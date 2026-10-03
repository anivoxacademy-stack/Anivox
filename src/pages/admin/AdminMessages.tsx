import React from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Send, Loader2, Users, User, BookOpen } from 'lucide-react';

export function AdminMessages() {
  const [students, setStudents] = React.useState<any[]>([]);
  const [courses, setCourses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = React.useState({
    recipientType: 'all', // 'all', 'course', 'individual'
    recipientId: '',
    title: '',
    message: '',
    type: 'info' // 'info', 'success', 'alert'
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const studentSnap = await getDocs(collection(db, 'users'));
        const courseSnap = await getDocs(collection(db, 'courses'));
        setStudents(studentSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching messaging data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setStatusMessage(null);
    try {
      let recipientIds: string[] = [];
      
      if (formData.recipientType === 'all') {
        recipientIds = students.map(s => s.id);
      } else if (formData.recipientType === 'course') {
        // Fetch enrollments for this course
        const enSnap = await getDocs(query(collection(db, 'enrollments')));
        recipientIds = enSnap.docs
          .filter(d => d.data().courseId === formData.recipientId)
          .map(d => d.data().studentId);
      } else {
        recipientIds = [formData.recipientId];
      }

      // Create notifications for each recipient
      await Promise.all(recipientIds.map(uid => 
        addDoc(collection(db, 'notifications'), {
          recipientId: uid,
          title: formData.title,
          message: formData.message,
          type: formData.type,
          read: false,
          createdAt: serverTimestamp()
        })
      ));

      setStatusMessage({ text: `Successfully sent notification to ${recipientIds.length} recipient(s).`, type: 'success' });
      setFormData({ ...formData, title: '', message: '' });
    } catch (error) {
      console.error("Error sending messages:", error);
      setStatusMessage({ text: 'Failed to send messages. Please check permissions.', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Message Center</h1>
          <p className="text-neutral-500">Send announcements and notifications to your students.</p>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Recipient</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white"
                  value={formData.recipientType}
                  onChange={(e) => setFormData({ ...formData, recipientType: e.target.value, recipientId: '' })}
                >
                  <option value="all">All Registered Students</option>
                  <option value="course">Course Participants</option>
                  <option value="individual">Individual Student</option>
                </select>
              </div>

              {formData.recipientType !== 'all' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-4">
                  <label className="text-sm font-medium text-neutral-700">
                    Select {formData.recipientType === 'course' ? 'Course' : 'Student'}
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white"
                    value={formData.recipientId}
                    onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {formData.recipientType === 'course' 
                      ? courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                      : students.map(s => <option key={s.id} value={s.id}>{s.displayName} ({s.email})</option>)
                    }
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Message Title</label>
              <input
                required
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. New Live Class Scheduled"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Message Content</label>
              <textarea
                required
                rows={5}
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none resize-none"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write your announcement here..."
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-neutral-50">
              <div className="flex gap-4">
                {['info', 'success', 'alert'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="msgType" 
                      checked={formData.type === t} 
                      onChange={() => setFormData({ ...formData, type: t })}
                    />
                    <span className="text-xs uppercase font-bold text-neutral-500">{t}</span>
                  </label>
                ))}
              </div>
              <Button type="submit" disabled={sending} className="gap-2 px-8 h-12">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Notification
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
