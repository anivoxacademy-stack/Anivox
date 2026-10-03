import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Loader2, 
  BookOpen, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  CreditCard,
  Video,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

export function MyCourses() {
  const { user } = useAuth();
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'enrolled' | 'pending'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setCoursesList([]);
      setLoading(false);
      return;
    }

    const fetchStudentCourses = async () => {
      try {
        const enrQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
        const enrSnap = await getDocs(enrQuery);

        const payQuery = query(collection(db, 'payments'), where('studentId', '==', user.uid));
        const paySnap = await getDocs(payQuery);

        const accessQuery = query(collection(db, 'userCourseAccess'), where('userId', '==', user.uid), where('status', '==', 'ACTIVE'));
        const accessSnap = await getDocs(accessQuery);

        const paymentsByCourse: Record<string, any[]> = {};
        paySnap.docs.forEach(d => {
          const data = d.data();
          if (!paymentsByCourse[data.courseId]) paymentsByCourse[data.courseId] = [];
          paymentsByCourse[data.courseId].push({ id: d.id, ...data });
        });

        const courseIdSet = new Set<string>();
        enrSnap.docs.forEach(d => courseIdSet.add(d.data().courseId));
        Object.keys(paymentsByCourse).forEach(cid => courseIdSet.add(cid));
        accessSnap.docs.forEach(d => courseIdSet.add(d.data().courseId));

        const list: any[] = [];
        for (const cid of courseIdSet) {
          try {
            const cSnap = await getDoc(doc(db, 'courses', cid));
            if (!cSnap.exists()) continue;
            const courseData = { id: cSnap.id, ...cSnap.data() as any };

            const matchingEnr = enrSnap.docs.find(d => d.data().courseId === cid)?.data();
            const matchingAccess = accessSnap.docs.find(d => d.data().courseId === cid)?.data();
            const coursePayments = paymentsByCourse[cid] || [];

            const approvedAmountPaid = coursePayments
              .filter(p => (p.status || '').toLowerCase() === 'approved')
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            const latestPayment = coursePayments.length > 0
              ? coursePayments.sort((a, b) => (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0))[0]
              : null;

            const enrollmentStatus = matchingAccess ? 'approved' : (matchingEnr?.status || 'pending');
            const paymentStatus = matchingAccess ? `Complimentary Access (${matchingAccess.accessType})` : (latestPayment ? latestPayment.status : (approvedAmountPaid > 0 ? 'Approved' : 'Pending Verification'));
            const isEnrolled = Boolean(matchingAccess) || enrollmentStatus === 'approved';
            const remainingAmount = Math.max(0, (courseData.price || 0) - approvedAmountPaid);

            let nextClass = null;
            try {
              const classQuery = query(
                collection(db, 'classes'),
                where('courseId', '==', cid),
                where('status', 'in', ['Scheduled', 'Live'])
              );
              const classSnap = await getDocs(classQuery);
              if (!classSnap.empty) {
                nextClass = { id: classSnap.docs[0].id, ...classSnap.docs[0].data() as any };
              }
            } catch (ce) {
              // ignore
            }

            list.push({
              course: courseData,
              enrollmentStatus,
              paymentStatus,
              isEnrolled,
              amountPaid: approvedAmountPaid,
              remainingAmount,
              progress: matchingEnr?.progress || (isEnrolled ? 40 : 0),
              latestPayment,
              nextClass,
            });
          } catch (e) {
            console.error("Error fetching course detail for student:", e);
          }
        }

        setCoursesList(list);
      } catch (error) {
        console.error("Error fetching my courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentCourses();

    const unsubEnr = onSnapshot(
      query(collection(db, 'enrollments'), where('studentId', '==', user.uid)),
      () => { fetchStudentCourses(); },
      (e) => { console.warn("Notice listening to student enrollments:", e); }
    );

    const unsubPay = onSnapshot(
      query(collection(db, 'payments'), where('studentId', '==', user.uid)),
      () => { fetchStudentCourses(); },
      (e) => { console.warn("Notice listening to student payments:", e); }
    );

    return () => {
      unsubEnr();
      unsubPay();
    };
  }, [user]);

  const filteredList = coursesList.filter(item => {
    if (filterTab === 'enrolled') return item.isEnrolled;
    if (filterTab === 'pending') return !item.isEnrolled;
    return true;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header with Title & Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-purple-600" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Student Workspace
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-neutral-900">
            My Enrolled Courses
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Access your active modules, live studio schedules, and creative project files.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-full border border-neutral-200 shadow-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
              filterTab === 'all'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({coursesList.length})
          </button>
          <button
            onClick={() => setFilterTab('enrolled')}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
              filterTab === 'enrolled'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Enrolled ({coursesList.filter(c => c.isEnrolled).length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
              filterTab === 'pending'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Pending ({coursesList.filter(c => !c.isEnrolled).length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 bg-white rounded-3xl border border-neutral-200/80 flex flex-col items-center justify-center gap-3 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-xs text-neutral-400 font-medium">Loading your course files...</p>
        </div>
      ) : filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map(({ course, enrollmentStatus, paymentStatus, isEnrolled, amountPaid, remainingAmount, progress, latestPayment, nextClass }) => {
            const isPaymentPending = (paymentStatus || '').toLowerCase().includes('pending');
            const isRejected = (paymentStatus || '').toLowerCase() === 'rejected' || enrollmentStatus === 'rejected';

            return (
              <div 
                key={course.id} 
                className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Thumbnail */}
                <div className="aspect-[16/10] relative overflow-hidden bg-neutral-100">
                  {course.thumbnailUrl || course.thumbnail || course.bannerUrl || course.banner ? (
                    <img 
                      src={course.thumbnailUrl || course.thumbnail || course.bannerUrl || course.banner} 
                      alt={course.title}
                      className="h-full w-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-neutral-300">
                      <BookOpen className="h-10 w-10" />
                    </div>
                  )}

                  {/* Status Pill Badge */}
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                    isEnrolled 
                      ? 'bg-emerald-600 text-white' 
                      : isPaymentPending
                      ? 'bg-amber-500 text-white'
                      : isRejected
                      ? 'bg-rose-600 text-white'
                      : 'bg-neutral-800 text-white'
                  }`}>
                    {isEnrolled ? 'Enrolled & Verified' : isPaymentPending ? 'Pending Verification' : isRejected ? 'Rejected' : enrollmentStatus}
                  </span>
                </div>

                {/* Content Details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                      {course.category || 'Creative Masterclass'}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 line-clamp-1">
                      {course.title}
                    </h3>

                    {/* Financial details pill */}
                    <div className="mt-3 p-3 rounded-2xl bg-[#FAF8FA] border border-neutral-100 space-y-1 text-xs">
                      <div className="flex justify-between text-neutral-600">
                        <span>Paid Tuition:</span>
                        <span className="font-bold text-emerald-700">₹{amountPaid.toLocaleString('en-IN')}</span>
                      </div>
                      {remainingAmount > 0 && (
                        <div className="flex justify-between text-neutral-500 text-[11px]">
                          <span>Remaining:</span>
                          <span className="font-semibold text-neutral-800">₹{remainingAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>

                    {/* Next live class notice */}
                    {nextClass && (
                      <div className="mt-3 p-2.5 bg-blue-50/80 border border-blue-100 rounded-2xl text-xs text-blue-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <Video className="h-3.5 w-3.5 text-blue-600 shrink-0 animate-pulse" />
                          <span className="truncate font-semibold text-[11px]">{nextClass.title}</span>
                        </div>
                        <Link to={`/live/${nextClass.id}`}>
                          <span className="text-[10px] font-bold uppercase underline shrink-0 ml-2">Join</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Progress & Action */}
                  <div className="space-y-3 pt-2">
                    {isEnrolled && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                          <span>Learning Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-600 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    <div>
                      {isEnrolled ? (
                        <Button 
                          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white h-11 text-xs font-bold rounded-2xl gap-2 shadow-xs" 
                          onClick={() => navigate(`/courses/${course.id}/learn`)}
                        >
                          Continue Learning <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      ) : isPaymentPending ? (
                        <Button 
                          variant="outline" 
                          className="w-full border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 h-11 text-xs font-bold rounded-2xl gap-2"
                          onClick={() => navigate('/payments')}
                        >
                          <Clock className="h-3.5 w-3.5" /> Check Payment Status
                        </Button>
                      ) : isRejected ? (
                        <Button 
                          variant="outline" 
                          className="w-full border-rose-200 text-rose-800 bg-rose-50 hover:bg-rose-100 h-11 text-xs font-bold rounded-2xl gap-2"
                          onClick={() => setSelectedDetails({ course, latestPayment })}
                        >
                          <AlertCircle className="h-3.5 w-3.5" /> View Rejection Notice
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-neutral-900 text-white h-11 text-xs font-bold rounded-2xl"
                          onClick={() => navigate(`/checkout/${course.id}`)}
                        >
                          Complete Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white border border-neutral-200/80 rounded-3xl max-w-lg mx-auto p-8 space-y-4 shadow-sm">
          <div className="h-14 w-14 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold text-neutral-900">No Enrolled Courses Found</h2>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Explore our masterclasses in 2D animation, Photoshop, and 3D graphics to get started.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/courses')} 
            className="bg-neutral-900 text-white text-xs font-bold px-6 h-10 rounded-2xl shadow-xs"
          >
            Browse Course Catalog
          </Button>
        </div>
      )}

      {/* Rejection Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-neutral-200">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-neutral-900 text-sm">Payment Verification Notice</h3>
              <button onClick={() => setSelectedDetails(null)} className="p-1 text-neutral-400 hover:text-neutral-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-neutral-600">
              <p>
                <strong>Course:</strong> {selectedDetails.course?.title}
              </p>
              <p>
                <strong>Submitted UTR:</strong> <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono">{selectedDetails.latestPayment?.utr || 'N/A'}</code>
              </p>
              <div className="p-3 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200">
                <span className="font-semibold block mb-1">Reason for Rejection:</span>
                <span>{selectedDetails.latestPayment?.rejectionReason || 'The transaction could not be matched with bank records. Please contact support or re-enroll.'}</span>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDetails(null)} className="rounded-xl">
                Close
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  setSelectedDetails(null);
                  navigate(`/checkout/${selectedDetails.course.id}`);
                }}
                className="rounded-xl bg-neutral-900 text-white"
              >
                Retry Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
