import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Video, 
  Radio, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Bell, 
  CreditCard,
  Layers,
  ChevronRight,
  User,
  Search,
  Award,
  Play,
  Flame,
  Target
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export function StudentHome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [exploreCourses, setExploreCourses] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const studentName = profile?.displayName || user?.displayName || 'Creative Learner';
  const firstName = studentName.split(' ')[0];

  useEffect(() => {
    if (!user) return;

    // 1. Real-time listener for Student's Enrollments & Payments
    const enrQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
    const payQuery = query(collection(db, 'payments'), where('studentId', '==', user.uid));

    let enrDocs: any[] = [];
    let payDocs: any[] = [];

    const updateStudentEnrolledCourses = async () => {
      const paymentsByCourse: Record<string, any[]> = {};
      payDocs.forEach(d => {
        const data = d.data();
        if (!paymentsByCourse[data.courseId]) paymentsByCourse[data.courseId] = [];
        paymentsByCourse[data.courseId].push({ id: d.id, ...data });
      });

      const courseIdSet = new Set<string>();
      enrDocs.forEach(d => courseIdSet.add(d.data().courseId));
      Object.keys(paymentsByCourse).forEach(cid => courseIdSet.add(cid));

      const list: any[] = [];
      for (const cid of courseIdSet) {
        try {
          const cSnap = await getDoc(doc(db, 'courses', cid));
          if (!cSnap.exists()) continue;
          const courseData = { id: cSnap.id, ...cSnap.data() as any };

          const matchingEnr = enrDocs.find(d => d.data().courseId === cid)?.data();
          const coursePayments = paymentsByCourse[cid] || [];

          const isApproved = matchingEnr?.status === 'approved';
          const paymentStatus = matchingEnr?.paymentStatus || (coursePayments.length > 0 ? coursePayments[0].status : 'Pending Verification');

          list.push({
            ...courseData,
            enrollmentStatus: matchingEnr?.status || 'pending',
            paymentStatus,
            isApproved,
            progress: matchingEnr?.progress || (isApproved ? 35 : 0),
          });
        } catch (e) {
          console.warn("Notice loading course:", e);
        }
      }

      setEnrolledCourses(list);
    };

    const unsubEnr = onSnapshot(enrQuery, (snap) => {
      enrDocs = snap.docs;
      updateStudentEnrolledCourses();
    });

    const unsubPay = onSnapshot(payQuery, (snap) => {
      payDocs = snap.docs;
      updateStudentEnrolledCourses();
    });

    // 2. Real-time listener for Live Classes
    const classQuery = query(
      collection(db, 'classes'),
      where('status', 'in', ['Live', 'Scheduled']),
      orderBy('startTime', 'asc'),
      limit(5)
    );

    const unsubClasses = onSnapshot(classQuery, async (snap) => {
      const classesList = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let courseTitle = 'Anivox Academy';
        try {
          const cSnap = await getDoc(doc(db, 'courses', data.courseId));
          if (cSnap.exists()) courseTitle = cSnap.data().title;
        } catch (e) {
          // ignore
        }
        return {
          id: d.id,
          ...data,
          courseTitle
        };
      }));
      setLiveClasses(classesList);
    });

    // 3. Real-time listener for Explore Courses (Published courses)
    const exploreQuery = query(
      collection(db, 'courses'),
      where('status', '==', 'Published'),
      limit(4)
    );

    const unsubExplore = onSnapshot(exploreQuery, (snap) => {
      setExploreCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // 4. Real-time listener for Recent Notifications
    const notifQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubNotif = onSnapshot(notifQuery, (snap) => {
      setRecentNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubEnr();
      unsubPay();
      unsubClasses();
      unsubExplore();
      unsubNotif();
    };
  }, [user]);

  const activeLiveClass = liveClasses.find(c => c.status === 'Live');
  const nextScheduledClass = liveClasses.find(c => c.status === 'Scheduled');

  // Course card pastel theme variations inspired by reference
  const pastelColors = [
    { bg: 'bg-[#F4F0FF]', border: 'border-[#E9E1FF]', accent: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
    { bg: 'bg-[#F0F7FF]', border: 'border-[#DBEAFE]', accent: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
    { bg: 'bg-[#FFF7ED]', border: 'border-[#FFEDD5]', accent: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
    { bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', accent: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/courses');
    }
  };

  // Calculate overall goal completion
  const completedCount = enrolledCourses.filter(c => c.progress >= 100).length;
  const overallProgress = enrolledCourses.length > 0 
    ? Math.round(enrolledCourses.reduce((acc, c) => acc + (c.progress || 0), 0) / enrolledCourses.length)
    : 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Section with Greeting & Reference-styled Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-purple-600" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Personal Learning Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900">
            Your Personal Learning
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Based on your enrolled masterclasses and upcoming live studio schedule.
          </p>
        </div>

        {/* Large Rounded Search Bar (Reference Style) */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a course, lesson..."
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white border border-neutral-200 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-sm transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-colors shadow-sm"
          >
            GO
          </button>
        </form>
      </div>

      {/* Hero Spotlight: Active Live Class OR Next Scheduled Session */}
      {activeLiveClass ? (
        <div className="p-6 md:p-8 rounded-3xl bg-neutral-950 text-white shadow-xl border border-red-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                <Radio className="h-4 w-4 text-red-500" />
                <span>Live Interactive Classroom In Session</span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-white">
                {activeLiveClass.title}
              </h2>
              <p className="text-xs text-neutral-400">
                Course: <span className="text-neutral-200 font-semibold">{activeLiveClass.courseTitle}</span> · Teacher Broadcasting with audio, video & screen share.
              </p>
            </div>

            <Button 
              onClick={() => navigate(`/live/${activeLiveClass.id}`)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-12 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-950/50 gap-2 shrink-0"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              <span>Join Live Class Now</span>
            </Button>
          </div>
        </div>
      ) : nextScheduledClass ? (
        <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                <span>Next Scheduled Class</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                {nextScheduledClass.title}
              </h3>
              <p className="text-xs text-neutral-500">
                {nextScheduledClass.courseTitle} · {nextScheduledClass.startTime?.toDate 
                  ? new Date(nextScheduledClass.startTime.toDate()).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Starting soon'}
              </p>
            </div>
          </div>

          <Button 
            onClick={() => navigate(`/live/${nextScheduledClass.id}`)}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold h-10 px-5 rounded-2xl shrink-0"
          >
            Classroom Details
          </Button>
        </div>
      ) : null}

      {/* Reference-Inspired 3-Card Grid (Learning Goal, Spotlight Course, Stat Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Goals Status (Reference: Soft Lavender Card) */}
        <div className="bg-[#F5F2FF] border border-[#E9E1FF] rounded-3xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Target className="h-4 w-4" />
              </div>
              <Link 
                to="/my-courses"
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 uppercase tracking-wider"
              >
                Manage Goals
              </Link>
            </div>

            <h3 className="text-sm font-semibold text-neutral-600">
              Learning Progress
            </h3>
            <h4 className="text-2xl font-display font-bold text-neutral-900 mt-0.5">
              {overallProgress}%
            </h4>
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2 w-full bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(overallProgress, 8)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 font-medium">
              <span>{enrolledCourses.length} Enrolled</span>
              <span>{completedCount} Completed</span>
            </div>
          </div>
        </div>

        {/* Card 2 & 3: Featured Course Highlight (Spans 2 columns on lg, reference-style) */}
        {exploreCourses.length > 0 && (
          <div className="lg:col-span-2 bg-[#F0F7FF] border border-[#DBEAFE] rounded-3xl p-5 flex flex-col sm:flex-row gap-5 justify-between shadow-sm group">
            <div className="w-full sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden bg-white shrink-0 relative shadow-xs">
              {exploreCourses[0].thumbnailUrl || exploreCourses[0].thumbnail || exploreCourses[0].bannerUrl || exploreCourses[0].banner ? (
                <img 
                  src={exploreCourses[0].thumbnailUrl || exploreCourses[0].thumbnail || exploreCourses[0].bannerUrl || exploreCourses[0].banner} 
                  alt={exploreCourses[0].title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                  <BookOpen className="h-8 w-8" />
                </div>
              )}
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider">
                Featured
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  {exploreCourses[0].category || 'Masterclass'}
                </span>
                <h3 className="text-base font-bold text-neutral-900 line-clamp-1 mt-0.5">
                  {exploreCourses[0].title}
                </h3>
                <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                  {exploreCourses[0].shortDescription || exploreCourses[0].description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-blue-200/60">
                <span className="text-sm font-display font-bold text-neutral-900">
                  ₹{exploreCourses[0].price}
                </span>
                <Button
                  onClick={() => navigate(`/courses/${exploreCourses[0].id}`)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-8 px-3.5"
                >
                  Enroll Today
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Quick Stat Numbers (Reference: "19 New Courses", "14 New Trials") */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-3xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-2xl font-display font-bold text-amber-900">
              {enrolledCourses.length}
            </span>
            <span className="text-[11px] font-bold text-amber-700 leading-tight">
              My Courses
            </span>
          </div>

          <div className="bg-[#FFF1F2] border border-[#FFE4E6] rounded-3xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-2xl font-display font-bold text-rose-900">
              {liveClasses.length}
            </span>
            <span className="text-[11px] font-bold text-rose-700 leading-tight">
              Live Sessions
            </span>
          </div>
        </div>
      </div>

      {/* Main Sections: My Enrolled Courses & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Left 2 Cols: My Active Courses */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-bold text-neutral-900">Continue Learning</h2>
              <p className="text-xs text-neutral-500">Pick up where you left off in your enrolled courses.</p>
            </div>
            <Link 
              to="/my-courses" 
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 uppercase tracking-wider"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 bg-white rounded-3xl border border-neutral-200/80 flex flex-col items-center justify-center gap-2 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="text-xs text-neutral-400 font-medium">Loading your enrolled masterclasses...</span>
            </div>
          ) : enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enrolledCourses.map((course, idx) => {
                const colorTheme = pastelColors[idx % pastelColors.length];
                return (
                  <div 
                    key={course.id}
                    onClick={() => navigate('/my-courses')}
                    className={`p-5 rounded-3xl ${colorTheme.bg} border ${colorTheme.border} shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group`}
                  >
                    <div className="space-y-3">
                      <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-white relative shadow-xs">
                        {course.thumbnailUrl || course.thumbnail || course.bannerUrl || course.banner ? (
                          <img 
                            src={course.thumbnailUrl || course.thumbnail || course.bannerUrl || course.banner} 
                            alt={course.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <BookOpen className="h-8 w-8" />
                          </div>
                        )}
                        <span className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          course.isApproved 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-amber-500 text-white'
                        }`}>
                          {course.isApproved ? 'Enrolled' : 'Pending Verification'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          {course.category || 'Creative Track'}
                        </span>
                        <h4 className="font-bold text-sm text-neutral-900 line-clamp-1 group-hover:text-neutral-700">
                          {course.title}
                        </h4>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2 pt-2 border-t border-black/5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600">
                        <span>Progress</span>
                        <span>{course.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/80 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neutral-900 rounded-full"
                          style={{ width: `${course.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-3xl border border-dashed border-neutral-200 text-center space-y-3 shadow-sm">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-neutral-900">No Enrolled Courses Yet</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Explore our hands-on curriculum in Animation, Photoshop, 3D, and VFX.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/courses')}
                className="bg-neutral-900 text-white text-xs font-bold px-5 h-9 rounded-xl"
              >
                Browse Catalog
              </Button>
            </div>
          )}
        </div>

        {/* Right Col: Announcements & Shortcuts */}
        <div className="space-y-6">
          {/* Announcements Card */}
          <div className="bg-white rounded-3xl p-5 border border-neutral-200/70 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-600" />
                <span>Announcements</span>
              </h3>
              <Link to="/notifications" className="text-[11px] font-bold text-neutral-400 hover:text-neutral-900 uppercase">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => navigate('/notifications')}
                    className="p-3 rounded-2xl bg-[#FAF8FA] hover:bg-purple-50/50 border border-neutral-100 transition-colors cursor-pointer text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 truncate pr-2">{n.title}</span>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-neutral-400 space-y-1">
                  <p>No new announcements.</p>
                  <p className="text-[10px]">Updates from Anivox will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Hub Shortcuts */}
          <div className="bg-white rounded-3xl p-5 border border-neutral-200/70 shadow-sm space-y-3">
            <h3 className="font-bold text-xs text-neutral-400 uppercase tracking-wider">
              Quick Shortcuts
            </h3>
            
            <div className="space-y-1.5">
              <Link 
                to="/live" 
                className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FA] hover:bg-purple-50/70 transition-colors text-xs font-semibold text-neutral-800"
              >
                <div className="flex items-center gap-2.5">
                  <Video className="h-4 w-4 text-purple-600" />
                  <span>Live Studio Schedule</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>

              <Link 
                to="/payments" 
                className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FA] hover:bg-purple-50/70 transition-colors text-xs font-semibold text-neutral-800"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span>Payments & Receipts</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>

              <Link 
                to="/portfolio" 
                className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FA] hover:bg-purple-50/70 transition-colors text-xs font-semibold text-neutral-800"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>Student Portfolio Showcase</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Explore More Courses Catalog Section */}
      <div className="pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-neutral-900">Explore Recommended Courses</h2>
            <p className="text-xs text-neutral-500">Master professional 2D/3D animation, concept art, and visual effects.</p>
          </div>
          <Link 
            to="/courses" 
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 uppercase tracking-wider"
          >
            <span>View Full Catalog</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {exploreCourses.map((course, idx) => {
            const colorTheme = pastelColors[idx % pastelColors.length];
            return (
              <div 
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="bg-white border border-neutral-200/70 hover:border-neutral-900 transition-all rounded-3xl overflow-hidden cursor-pointer flex flex-col justify-between group shadow-sm"
              >
                <div className="aspect-[16/10] overflow-hidden bg-neutral-100 relative">
                  {course.thumbnail ? (
                    <img 
                      src={course.thumbnail} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                  <span className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${colorTheme.badge}`}>
                    {course.category || 'Track'}
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900 line-clamp-1 group-hover:text-purple-700 transition-colors">
                      {course.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1">
                      {course.shortDescription || course.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                    <span className="font-display font-bold text-neutral-900">₹{course.price}</span>
                    <span className="text-[11px] font-bold text-purple-700 group-hover:underline flex items-center gap-1">
                      Details <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
