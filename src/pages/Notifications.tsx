import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Bell, CheckCircle2, Info, AlertTriangle, Radio, CreditCard, BookOpen, ArrowRight, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'), 
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error listening to notifications:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      } catch (e) {
        console.warn("Failed to mark notification as read:", e);
      }
    }

    if (n.classId) {
      navigate(`/live/${n.classId}`);
    } else if (n.courseId) {
      navigate(`/courses/${n.courseId}`);
    } else if (n.type === 'success' && n.title.includes('Payment')) {
      navigate('/payments');
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    try {
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case 'alert': return <AlertTriangle className="h-5 w-5 text-rose-600" />;
      case 'live': return <Radio className="h-5 w-5 text-purple-600 animate-pulse" />;
      case 'info': return <Info className="h-5 w-5 text-blue-600" />;
      default: return <Bell className="h-5 w-5 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-purple-600" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Activity & Notices
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-neutral-900">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Real-time updates regarding your classes, verification, and academy announcements.
          </p>
        </div>

        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllRead} 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/80 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors shadow-2xs self-start"
          >
            <Check className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div 
              key={n.id} 
              className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer shadow-sm ${
                n.read 
                  ? 'bg-white border-neutral-200/60 opacity-80 hover:opacity-100' 
                  : 'bg-white border-purple-200 ring-2 ring-purple-500/10'
              }`}
              onClick={() => handleNotificationClick(n)}
            >
              <div className="flex gap-4 items-start">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  n.read ? 'bg-[#FAF8FA] text-neutral-400' : 'bg-purple-50 text-purple-600'
                }`}>
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-sm font-bold text-neutral-900">
                      {n.title}
                    </h3>
                    {!n.read && (
                      <span className="h-2 w-2 bg-purple-600 rounded-full shrink-0 mt-1 animate-pulse" />
                    )}
                  </div>

                  <p className="text-neutral-500 text-xs leading-relaxed">
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-[11px] text-neutral-400">
                    <span>
                      {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                    <span className="font-bold text-purple-700 hover:underline flex items-center gap-1">
                      Details <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white border border-neutral-200/80 rounded-3xl p-8 space-y-3 shadow-sm">
          <div className="h-14 w-14 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto">
            <Bell className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No Notifications</h2>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            You're all caught up! Updates from your live classes and course enrollments will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
