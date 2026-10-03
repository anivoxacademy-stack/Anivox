import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { FileUpload } from '../components/ui/FileUpload';
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    age: '',
    city: '',
    photoURL: '',
    learningInterests: ''
  });

  useEffect(() => {
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
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone) {
      setError('Phone number is required.');
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
    setSuccess(false);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName.trim(),
        phone: trimmedPhone,
        age: parsedAge,
        city: formData.city.trim(),
        photoURL: formData.photoURL || '',
        learningInterests: formData.learningInterests.trim(),
        interests: formData.learningInterests.trim(),
        profileCompleted: true,
        updatedAt: serverTimestamp()
      });

      await refreshProfile();
      setSuccess(true);
      setTimeout(() => {
        navigate('/profile');
      }, 800);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-16 max-w-xl mx-auto">
      <button 
        onClick={() => navigate('/profile')}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/80 text-xs font-bold text-neutral-700 hover:bg-neutral-50 shadow-2xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
      </button>

      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="border-b border-neutral-100 pb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
            Account Preferences
          </span>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Edit Profile</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Update your contact information, profile avatar, and learning interests.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Profile updated successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Google Account Email
            </label>
            <input
              disabled
              type="text"
              className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 bg-[#FAF8FA] text-neutral-400 font-mono text-xs cursor-not-allowed"
              value={user?.email || ''}
            />
          </div>

          <FileUpload
            label="Profile Photo Avatar"
            accept="image/*"
            folder={`profiles/${user?.uid}`}
            currentUrl={formData.photoURL}
            onUploadComplete={(url) => setFormData(prev => ({ ...prev, photoURL: url }))}
            helperText="Upload JPG, PNG (Max 5MB)."
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">
              Full Display Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="tel"
                placeholder="+91 9876543210"
                className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min="5"
                max="120"
                className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">City / Location</label>
            <input
              type="text"
              placeholder="e.g. Mumbai, Bengaluru"
              className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Creative Learning Interests</label>
            <textarea
              rows={2}
              placeholder="e.g. 2D Character Animation, Photoshop Matte Painting, 3D Rigging"
              className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              value={formData.learningInterests}
              onChange={(e) => setFormData({ ...formData, learningInterests: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/profile')} 
              className="rounded-2xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-6"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
