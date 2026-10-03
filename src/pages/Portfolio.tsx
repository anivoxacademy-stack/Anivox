import React, { useState, useEffect } from 'react';
import { Loader2, ExternalLink, Image as ImageIcon, Briefcase, Plus, X, Save, Sparkles, User } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { FileUpload } from '../components/ui/FileUpload';

export function Portfolio() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    software: '',
    category: '2D Animation',
    tags: '',
    visibility: 'Public'
  });

  const fetchPortfolio = async () => {
    try {
      const q = query(
        collection(db, 'portfolios'), 
        where('visibility', '==', 'Public'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setProjects(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'portfolios'), {
        ...formData,
        studentId: user.uid,
        studentName: profile?.displayName || user.displayName || 'Student',
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        videoUrl: '',
        software: '',
        category: '2D Animation',
        tags: '',
        visibility: 'Public'
      });
      fetchPortfolio();
    } catch (error) {
      console.error("Error creating student portfolio project:", error);
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

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-purple-600" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Creative Gallery
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-neutral-900">
            Student Showcase
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Explore 2D/3D animations, character rigs, and visual art made by students of Anivox Academy.
          </p>
        </div>

        {user && (
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs h-11 px-5 gap-2 shadow-xs shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Project
          </Button>
        )}
      </div>

      {/* Gallery Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="aspect-[16/10] overflow-hidden bg-neutral-100 relative">
                {project.imageUrl ? (
                  <img 
                    src={project.imageUrl} 
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : project.videoUrl ? (
                  <video src={project.videoUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
                {project.category && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-xs">
                    {project.category}
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                    {project.software || 'Digital Art'}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5 font-medium text-neutral-700">
                    <User className="h-3.5 w-3.5 text-neutral-400" />
                    {project.studentName || 'Student Artist'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white border border-neutral-200/80 rounded-3xl p-8 space-y-3 shadow-sm max-w-md mx-auto">
          <div className="h-14 w-14 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No Projects Published Yet</h2>
          <p className="text-xs text-neutral-400">
            Be the first to publish your creative animation reel or concept artwork!
          </p>
          {user && (
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-neutral-900 text-white text-xs font-bold px-5 h-9 rounded-xl"
            >
              Upload Project
            </Button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-lg font-display font-bold text-neutral-900">Add Portfolio Artwork</h3>
                <p className="text-xs text-neutral-400">Showcase your animations or illustrations.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2D Character Walk Cycle"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800">Description</label>
                <textarea
                  rows={3}
                  placeholder="Tell about tools used, inspiration, and techniques..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-800">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white outline-none"
                  >
                    <option value="2D Animation">2D Animation</option>
                    <option value="3D Modeling">3D Modeling</option>
                    <option value="Digital Painting">Digital Painting</option>
                    <option value="Concept Art">Concept Art</option>
                    <option value="VFX & Compositing">VFX & Compositing</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-800">Software Used</label>
                  <input
                    type="text"
                    placeholder="e.g. Maya, Photoshop, Blender"
                    value={formData.software}
                    onChange={(e) => setFormData({ ...formData, software: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800">Project Image / Render</label>
                <FileUpload
                  label=""
                  accept="image/*"
                  folder={`portfolios/${user?.uid}`}
                  currentUrl={formData.imageUrl}
                  onUploadComplete={(url) => setFormData({ ...formData, imageUrl: url })}
                  helperText="Upload JPG, PNG artwork image."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-5"
                >
                  {submitting ? 'Publishing...' : 'Publish to Showcase'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
