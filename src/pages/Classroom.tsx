import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ClassroomErrorBoundary } from '../components/classroom/ClassroomErrorBoundary';
import { ClassroomChat } from '../components/classroom/ClassroomChat';
import { ClassroomParticipants } from '../components/classroom/ClassroomParticipants';

import { 
  Loader2, 
  AlertCircle, 
  RotateCcw, 
  Home, 
  CheckCircle2, 
  Lock, 
  Calendar, 
  Clock,
  ArrowLeft,
  MessageSquare,
  Users,
  Hand,
  AlertTriangle,
  X,
  Video,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Edit3,
  Save
} from 'lucide-react';
import { Button } from '../components/ui/Button';

type ConnectionStage = 
  | 'idle' 
  | 'checking-auth' 
  | 'checking-enrollment' 
  | 'ready' 
  | 'error';

export function Classroom() {
  const navigate = useNavigate();

  return (
    <ClassroomErrorBoundary onLeave={() => navigate('/live')}>
      <ClassroomInternal />
    </ClassroomErrorBoundary>
  );
}

function ClassroomInternal() {
  const { classId } = useParams();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Lifecycle States
  const [stage, setConnectionStage] = useState<ConnectionStage>('idle');
  const [error, setError] = useState<{ title: string; message: string; code?: string; actionType?: 'enroll' | 'schedule' | 'retry' } | null>(null);
  const [classData, setClassData] = useState<any>(null);
  const [courseData, setCourseData] = useState<any>(null);
  
  // Meeting URL state
  const [meetingUrl, setMeetingUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinedMeet, setJoinedMeet] = useState(false);

  // Edit Link State for Admin
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [updatingUrl, setUpdatingUrl] = useState(false);

  // Active UI tab
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'info' | null>('chat');

  // Hand Raise State
  const [raisedHands, setRaisedHands] = useState<any[]>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);

  // Attendance
  const attendanceDocIdRef = useRef<string | null>(null);
  const joinTimeRef = useRef<number>(Date.now());
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  const initClassroom = async () => {
    if (!classId) return;
    
    setError(null);
    setConnectionStage('checking-auth');

    try {
      // 1. Check Authentication
      if (authLoading) return;
      if (!user) {
        navigate('/login');
        return;
      }

      if (profile?.status === 'blocked') {
        navigate('/restricted');
        return;
      }

      // 2. Fetch Class & Course
      setConnectionStage('checking-enrollment');
      const classSnap = await getDoc(doc(db, 'classes', classId));
      if (!classSnap.exists()) {
        setError({
          title: 'Classroom Not Found',
          message: 'This live session does not exist or has been removed by the instructor.',
          code: 'CLASS_NOT_FOUND'
        });
        setConnectionStage('error');
        return;
      }

      const cData = classSnap.data();
      const rawUrl = cData.meetingUrl || cData.googleMeetUrl || '';

      setClassData({ id: classSnap.id, ...cData });
      setMeetingUrl(rawUrl);
      setNewUrlInput(rawUrl);

      const courseSnap = await getDoc(doc(db, 'courses', cData.courseId));
      if (courseSnap.exists()) {
        setCourseData({ id: courseSnap.id, ...courseSnap.data() });
      } else {
        setCourseData({ id: cData.courseId, title: 'Anivox Academy' });
      }

      // 3. Verify Enrollment & Status
      if (!isAdmin) {
        const enrQuery = query(
          collection(db, 'enrollments'),
          where('studentId', '==', user.uid),
          where('courseId', '==', cData.courseId),
          where('status', '==', 'approved')
        );
        const enrSnap = await getDocs(enrQuery);

        if (enrSnap.empty) {
          setError({
            title: 'Enrollment Required',
            message: 'You must be an enrolled and approved student in this course to enter this live classroom.',
            code: 'ENROLLMENT_REQUIRED',
            actionType: 'enroll'
          });
          setConnectionStage('error');
          return;
        }

        if (cData.status === 'Cancelled') {
          setError({
            title: 'Class Cancelled',
            message: cData.cancellationReason 
              ? `This session was cancelled by the instructor: "${cData.cancellationReason}"` 
              : 'This live session has been cancelled. Please check your notifications for updates.',
            code: 'CLASS_CANCELLED'
          });
          setConnectionStage('error');
          return;
        }

        if (cData.status === 'Postponed') {
          const rescheduleDate = cData.startTime?.toDate 
            ? new Date(cData.startTime.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
            : 'a future date';

          setError({
            title: 'Class Rescheduled',
            message: `This live session has been postponed to ${rescheduleDate}.${cData.rescheduleReason ? ` Reason: ${cData.rescheduleReason}` : ''}`,
            code: 'CLASS_RESCHEDULED',
            actionType: 'schedule'
          });
          setConnectionStage('error');
          return;
        }
      }

      setConnectionStage('ready');

    } catch (err: any) {
      console.error('[CLASSROOM_INIT_ERROR]:', err);
      setError({
        title: 'Connection Failed',
        message: err.message || 'Unable to load the Google Meet live classroom.',
        code: 'CLASSROOM_LOAD_ERROR'
      });
      setConnectionStage('error');
    }
  };

  useEffect(() => {
    if (!authLoading) {
      initClassroom();
    }
  }, [classId, user?.uid, authLoading, isAdmin]);

  // Real-time Hand & Class Listeners
  useEffect(() => {
    if (!classId) return;

    const handsQuery = collection(db, 'classes', classId, 'hands');
    const unsubHands = onSnapshot(handsQuery, (snap) => {
      const handsList: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRaisedHands(handsList);
      if (user && handsList.some(h => h.id === user.uid || h.studentId === user.uid)) {
        setHasRaisedHand(true);
      } else {
        setHasRaisedHand(false);
      }
    }, (e) => console.warn("Hands listener notice:", e));

    const unsubClass = onSnapshot(doc(db, 'classes', classId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setClassData((prev: any) => ({ ...prev, id: snap.id, ...data }));
        const currentUrl = data.meetingUrl || data.googleMeetUrl || '';
        setMeetingUrl(currentUrl);
        
        if (data.status === 'Ended' && !isAdmin) {
          alert('The instructor has ended this live class session.');
          navigate('/live');
        }
      }
    }, (e) => console.warn("Class listener notice:", e));

    return () => {
      unsubHands();
      unsubClass();
      
      if (attendanceDocIdRef.current) {
        const docId = attendanceDocIdRef.current;
        const durationMins = Math.max(1, Math.round((Date.now() - joinTimeRef.current) / 60000));
        updateDoc(doc(db, 'attendance', docId), {
          leftAt: serverTimestamp(),
          durationMinutes: durationMins,
          durationSeconds: Math.round((Date.now() - joinTimeRef.current) / 1000),
          updatedAt: serverTimestamp()
        }).catch(e => console.warn("Failed to record leave time:", e));
      }
    };
  }, [classId, user?.uid, isAdmin, navigate]);

  const handleJoinGoogleMeet = async () => {
    if (!meetingUrl) {
      alert('No Google Meet URL has been set for this class by the instructor.');
      return;
    }

    let finalUrl = meetingUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    // Record attendance if not already recorded
    if (!attendanceDocIdRef.current && user && !isAdmin && classId) {
      try {
        const attRef = await addDoc(collection(db, 'attendance'), {
          studentId: user.uid,
          classId: classId,
          courseId: classData?.courseId || '',
          joinedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        attendanceDocIdRef.current = attRef.id;
        joinTimeRef.current = Date.now();
      } catch (attErr) {
        console.warn('Notice: Failed to record attendance start:', attErr);
      }
    }

    setJoinedMeet(true);
    navigate(`/live/${classId}/meeting`);
  };

  const handleCopyLink = () => {
    if (!meetingUrl) return;
    navigator.clipboard.writeText(meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveMeetingUrl = async () => {
    if (!classId || !isAdmin) return;
    setUpdatingUrl(true);
    try {
      let formatted = newUrlInput.trim();
      if (formatted && !formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = 'https://' + formatted;
      }

      await updateDoc(doc(db, 'classes', classId), {
        meetingUrl: formatted,
        googleMeetUrl: formatted,
        updatedAt: serverTimestamp(),
      });
      setMeetingUrl(formatted);
      setIsEditingUrl(false);
    } catch (err) {
      console.error("Error updating meeting URL:", err);
      alert("Failed to update Google Meet URL.");
    } finally {
      setUpdatingUrl(false);
    }
  };

  const handleToggleHand = async () => {
    if (!classId || !user) return;
    try {
      const handDocRef = doc(db, 'classes', classId, 'hands', user.uid);
      if (hasRaisedHand) {
        await deleteDoc(handDocRef);
      } else {
        await setDoc(handDocRef, {
          studentId: user.uid,
          studentName: profile?.displayName || user.displayName || 'Student',
          photoURL: profile?.photoURL || user.photoURL || '',
          raisedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Error toggling hand raise:", err);
    }
  };

  const lowerStudentHand = async (studentId: string) => {
    if (!classId) return;
    try {
      await deleteDoc(doc(db, 'classes', classId, 'hands', studentId));
    } catch (err) {
      console.error("Error lowering student hand:", err);
    }
  };

  const handleStartClassByAdmin = async () => {
    if (!classId) return;
    try {
      await updateDoc(doc(db, 'classes', classId), {
        status: 'Live',
        startedAt: serverTimestamp(),
      });
      handleJoinGoogleMeet();
    } catch (err) {
      console.error("Error starting class session:", err);
    }
  };

  const confirmEndClass = async () => {
    if (!classId) return;
    try {
      await updateDoc(doc(db, 'classes', classId), {
        status: 'Ended',
        endedAt: serverTimestamp(),
      });
      navigate('/admin/live');
    } catch (err) {
      console.error("Error ending class session:", err);
    }
  };

  const handleLeave = () => {
    navigate(isAdmin ? '/admin/live' : '/live');
  };

  // 1. Loading State
  if (stage !== 'ready' && stage !== 'error') {
    return (
      <div className="h-screen bg-[#090a0d] flex flex-col items-center justify-center text-white p-6 select-none">
        <div className="max-w-sm w-full space-y-7 text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto shadow-xl">
              <Video className="h-9 w-9 text-blue-500 animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-display font-bold uppercase tracking-wider text-neutral-100">
              Opening Live Class Hub...
            </h2>
            <div className="space-y-2 text-left bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
              <div className={`text-xs transition-opacity duration-300 ${stage === 'checking-auth' ? 'opacity-100 font-semibold text-blue-400' : 'opacity-50 text-neutral-400'} flex items-center gap-2.5`}>
                {stage === 'checking-auth' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                <span>Verifying credentials...</span>
              </div>
              <div className={`text-xs transition-opacity duration-300 ${stage === 'checking-enrollment' ? 'opacity-100 font-semibold text-blue-400' : (stage === 'checking-auth' ? 'opacity-30 text-neutral-600' : 'opacity-50 text-neutral-400')} flex items-center gap-2.5`}>
                {stage === 'checking-enrollment' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" /> : (stage === 'checking-auth' ? <span className="w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />)}
                <span>Checking course enrollment...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (stage === 'error' || error) {
    const isEnrollmentErr = error?.code === 'ENROLLMENT_REQUIRED';
    const isCancelledOrRescheduled = error?.code === 'CLASS_CANCELLED' || error?.code === 'CLASS_RESCHEDULED';

    return (
      <div className="h-screen bg-[#090a0d] flex items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full space-y-6">
          <div className="h-20 w-20 bg-neutral-900 border border-neutral-800 text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
            {isEnrollmentErr ? (
              <Lock className="h-9 w-9 text-amber-400" />
            ) : isCancelledOrRescheduled ? (
              <Calendar className="h-9 w-9 text-blue-400" />
            ) : (
              <AlertCircle className="h-9 w-9 text-red-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white uppercase tracking-tight">
              {error?.title || 'Unable to open classroom'}
            </h1>
            <div className="text-neutral-400 text-xs leading-relaxed max-w-sm mx-auto">
              {error?.message || 'Something went wrong while connecting to the live classroom.'}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <Button 
              onClick={() => initClassroom()} 
              className="flex-1 bg-white hover:bg-neutral-100 text-neutral-900 font-bold gap-2 h-11 uppercase text-xs"
            >
              <RotateCcw className="h-4 w-4" /> Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLeave} 
              className="flex-1 border-neutral-800 text-neutral-300 hover:bg-neutral-900 hover:text-white font-bold gap-2 h-11 uppercase text-xs"
            >
              <Home className="h-4 w-4" /> Return to Classes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Classroom / Google Meet Hub Screen
  const isLive = classData?.status === 'Live';

  return (
    <div className="h-screen flex flex-col bg-[#090a0d] text-white overflow-hidden font-sans select-none">
      {/* Top Header */}
      <header className="h-16 border-b border-neutral-800/80 flex items-center justify-between px-4 md:px-6 shrink-0 bg-[#0d0e12] z-30 select-none">
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <button 
            onClick={handleLeave} 
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all active:scale-95 shrink-0"
            title="Return to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div className="h-6 w-px bg-neutral-800 shrink-0 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase truncate">
                ANIVOX ACADEMY
              </span>
              <span className="text-neutral-600 hidden sm:inline">·</span>
              <span className="text-[10px] font-medium text-neutral-400 truncate max-w-[120px] sm:max-w-[200px] hidden sm:inline">
                {courseData?.title || 'Course'}
              </span>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0 ${
                isLive 
                  ? 'bg-red-500/15 border border-red-500/30 text-red-400' 
                  : 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
              }`}>
                {isLive && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                {classData?.status || 'SCHEDULED'}
              </div>
            </div>
            <h1 className="text-xs md:text-sm font-bold text-neutral-100 uppercase tracking-tight truncate max-w-[200px] sm:max-w-[340px] md:max-w-[480px]">
              {classData?.title || 'Live Classroom Session'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Main Join Google Meet action header button */}
          <Button
            size="sm"
            onClick={handleJoinGoogleMeet}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-4 uppercase tracking-wider shadow-md gap-2 rounded-xl"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Join Google Meet</span>
          </Button>

          {/* Raise Hand Toggle */}
          <button
            onClick={handleToggleHand}
            className={`h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all border shadow-sm ${
              hasRaisedHand 
                ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400' 
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
            }`}
            title={hasRaisedHand ? 'Lower Hand' : 'Raise Hand'}
          >
            <Hand className="h-4 w-4" />
            <span className="hidden md:inline text-[11px] uppercase tracking-wider font-bold">
              {hasRaisedHand ? 'Lower' : 'Raise Hand'}
            </span>
          </button>

          {/* Sidebar Toggles */}
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
            className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold border transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
            }`}
            title="Toggle Class Chat"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline text-[11px] uppercase tracking-wider">Chat</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'participants' ? null : 'participants')}
            className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold border transition-all ${
              activeTab === 'participants'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
            }`}
            title="Toggle Hands & Participants"
          >
            <Users className="h-4 w-4" />
            {raisedHands.length > 0 && (
              <span className="h-4 min-w-[16px] px-1 bg-amber-500 text-black rounded-full text-[9px] font-black flex items-center justify-center">
                {raisedHands.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <Button 
              size="sm" 
              onClick={() => setShowConfirmEnd(true)} 
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 px-3 uppercase tracking-wider shadow-sm rounded-xl"
            >
              End Session
            </Button>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Interactive Google Meet Hub Stage */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-[#090a0d] flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full bg-[#101116] border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Stage Title */}
            <div className="space-y-3 text-center sm:text-left relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-500" />
                  Official Live Classroom
                </span>

                {joinedMeet && (
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Google Meet Launched
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                {classData?.title}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl">
                {classData?.description || 'Join the live video classroom on Google Meet. Use the in-app chat panel on the right to participate in discussions and raise your hand for questions.'}
              </p>
            </div>

            {/* Primary Action Button Box */}
            <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl p-6 space-y-5 relative z-10">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Google Meet Classroom Link
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {meetingUrl ? 'Ready to connect' : 'Instructor has not provided a meeting link yet.'}
                  </p>
                </div>

                {isAdmin && (
                  <button 
                    onClick={() => setIsEditingUrl(!isEditingUrl)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 shrink-0 self-start sm:self-center"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{isEditingUrl ? 'Cancel Edit' : 'Edit Meeting Link'}</span>
                  </button>
                )}
              </div>

              {/* Admin URL Edit Form */}
              {isEditingUrl && isAdmin ? (
                <div className="space-y-3 pt-2">
                  <input
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={newUrlInput}
                    onChange={(e) => setNewUrlInput(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 text-white font-mono text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveMeetingUrl}
                    disabled={updatingUrl}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-2"
                  >
                    {updatingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save New Meeting Link
                  </Button>
                </div>
              ) : (
                /* Google Meet Display & Direct Launch */
                <div className="space-y-4">
                  {meetingUrl ? (
                    <div className="flex items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 p-3 rounded-xl">
                      <span className="text-xs font-mono text-blue-400 truncate flex-1">
                        {meetingUrl}
                      </span>
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                        title="Copy meeting link"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    {!isLive && isAdmin ? (
                      <Button
                        size="lg"
                        onClick={handleStartClassByAdmin}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold h-13 rounded-xl uppercase text-xs tracking-wider gap-2 shadow-lg shadow-red-950/40"
                      >
                        <Radio className="h-4 w-4 animate-pulse" />
                        <span>Start Class & Launch Meet</span>
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={handleJoinGoogleMeet}
                        disabled={!meetingUrl}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold h-13 rounded-xl uppercase text-xs tracking-wider gap-2 shadow-lg shadow-blue-950/40"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Join Google Meet Classroom</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Helpful Session Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
                <Calendar className="h-4 w-4 text-blue-400 shrink-0" />
                <div>
                  <p className="font-semibold text-neutral-200">Scheduled Time</p>
                  <p className="text-[11px] text-neutral-400">
                    {classData?.startTime?.toDate 
                      ? new Date(classData.startTime.toDate()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Scheduled Session'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
                <Clock className="h-4 w-4 text-purple-400 shrink-0" />
                <div>
                  <p className="font-semibold text-neutral-200">Session Duration</p>
                  <p className="text-[11px] text-neutral-400">{classData?.duration || 60} Minutes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Drawer (Classroom Chat / Participants) */}
        {activeTab && (
          <aside className="w-full md:w-80 lg:w-96 border-l border-neutral-800/80 bg-[#101115] flex flex-col shrink-0 z-20 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="h-14 border-b border-neutral-800/80 flex items-center px-5 shrink-0 justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
                {activeTab === 'chat' ? 'Classroom Chat' : activeTab === 'participants' ? 'Hands & Attendees' : 'Session Info'}
              </h2>
              <button 
                onClick={() => setActiveTab(null)} 
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Close Panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {activeTab === 'chat' ? (
                <ClassroomChat 
                  classId={classData.id} 
                  courseId={classData.courseId} 
                  isAdmin={isAdmin}
                  chatEnabled={classData?.chatEnabled !== false}
                />
              ) : activeTab === 'participants' ? (
                <ClassroomParticipants 
                  isAdmin={isAdmin} 
                  raisedHands={raisedHands} 
                  onLowerHand={lowerStudentHand} 
                />
              ) : (
                <div className="p-5 space-y-4 text-xs text-neutral-300">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Class Details</span>
                    <h3 className="font-bold text-sm text-white uppercase">{classData?.title}</h3>
                    <p className="text-neutral-400">{courseData?.title}</p>
                  </div>
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
                    <p className="text-neutral-300 leading-relaxed">{classData?.description || 'Live interactive session.'}</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Confirmation Modals */}
      {showConfirmEnd && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight">End Live Class Session?</h3>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                This will mark the session as concluded for all students.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmEnd(false)} 
                className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setShowConfirmEnd(false);
                  confirmEndClass();
                }} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                End Class
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
