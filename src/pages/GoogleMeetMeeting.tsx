import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getClassLifecycle } from '../lib/classUtils';
import { 
  ArrowLeft, 
  Video, 
  ExternalLink, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  Radio, 
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export function GoogleMeetMeeting() {
  const { classId } = useParams();
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);
  const [courseData, setCourseData] = useState<any>(null);
  const [meetingUrl, setMeetingUrl] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    const verifyAndLoad = async () => {
      if (!classId || !user) return;
      setLoading(true);
      setAuthError(null);

      try {
        if (profile?.status === 'blocked') {
          setAuthError('Your student account is suspended. Cannot access live classes.');
          setLoading(false);
          return;
        }

        // 1. Fetch Class
        const classSnap = await getDoc(doc(db, 'classes', classId));
        if (!classSnap.exists()) {
          setAuthError('Live class session not found.');
          setLoading(false);
          return;
        }

        const cData = classSnap.data();
        setClassData({ id: classSnap.id, ...cData });

        const rawUrl = cData.meetingUrl || cData.googleMeetUrl || '';
        if (!rawUrl) {
          setAuthError('Google Meet link has not been provided by the instructor yet.');
          setLoading(false);
          return;
        }

        let finalUrl = rawUrl.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'https://' + finalUrl;
        }
        setMeetingUrl(finalUrl);

        // 2. Fetch Course
        const courseSnap = await getDoc(doc(db, 'courses', cData.courseId));
        if (courseSnap.exists()) {
          setCourseData({ id: courseSnap.id, ...courseSnap.data() });
        }

        // 3. Verify Enrollment / Authorization
        if (!isAdmin) {
          const lifecycle = getClassLifecycle(cData);
          if (lifecycle !== 'LIVE' && cData.status !== 'Live') {
            setAuthError('This live class is not currently active (Status: ' + lifecycle + ').');
            setLoading(false);
            return;
          }

          const enrQuery = query(
            collection(db, 'enrollments'),
            where('studentId', '==', user.uid),
            where('courseId', '==', cData.courseId),
            where('status', '==', 'approved')
          );
          const enrSnap = await getDocs(enrQuery);

          if (enrSnap.empty) {
            setAuthError('You must be an approved enrolled student in this course to join the live classroom.');
            setLoading(false);
            return;
          }
        }

      } catch (err: any) {
        console.error('Error loading internal meeting room:', err);
        setAuthError(err.message || 'Failed to authorize meeting session.');
      } finally {
        setLoading(false);
      }
    };

    verifyAndLoad();
  }, [classId, user, profile, isAdmin]);

  if (loading) {
    return (
      <div className="h-screen bg-[#090a0d] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-xs uppercase tracking-widest text-neutral-400">Authenticating Live Classroom...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-screen bg-[#090a0d] flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold uppercase tracking-tight">Access Restricted</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">{authError}</p>
          </div>
          <Button 
            onClick={() => navigate(isAdmin ? '/admin/live' : '/live')} 
            className="w-full bg-white text-neutral-900 font-bold h-11 uppercase text-xs"
          >
            Return to Live Classes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#090a0d] text-white overflow-hidden font-sans select-none">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-[#0d0e12] shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/live/${classId}`)}
            className="h-9 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Class Hub</span>
          </button>

          <div className="h-5 w-px bg-neutral-800 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                ANIVOX LIVE CLASSROOM
              </span>
            </div>
            <h1 className="text-xs sm:text-sm font-bold text-neutral-100 truncate max-w-xs sm:max-w-md">
              {classData?.title || courseData?.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => navigate(`/live/${classId}`)}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs h-9 px-4 gap-2 rounded-xl"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Leave Meeting</span>
          </Button>
        </div>
      </header>

      {/* Main Embedded / Fallback Workspace */}
      <div className="flex-1 flex flex-col min-h-0 bg-black relative">
        {/* Attempt embedding Google Meet iframe */}
        <iframe
          src={meetingUrl}
          title={classData?.title || 'Google Meet'}
          className="w-full h-full border-0 absolute inset-0 z-10"
          allow="camera; microphone; display-capture; fullscreen; accelerometer; gyroscope; clipboard-write"
          allowFullScreen
          onError={() => setIframeError(true)}
          onLoad={() => setIframeLoaded(true)}
        />

        {/* Fallback Overlay if Google Meet restricts iframe embedding */}
        <div className="absolute inset-0 z-0 bg-[#090a0d] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="h-16 w-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
              <Video className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-display font-bold text-white uppercase">Google Meet Session Ready</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Google Meet requires opening in an authenticated secure browser window for camera and microphone sharing. Click below to launch your live class meeting.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-blue-400 truncate">{meetingUrl}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                onClick={() => window.open(meetingUrl, '_blank', 'noopener,noreferrer')}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 rounded-xl uppercase text-xs tracking-wider gap-2 shadow-lg"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Google Meet Window</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate(`/live/${classId}`)}
                className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-bold h-12 rounded-xl uppercase text-xs"
              >
                Return to Class Hub
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
