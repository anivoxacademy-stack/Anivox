import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { FileUpload } from '../components/ui/FileUpload';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, Mail } from 'lucide-react';

export function ProfileSetup() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phone: '',
    age: '',
    city: '',
    photoURL: user?.photoURL || '',
    learningInterests: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If user already has a complete profile with required fields, never show onboarding again
    if (profile && (profile.profileCompleted === true || profile.phone) && profile.displayName && profile.phone) {
      navigate('/', { replace: true });
      return;
    }

    if (profile) {
      setFormData({
        displayName: profile.displayName || user?.displayName || '',
        phone: profile.phone || '',
        age: profile.age ? String(profile.age) : '',
        city: profile.city || '',
        photoURL: profile.photoURL || user?.photoURL || '',
        learningInterests: profile.learningInterests || profile.interests || ''
      });
    }
  }, [profile, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone) {
      setError('Phone number is required to complete your student profile.');
      return;
    }
    if (trimmedPhone.length < 8) {
      setError('Please provide a valid phone number with country code (e.g. +91 9876543210).');
      return;
    }

    const parsedAge = parseInt(formData.age, 10);
    if (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 120) {
      setError('Please enter a valid age between 5 and 120.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userPayload: any = {
        uid: user.uid,
        email: user.email || '',
        displayName: formData.displayName.trim(),
        phone: trimmedPhone,
        age: parsedAge,
        city: formData.city.trim(),
        photoURL: formData.photoURL || user.photoURL || '',
        learningInterests: formData.learningInterests.trim(),
        interests: formData.learningInterests.trim(),
        profileCompleted: true,
        role: profile?.role || 'student',
        status: profile?.status || 'active',
        updatedAt: serverTimestamp()
      };

      if (!profile?.createdAt) {
        userPayload.createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'users', user.uid), userPayload, { merge: true });

      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error("Error saving student profile:", err);
      setError(err?.message || 'Failed to save profile. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 bg-neutral-50 min-h-screen">
      <div className="container mx-auto px-6 max-w-xl">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 md:p-10 space-y-6">
          <div className="space-y-2 border-b border-neutral-100 pb-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600">
              <ShieldCheck className="h-4 w-4" />
              <span>Step 1 of 1 · Mandatory Onboarding</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">Complete Your Student Profile</h1>
            <p className="text-sm text-neutral-500">
              Please complete your student profile to unlock enrollment, live classroom sessions, and course materials.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl text-sm font-medium bg-red-50 text-red-800 border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Auto-obtained Google Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Google Account Email
              </label>
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-neutral-100 rounded-lg border border-neutral-200 text-neutral-700 text-sm">
                <Mail className="h-4 w-4 text-neutral-400" />
                <span className="font-medium font-mono text-xs">{user?.email}</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded">
                  Verified Google Account
                </span>
              </div>
            </div>

            {/* Profile Photo (Optional Direct Upload) */}
            <FileUpload
              label="Profile Photo (Optional)"
              accept="image/*"
              folder={`profiles/${user?.uid}`}
              currentUrl={formData.photoURL}
              onUploadComplete={(url) => setFormData({ ...formData, photoURL: url })}
              helperText="Upload your real photo from your device or camera."
            />

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>

            {/* Phone Number - REQUIRED */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700">
                  Phone Number <span className="text-red-500">* REQUIRED</span>
                </label>
                <span className="text-[11px] text-neutral-400">For course updates & alerts</span>
              </div>
              <input
                required
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Age & City */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="5"
                  max="120"
                  placeholder="22"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Hyderabad"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            {/* Learning Interests */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">
                Learning Interests (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm resize-none"
                placeholder="What creative skills or animation workflows are you looking to master?"
                value={formData.learningInterests}
                onChange={(e) => setFormData({ ...formData, learningInterests: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-sm font-semibold gap-2 mt-4" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save & Enter Academy
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
