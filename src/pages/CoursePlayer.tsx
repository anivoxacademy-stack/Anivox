import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Lock, 
  BookOpen, 
  Clock, 
  Loader2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MuxPlayer } from '../components/common/MuxPlayer';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxStatus?: string;
  duration?: string;
  isFreePreview?: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export function CoursePlayer() {
  const { courseId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = React.useState<any>(null);
  const [modules, setModules] = React.useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = React.useState<Lesson | null>(null);
  const [isEnrolled, setIsEnrolled] = React.useState(false);
  const [completedLessonIds, setCompletedLessonIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCourseAndEnrollment = async () => {
      if (!courseId) return;
      setLoading(true);
      try {
        // 1. Fetch Course
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) {
          setLoading(false);
          return;
        }
        const cData = { id: courseDoc.id, ...courseDoc.data() };
        setCourse(cData);

        const mods: Module[] = (cData as any).modules || [];
        setModules(mods);

        // Select first lesson
        if (mods.length > 0 && mods[0].lessons?.length > 0) {
          setActiveLesson(mods[0].lessons[0]);
        }

        // 2. Check Enrollment if user logged in
        if (user) {
          if (isAdmin) {
            setIsEnrolled(true);
          } else {
            try {
              const enrQuery = query(
                collection(db, 'enrollments'),
                where('studentId', '==', user.uid),
                where('courseId', '==', courseId),
                where('status', '==', 'approved')
              );
              const enrSnap = await getDocs(enrQuery);
              setIsEnrolled(!enrSnap.empty);
            } catch (enrErr) {
              console.warn('Could not verify enrollment status:', enrErr);
            }
          }

          // 3. Fetch Student Progress
          try {
            const progDoc = await getDoc(doc(db, `users/${user.uid}/progress`, courseId));
            if (progDoc.exists()) {
              setCompletedLessonIds(progDoc.data().completedLessons || []);
            }
          } catch (progErr) {
            console.warn('Could not load course progress:', progErr);
          }
        }
      } catch (err) {
        console.error('Error loading course player:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndEnrollment();
  }, [courseId, user, isAdmin]);

  const toggleLessonComplete = async (lessonId: string) => {
    if (!user || !courseId) return;
    const isCompleted = completedLessonIds.includes(lessonId);
    const updated = isCompleted
      ? completedLessonIds.filter(id => id !== lessonId)
      : [...completedLessonIds, lessonId];

    setCompletedLessonIds(updated);

    try {
      await setDoc(doc(db, `users/${user.uid}/progress`, courseId), {
        courseId,
        studentId: user.uid,
        completedLessons: updated,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch')) {
        const v = new URL(url).searchParams.get('v');
        return `https://www.youtube-nocookie.com/embed/${v}?autoplay=0&rel=0`;
      }
      if (url.includes('youtu.be/')) {
        const v = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube-nocookie.com/embed/${v}?autoplay=0&rel=0`;
      }
      if (url.includes('vimeo.com/')) {
        const v = url.split('vimeo.com/')[1]?.split('?')[0];
        return `https://player.vimeo.com/video/${v}`;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-xs uppercase tracking-widest text-neutral-400">Loading Course Classroom...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
        <p className="text-neutral-500 mb-6">This course is not available or has been removed.</p>
        <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
      </div>
    );
  }

  const isCurrentLessonLocked = !isEnrolled && !activeLesson?.isFreePreview;
  const embedUrl = getEmbedUrl(activeLesson?.videoUrl);
  const isDirectVideo = embedUrl && (embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm'));

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/my-courses" className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium">
            <ArrowLeft className="h-4 w-4" /> My Learning
          </Link>
          <div className="h-4 w-px bg-white/10"></div>
          <h1 className="font-bold text-sm tracking-wide truncate max-w-md">{course.title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {!isEnrolled && (
            <Link to={`/checkout/${course.id}`}>
              <Button size="sm" className="bg-brand-600 hover:bg-brand-700">
                Enroll Now
              </Button>
            </Link>
          )}
          <span className="text-xs text-neutral-400">
            {completedLessonIds.length} completed
          </span>
        </div>
      </header>

      {/* Main Classroom Grid */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Video & Lesson Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
          {/* Video Player Box */}
          <div className="aspect-video w-full max-w-5xl mx-auto bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex items-center justify-center">
            {isCurrentLessonLocked ? (
              <div className="text-center p-8 max-w-md">
                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                  <Lock className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold mb-2">Lesson Locked</h3>
                <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                  This lesson is part of the full curriculum. Complete your course enrollment to access all modules and live workshops.
                </p>
                <Button onClick={() => navigate(`/checkout/${course.id}`)}>
                  Unlock Full Course Access
                </Button>
              </div>
            ) : activeLesson?.muxPlaybackId || embedUrl ? (
              <MuxPlayer
                playbackId={activeLesson?.muxPlaybackId}
                videoUrl={embedUrl || undefined}
                title={activeLesson?.title}
              />
            ) : (
              <div className="text-center p-8 text-neutral-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No video uploaded for this lesson yet.</p>
              </div>
            )}
          </div>

          {/* Lesson Details */}
          {activeLesson && (
            <div className="max-w-5xl mx-auto w-full mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-semibold border border-brand-500/30">
                      Lesson
                    </span>
                    {activeLesson.duration && (
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {activeLesson.duration}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
                </div>

                {!isCurrentLessonLocked && (
                  <Button
                    variant={completedLessonIds.includes(activeLesson.id) ? 'outline' : 'primary'}
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => toggleLessonComplete(activeLesson.id)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {completedLessonIds.includes(activeLesson.id) ? 'Mark Incomplete' : 'Mark as Completed'}
                  </Button>
                )}
              </div>

              {activeLesson.description && (
                <div className="mt-6 text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {activeLesson.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Syllabus / Module Sidebar */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/10 bg-neutral-900/60 overflow-y-auto shrink-0 flex flex-col">
          <div className="p-4 border-b border-white/10 bg-neutral-900/90">
            <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-300">Course Syllabus</h3>
          </div>

          <div className="flex-1 p-4 space-y-6">
            {modules.length > 0 ? (
              modules.map((mod, mIdx) => (
                <div key={mod.id || mIdx} className="space-y-2">
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-2">
                    {mod.title || `Module ${mIdx + 1}`}
                  </div>
                  <div className="space-y-1">
                    {mod.lessons?.map((lesson, lIdx) => {
                      const isActive = activeLesson?.id === lesson.id;
                      const isDone = completedLessonIds.includes(lesson.id);
                      const isLocked = !isEnrolled && !lesson.isFreePreview;

                      return (
                        <button
                          key={lesson.id || lIdx}
                          onClick={() => setActiveLesson(lesson)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs transition-all ${
                            isActive
                              ? 'bg-brand-600 text-white font-medium shadow-md'
                              : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="shrink-0">
                            {isDone ? (
                              <CheckCircle className={`h-4 w-4 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                            ) : isLocked ? (
                              <Lock className="h-3.5 w-3.5 text-neutral-500" />
                            ) : (
                              <Play className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                            )}
                          </div>
                          <div className="flex-1 truncate">
                            <span className="truncate">{lesson.title}</span>
                          </div>
                          {lesson.isFreePreview && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Preview
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-neutral-500 text-xs">
                No syllabus modules published for this course yet.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
