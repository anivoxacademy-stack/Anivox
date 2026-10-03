import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  getDoc, 
  addDoc, 
  where 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Loader2, 
  Image as ImageIcon, 
  X, 
  HelpCircle,
  Filter,
  CreditCard,
  User,
  BookOpen,
  Shield
} from 'lucide-react';

export function AdminPayments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  // Rejection modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const [overridingPayment, setOverridingPayment] = useState<any | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('VIP Access / Manual Payment');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'payments'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      
      const paymentsList = await Promise.all(snap.docs.map(async (paymentDoc) => {
        const data = paymentDoc.data();
        let studentName = 'Unknown Student';
        let studentEmail = '';
        let courseTitle = 'Unknown Course';

        try {
          const studentSnap = await getDoc(doc(db, 'users', data.studentId));
          if (studentSnap.exists()) {
            const sData = studentSnap.data();
            studentName = sData.displayName || studentName;
            studentEmail = sData.email || '';
          }
        } catch (e) {
          // ignore
        }

        try {
          const courseSnap = await getDoc(doc(db, 'courses', data.courseId));
          if (courseSnap.exists()) {
            courseTitle = courseSnap.data().title || courseTitle;
          }
        } catch (e) {
          // ignore
        }
        
        return {
          id: paymentDoc.id,
          ...data,
          studentName,
          studentEmail,
          courseTitle,
        };
      }));

      setPayments(paymentsList);
    } catch (error) {
      console.error("Error fetching admin payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: 'Approved' | 'Rejected' | 'Request More Information', reason?: string) => {
    setProcessing(id);
    setErrorMessage(null);
    try {
      const payment = payments.find(p => p.id === id);
      const reviewer = profile?.displayName || 'Admin';

      await updateDoc(doc(db, 'payments', id), {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewedBy: reviewer,
        ...(reason ? { rejectionReason: reason } : {}),
      });

      if (payment) {
        if (newStatus === 'Approved') {
          // Check for existing enrollment or create approved enrollment
          const enrQuery = query(
            collection(db, 'enrollments'),
            where('studentId', '==', payment.studentId),
            where('courseId', '==', payment.courseId)
          );
          const enrSnap = await getDocs(enrQuery);

          if (!enrSnap.empty) {
            const enrDoc = enrSnap.docs[0];
            await updateDoc(doc(db, 'enrollments', enrDoc.id), {
              status: 'approved',
              paymentStatus: 'Approved',
              amountPaid: payment.amount,
              updatedAt: serverTimestamp(),
            });
          } else {
            await addDoc(collection(db, 'enrollments'), {
              studentId: payment.studentId,
              courseId: payment.courseId,
              status: 'approved',
              paymentStatus: 'Approved',
              amountPaid: payment.amount,
              enrolledAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          // Log audit
          await addDoc(collection(db, 'audit_logs'), {
            adminId: profile?.uid || 'unknown',
            action: 'APPROVE_PAYMENT',
            targetType: 'payment',
            targetId: id,
            timestamp: serverTimestamp(),
            metadata: { studentId: payment.studentId, amount: payment.amount, utr: payment.utr }
          });

          // Send approval notification
          await addDoc(collection(db, 'notifications'), {
            recipientId: payment.studentId,
            title: 'Payment & Enrollment Approved',
            message: `Your payment of ₹${payment.amount} for "${payment.courseTitle}" (UTR: ${payment.utr}) has been approved by ${reviewer}. You now have full access to course lessons and live classes!`,
            type: 'success',
            read: false,
            createdAt: serverTimestamp(),
          });
        } else if (newStatus === 'Rejected') {
          // Log audit
          await addDoc(collection(db, 'audit_logs'), {
            adminId: profile?.uid || 'unknown',
            action: 'REJECT_PAYMENT',
            targetType: 'payment',
            targetId: id,
            timestamp: serverTimestamp(),
            metadata: { studentId: payment.studentId, reason }
          });

          await addDoc(collection(db, 'notifications'), {
            recipientId: payment.studentId,
            title: 'Payment Verification Rejected',
            message: `Your payment verification (UTR: ${payment.utr}) for "${payment.courseTitle}" was rejected. Reason: ${reason || 'Could not be verified with academy bank records'}. Please check your transaction or resubmit.`,
            type: 'alert',
            read: false,
            createdAt: serverTimestamp(),
          });
        } else if (newStatus === 'Request More Information') {
          await addDoc(collection(db, 'notifications'), {
            recipientId: payment.studentId,
            title: 'Payment Information Requested',
            message: `Our admin team requires additional information or a clearer receipt for your transaction (UTR: ${payment.utr}). Please contact support or update your payment details.`,
            type: 'warning',
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      setRejectingId(null);
      setRejectionReason('');
      await fetchPayments();
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      setErrorMessage(error.message || 'Failed to update payment status.');
    } finally {
      setProcessing(null);
    }
  };

  const handleOverride = async (payment: any) => {
    setOverridingPayment(payment);
  };

  const confirmOverride = async () => {
    if (!overridingPayment) return;
    setProcessing(overridingPayment.id);
    setErrorMessage(null);

    try {
      const adminToken = sessionStorage.getItem('admin_session');
      const response = await fetch('/api/admin/enrollments/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          studentId: overridingPayment.studentId,
          courseId: overridingPayment.courseId,
          reason: overrideReason
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Override failed');
      }

      // Also update the payment record to mark it as approved via override
      await updateDoc(doc(db, 'payments', overridingPayment.id), {
        status: 'Approved (Override)',
        reviewedAt: serverTimestamp(),
        reviewedBy: profile?.displayName || 'Admin',
        overrideReason: overrideReason
      });

      setOverridingPayment(null);
      setOverrideReason('VIP Access / Manual Payment');
      await fetchPayments();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (filterStatus === 'All') return true;
    const norm = (p.status || '').toLowerCase();
    if (filterStatus === 'Pending') return norm.includes('pending');
    if (filterStatus === 'Approved') return norm === 'approved';
    if (filterStatus === 'Rejected') return norm === 'rejected';
    if (filterStatus === 'Info') return norm.includes('information') || norm.includes('request');
    return true;
  });

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Payment Verifications</h1>
            <p className="text-neutral-500">Review student UPI submissions, verify UTR with bank records, and approve course access.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {['All', 'Pending', 'Approved', 'Rejected', 'Info'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === status
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl text-sm font-medium bg-red-50 text-red-800 border border-red-200">
            {errorMessage}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Amount / Expected</th>
                  <th className="px-6 py-4">UTR Reference</th>
                  <th className="px-6 py-4">Receipt Proof</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredPayments.length > 0 ? filteredPayments.map((payment) => {
                  const isPending = (payment.status || '').toLowerCase().includes('pending');
                  const isApproved = (payment.status || '').toLowerCase() === 'approved';
                  const isRejected = (payment.status || '').toLowerCase() === 'rejected';

                  return (
                    <tr key={payment.id} className="hover:bg-neutral-50/50 transition-colors">
                      {/* Student */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0 font-bold text-xs uppercase">
                            {payment.studentName?.slice(0, 2) || 'ST'}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900">{payment.studentName}</p>
                            <p className="text-[11px] text-neutral-400 font-mono">{payment.studentEmail || payment.studentId?.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-neutral-900 max-w-[180px] truncate">{payment.courseTitle}</p>
                        <span className="text-[10px] uppercase font-bold text-neutral-400">
                          {payment.paymentType || 'Full'}
                        </span>
                      </td>

                      {/* Amount / Expected */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-neutral-900 text-sm">₹{payment.amount}</p>
                        <p className="text-[11px] text-neutral-400">
                          Expected: ₹{payment.expectedAmount || payment.amount}
                        </p>
                      </td>

                      {/* UTR */}
                      <td className="px-6 py-4">
                        <code className="text-xs bg-neutral-100 px-2.5 py-1 rounded-md font-mono text-neutral-800 font-medium">
                          {payment.utr}
                        </code>
                      </td>

                      {/* Screenshot Proof */}
                      <td className="px-6 py-4">
                        {payment.screenshotUrl ? (
                          <button
                            onClick={() => setPreviewImage(payment.screenshotUrl)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-medium transition-colors"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">No receipt attached</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isApproved ? 'bg-green-100 text-green-700' :
                          isRejected ? 'bg-red-100 text-red-700' :
                          isPending ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {payment.status}
                        </span>
                        {payment.reviewedBy && (
                          <p className="text-[10px] text-neutral-400 mt-1">by {payment.reviewedBy}</p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-neutral-500 text-xs">
                        {payment.submittedAt?.toDate ? payment.submittedAt.toDate().toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Just now'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                disabled={processing === payment.id}
                                onClick={() => handleStatusUpdate(payment.id, 'Approved')}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Approve Payment & Grant Enrollment"
                              >
                                {processing === payment.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                )}
                                <span>Approve</span>
                              </button>
                              <button
                                disabled={processing === payment.id}
                                onClick={() => setRejectingId(payment.id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Reject Payment"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                disabled={processing === payment.id}
                                onClick={() => handleStatusUpdate(payment.id, 'Request More Information')}
                                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                                title="Request More Information"
                              >
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {isPending && (
                            <button
                              disabled={processing === payment.id}
                              onClick={() => handleOverride(payment)}
                              className="p-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors border border-brand-100"
                              title="Grant Access Override (VIP)"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}
                          {!isPending && (
                            <span className="text-xs text-neutral-400 italic">Resolved</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-neutral-500">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                          <span>Loading payments...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <CreditCard className="h-10 w-10 text-neutral-300 mx-auto" />
                          <p className="font-semibold text-neutral-700">No payments submitted yet.</p>
                          <p className="text-xs text-neutral-400">Submitted UPI transactions will appear here for manual verification.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Screenshot Modal */}
        {previewImage && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 relative overflow-hidden space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <h3 className="font-bold text-neutral-900 text-sm">Payment Screenshot Proof</h3>
                <button onClick={() => setPreviewImage(null)} className="p-1 text-neutral-400 hover:text-neutral-900 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[68vh] overflow-auto rounded-2xl bg-neutral-100 flex items-center justify-center p-2">
                <img src={previewImage} alt="Payment Proof" className="max-w-full max-h-[64vh] object-contain rounded-xl" />
              </div>
              <div className="flex justify-between items-center text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                <span>Verify UTR against UPI reference in screenshot</span>
                <a href={previewImage} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline flex items-center gap-1 font-semibold">
                  Open Original <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Dialog */}
        {rejectingId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <h3 className="font-bold text-neutral-900 text-sm">Reject Payment Submission</h3>
                <button onClick={() => setRejectingId(null)} className="p-1 text-neutral-400 hover:text-neutral-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-neutral-500">
                Please provide a brief reason for rejecting this transaction. This will be visible to the student in their notifications.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. UTR number not found in academy bank statements, amount mismatch, etc."
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none resize-none"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setRejectingId(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleStatusUpdate(rejectingId, 'Rejected', rejectionReason || 'Could not verify transaction with bank')}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Override Modal */}
        {overridingPayment && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl relative border border-brand-100">
              <div className="h-16 w-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-brand-50/50">
                <Shield className="h-8 w-8" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-display font-bold text-neutral-900 uppercase">Grant Access Override</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  You are bypassing verification for <span className="font-bold text-neutral-900">{overridingPayment.studentName}</span>'s enrollment in <span className="font-bold text-neutral-900">"{overridingPayment.courseTitle}"</span>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Reason for Override</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Student, Offline Cash Payment"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm font-medium"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-[11px] text-amber-800 leading-relaxed">
                <strong>Audit Warning:</strong> This action will be logged in the system activity logs with your admin credentials. Use only for authorized exceptions.
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  className="w-full bg-brand-600 hover:bg-brand-700 h-12 font-bold uppercase gap-2"
                  disabled={processing === overridingPayment.id}
                  onClick={confirmOverride}
                >
                  {processing === overridingPayment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Confirm & Grant Access Now
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 font-bold uppercase"
                  onClick={() => setOverridingPayment(null)}
                  disabled={processing === overridingPayment.id}
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
