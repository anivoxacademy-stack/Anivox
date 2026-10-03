import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  CheckCircle, 
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Link, useNavigate } from 'react-router-dom';

export function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: 'Total Students', value: '0', change: 'Enrolled', bg: 'bg-[#F4F0FF]', border: 'border-[#E9E1FF]', text: 'text-purple-700', icon: Users },
    { label: 'Active Courses', value: '0', change: 'Published', bg: 'bg-[#F0F7FF]', border: 'border-[#DBEAFE]', text: 'text-blue-700', icon: BookOpen },
    { label: 'Pending Payments', value: '0', change: 'Needs Review', bg: 'bg-[#FFF7ED]', border: 'border-[#FFEDD5]', text: 'text-amber-700', icon: CreditCard },
    { label: 'Total Revenue', value: '₹0', change: 'Approved', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-emerald-700', icon: TrendingUp },
  ]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const adminToken = sessionStorage.getItem('admin_session');

        if (adminToken) {
          try {
            const res = await fetch('/api/admin/stats', {
              headers: {
                'Authorization': `Bearer ${adminToken}`
              }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && isMounted) {
                setStats([
                  { label: 'Total Students', value: (data.stats.totalStudents || 0).toString(), change: 'Enrolled', bg: 'bg-[#F4F0FF]', border: 'border-[#E9E1FF]', text: 'text-purple-700', icon: Users },
                  { label: 'Active Courses', value: (data.stats.activeCourses || 0).toString(), change: 'Published', bg: 'bg-[#F0F7FF]', border: 'border-[#DBEAFE]', text: 'text-blue-700', icon: BookOpen },
                  { label: 'Pending Payments', value: (data.stats.pendingPayments || 0).toString(), change: 'Needs Review', bg: 'bg-[#FFF7ED]', border: 'border-[#FFEDD5]', text: 'text-amber-700', icon: CreditCard },
                  { label: 'Total Revenue', value: `₹${((data.stats.totalRevenue || 0) / 1000).toFixed(1)}k`, change: 'Approved', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-emerald-700', icon: TrendingUp },
                ]);
                setActivities(data.activities || []);
                setLoading(false);
                return;
              }
            }
          } catch (apiErr) {
            console.warn("[ADMIN_STATS] Server API unavailable, falling back to client firestore:", apiErr);
          }
        }

        let totalStudents = 0;
        let activeCourses = 0;
        let pendingPayments = 0;
        let totalRevenue = 0;
        let activitiesList: any[] = [];

        try {
          const studentsSnap = await getDocs(collection(db, 'users'));
          totalStudents = studentsSnap.size;
        } catch (e: any) {
          console.warn("[ADMIN_STATS] Notice fetching users:", e?.message);
        }

        try {
          const coursesSnap = await getDocs(collection(db, 'courses'));
          activeCourses = coursesSnap.docs.filter(d => d.data().status === 'Published').length;
        } catch (e: any) {
          console.warn("[ADMIN_STATS] Notice fetching courses:", e?.message);
        }

        try {
          const paymentsSnap = await getDocs(collection(db, 'payments'));
          pendingPayments = paymentsSnap.docs.filter(d => d.data().status === 'pending' || d.data().status === 'Pending Verification').length;
          totalRevenue = paymentsSnap.docs
            .filter(d => d.data().status === 'approved' || d.data().status === 'Approved')
            .reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
        } catch (e: any) {
          console.warn("[ADMIN_STATS] Notice fetching payments:", e?.message);
        }

        try {
          const auditSnap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(8)));
          activitiesList = auditSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e: any) {
          console.warn("[ADMIN_STATS] Notice fetching audit logs:", e?.message);
        }

        if (isMounted) {
          setStats([
            { label: 'Total Students', value: totalStudents.toString(), change: 'Enrolled', bg: 'bg-[#F4F0FF]', border: 'border-[#E9E1FF]', text: 'text-purple-700', icon: Users },
            { label: 'Active Courses', value: activeCourses.toString(), change: 'Published', bg: 'bg-[#F0F7FF]', border: 'border-[#DBEAFE]', text: 'text-blue-700', icon: BookOpen },
            { label: 'Pending Payments', value: pendingPayments.toString(), change: 'Needs Review', bg: 'bg-[#FFF7ED]', border: 'border-[#FFEDD5]', text: 'text-amber-700', icon: CreditCard },
            { label: 'Total Revenue', value: `₹${(totalRevenue / 1000).toFixed(1)}k`, change: 'Approved', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-emerald-700', icon: TrendingUp },
          ]);
          setActivities(activitiesList);
        }

      } catch (error: any) {
        console.warn("Notice updating admin stats:", error?.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const getActionLabel = (action: string) => {
    return action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  };

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-purple-600" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Academy Administration
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-neutral-900">
            Welcome, {profile?.displayName || 'Admin'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Operational dashboard for student enrollments, UPI verifications, and live classrooms.
          </p>
        </div>

        {/* Reference-Styled Pastel Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.label} 
                className={`${stat.bg} ${stat.border} border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-600">
                    {stat.label}
                  </span>
                  <div className={`p-2 rounded-xl bg-white shadow-2xs ${stat.text}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-2">
                  <h3 className="text-3xl font-display font-bold text-neutral-900">
                    {stat.value}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 text-neutral-700 shadow-2xs">
                    {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Audit Log Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">System Operations & Audit Log</h3>
                <p className="text-[11px] text-neutral-400">Recent server and administrative activities.</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin/audit')} 
                className="text-xs font-bold rounded-xl"
              >
                View Full Log
              </Button>
            </div>

            <div className="divide-y divide-neutral-100">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-[#FAF8FA] transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {activity.adminId?.slice(0, 2) || 'AD'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900">
                          {getActionLabel(activity.action || 'ACTION')}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {activity.targetType}: {activity.targetId}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-400">
                      {activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-neutral-400 text-xs">
                  No system audit logs found.
                </div>
              )}
            </div>
          </div>

          {/* Quick Admin Actions */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-neutral-900">Quick Administration</h3>
            
            <div className="space-y-2">
              <Link
                to="/admin/payments"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8FA] hover:bg-purple-50/70 transition-colors text-xs font-semibold text-neutral-800"
              >
                <span>Verify Pending Payments</span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>

              <Link
                to="/admin/courses"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8FA] hover:bg-purple-50/70 transition-colors text-xs font-semibold text-neutral-800"
              >
                <span>Manage Course Curriculum</span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>

              <Link
                to="/admin/live"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8FA] hover:bg-purple-50/70 transition-colors text-xs font-semibold text-neutral-800"
              >
                <span>Start / Schedule Live Class</span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>

              <Link
                to="/admin/payment-settings"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8FA] hover:bg-purple-50/70 transition-colors text-xs font-semibold text-neutral-800"
              >
                <span>Configure UPI QR & VPA</span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
