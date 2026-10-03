import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Plus, 
  Search, 
  BookOpen, 
  Archive, 
  AlertTriangle,
  Loader2,
  X,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error listening to courses:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateCourseStatus = async (courseId: string, newStatus: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'courses', courseId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Log audit
      const { addDoc, collection } = await import('firebase/firestore');
      const adminSession = JSON.parse(sessionStorage.getItem('admin_session_data') || '{}');
      await addDoc(collection(db, 'audit_logs'), {
        adminId: adminSession.uid || 'unknown',
        action: 'UPDATE_COURSE_STATUS',
        targetType: 'course',
        targetId: courseId,
        timestamp: serverTimestamp(),
        metadata: { newStatus }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async (courseId: string, action: 'archive' | 'delete') => {
    if (action === 'delete' && deleteConfirm !== 'DELETE') return;

    setIsProcessing(true);
    setError(null);

    try {
      const adminToken = sessionStorage.getItem('admin_session');
      const response = await fetch('/api/admin/courses/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ courseId, action })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to ${action} course`);
      }

      setDeletingId(null);
      setDeleteConfirm('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCourses = courses.filter(c => 
    (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Courses Management</h1>
            <p className="text-neutral-500 text-sm">Create, publish, and manage your curriculum catalog.</p>
          </div>
          <Button className="gap-2 h-11 px-6 font-bold" onClick={() => navigate('/admin/courses/new')}>
            <Plus className="h-4 w-4" /> Create New Course
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-100 bg-neutral-50/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search by title or category..." 
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase text-[10px] tracking-widest border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-4">Course Details</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Students</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mx-auto" />
                    </td>
                  </tr>
                ) : filteredCourses.length > 0 ? filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-neutral-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-neutral-100 shrink-0 overflow-hidden border border-neutral-200">
                          {course.thumbnailUrl || course.thumbnail || course.bannerUrl || course.banner ? (
                            <img 
                              src={course.thumbnailUrl || course.thumbnail || course.bannerUrl || course.banner} 
                              className="h-full w-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-neutral-400">
                              <BookOpen className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <span className="font-bold text-neutral-900 block truncate">{course.title}</span>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">{course.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        course.status === 'Published' ? 'bg-green-50 text-green-700 border border-green-100' :
                        course.status === 'Archived' ? 'bg-red-50 text-red-700 border border-red-100' :
                        course.status === 'Draft' ? 'bg-neutral-100 text-neutral-500 border border-neutral-200' :
                        'bg-orange-50 text-orange-700 border border-orange-100'
                      }`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-neutral-900">₹{course.price?.toLocaleString('en-IN')}</p>
                      {course.advancePrice > 0 && <p className="text-[10px] text-neutral-400">Advance: ₹{course.advancePrice}</p>}
                    </td>
                    <td className="px-6 py-4 text-neutral-500 text-xs font-medium">
                      {course.studentCount || 0} Enrolled
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          title="View Public Page"
                          onClick={() => window.open(`/courses/${course.id}`, '_blank')}
                          className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        {course.status === 'Draft' ? (
                          <button 
                            title="Publish Course"
                            onClick={() => updateCourseStatus(course.id, 'Published')}
                            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        ) : course.status === 'Published' ? (
                          <button 
                            title="Move to Draft"
                            onClick={() => updateCourseStatus(course.id, 'Draft')}
                            className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button 
                          title="Edit Course"
                          onClick={() => navigate(`/admin/courses/edit/${course.id}`)}
                          className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {course.status !== 'Archived' && (
                          <button 
                            title="Archive Course"
                            onClick={() => handleAction(course.id, 'archive')}
                            className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          title="Delete Course"
                          onClick={() => setDeletingId(course.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center text-neutral-400">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="font-semibold text-neutral-600">No courses found</p>
                      <p className="text-xs">Start building your academy by creating your first course.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal (Requirement 17, 30) */}
        {deletingId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <button 
                onClick={() => {setDeletingId(null); setDeleteConfirm('');}}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="h-8 w-8" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-display font-bold text-neutral-900 uppercase">Delete this course?</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  This action is permanent. All lessons, modules, and content will be removed.
                  <strong className="block mt-2 text-red-600 font-bold">Important:</strong> If students have already paid for this course, you should <span className="font-black underline italic">Archive</span> it instead to preserve financial records.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block text-center">Type <span className="text-neutral-900">DELETE</span> to confirm</label>
                <input 
                  type="text"
                  placeholder="Type DELETE here..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-red-50 focus:border-red-500 focus:ring-0 text-center font-black tracking-widest uppercase transition-all"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 h-12 font-bold uppercase gap-2"
                  disabled={deleteConfirm !== 'DELETE' || isProcessing}
                  onClick={() => handleAction(deletingId, 'delete')}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Confirm Hard Deletion
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 font-bold uppercase"
                  onClick={() => {setDeletingId(null); setDeleteConfirm('');}}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
