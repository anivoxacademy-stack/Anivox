import React from 'react';
import { collection, query, getDocs, orderBy, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { CheckCircle, XCircle, Loader2, User, BookOpen } from 'lucide-react';

export function AdminEnrollments() {
  const [enrollments, setEnrollments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState<string | null>(null);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'enrollments'), orderBy('enrolledAt', 'desc'));
      const snap = await getDocs(q);
      
      const list = await Promise.all(snap.docs.map(async (enDoc) => {
        const data = enDoc.data();
        const studentSnap = await getDoc(doc(db, 'users', data.studentId));
        const courseSnap = await getDoc(doc(db, 'courses', data.courseId));
        
        return {
          id: enDoc.id,
          ...data,
          studentName: studentSnap.exists() ? studentSnap.data().displayName : 'Unknown',
          courseTitle: courseSnap.exists() ? courseSnap.data().title : 'Unknown'
        };
      }));

      setEnrollments(list);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    setProcessing(id);
    try {
      await updateDoc(doc(db, 'enrollments', id), {
        status,
        updatedAt: serverTimestamp()
      });
      fetchEnrollments();
    } catch (error) {
      console.error("Error updating enrollment:", error);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Course Enrollments</h1>
          <p className="text-neutral-500">Manage student access to courses.</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-100 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {enrollments.length > 0 ? enrollments.map((en) => (
                <tr key={en.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium text-neutral-900">{en.studentName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-600">{en.courseTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      en.status === 'approved' ? 'bg-green-50 text-green-600' :
                      en.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {en.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-400 text-xs">
                    {en.enrolledAt?.toDate ? en.enrolledAt.toDate().toLocaleDateString() : 'Just now'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {en.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button 
                          disabled={!!processing}
                          onClick={() => handleStatusUpdate(en.id, 'approved')}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button 
                          disabled={!!processing}
                          onClick={() => handleStatusUpdate(en.id, 'rejected')}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    {loading ? 'Loading enrollments...' : 'No enrollments found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
