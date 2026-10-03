import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Trash2, MessageSquare, Loader2, Shield, Lock, Unlock } from 'lucide-react';

interface ClassroomChatProps {
  classId: string;
  courseId: string;
  isAdmin: boolean;
  chatEnabled?: boolean;
}

export function ClassroomChat({ classId, courseId, isAdmin, chatEnabled = true }: ClassroomChatProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!classId) return;

    const q = query(
      collection(db, 'classes', classId, 'chat'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      console.warn("Classroom chat listener notice:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || submitting) return;
    if (!chatEnabled && !isAdmin) return;

    const text = newMessage.trim();
    setNewMessage('');
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'classes', classId, 'chat'), {
        senderId: user.uid,
        senderName: profile?.displayName || user.displayName || (isAdmin ? 'Instructor' : 'Student'),
        senderPhoto: profile?.photoURL || user.photoURL || '',
        senderRole: isAdmin ? 'teacher' : 'student',
        text,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending classroom message:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'classes', classId, 'chat', msgId));
    } catch (e) {
      console.error("Error deleting message:", e);
    }
  };

  const toggleClassChat = async () => {
    if (!isAdmin || !classId) return;
    try {
      await updateDoc(doc(db, 'classes', classId), {
        chatEnabled: !chatEnabled
      });
    } catch (e) {
      console.error("Error toggling chat state:", e);
    }
  };

  const isStudentChatDisabled = !chatEnabled && !isAdmin;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#101115] text-neutral-100 select-none">
      {/* Teacher moderation bar */}
      {isAdmin && (
        <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Chat Policy
          </span>
          <button
            onClick={toggleClassChat}
            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              chatEnabled 
                ? 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {chatEnabled ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {chatEnabled ? 'Disable Student Chat' : 'Enable Student Chat'}
          </button>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-neutral-800">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            const isTeacher = msg.senderRole === 'teacher';

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 group`}
              >
                <div className="flex items-center gap-2 px-1">
                  {!isMe && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isTeacher ? 'text-blue-400' : 'text-neutral-400'
                    }`}>
                      {msg.senderName}
                      {isTeacher && (
                        <span className="text-[9px] px-1 py-0.2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 font-black">
                          INSTRUCTOR
                        </span>
                      )}
                    </span>
                  )}
                  {isAdmin && (
                    <button 
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-opacity"
                      title="Delete message"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className={`p-3 rounded-xl text-xs max-w-[88%] leading-relaxed break-words shadow-sm ${
                  isMe 
                    ? 'bg-neutral-800 text-white rounded-tr-none border border-neutral-700' 
                    : isTeacher
                    ? 'bg-blue-950/40 text-blue-100 border border-blue-800/50 rounded-tl-none'
                    : 'bg-[#181920] text-neutral-200 border border-neutral-800 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>

                <span className="text-[9px] text-neutral-500 px-1 font-mono">
                  {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-50">
            <MessageSquare className="h-8 w-8 text-neutral-600 mb-1" />
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">No messages yet.</p>
            <p className="text-[11px] text-neutral-500 max-w-[200px]">
              Use this chat to communicate with the instructor and peers during class.
            </p>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-neutral-800 bg-[#0e0f13]">
        {isStudentChatDisabled ? (
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
            <Lock className="h-3.5 w-3.5 text-amber-500" />
            <span>Chat is currently paused by the instructor.</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Send message to class..."
              className="flex-1 bg-neutral-900 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-700 px-3.5 py-2.5 rounded-xl border border-neutral-800"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || submitting}
              className="h-9 w-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-white flex items-center justify-center transition-all border border-neutral-700"
              title="Send"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
