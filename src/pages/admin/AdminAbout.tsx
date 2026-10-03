import React from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Save, Loader2 } from 'lucide-react';

export function AdminAbout() {
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = React.useState({
    academyName: 'Anivox Academy',
    creator: 'G. Chandu',
    description: '',
    mission: '',
    teachingPhilosophy: '',
    instructorInfo: '',
  });

  React.useEffect(() => {
    const fetchAbout = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'appSettings', 'about'));
        if (docSnap.exists()) {
          setFormData({ ...formData, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching about for admin:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchAbout();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      await setDoc(doc(db, 'appSettings', 'about'), {
        ...formData,
        updatedAt: serverTimestamp(),
      });
      setStatusMessage({ text: 'About page content updated successfully!', type: 'success' });
    } catch (error) {
      console.error("Error saving about content:", error);
      setStatusMessage({ text: 'Failed to save content. Check console for details.', type: 'error' });
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
          <h1 className="text-2xl font-display font-bold text-neutral-900">Manage About Content</h1>
          <p className="text-neutral-500">Update the information displayed on the public About page.</p>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Academy Name</label>
                <input
                  required
                  className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  value={formData.academyName}
                  onChange={(e) => setFormData({ ...formData, academyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Creator Name</label>
                <input
                  required
                  className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  value={formData.creator}
                  onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Description</label>
              <textarea
                rows={4}
                required
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Briefly describe the academy..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Mission Statement</label>
              <textarea
                rows={3}
                required
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                value={formData.mission}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Teaching Philosophy</label>
              <textarea
                rows={3}
                required
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                value={formData.teachingPhilosophy}
                onChange={(e) => setFormData({ ...formData, teachingPhilosophy: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Instructor Information</label>
              <textarea
                rows={4}
                required
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                value={formData.instructorInfo}
                onChange={(e) => setFormData({ ...formData, instructorInfo: e.target.value })}
              />
            </div>

            <Button type="submit" className="gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save About Content
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
