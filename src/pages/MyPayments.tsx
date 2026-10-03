import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, CreditCard, ChevronRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function MyPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'payments'), 
      where('studentId', '==', user.uid),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const list = await Promise.all(snap.docs.map(async (pDoc) => {
        const data = pDoc.data();
        let courseTitle = 'Anivox Course';
        try {
          const courseSnap = await getDoc(doc(db, 'courses', data.courseId));
          if (courseSnap.exists()) {
            courseTitle = courseSnap.data().title;
          }
        } catch (e) {
          // ignore
        }
        return {
          id: pDoc.id,
          ...data,
          courseTitle
        };
      }));
      
      setPayments(list);
      setLoading(false);
    }, (error) => {
      console.warn("Notice listening to payments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-purple-600" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Billing & Invoices
          </span>
        </div>
        <h1 className="text-3xl font-display font-bold text-neutral-900">
          Payment Receipts
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Review your submitted UPI transactions, verification statuses, and payment receipts.
        </p>
      </div>

      {payments.length > 0 ? (
        <div className="space-y-4">
          {payments.map((payment) => {
            const isApproved = (payment.status || '').toLowerCase() === 'approved';
            const isRejected = (payment.status || '').toLowerCase() === 'rejected';

            return (
              <div 
                key={payment.id} 
                className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center shrink-0">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900">{payment.courseTitle}</h3>
                    <p className="text-xs text-neutral-400 font-medium mt-0.5">
                      {payment.paymentType || 'Full'} Payment · {payment.submittedAt?.toDate ? payment.submittedAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Submitted'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 flex-1 md:justify-items-center">
                  <div>
                    <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-0.5">Amount</p>
                    <p className="font-display font-bold text-neutral-900 text-lg">₹{payment.amount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-0.5">UTR Reference</p>
                    <p className="text-xs font-mono font-medium text-neutral-700 bg-neutral-100/70 px-2 py-1 rounded-lg w-fit">
                      {payment.utr}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-0.5">Status</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      isRejected ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {isApproved ? <CheckCircle2 className="h-3 w-3" /> : isRejected ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {payment.status}
                    </span>
                  </div>
                </div>

                {isApproved && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="rounded-xl text-xs font-bold shrink-0"
                    onClick={() => navigate('/my-courses')}
                  >
                    Open Course
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white border border-neutral-200/80 rounded-3xl p-8 space-y-3 shadow-sm max-w-lg mx-auto">
          <div className="h-14 w-14 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto">
            <CreditCard className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No Payment History</h2>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Your transaction receipts and approval statuses will appear here once you enroll in a program.
          </p>
          <Button 
            onClick={() => navigate('/courses')} 
            className="bg-neutral-900 text-white text-xs font-bold px-5 h-9 rounded-xl"
          >
            Explore Courses
          </Button>
        </div>
      )}
    </div>
  );
}
