import React from 'react';
import { 
  Hand, 
  Users, 
  Trash2,
  Video
} from 'lucide-react';

interface ClassroomParticipantsProps {
  isAdmin: boolean;
  raisedHands: any[];
  onLowerHand?: (id: string) => void;
}

export function ClassroomParticipants({ 
  isAdmin, 
  raisedHands = [], 
  onLowerHand 
}: ClassroomParticipantsProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#101115] text-neutral-100 select-none">
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-neutral-800">
        {/* Hand Raises Section */}
        {raisedHands.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
              <Hand className="h-3 w-3" /> Raised Hands ({raisedHands.length})
            </h3>
            <div className="space-y-1.5">
              {raisedHands.map((h) => (
                <div 
                  key={h.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-7 w-7 rounded-lg bg-amber-500 text-black flex items-center justify-center font-black text-xs uppercase shrink-0">
                      {h.studentName ? h.studentName.slice(0, 2).toUpperCase() : 'ST'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-amber-200 truncate">{h.studentName || 'Student'}</p>
                      <p className="text-[9px] text-amber-400/80 font-mono">
                        {h.raisedAt?.toDate ? new Date(h.raisedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                  {isAdmin && onLowerHand && (
                    <button 
                      onClick={() => onLowerHand(h.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-black uppercase hover:bg-amber-400 transition-colors shadow-sm"
                    >
                      Lower
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400 space-y-1">
            <Hand className="h-4 w-4 text-neutral-500 mx-auto" />
            <p className="font-semibold text-neutral-300">No Raised Hands</p>
            <p className="text-[10px] text-neutral-500">Students can raise their hand using the hand button on the toolbar.</p>
          </div>
        )}

        {/* Live Video Participants Info */}
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              Live Google Meet Session
            </h3>
          </div>
          <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs text-neutral-400 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-[11px]">
              <Video className="h-4 w-4" />
              <span>Google Meet Classroom</span>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              Live video, microphone, camera, and screen sharing occur directly inside the Google Meet meeting. Use this Anivox Academy panel for live chat and raising hands.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
