import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { FileUpload } from '../../components/ui/FileUpload';
import { Save, Loader2, CheckCircle2, QrCode, AlertCircle, Copy, Eye } from 'lucide-react';
import QRCode from 'qrcode';

export function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    upiId: '',
    paymentName: 'Anivox Academy',
    defaultMessage: 'Anivox Academy Course Payment',
    instructions: '1. Scan the QR code using any UPI app (GPay, PhonePe, Paytm, etc.).\n2. Pay the exact displayed amount.\n3. Note down the 12-digit UTR / Transaction Reference number.\n4. Submit the UTR number for verification.',
    qrImageUrl: '',
    enabled: true
  });

  // Course preview state
  const [courses, setCourses] = useState<any[]>([]);
  const [previewCourseId, setPreviewCourseId] = useState<string>('');
  const [previewType, setPreviewType] = useState<'full' | 'advance'>('full');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const settingsSnap = await getDoc(doc(db, 'appSettings', 'payment'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setFormData({
            upiId: data.upiId || '',
            paymentName: data.paymentName || 'Anivox Academy',
            defaultMessage: data.defaultMessage || 'Anivox Academy Course Payment',
            instructions: data.instructions || '',
            qrImageUrl: data.qrImageUrl || '',
            enabled: data.enabled !== undefined ? data.enabled : true,
          });
        }

        const coursesSnap = await getDocs(collection(db, 'courses'));
        const list = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        setCourses(list);
        if (list.length > 0) {
          setPreviewCourseId(list[0].id);
        }
      } catch (err) {
        console.error("Error fetching payment settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update dynamic QR preview when preview parameters or formData change
  useEffect(() => {
    const selectedCourse = courses.find(c => c.id === previewCourseId);
    const amount = selectedCourse
      ? (previewType === 'advance' && selectedCourse.advancePrice ? selectedCourse.advancePrice : selectedCourse.price || 0)
      : 10000;

    const courseTitle = selectedCourse?.title || 'Animation Masterclass';
    const message = `${formData.defaultMessage || 'Anivox Academy Course Payment'} - ${courseTitle}`.trim();
    const upiUri = `upi://pay?pa=${encodeURIComponent(formData.upiId || 'anivox@upi')}&pn=${encodeURIComponent(formData.paymentName || 'Anivox Academy')}&am=${amount}&cu=INR&tn=${encodeURIComponent(message)}`;

    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 2,
      color: {
        dark: '#171717',
        light: '#ffffff'
      }
    }).then(url => {
      setQrCodeDataUrl(url);
    }).catch(err => {
      console.error("QR generation error:", err);
    });
  }, [formData.upiId, formData.paymentName, formData.defaultMessage, previewCourseId, previewType, courses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await setDoc(doc(db, 'appSettings', 'payment'), {
        ...formData,
        upiId: formData.upiId.trim(),
        paymentName: formData.paymentName.trim(),
        defaultMessage: formData.defaultMessage.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setSuccessMessage('Payment settings updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Error saving payment settings:", err);
      setErrorMessage(err.message || 'Failed to update payment settings.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCourse = courses.find(c => c.id === previewCourseId);
  const currentPreviewAmount = selectedCourse
    ? (previewType === 'advance' && selectedCourse.advancePrice ? selectedCourse.advancePrice : selectedCourse.price || 0)
    : 10000;

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Payment Settings</h1>
            <p className="text-neutral-500">Configure academy UPI receiving ID, payment messages, and preview payment QR codes.</p>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl mb-6 text-sm font-medium bg-green-50 text-green-800 border border-green-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl mb-6 text-sm font-medium bg-red-50 text-red-800 border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Configuration Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-3">
                  UPI Receiver Details
                </h2>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">
                    UPI ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. anivoxacademy@okaxis or your-vpa@upi"
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none font-mono text-sm"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  />
                  <p className="text-[11px] text-neutral-400">All student checkout payments will route directly to this UPI VPA.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Academy / Merchant Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                    value={formData.paymentName}
                    onChange={(e) => setFormData({ ...formData, paymentName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Default Payment Note / Message <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                    value={formData.defaultMessage}
                    onChange={(e) => setFormData({ ...formData, defaultMessage: e.target.value })}
                  />
                  <p className="text-[11px] text-neutral-400">Prefilled into the UPI transaction note (`tn`).</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Payment Instructions</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm resize-none font-sans"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  />
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-neutral-900 block">Enable UPI Payments</label>
                    <p className="text-xs text-neutral-400">Allow students to enroll and checkout via UPI</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-brand-600 rounded cursor-pointer"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                </div>
              </div>

              {/* Optional Custom QR Image Upload */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-3">
                  Custom Static QR Image (Optional)
                </h2>
                <FileUpload
                  label="Upload Custom Academy UPI QR (Optional)"
                  accept="image/*"
                  folder="branding/qr"
                  currentUrl={formData.qrImageUrl}
                  onUploadComplete={(url) => setFormData({ ...formData, qrImageUrl: url })}
                  helperText="If provided, this uploaded QR image will be shown alongside the dynamic QR code."
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full h-11 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Payment Settings
              </Button>
            </form>

            {/* Live QR Preview Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-brand-600" />
                    Live QR Preview
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">
                    Student View
                  </span>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                    Simulate Course Payment:
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs font-medium bg-white focus:outline-none"
                    value={previewCourseId}
                    onChange={(e) => setPreviewCourseId(e.target.value)}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} (₹{c.price})
                      </option>
                    ))}
                    {courses.length === 0 && <option value="">No published courses</option>}
                  </select>

                  {selectedCourse?.advancePrice ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewType('full')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                          previewType === 'full' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        Full (₹{selectedCourse.price})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewType('advance')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                          previewType === 'advance' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        Advance (₹{selectedCourse.advancePrice})
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Rendered QR Card */}
                <div className="border border-neutral-200 rounded-xl p-5 bg-neutral-50/70 flex flex-col items-center text-center space-y-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-neutral-100">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="UPI Payment QR Code" className="w-48 h-48 rounded" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-neutral-300">
                        <QrCode className="h-16 w-16" />
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-2 text-left bg-white p-4 rounded-xl border border-neutral-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-500">Payable Amount:</span>
                      <span className="font-bold text-base text-neutral-900">₹{currentPreviewAmount}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-500">Receiver UPI ID:</span>
                      <span className="font-mono font-medium text-neutral-800">{formData.upiId || 'Not configured'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-500">Payee Name:</span>
                      <span className="font-medium text-neutral-800">{formData.paymentName || 'Anivox Academy'}</span>
                    </div>
                    <div className="flex justify-between items-start text-xs pt-1 border-t border-neutral-100">
                      <span className="text-neutral-500">Payment Note:</span>
                      <span className="font-medium text-neutral-800 text-right max-w-[200px] truncate">
                        {formData.defaultMessage} - {selectedCourse?.title || 'Course'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    The payment amount is locked to exactly ₹{currentPreviewAmount}. Students cannot tamper with this value.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
