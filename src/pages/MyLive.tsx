import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getClassLifecycle, formatClassTime } from '../lib/classUtils';
import { Loader2, Video, Calendar, Clock, Radio, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function MyLive() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    let unsubClasses: (() => void) | null = null;

    const enQuery = query(
      collection(db, 'enrollments'), 
      where('studentId', '==', user.uid), 
      where('status', '==', 'approved')
    );

    const unsubEnrollments = onSnapshot(enQuery, async (enSnap) => {
      const courseIds = enSnap.docs.map(d => d.data().courseId);

      if (courseIds.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      if (unsubClasses) {
        unsubClasses();
      }

      const classQuery = query(
        collection(db, 'classes'), 
        where('courseId', 'in', courseIds.slice(0, 10)), 
        orderBy('startTime', 'desc')
      );

      unsubClasses = onSnapshot(classQuery, async (classSnap) => {
        const list = await Promise.all(classSnap.docs.map(async (cDoc) => {
          const data = cDoc.data();
          let courseTitle = 'Anivox Academy';
          try {
            const courseSnap = await getDoc(doc(db, 'courses', data.courseId));
            if (courseSnap.exists()) {
              courseTitle = courseSnap.data().title;
            }
          } catch (e) {
            // ignore
          }
          const lifecycle = getClassLifecycle(data);
          return {
            id: cDoc.id,
            ...data,
            calculatedLifecycle: lifecycle,
            courseTitle
          };
        }));

        setClasses(list);
        setLoading(false);
      }, (err) => {
        console.warn("Notice listening to classes:", err);
        setLoading(false);
      });

    }, (err) => {
      console.warn("Notice listening to enrollments:", err);
      setLoading(false);
    });

    return () => {
      unsubEnrollments();
      if (unsubClasses) unsubClasses();
    };
  }, [user]);

  // Refresh time-based lifecycle every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setClasses(prev => prev.map(c => ({
        ...c,
        calculatedLifecycle: getClassLifecycle(c)
      })));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const liveNow = classes.filter(c => c.calculatedLifecycle === 'LIVE' && (c.meetingUrl || c.googleMeetUrl));
  const upcoming = classes.filter(c => c.calculatedLifecycle === 'SCHEDULED');
  const completed = classes.filter(c => c.calculatedLifecycle === 'ENDED' || c.calculatedLifecycle === 'CANCELLED');

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-purple-600" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Live Studio
          </span>
        </div>
        <h1 className="text-3xl font-display font-bold text-neutral-900">
          Live Interactive Classrooms
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Join real-time video sessions during scheduled live windows. Join buttons appear automatically when classes start.
        </p>
      </div>

      {/* Active Live Class Card */}
      {liveNow.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-wider">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
            <span>Broadcasting Right Now</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {liveNow.map((cls) => {
              const meetUrl = cls.meetingUrl || cls.googleMeetUrl;
              return (
                <div 
                  key={cls.id} 
                  className="bg-neutral-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-red-500/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 max-w-2xl relative z-10">
                    <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
                      {cls.courseTitle}
                    </span>
                    <h2 className="text-2xl font-display font-bold text-white">
                      {cls.title}
                    </h2>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {cls.description || 'Live session is currently active. Click below to join the Google Meet room.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
                    {meetUrl ? (
                      <Button 
                        size="lg" 
                        className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl h-12 px-6 text-xs uppercase tracking-wider shadow-lg gap-2" 
                        onClick={() => window.open(meetUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <Radio className="h-4 w-4 animate-pulse" />
                        <span>Join Live (Google Meet)</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                        Meeting link not available
                      </span>
                    )}
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="border-neutral-700 text-neutral-200 hover:bg-neutral-800 font-bold rounded-2xl h-12 px-5 text-xs uppercase tracking-wider" 
                      onClick={() => navigate(`/live/${cls.id}`)}
                    >
                      Class Hub & Chat
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Sessions */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
          Upcoming Scheduled Classes ({upcoming.length})
        </h2>

        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcoming.map((cls) => {
              const hasMeet = Boolean(cls.meetingUrl || cls.googleMeetUrl);
              return (
                <div 
                  key={cls.id} 
                  className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                        {cls.courseTitle}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold">
                        {cls.duration || 60} mins
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 line-clamp-1">
                      {cls.title}
                    </h3>
                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                      {cls.description || 'Live class module covering practical techniques.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-neutral-600 font-medium">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span>{formatClassTime(cls)}</span>
                    </div>

                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                      Scheduled
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-white border border-neutral-200/80 rounded-3xl text-center space-y-2 shadow-sm">
            <Calendar className="h-8 w-8 text-neutral-300 mx-auto" />
            <p className="text-xs font-bold text-neutral-700">No upcoming live classes scheduled.</p>
          </div>
        )}
      </section>

      {/* Completed / Past Masterclasses (History) */}
      {completed.length > 0 && (
        <section className="space-y-4 pt-4">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
            Past Masterclasses & History ({completed.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completed.map((cls) => (
              <div 
                key={cls.id} 
                className="bg-white border border-neutral-200/60 rounded-2xl p-5 text-xs space-y-2 opacity-85 shadow-2xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">
                    {cls.courseTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[10px] font-bold uppercase">
                    {cls.calculatedLifecycle}
                  </span>
                </div>
                <h4 className="font-bold text-neutral-900 text-sm">{cls.title}</h4>
                <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] pt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Completed on {formatClassTime(cls)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
