import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Send, 
  Megaphone, 
  History, 
  Users, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Bell
} from 'lucide-react';

import { useSearchParams } from 'react-router-dom';

export function AdminBroadcast() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetStudentId = searchParams.get('studentId');

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'alert' | 'warning'>('info');
  const [scope, setScope] = useState<'all' | 'course' | 'student'>(targetStudentId ? 'student' : 'all');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');

  const fetchStudentName = async (uid: string) => {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        setSelectedStudentName(snap.data().displayName || uid);
      }
    } catch (e) {
      console.warn("Failed to fetch student name:", e);
    }
  };

  useEffect(() => {
    if (targetStudentId) {
      fetchStudentName(targetStudentId);
    }
  }, [targetStudentId]);

  const [courses, setCourses] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchCourses = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'courses'), orderBy('title', 'asc')));
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const q = query(
        collection(db, 'audit_logs'), 
        where('action', '==', 'BROADCAST_SENT'),
        orderBy('timestamp', 'desc'), 
        limit(10)
      );
      const snap = await getDocs(q);
      setHistory(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.metadata?.title || 'Broadcast',
          message: data.metadata?.message || 'Content unavailable',
          type: data.metadata?.type || 'info',
          createdAt: data.timestamp,
          count: data.metadata?.count || 0
        };
      }));
    } catch (err) {
      console.error("Error fetching broadcast history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchCourses();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || !user) return;
    if (scope === 'course' && !selectedCourseId) {
      setError('Please select a target course');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      let targetRecipientIds: string[] = [];

      if (scope === 'student' && targetStudentId) {
        targetRecipientIds = [targetStudentId];
      } else if (scope === 'course' && selectedCourseId) {
        const enrSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', selectedCourseId)));
        targetRecipientIds = Array.from(new Set(enrSnap.docs.map(d => d.data().studentId).filter(Boolean)));
      } else {
        // All active students
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        targetRecipientIds = usersSnap.docs.map(d => d.id);
      }

      // Create notifications for each recipient
      await Promise.all(targetRecipientIds.map(rId => 
        addDoc(collection(db, 'notifications'), {
          recipientId: rId,
          title,
          message,
          type,
          courseId: scope === 'course' ? selectedCourseId : null,
          read: false,
          createdAt: serverTimestamp(),
        })
      ));

      // Audit Log
      await addDoc(collection(db, 'audit_logs'), {
        userId: user.uid,
        action: 'BROADCAST_SENT',
        targetType: scope,
        targetId: scope === 'course' ? selectedCourseId : (scope === 'student' ? targetStudentId : 'global'),
        metadata: {
          title,
          message,
          type,
          count: targetRecipientIds.length,
        },
        timestamp: serverTimestamp(),
      });

      setSuccess(true);
      setTitle('');
      setMessage('');
      fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to send broadcast.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Academy Broadcast System</h1>
          <p className="text-neutral-500 text-sm">Send real-time notifications to all registered students at once.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Composer */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden p-8 space-y-6">
            <div className="flex items-center gap-3 text-brand-600">
              <Megaphone className="h-6 w-6" />
              <h2 className="text-lg font-bold">New Broadcast</h2>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Notification Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'info', label: 'Info', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                      { id: 'success', label: 'Success', color: 'bg-green-50 text-green-700 border-green-100' },
                      { id: 'warning', label: 'Warning', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                      { id: 'alert', label: 'Alert', color: 'bg-red-50 text-red-700 border-red-100' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id as any)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tight border transition-all ${
                          type === t.id ? t.color : 'bg-white text-neutral-400 border-neutral-100 grayscale opacity-60'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Target Recipients</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        scope === 'all' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200'
                      }`}
                    >
                      Global
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('course')}
                      className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        scope === 'course' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200'
                      }`}
                    >
                      Course
                    </button>
                    {targetStudentId && (
                      <button
                        type="button"
                        onClick={() => setScope('student')}
                        className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          scope === 'student' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200'
                        }`}
                      >
                        Student
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {scope === 'student' && targetStudentId && (
                <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Recipient</p>
                    <p className="text-sm font-bold text-neutral-900">{selectedStudentName}</p>
                  </div>
                  <Users className="h-5 w-5 text-brand-400" />
                </div>
              )}

              {scope === 'course' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Select Target Course</label>
                  <select
                    className="w-full px-4 py-3 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white text-sm font-medium"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    required={scope === 'course'}
                  >
                    <option value="">Choose a course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Title / Heading</label>
                <input
                  type="text"
                  placeholder="e.g. New Live Class Scheduled"
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all font-medium"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Message Content</label>
                <textarea
                  rows={6}
                  placeholder="Tell your students something important..."
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all resize-none text-sm leading-relaxed"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Broadcast sent successfully to all students!
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 bg-neutral-900 hover:bg-black text-white font-bold uppercase tracking-widest gap-2 rounded-2xl shadow-lg shadow-neutral-900/10"
                disabled={sending}
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Send Broadcast to All Members
              </Button>
            </form>
          </div>

          {/* History */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-neutral-900 rounded-3xl p-8 text-white space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-neutral-400" />
                  <h2 className="text-lg font-bold uppercase tracking-tight">Recent History</h2>
                </div>
                <Users className="h-5 w-5 text-neutral-600" />
              </div>

              <div className="space-y-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-700" />
                  </div>
                ) : history.length > 0 ? history.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        item.type === 'alert' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        item.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        item.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Now'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold truncate">{item.title}</h3>
                    <p className="text-[11px] text-neutral-400 line-clamp-2">{item.message}</p>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-tighter flex items-center gap-1">
                        <Users className="h-3 w-3" /> Sent to all students
                      </span>
                      <button className="text-[9px] text-brand-400 hover:text-brand-300 font-bold uppercase underline">Details</button>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center space-y-2 opacity-30">
                    <Megaphone className="h-10 w-10 mx-auto" />
                    <p className="text-xs uppercase font-bold tracking-widest">No previous broadcasts</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-brand-500 rounded-3xl p-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="h-6 w-6" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Push Notification</h3>
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                Broadcasts are sent via the internal notification system. Students will see a badge and receive an in-app alert when they next open the platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
