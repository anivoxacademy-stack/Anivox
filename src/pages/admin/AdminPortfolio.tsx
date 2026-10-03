import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { FileUpload } from '../../components/ui/FileUpload';
import { Plus, Trash2, Edit2, Loader2, Save, X, ImageIcon, CheckCircle2, Film } from 'lucide-react';

export function AdminPortfolio() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    software: '',
    category: 'Digital Art',
    tags: 'concept-art, 2d-animation',
    visibility: 'Public',
  });

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'portfolios'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching admin portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'portfolios', editingId), data);
      } else {
        await addDoc(collection(db, 'portfolios'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setIsFormOpen(false);
      setEditId(null);
      resetForm();
      fetchPortfolio();
    } catch (error) {
      console.error("Error saving portfolio project:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      videoUrl: '',
      software: '',
      category: 'Digital Art',
      tags: '',
      visibility: 'Public',
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this portfolio project?')) {
      try {
        await deleteDoc(doc(db, 'portfolios', id));
        fetchPortfolio();
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const startEdit = (project: any) => {
    setFormData({
      title: project.title || '',
      description: project.description || '',
      imageUrl: project.imageUrl || '',
      videoUrl: project.videoUrl || '',
      software: project.software || '',
      category: project.category || 'Digital Art',
      tags: project.tags || '',
      visibility: project.visibility || 'Public',
    });
    setEditId(project.id);
    setIsFormOpen(true);
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Portfolio Management</h1>
            <p className="text-neutral-500">Showcase student and academy animation artwork, 3D renders, and video projects.</p>
          </div>
          <Button className="gap-2 h-11" onClick={() => { resetForm(); setEditId(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Project
          </Button>
        </div>

        {isFormOpen && (
          <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm relative space-y-6">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-900">
                {editingId ? 'Edit Project' : 'New Portfolio Project'}
              </h2>
              <p className="text-xs text-neutral-400">Directly upload images or animation clips from your device.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Project Title *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Category</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option>Digital Art</option>
                      <option>2D Animation</option>
                      <option>3D & VFX</option>
                      <option>Character Design</option>
                      <option>Motion Graphics</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Visibility</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white text-sm"
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    >
                      <option value="Public">Public (Showcased)</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Software Used</label>
                    <input
                      placeholder="e.g. Maya, Blender, After Effects"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none"
                      value={formData.software}
                      onChange={(e) => setFormData({ ...formData, software: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Tags</label>
                    <input
                      placeholder="e.g. 3d, rigging, lighting"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Description</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm resize-none focus:outline-none"
                    placeholder="Techniques used, production workflow, or concept details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Direct Media Uploads */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <FileUpload
                    label="Project Artwork / Thumbnail Image"
                    accept="image/*"
                    folder="portfolios/images"
                    currentUrl={formData.imageUrl}
                    onUploadComplete={(url) => setFormData({ ...formData, imageUrl: url })}
                    helperText="Upload JPG/PNG directly from device."
                  />

                  <FileUpload
                    label="Project Video / Demo Reel (Optional)"
                    accept="video/*"
                    folder="portfolios/videos"
                    currentUrl={formData.videoUrl}
                    onUploadComplete={(url) => setFormData({ ...formData, videoUrl: url })}
                    helperText="Upload MP4 animation clip directly from device (up to 500MB)."
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={submitting} className="h-11 px-6 gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Project
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
              <div className="aspect-video relative overflow-hidden bg-neutral-100">
                {project.imageUrl ? (
                  <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
                ) : project.videoUrl ? (
                  <video src={project.videoUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
                  {project.visibility}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block">
                    {project.category} · {project.software || 'Creative'}
                  </span>
                  <h3 className="font-bold text-neutral-900 text-base mt-0.5">{project.title}</h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{project.description}</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button 
                    onClick={() => startEdit(project)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(project.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-600 rounded-lg hover:bg-neutral-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {projects.length === 0 && !loading && (
            <div className="col-span-3 py-16 text-center text-neutral-400 bg-white rounded-2xl border border-dashed border-neutral-200 space-y-2">
              <ImageIcon className="h-8 w-8 mx-auto text-neutral-300" />
              <p className="text-xs font-semibold">No portfolio projects published yet.</p>
              <Button size="sm" onClick={() => { resetForm(); setIsFormOpen(true); }}>
                Add First Project
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
