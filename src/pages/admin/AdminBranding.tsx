import React from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { FileUpload } from '../../components/ui/FileUpload';
import { Save, Loader2, Palette } from 'lucide-react';

export function AdminBranding() {
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = React.useState({
    appName: 'Anivox Academy',
    tagline: 'Professional training for modern creators.',
    logoUrl: '',
    faviconUrl: '',
    accentColor: '#6366f1',
    supportEmail: 'support@anivox.com',
    supportPhone: '',
  });

  React.useEffect(() => {
    const fetchBranding = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'appSettings', 'branding'));
        if (docSnap.exists()) {
          setFormData({ ...formData, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching branding for admin:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchBranding();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      await setDoc(doc(db, 'appSettings', 'branding'), {
        ...formData,
        updatedAt: serverTimestamp(),
      });
      setStatusMessage({ text: 'Branding updated successfully! The app will reflect these changes on refresh.', type: 'success' });
    } catch (error) {
      console.error("Error saving branding:", error);
      setStatusMessage({ text: 'Failed to save branding.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AdminLayout>
        <div className="p-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Branding & Identity</h1>
          <p className="text-neutral-500">Configure your academy's visual identity and contact info.</p>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">General</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">App Name</label>
                  <input
                    required
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    value={formData.appName}
                    onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Tagline</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Visuals</h3>
                <FileUpload
                  label="Academy Logo Image"
                  accept="image/*"
                  folder="branding/logo"
                  currentUrl={formData.logoUrl}
                  onUploadComplete={(url) => setFormData({ ...formData, logoUrl: url })}
                  helperText="Upload PNG, SVG, or WebP logo file or paste an external image link."
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-10 rounded border border-neutral-200 p-1"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    />
                    <input
                      className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Support Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Support Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Support Phone</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-50 flex justify-end">
              <Button type="submit" className="gap-2 px-8 h-12" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Branding
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
