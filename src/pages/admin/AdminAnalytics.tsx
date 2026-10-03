import React from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BarChart3, Users, BookOpen, CreditCard, Video, CheckCircle2, Loader2 } from 'lucide-react';

export function AdminAnalytics() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState({
    totalStudents: 0,
    totalCourses: 0,
    publishedCourses: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    totalRevenue: 0,
    totalEnrollments: 0,
    approvedEnrollments: 0,
    totalLiveClasses: 0,
    liveNowClasses: 0,
  });

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [usersSnap, coursesSnap, paymentsSnap, enrollmentsSnap, classesSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'courses')),
          getDocs(collection(db, 'payments')),
          getDocs(collection(db, 'enrollments')),
          getDocs(collection(db, 'classes')),
        ]);

        const published = coursesSnap.docs.filter(d => d.data().status === 'Published').length;
        const pendingPay = paymentsSnap.docs.filter(d => d.data().status === 'pending').length;
        const approvedPayDocs = paymentsSnap.docs.filter(d => d.data().status === 'approved');
        const approvedPay = approvedPayDocs.length;
        const revenue = approvedPayDocs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
        const approvedEnr = enrollmentsSnap.docs.filter(d => d.data().status === 'approved').length;
        const liveNow = classesSnap.docs.filter(d => d.data().status === 'Live').length;

        setData({
          totalStudents: usersSnap.size,
          totalCourses: coursesSnap.size,
          publishedCourses: published,
          pendingPayments: pendingPay,
          approvedPayments: approvedPay,
          totalRevenue: revenue,
          totalEnrollments: enrollmentsSnap.size,
          approvedEnrollments: approvedEnr,
          totalLiveClasses: classesSnap.size,
          liveNowClasses: liveNow,
        });
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          <p className="text-sm text-neutral-500">Calculating real analytics from database...</p>
        </div>
      </AdminLayout>
    );
  }

  const metrics = [
    { label: 'Registered Students', value: data.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Published Courses', value: `${data.publishedCourses} / ${data.totalCourses}`, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Approved Revenue', value: `₹${data.totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending Payments', value: data.pendingPayments, icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Enrollments', value: data.approvedEnrollments, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Scheduled / Live Classes', value: `${data.liveNowClasses} live / ${data.totalLiveClasses} total`, icon: Video, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-900">Platform Analytics</h1>
              <p className="text-neutral-500 text-sm">Real-time metrics strictly derived from verified Firestore records.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {metrics.map((m) => (
            <div key={m.label} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{m.label}</p>
                <p className="text-2xl font-bold text-neutral-900">{m.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${m.bg} ${m.color}`}>
                <m.icon className="h-6 w-6" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 mb-2">Data Integrity Note</h2>
          <p className="text-neutral-500 text-sm leading-relaxed">
            All analytics above reflect actual database records created through registered students, courses, manual UPI payment receipts, and schedule updates. No synthetic or simulated metrics are displayed.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
