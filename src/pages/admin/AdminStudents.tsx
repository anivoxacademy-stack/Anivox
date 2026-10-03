import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc,
  deleteDoc,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar as CalendarIcon, 
  ShieldAlert, 
  ShieldCheck, 
  MoreVertical,
  Search,
  Loader2,
  Filter,
  ExternalLink,
  BookOpen,
  CreditCard,
  Video,
  AlertCircle,
  Bell,
  Award,
  Plus,
  Trash2,
  X
} from 'lucide-react';

export function AdminStudents() {
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked'>('all');
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentEntitlements, setStudentEntitlements] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantCourseId, setGrantCourseId] = useState('');
  const [grantAccessType, setGrantAccessType] = useState<'FREE' | 'DISCOUNT' | 'SPECIAL'>('FREE');
  const [grantPrice, setGrantPrice] = useState(0);
  const [grantReason, setGrantReason] = useState('');
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(list);
      setLoading(false);
    });

    const fetchCourses = async () => {
      try {
        const cSnap = await getDocs(collection(db, 'courses'));
        setCoursesList(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching courses list:", e);
      }
    };
    fetchCourses();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedStudent) {
      setStudentEntitlements([]);
      return;
    }

    const fetchEntitlements = async () => {
      try {
        const q = query(collection(db, 'userCourseAccess'), where('userId', '==', selectedStudent.uid));
        const snap = await getDocs(q);
        const ents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudentEntitlements(ents);
      } catch (e) {
        console.error("Error fetching student entitlements:", e);
      }
    };

    fetchEntitlements();
  }, [selectedStudent]);

  const handleToggleBlock = async (student: any) => {
    const isBlocking = student.status !== 'blocked';
    const reason = isBlocking ? prompt('Reason for blocking this student?') : null;
    
    if (isBlocking && reason === null) return;

    setProcessing(true);
    setError(null);

    try {
      const adminToken = sessionStorage.getItem('admin_session');
      const response = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          uid: student.uid,
          status: isBlocking ? 'blocked' : 'active',
          reason: reason
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update student status');
      }

      if (selectedStudent?.uid === student.uid) {
        setSelectedStudent({ ...selectedStudent, status: isBlocking ? 'blocked' : 'active', blockReason: reason });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !grantCourseId) return;

    setProcessing(true);
    setError(null);

    try {
      const course = coursesList.find(c => c.id === grantCourseId);
      const originalPrice = course?.price || 0;
      let grantedPrice = 0;
      let paymentRequired = false;

      if (grantAccessType === 'DISCOUNT' || grantAccessType === 'SPECIAL') {
        grantedPrice = Number(grantPrice);
        paymentRequired = grantedPrice > 0;
      }

      const accessId = `${selectedStudent.uid}_${grantCourseId}`;
      const accessPayload = {
        userId: selectedStudent.uid,
        courseId: grantCourseId,
        courseTitleSnapshot: course?.title || 'Masterclass',
        accessType: grantAccessType,
        originalPrice,
        grantedPrice,
        discountAmount: Math.max(0, originalPrice - grantedPrice),
        status: 'ACTIVE',
        paymentRequired,
        grantedBy: adminUser?.email || 'admin',
        grantedAt: serverTimestamp(),
        reason: grantReason || 'Admin granted access'
      };

      await setDoc(doc(db, 'userCourseAccess', accessId), accessPayload, { merge: true });

      // Create enrollment record
      await setDoc(doc(db, 'enrollments', accessId), {
        studentId: selectedStudent.uid,
        courseId: grantCourseId,
        status: 'approved',
        createdAt: serverTimestamp()
      }, { merge: true });

      // Create notification for student
      await setDoc(doc(collection(db, 'notifications'), `${selectedStudent.uid}_${Date.now()}`), {
        recipientId: selectedStudent.uid,
        title: grantAccessType === 'FREE' ? 'Complimentary Course Access Granted!' : 'Special Course Offer Granted!',
        message: `You have been granted access to "${course?.title || 'Masterclass'}". Enjoy your learning journey!`,
        read: false,
        createdAt: serverTimestamp()
      });

      // Refresh entitlements
      const q = query(collection(db, 'userCourseAccess'), where('userId', '==', selectedStudent.uid));
      const snap = await getDocs(q);
      setStudentEntitlements(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      setIsGrantModalOpen(false);
      setGrantCourseId('');
      setGrantReason('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    if (!confirm('Are you sure you want to revoke this student access?')) return;

    setProcessing(true);
    try {
      await deleteDoc(doc(db, 'userCourseAccess', accessId));
      setStudentEntitlements(prev => prev.filter(e => e.id !== accessId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      (s.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone || '').includes(searchQuery);
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && s.status === filterStatus;
  });

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Student Directory & Offers</h1>
            <p className="text-neutral-500 text-sm">Manage academy members, monitor access, and grant free or discounted offers.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search name, email, or phone..."
                className="pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-1 gap-1">
              <button 
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${filterStatus === 'active' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setFilterStatus('blocked')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${filterStatus === 'blocked' ? 'bg-red-600 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                Blocked
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Student List */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase text-[10px] tracking-widest border-b border-neutral-100">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredStudents.length > 0 ? filteredStudents.map((student) => (
                    <tr 
                      key={student.uid} 
                      className={`hover:bg-neutral-50 transition-colors cursor-pointer ${selectedStudent?.uid === student.uid ? 'bg-neutral-100/80' : ''}`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                            {student.photoURL ? (
                              <img src={student.photoURL} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-neutral-400 font-bold uppercase tracking-tighter">
                                {student.displayName?.slice(0, 2) || 'ST'}
                              </div>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-900 truncate block">{student.displayName}</span>
                              {student.status === 'blocked' && (
                                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                              )}
                            </div>
                            <span className="text-xs text-neutral-400 font-mono truncate block">{student.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-neutral-700 font-medium text-xs flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-neutral-400" />
                            {student.phone || 'No phone'}
                          </p>
                          <p className="text-neutral-400 text-[11px] flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            {student.city || 'Location not set'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 text-xs">
                        {student.createdAt?.toDate ? new Date(student.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-white rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-24 text-center text-neutral-400">
                        <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="font-semibold text-neutral-600">No students found</p>
                        <p className="text-xs">Adjust your search or filter to see more.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Sidebar (Requirement 14 & Offers) */}
          <div className="lg:col-span-4 space-y-6 sticky top-24">
            {selectedStudent ? (
              <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                {/* Profile Header */}
                <div className="p-8 pb-4 text-center space-y-4">
                  <div className="h-24 w-24 rounded-3xl bg-neutral-50 mx-auto border-2 border-white ring-8 ring-neutral-50/50 overflow-hidden shadow-sm">
                    {selectedStudent.photoURL ? (
                      <img src={selectedStudent.photoURL} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-neutral-300 text-2xl font-bold uppercase tracking-tighter">
                        {selectedStudent.displayName?.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-display font-bold text-neutral-900">{selectedStudent.displayName}</h2>
                    <p className="text-xs text-neutral-400 font-mono">{selectedStudent.email}</p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      selectedStudent.status === 'blocked' 
                        ? 'bg-red-50 text-red-600 border-red-100' 
                        : 'bg-green-50 text-green-700 border-green-100'
                    }`}>
                      {selectedStudent.status || 'Active'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-neutral-100 text-neutral-600 border border-neutral-200">
                      Student
                    </span>
                  </div>
                </div>

                {/* Special Access / Offers Section (Requirement 12, 13, 14) */}
                <div className="p-6 space-y-4 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-purple-600" /> Granted Offers & Access
                    </h3>
                    <Button 
                      size="sm" 
                      onClick={() => setIsGrantModalOpen(true)}
                      className="h-8 text-[11px] font-bold bg-neutral-900 text-white rounded-xl gap-1 px-3"
                    >
                      <Plus className="h-3.5 w-3.5" /> Grant Offer
                    </Button>
                  </div>

                  {studentEntitlements.length > 0 ? (
                    <div className="space-y-2">
                      {studentEntitlements.map(ent => {
                        const course = coursesList.find(c => c.id === ent.courseId);
                        return (
                          <div key={ent.id} className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                            <div className="space-y-0.5 overflow-hidden">
                              <p className="text-xs font-bold text-neutral-900 truncate">{course?.title || ent.courseId}</p>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500">
                                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">{ent.accessType}</span>
                                <span>{ent.accessType === 'FREE' ? '₹0' : `₹${ent.grantedPrice}`}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRevokeAccess(ent.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Revoke Access"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 italic bg-neutral-50 p-3 rounded-xl text-center">
                      No special course offers granted yet.
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="p-6 bg-neutral-50/50 space-y-3 border-t border-neutral-100">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-10 text-xs font-bold gap-1.5" onClick={() => window.open(`mailto:${selectedStudent.email}`)}>
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-10 text-xs font-bold gap-1.5"
                      onClick={() => navigate(`/admin/broadcast?studentId=${selectedStudent.uid}`)}
                    >
                      <Bell className="h-3.5 w-3.5" /> Notify
                    </Button>
                  </div>
                  
                  <Button 
                    className={`w-full h-11 text-xs font-bold gap-2 ${
                      selectedStudent.status === 'blocked' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                    disabled={processing}
                    onClick={() => handleToggleBlock(selectedStudent)}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedStudent.status === 'blocked' ? (
                      <><ShieldCheck className="h-4 w-4" /> Unblock Student</>
                    ) : (
                      <><ShieldAlert className="h-4 w-4" /> Block Student Account</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-100/50 rounded-3xl border border-dashed border-neutral-200 p-12 text-center space-y-2">
                <User className="h-10 w-10 text-neutral-300 mx-auto" />
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Select a student</p>
                <p className="text-[11px] text-neutral-400">Click on a row to view full profile and management options.</p>
              </div>
            )}
          </div>
        </div>

        {/* Grant Course Access Modal */}
        {isGrantModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button 
                onClick={() => setIsGrantModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-xl font-display font-bold text-neutral-900">Grant Course Access</h3>
                <p className="text-xs text-neutral-500">Provide complimentary or discounted access for {selectedStudent.displayName}.</p>
              </div>

              <form onSubmit={handleGrantAccess} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Select Course</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={grantCourseId}
                    onChange={(e) => setGrantCourseId(e.target.value)}
                    required
                  >
                    <option value="">Select a masterclass...</option>
                    {coursesList.map(c => (
                      <option key={c.id} value={c.id}>{c.title} (₹{c.price})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Access Type</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={grantAccessType}
                    onChange={(e: any) => setGrantAccessType(e.target.value)}
                  >
                    <option value="FREE">Free Access (100% Scholarship)</option>
                    <option value="DISCOUNT">Discounted Price</option>
                    <option value="SPECIAL">Special Custom Price</option>
                  </select>
                </div>

                {grantAccessType !== 'FREE' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Custom Price (₹)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      value={grantPrice}
                      onChange={(e) => setGrantPrice(Number(e.target.value))}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Reason / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Special scholarship winner"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsGrantModalOpen(false)}
                    className="rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={processing}
                    className="rounded-xl font-bold text-xs bg-neutral-900 hover:bg-neutral-800 text-white"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Grant'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
