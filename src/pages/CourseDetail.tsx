import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Users, 
  Star, 
  ArrowLeft, 
  Loader2, 
  Play, 
  Sparkles, 
  BookOpen, 
  Lock,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userEntitlement, setUserEntitlement] = useState<any>(null);

  useEffect(() => {
    if (!courseId) return;
    
    // Real-time listener for course document
    const unsubCourse = onSnapshot(doc(db, 'courses', courseId), (docSnap) => {
      if (docSnap.exists()) {
        setCourse({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    }, (error) => {
      console.warn("Error listening to course detail:", error);
      setLoading(false);
    });

    return () => unsubCourse();
  }, [courseId]);

  useEffect(() => {
    if (!user || !courseId) {
      setUserEntitlement(null);
      return;
    }

    const checkEntitlement = async () => {
      try {
        const accessId = `${user.uid}_${courseId}`;
        const accessDoc = await getDoc(doc(db, 'userCourseAccess', accessId));
        if (accessDoc.exists() && accessDoc.data().status === 'ACTIVE') {
          setUserEntitlement(accessDoc.data());
        } else {
          setUserEntitlement(null);
        }
      } catch (e) {
        console.error("Error checking user entitlement:", e);
      }
    };

    checkEntitlement();
  }, [user, courseId]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-14 w-14 rounded-3xl bg-neutral-100 flex items-center justify-center text-neutral-400">
          <BookOpen className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-display font-bold text-neutral-900">Course Not Found</h1>
        <p className="text-xs text-neutral-500 max-w-sm">The course you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate('/courses')} className="rounded-xl font-bold">
          Back to Course Catalog
        </Button>
      </div>
    );
  }

  const curriculumLessons = course.lessons && course.lessons.length > 0 
    ? course.lessons 
    : [
        { title: 'Welcome & Creative Orientation', duration: '15 mins', isPreview: true },
        { title: 'Foundations & Tool Mastery', duration: '45 mins', isPreview: false },
        { title: 'Live Project Demonstration', duration: '60 mins', isPreview: false },
        { title: 'Industry Portfolio Review & Export', duration: '30 mins', isPreview: false }
      ];

  return (
    <div className="space-y-8 pb-20">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/courses')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/80 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Courses
        </button>

        <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider">
          {course.category || 'Creative Masterclass'}
        </span>
      </div>

      {/* Hero Card */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                FEATURED PROGRAM
              </span>
              <span className="text-xs text-neutral-400">·</span>
              <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                {course.duration || 'Comprehensive Track'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-neutral-900 leading-tight">
              {course.title}
            </h1>

            <p className="text-sm text-neutral-600 leading-relaxed max-w-2xl">
              {course.shortDescription || course.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                  {course.instructor ? course.instructor.charAt(0) : 'G'}
                </div>
                <span className="font-semibold text-neutral-800">{course.instructor || 'G. Chandu (Lead Instructor)'}</span>
              </div>
              <span>·</span>
              <span className="font-semibold text-neutral-500">Live Interactive Mentorship</span>
            </div>
          </div>

          {/* Hero Thumbnail / Preview Area */}
          <div className="lg:col-span-5">
            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-100 relative shadow-sm">
              {course.bannerUrl || course.banner || course.thumbnailUrl || course.thumbnail ? (
                <img 
                  src={course.bannerUrl || course.banner || course.thumbnailUrl || course.thumbnail} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                  <BookOpen className="h-12 w-12" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Checkout Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-lg font-display font-bold text-neutral-900">About This Masterclass</h2>
            <div className="text-xs sm:text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
              {course.description}
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-neutral-900">Course Content & Modules</h2>
                <p className="text-xs text-neutral-500">Curriculum designed for career-ready skills.</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                {curriculumLessons.length} Modules
              </span>
            </div>

            <div className="space-y-3">
              {curriculumLessons.map((lesson: any, idx: number) => {
                const lessonNum = String(idx + 1).padStart(2, '0');
                return (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl bg-[#FAF8FA] border border-neutral-100 flex items-center justify-between hover:bg-purple-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {lessonNum}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
                          {lesson.title}
                        </h4>
                        <span className="text-[11px] text-neutral-400 font-medium">
                          {lesson.duration || '30 mins'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {lesson.isPreview || userEntitlement ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          <Play className="h-3 w-3 fill-emerald-600 text-emerald-600" /> Access
                        </span>
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {course.learningOutcomes && course.learningOutcomes.length > 0 && (
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-display font-bold text-neutral-900">What You Will Learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {course.learningOutcomes.map((outcome: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FAF8FA]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs text-neutral-700 font-medium">{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pricing & Enrollment or Complimentary Access Card */}
        <div className="space-y-6">
          <div className="sticky top-24 bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {userEntitlement ? (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                    <Award className="h-4 w-4 text-emerald-600" /> Complimentary Access Granted
                  </div>
                  <p className="text-xs text-emerald-700">
                    You have been granted {userEntitlement.accessType.toLowerCase()} access to this masterclass by academy administration.
                  </p>
                </div>

                <Button 
                  onClick={() => navigate(`/classroom/${course.id}`)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-2xl text-xs uppercase tracking-wider shadow-sm gap-2"
                >
                  <Play className="h-4 w-4 fill-white" /> Enter Classroom & Learning
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Enrollment Options
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-bold text-neutral-900">₹{course.price}</span>
                    <span className="text-xs text-neutral-400 font-medium">One-time tuition</span>
                  </div>
                </div>

                {course.advancePrice > 0 && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-100 text-xs space-y-1.5">
                    <div className="flex justify-between font-semibold text-purple-900">
                      <span>Advance Booking:</span>
                      <span>₹{course.advancePrice}</span>
                    </div>
                    <div className="flex justify-between text-neutral-500 text-[11px]">
                      <span>Balance before class:</span>
                      <span className="font-bold text-neutral-800">₹{Math.max(0, (course.price || 0) - course.advancePrice)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  <Button 
                    onClick={() => navigate(`/checkout/${course.id}`)}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold h-12 rounded-2xl text-xs uppercase tracking-wider shadow-sm"
                  >
                    Enroll Now · Full Payment (₹{course.price})
                  </Button>

                  {course.advancePrice > 0 && (
                    <Button 
                      onClick={() => navigate(`/checkout/${course.id}?type=advance`)}
                      variant="outline"
                      className="w-full border-neutral-200 hover:bg-neutral-50 text-neutral-800 font-bold h-11 rounded-2xl text-xs"
                    >
                      Pay Advance Only (₹{course.advancePrice})
                    </Button>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-100 space-y-2 text-[11px] text-neutral-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Instant UPI payment verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Live classroom & recording access</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
