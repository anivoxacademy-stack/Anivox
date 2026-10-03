import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Loader2, 
  QrCode, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ShieldCheck, 
  CreditCard,
  Check,
  Building2,
  FileCheck,
  Sparkles
} from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { FileUpload } from '../components/ui/FileUpload';
import QRCode from 'qrcode';

export function Checkout() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const paymentTypeParam = (searchParams.get('type') || 'full').toLowerCase();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Payment Settings from Firestore
  const [paymentConfig, setPaymentConfig] = useState({
    upiId: 'anivoxacademy@okaxis',
    paymentName: 'Anivox Academy',
    defaultMessage: 'Anivox Academy Course Payment',
    instructions: '1. Scan the QR code using any UPI app (Google Pay, PhonePe, Paytm, BHIM, etc.).\n2. Verify the payable amount matches exactly.\n3. Complete the payment in your UPI app.\n4. Copy the 12-digit UTR / UPI Ref ID number.\n5. Paste the UTR number below and submit for verification.',
    qrImageUrl: '',
    enabled: true
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  
  // Student Submission State
  const [utr, setUtr] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCheckoutData = async () => {
      if (!courseId) return;
      try {
        const courseSnap = await getDoc(doc(db, 'courses', courseId));
        if (courseSnap.exists()) {
          setCourse({ id: courseSnap.id, ...courseSnap.data() });
        } else {
          setError('Course not found');
        }

        const settingsSnap = await getDoc(doc(db, 'appSettings', 'payment'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setPaymentConfig(prev => ({
            ...prev,
            upiId: data.upiId || prev.upiId,
            paymentName: data.paymentName || prev.paymentName,
            defaultMessage: data.defaultMessage || prev.defaultMessage,
            instructions: data.instructions || prev.instructions,
            qrImageUrl: data.qrImageUrl || '',
            enabled: data.enabled !== undefined ? data.enabled : true,
          }));
        }
      } catch (err: any) {
        console.error("Error loading checkout:", err);
        setError('Failed to load checkout details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [courseId]);

  const isAdvance = paymentTypeParam === 'advance' && Boolean(course?.advancePrice && course.advancePrice > 0);
  const expectedAmount = isAdvance ? Number(course.advancePrice) : Number(course?.price || 0);
  const paymentTypeTitle = isAdvance ? 'Advance' : 'Full';

  const studentIdentifier = profile?.displayName || user?.displayName || 'Student';
  const paymentMessage = `${paymentConfig.defaultMessage || 'Anivox Academy Course Payment'} - ${studentIdentifier} - ${course?.title || 'Course'}`.trim();

  useEffect(() => {
    if (!course || !paymentConfig.upiId || expectedAmount <= 0) return;

    const upiUri = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(paymentConfig.paymentName)}&am=${expectedAmount}&cu=INR&tn=${encodeURIComponent(paymentMessage)}`;

    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 2,
      color: {
        dark: '#18181b',
        light: '#ffffff'
      }
    }).then(url => {
      setQrCodeUrl(url);
    }).catch(qrErr => {
      console.error("Error rendering QR Code:", qrErr);
    });
  }, [course, paymentConfig, expectedAmount, paymentMessage]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(paymentConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !course) return;

    const cleanUtr = utr.trim();
    if (!cleanUtr) {
      setError('UTR number is required.');
      return;
    }
    if (cleanUtr.length < 6) {
      setError('Please provide a valid UTR / Transaction reference number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'payments'), {
        studentId: user.uid,
        courseId: course.id,
        amount: expectedAmount,
        expectedAmount: expectedAmount,
        paymentType: isAdvance ? 'Advance' : 'Full',
        utr: cleanUtr,
        screenshotUrl: screenshotUrl || '',
        status: 'Pending Verification',
        submittedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      });

      const enrQuery = query(
        collection(db, 'enrollments'),
        where('studentId', '==', user.uid),
        where('courseId', '==', course.id)
      );
      const enrSnap = await getDocs(enrQuery);

      if (enrSnap.empty) {
        await addDoc(collection(db, 'enrollments'), {
          studentId: user.uid,
          courseId: course.id,
          status: 'pending',
          paymentStatus: 'Pending Verification',
          amountPaid: expectedAmount,
          enrolledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'enrollments', enrSnap.docs[0].id), {
          paymentStatus: 'Pending Verification',
          updatedAt: serverTimestamp(),
        });
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Error submitting payment:", err);
      setError(err.message || 'Failed to record payment submission. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-12 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-lg p-8 sm:p-10 text-center space-y-6">
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Pending Verification
            </span>
            <h1 className="text-2xl font-display font-bold text-neutral-900 pt-1">Payment Submitted</h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Your payment of <strong className="text-neutral-800">₹{expectedAmount}</strong> for <strong>{course?.title}</strong> (UTR: <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-xs font-mono">{utr}</code>) has been submitted for admin verification.
            </p>
          </div>

          <div className="bg-[#FAF8FA] p-4 rounded-2xl border border-neutral-100 text-left text-xs space-y-1.5 text-neutral-600">
            <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              Next Steps
            </p>
            <p className="text-[11px] leading-relaxed">
              Our admin team verifies your UTR against bank records. Once verified, your course and live studio classroom access will be activated immediately.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Button onClick={() => navigate('/my-courses')} className="w-full h-11 rounded-2xl bg-neutral-900 text-white font-bold text-xs">
              View My Courses
            </Button>
            <Button variant="outline" onClick={() => navigate('/payments')} className="w-full h-11 rounded-2xl border-neutral-200 font-bold text-xs">
              View Payment Receipts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-24 text-center space-y-3">
        <h1 className="text-xl font-bold text-neutral-900">Course Unavailable</h1>
        <p className="text-xs text-neutral-500">The selected course is not available for enrollment.</p>
        <Link to="/courses">
          <Button variant="outline" className="rounded-xl">Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => navigate(`/courses/${course.id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200/80 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Course
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: QR Code Card */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                  Secure UPI Checkout
                </span>
                <h2 className="text-xl font-display font-bold text-neutral-900">Scan & Pay</h2>
              </div>
              <span className="text-xs px-3 py-1 bg-purple-50 text-purple-800 font-bold rounded-full uppercase">
                {paymentTypeTitle} Payment
              </span>
            </div>

            {/* QR Code Container */}
            <div className="bg-[#FAF8FA] p-6 rounded-3xl border border-neutral-100 flex flex-col items-center text-center space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200/80">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="UPI Payment QR" className="w-52 h-52 rounded-xl" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-neutral-300">
                    <QrCode className="h-16 w-16 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-bold text-neutral-800">
                  Scan with any UPI App
                </p>
                <p className="text-[11px] text-neutral-400">
                  GPay · PhonePe · Paytm · BHIM · Banking Apps
                </p>
              </div>
            </div>

            {/* Amount & UPI Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                    Payable Amount
                  </span>
                  <span className="text-2xl font-display font-bold text-neutral-900">
                    ₹{expectedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Verified Fee
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#FAF8FA] rounded-2xl border border-neutral-100">
                <div className="overflow-hidden pr-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                    Academy UPI ID
                  </span>
                  <span className="text-xs font-mono font-medium text-neutral-900 truncate block">
                    {paymentConfig.upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shrink-0 transition-colors shadow-2xs"
                >
                  {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: UTR Reference Submission */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-neutral-100 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                Verification Step
              </span>
              <h2 className="text-xl font-display font-bold text-neutral-900">
                Submit Transaction Reference
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Enter your 12-digit UTR / UPI Ref ID after completing the transfer.
              </p>
            </div>

            {/* Student Summary */}
            <div className="bg-[#FAF8FA] p-4 rounded-2xl border border-neutral-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Course:</span>
                <span className="font-semibold text-neutral-900 truncate max-w-[200px]">{course.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Student:</span>
                <span className="font-semibold text-neutral-900">{profile?.displayName || user?.displayName}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-neutral-200/60">
                <span className="text-neutral-500">Total Payable:</span>
                <span className="font-bold text-purple-800">₹{expectedAmount} ({paymentTypeTitle})</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block">
                  12-Digit UTR / Transaction Reference <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 423456789012"
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none font-mono text-sm tracking-wide bg-white"
                  value={utr}
                  onChange={(e) => {
                    setUtr(e.target.value);
                    if (error) setError(null);
                  }}
                />
                <p className="text-[11px] text-neutral-400">
                  Find the UTR / UPI Ref ID in your transaction history receipt.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block">
                  Screenshot / Receipt <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <FileUpload
                  label=""
                  accept="image/*"
                  folder={`payments/receipts/${user?.uid}`}
                  currentUrl={screenshotUrl}
                  onUploadComplete={(url) => setScreenshotUrl(url)}
                  helperText="Upload an image of your payment confirmation screen (optional)."
                />
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200/60 rounded-2xl flex gap-2.5 text-xs text-amber-900">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Verification Notice:</strong> Every payment is checked against academy bank statements. Once verified, enrollment access is granted automatically.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying Submission...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4" />
                    Submit Payment for Verification
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
