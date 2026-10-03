import React from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Share2, Plus, Trash2, Save, Loader2, Globe, Youtube, Instagram, MessageCircle, Send } from 'lucide-react';

interface SocialLinkItem {
  id: string;
  platform: string;
  displayName: string;
  url: string;
  active: boolean;
}

export function AdminSocialLinks() {
  const [links, setLinks] = React.useState<SocialLinkItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    const fetchSocialLinks = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'appSettings', 'socialLinks'));
        if (snap.exists() && Array.isArray(snap.data().links)) {
          setLinks(snap.data().links);
        } else {
          // Default template links (inactive by default, only activated when user adds real URL)
          setLinks([
            { id: '1', platform: 'YouTube', displayName: 'YouTube Channel', url: '', active: false },
            { id: '2', platform: 'Instagram', displayName: 'Instagram Page', url: '', active: false },
            { id: '3', platform: 'Telegram', displayName: 'Telegram Community', url: '', active: false },
            { id: '4', platform: 'WhatsApp', displayName: 'WhatsApp Support', url: '', active: false },
          ]);
        }
      } catch (err) {
        console.error('Error fetching social links:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSocialLinks();
  }, []);

  const handleAddLink = () => {
    setLinks([
      ...links,
      {
        id: Date.now().toString(),
        platform: 'Website',
        displayName: 'Official Website',
        url: '',
        active: true,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<SocialLinkItem>) => {
    setLinks(links.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      await setDoc(doc(db, 'appSettings', 'socialLinks'), {
        links,
        updatedAt: serverTimestamp(),
      });
      setStatusMessage({ text: 'Social links saved successfully!', type: 'success' });
    } catch (err) {
      console.error('Error saving social links:', err);
      setStatusMessage({ text: 'Failed to save social links.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-neutral-900">Social Links Management</h1>
                <p className="text-neutral-500 text-sm">Configure external community links. Links without URLs are hidden automatically.</p>
              </div>
            </div>
          </div>
          <Button onClick={handleAddLink} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Link
          </Button>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
            {links.map((link) => (
              <div key={link.id} className="p-4 rounded-xl border border-neutral-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="h-10 w-10 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-600 shrink-0">
                    {link.platform === 'YouTube' ? <Youtube className="h-5 w-5 text-red-600" /> :
                     link.platform === 'Instagram' ? <Instagram className="h-5 w-5 text-pink-600" /> :
                     link.platform === 'Telegram' ? <Send className="h-5 w-5 text-sky-500" /> :
                     link.platform === 'WhatsApp' ? <MessageCircle className="h-5 w-5 text-emerald-600" /> :
                     <Globe className="h-5 w-5 text-neutral-600" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      className="font-medium text-sm text-neutral-900 border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:outline-none w-full"
                      value={link.displayName}
                      onChange={(e) => handleUpdate(link.id, { displayName: e.target.value })}
                      placeholder="Display Name"
                    />
                    <select
                      value={link.platform}
                      onChange={(e) => handleUpdate(link.id, { platform: e.target.value })}
                      className="text-xs text-neutral-500 bg-transparent focus:outline-none"
                    >
                      <option value="YouTube">YouTube</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Telegram">Telegram</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Discord">Discord</option>
                      <option value="Website">Website</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 w-full md:w-auto px-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => handleUpdate(link.id, { url: e.target.value, active: Boolean(e.target.value.trim()) })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-600">
                    <input
                      type="checkbox"
                      checked={link.active && Boolean(link.url.trim())}
                      onChange={(e) => handleUpdate(link.id, { active: e.target.checked })}
                      disabled={!link.url.trim()}
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemove(link.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Social Links
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
