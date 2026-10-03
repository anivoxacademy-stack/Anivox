import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  deleteDoc,
  where 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getClassLifecycle, formatClassTime } from '../../lib/classUtils';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Video, 
  Calendar, 
  Clock, 
  X, 
  Save, 
  Loader2, 
  ExternalLink,
  Radio,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Ban
} from 'lucide-react';

export function AdminLive() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    startTime: '',
    duration: '60',
    meetingUrl: '',
    allowStudentScreenSharing: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const classSnap = await getDocs(query(collection(db, 'classes'), orderBy('startTime', 'desc')));
      const courseSnap = await getDocs(collection(db, 'courses'));
      
      const coursesList = courseSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      setCourses(coursesList);

      const list = classSnap.docs.map(d => {
        const data = d.data();
        const course = coursesList.find(c => c.id === data.courseId);
        const lifecycle = getClassLifecycle(data);
        return {
          id: d.id,
          ...data,
          calculatedLifecycle: lifecycle,
          courseTitle: course?.title || 'General Academy Session'
        };
      });
      setClasses(list);
    } catch (error) {
      console.error("Error fetching live classes data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Check lifecycle every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const validateMeetUrl = (url: string) => {
    if (!url || !url.trim()) return false;
    const lower = url.toLowerCase();
    return lower.includes('meet.google.com/') || lower.startsWith('http://') || lower.startsWith('https://');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    let url = formData.meetingUrl.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (!validateMeetUrl(url)) {
      setUrlError('Please enter a valid Google Meet URL (e.g. https://meet.google.com/abc-defg-hij)');
      return;
    }

    setSubmitting(true);
    try {
      const startDateTime = new Date(formData.startTime);
      const durationMins = Number(formData.duration) || 60;
      const endDateTime = new Date(startDateTime.getTime() + durationMins * 60000);

      const docRef = await addDoc(collection(db, 'classes'), {
        courseId: formData.courseId,
        title: formData.title,
        description: formData.description,
        startTime: startDateTime,
        endTime: endDateTime,
        duration: durationMins,
        durationMinutes: durationMins,
        meetingUrl: url,
        googleMeetUrl: url,
        status: 'Scheduled',
        allowStudentScreenSharing: Boolean(formData.allowStudentScreenSharing),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify enrolled students
      await notifyClassStudents(
        { id: docRef.id, courseId: formData.courseId, title: formData.title },
        'New Live Class Scheduled',
        `A new live session "${formData.title}" has been scheduled for ${startDateTime.toLocaleString('en-IN')}.`,
        'info'
      );

      setIsFormOpen(false);
      setFormData({ 
        courseId: '', 
        title: '', 
        description: '', 
        startTime: '', 
        duration: '60', 
        meetingUrl: '',
        allowStudentScreenSharing: false,
      });
      fetchData();
    } catch (error) {
      console.error("Error creating class:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const notifyClassStudents = async (cls: any, notifTitle: string, notifMessage: string, notifType: 'live' | 'alert' | 'info') => {
    if (!cls?.courseId) return;
    try {
      const enrSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', cls.courseId)));
      const studentIds = Array.from(new Set(enrSnap.docs.map(d => d.data().studentId).filter(Boolean)));
      await Promise.all(studentIds.map(sId => 
        addDoc(collection(db, 'notifications'), {
          recipientId: sId,
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          classId: cls.id,
          courseId: cls.courseId,
          read: false,
          createdAt: serverTimestamp(),
        })
      ));
    } catch (e) {
      console.warn("Notice notifying students:", e);
    }
  };

  const handleStartClass = async (cls: any) => {
    const meetUrl = cls.meetingUrl || cls.googleMeetUrl;
    if (!meetUrl || !validateMeetUrl(meetUrl)) {
      alert("A valid Google Meet URL is required before starting this class.");
      return;
    }

    try {
      await updateDoc(doc(db, 'classes', cls.id), { 
        status: 'Live',
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await notifyClassStudents(
        cls, 
        'Class is Live Now!', 
        `The live session "${cls.title}" has started. Join Google Meet now.`, 
        'live'
      );

      window.open(meetUrl, '_blank', 'noopener,noreferrer');
      fetchData();
    } catch (error) {
      console.error("Error starting class:", error);
    }
  };

  const handleEndClass = async (id: string) => {
    try {
      await updateDoc(doc(db, 'classes', id), { 
        status: 'Ended',
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      fetchData();
    } catch (error) {
      console.error("Error ending class:", error);
    }
  };

  const handleCancelClass = async (id: string) => {
    const reason = prompt("Reason for cancelling this class?");
    if (reason === null) return;

    try {
      await updateDoc(doc(db, 'classes', id), { 
        status: 'Cancelled',
        cancelledAt: serverTimestamp(),
        cancelReason: reason || 'Instructor cancellation',
        updatedAt: serverTimestamp()
      });

      const cls = classes.find(c => c.id === id);
      if (cls) {
        await notifyClassStudents(
          cls,
          'Class Cancelled',
          `The live session "${cls.title}" has been cancelled. Reason: ${reason || 'Instructor schedule change'}`,
          'alert'
        );
      }
      fetchData();
    } catch (error) {
      console.error("Error cancelling class:", error);
    }
  };

  // Reschedule state
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newStartTime, setNewStartTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingId || !newStartTime) return;

    try {
      const cls = classes.find(c => c.id === reschedulingId);
      const startTimeDate = new Date(newStartTime);
      const durationMins = Number(cls?.duration || 60);
      const endTimeDate = new Date(startTimeDate.getTime() + durationMins * 60000);

      await updateDoc(doc(db, 'classes', reschedulingId), { 
        status: 'Scheduled',
        startTime: startTimeDate,
        endTime: endTimeDate,
        rescheduledFrom: cls?.startTime || null,
        rescheduledAt: serverTimestamp(),
        rescheduleReason: rescheduleReason,
        updatedAt: serverTimestamp()
      });

      if (cls) {
        await notifyClassStudents(
          cls,
          'Class Rescheduled',
          `Your class "${cls.title}" has been rescheduled to ${startTimeDate.toLocaleString('en-IN')}.`,
          'info'
        );
      }

      setReschedulingId(null);
      setNewStartTime('');
      setRescheduleReason('');
      fetchData();
    } catch (error) {
      console.error("Error rescheduling class:", error);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Live Classrooms & Lifecycle</h1>
            <p className="text-neutral-500 text-sm">Schedule real-time video sessions with automatic time-based lifecycle rules and strict Meet link validation.</p>
          </div>
          <Button className="gap-2 h-11 font-semibold" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4" /> Schedule New Class
          </Button>
        </div>

        {isFormOpen && (
          <div className="bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-sm relative space-y-6">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900">
              <X className="h-5 w-5" />
            </button>
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-900">Schedule Live Session</h2>
              <p className="text-xs text-neutral-400">Google Meet link is strictly required. Empty URLs prevent student join buttons.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Course *</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white text-sm"
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  >
                    <option value="">Select a course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Class Session Title *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Masterclass 01: Character Walk Cycles & Rigging"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700 flex items-center justify-between">
                    <span>Google Meet URL *</span>
                    <span className="text-[11px] text-blue-600 font-medium">Required for Live state</span>
                  </label>
                  <input
                    required
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm font-mono text-blue-600"
                    value={formData.meetingUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, meetingUrl: e.target.value });
                      setUrlError(null);
                    }}
                  />
                  {urlError && <p className="text-xs text-red-600">{urlError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Start Time *</label>
                    <input
                      required
                      type="datetime-local"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Duration *</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white text-sm"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes (1 hour)</option>
                      <option value="90">90 minutes (1.5 hrs)</option>
                      <option value="120">120 minutes (2 hrs)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-neutral-900 block">
                      Allow Student Screen Sharing
                    </label>
                    <p className="text-xs text-neutral-400">
                      Enrolled students can share screens during the session.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-neutral-900 rounded cursor-pointer"
                    checked={formData.allowStudentScreenSharing}
                    onChange={(e) => setFormData({ ...formData, allowStudentScreenSharing: e.target.checked })}
                  />
                </div>
              </div>

              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Session Outline / Description</label>
                  <textarea
                    rows={6}
                    placeholder="Topics to be covered, required project files..."
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={submitting} className="h-11 px-6 gap-2 font-bold">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save & Schedule Class
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Session Title</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Schedule & Duration</th>
                  <th className="px-6 py-4">Meet Link</th>
                  <th className="px-6 py-4">Lifecycle Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {classes.length > 0 ? classes.map((cls) => {
                  const lifecycle = getClassLifecycle(cls);
                  const hasMeetUrl = Boolean(cls.meetingUrl || cls.googleMeetUrl);

                  return (
                    <tr key={cls.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            lifecycle === 'LIVE' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            <Video className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900">{cls.title}</p>
                            <p className="text-xs text-neutral-400">{cls.duration || 60} mins</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-neutral-800 text-xs">{cls.courseTitle}</p>
                      </td>

                      <td className="px-6 py-4 text-xs text-neutral-600">
                        {formatClassTime(cls)}
                      </td>

                      <td className="px-6 py-4">
                        {hasMeetUrl ? (
                          <a 
                            href={cls.meetingUrl || cls.googleMeetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold font-mono"
                          >
                            <ExternalLink className="h-3 w-3" /> Meet Ready
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold">
                            <AlertTriangle className="h-3 w-3 text-amber-600" /> Link Required
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          lifecycle === 'LIVE' ? 'bg-red-100 text-red-700' :
                          lifecycle === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                          lifecycle === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {lifecycle === 'LIVE' && <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />}
                          {lifecycle}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lifecycle === 'SCHEDULED' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleStartClass(cls)} 
                                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5"
                              >
                                <Radio className="h-3.5 w-3.5 animate-pulse" /> Start Now
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReschedulingId(cls.id);
                                  setNewStartTime(cls.startTime?.toDate ? new Date(cls.startTime.toDate().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
                                }}
                                className="text-xs font-semibold"
                              >
                                Reschedule
                              </Button>
                            </>
                          )}

                          {lifecycle === 'LIVE' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleStartClass(cls)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Join Meet
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEndClass(cls.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold"
                              >
                                End Class
                              </Button>
                            </>
                          )}

                          {lifecycle !== 'CANCELLED' && lifecycle !== 'ENDED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelClass(cls.id)}
                              className="text-neutral-500 hover:text-red-600 text-xs font-semibold"
                            >
                              Cancel
                            </Button>
                          )}

                          <button 
                            onClick={() => {
                              if (window.confirm("Delete this session record?")) {
                                deleteDoc(doc(db, 'classes', cls.id)).then(() => fetchData());
                              }
                            }}
                            className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-neutral-500">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                          <span>Loading classes...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Video className="h-10 w-10 text-neutral-300 mx-auto" />
                          <p className="font-semibold text-neutral-700">No scheduled classes.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reschedule Modal */}
        {reschedulingId && (
           <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl relative">
                 <button onClick={() => setReschedulingId(null)} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900">
                    <X className="h-5 w-5" />
                 </button>
                 
                 <div className="border-b border-neutral-100 pb-3 text-center">
                    <h3 className="text-xl font-display font-bold text-neutral-900 uppercase">Reschedule Class</h3>
                    <p className="text-xs text-neutral-400 mt-1">Updates scheduled time and notifies authorized students.</p>
                 </div>

                 <form onSubmit={handleReschedule} className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-sm font-medium text-neutral-700">New Start Time *</label>
                       <input
                          required
                          type="datetime-local"
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                          value={newStartTime}
                          onChange={(e) => setNewStartTime(e.target.value)}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-sm font-medium text-neutral-700">Reason</label>
                       <textarea
                          rows={3}
                          placeholder="e.g. Schedule adjustment..."
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm resize-none"
                          value={rescheduleReason}
                          onChange={(e) => setRescheduleReason(e.target.value)}
                       />
                    </div>

                    <div className="flex gap-2 pt-4">
                       <Button type="button" variant="outline" className="flex-1 h-11 font-bold uppercase" onClick={() => setReschedulingId(null)}>
                          Cancel
                       </Button>
                       <Button type="submit" className="flex-1 h-11 bg-neutral-900 font-bold uppercase gap-2">
                          <Save className="h-4 w-4" /> Save Schedule
                       </Button>
                    </div>
                 </form>
              </div>
           </div>
        )}
      </div>
    </AdminLayout>
  );
}
