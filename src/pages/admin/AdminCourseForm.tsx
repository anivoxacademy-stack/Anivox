import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { FileUpload } from '../../components/ui/FileUpload';
import { MuxVideoUpload } from '../../components/admin/MuxVideoUpload';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  Video, 
  Film, 
  Layers, 
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxStatus?: string;
  duration: string;
  isFreePreview: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export function AdminCourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    shortDescription: '',
    description: '',
    thumbnail: '',
    banner: '',
    instructor: 'G. Chandu',
    category: 'Animation',
    difficulty: 'Beginner',
    price: 0,
    advancePrice: 0,
    duration: '',
    totalLessons: 0,
    schedule: 'Mon, Wed, Fri 7:00 PM IST',
    status: 'Draft',
    language: 'English & Telugu',
    startDate: '',
    endDate: '',
    maxStudents: 30,
    learningOutcomes: ['Master industry-standard animation workflows', 'Build a production-ready creative portfolio'],
    requirements: ['Computer with internet connection', 'Basic familiarity with digital creative tools'],
    modules: [] as Module[]
  });

  useEffect(() => {
    if (id) {
      const fetchCourse = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'courses', id));
          if (docSnap.exists()) {
            const data = docSnap.data();
            const thumbUrl = data.thumbnail || data.thumbnailUrl || '';
            const banUrl = data.banner || data.bannerUrl || '';
            setFormData(prev => ({
              ...prev,
              ...data,
              thumbnail: thumbUrl,
              thumbnailUrl: thumbUrl,
              banner: banUrl,
              bannerUrl: banUrl,
              learningOutcomes: data.learningOutcomes?.length ? data.learningOutcomes : [''],
              requirements: data.requirements?.length ? data.requirements : [''],
              modules: data.modules || []
            }));
          }
        } catch (error) {
          console.error("Error fetching course for edit:", error);
          setErrorMessage("Failed to load course details.");
        } finally {
          setFetching(false);
        }
      };
      fetchCourse();
    }
  }, [id]);

  const balancePrice = Math.max(0, (formData.price || 0) - (formData.advancePrice || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    // Validate that images are valid permanent HTTP/HTTPS URLs (not blob or base64)
    if (formData.thumbnail && formData.thumbnail.startsWith('blob:')) {
      setErrorMessage('Thumbnail upload is still processing or temporary. Please re-select or wait for upload to complete.');
      setLoading(false);
      return;
    }
    if (formData.banner && formData.banner.startsWith('blob:')) {
      setErrorMessage('Banner upload is still processing or temporary. Please re-select or wait for upload to complete.');
      setLoading(false);
      return;
    }

    try {
      const thumbUrl = formData.thumbnail || '';
      const banUrl = formData.banner || '';

      const cleanedData = {
        ...formData,
        thumbnail: thumbUrl,
        thumbnailUrl: thumbUrl,
        banner: banUrl,
        bannerUrl: banUrl,
        price: Number(formData.price) || 0,
        advancePrice: Number(formData.advancePrice) || 0,
        balancePrice,
        totalLessons: formData.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || Number(formData.totalLessons) || 0,
        maxStudents: Number(formData.maxStudents) || 30,
        learningOutcomes: formData.learningOutcomes.filter(i => i && i.trim()),
        requirements: formData.requirements.filter(i => i && i.trim()),
        updatedAt: serverTimestamp(),
      };

      if (id) {
        await updateDoc(doc(db, 'courses', id), cleanedData);
      } else {
        await addDoc(collection(db, 'courses'), {
          ...cleanedData,
          createdAt: serverTimestamp(),
        });
      }
      navigate('/admin/courses');
    } catch (error: any) {
      console.error("Error saving course:", error);
      setErrorMessage(error.message || "Failed to save course. Check permissions.");
    } finally {
      setLoading(false);
    }
  };

  // Module & Lesson Management
  const addModule = () => {
    const newModule: Module = {
      id: 'mod_' + Date.now(),
      title: `Module ${formData.modules.length + 1}: Foundations`,
      lessons: []
    };
    setFormData({ ...formData, modules: [...formData.modules, newModule] });
  };

  const removeModule = (mIdx: number) => {
    const newMods = formData.modules.filter((_, idx) => idx !== mIdx);
    setFormData({ ...formData, modules: newMods });
  };

  const updateModuleTitle = (mIdx: number, title: string) => {
    const newMods = [...formData.modules];
    newMods[mIdx].title = title;
    setFormData({ ...formData, modules: newMods });
  };

  const addLesson = (mIdx: number) => {
    const newLesson: Lesson = {
      id: 'les_' + Date.now(),
      title: `Lesson ${formData.modules[mIdx].lessons.length + 1}`,
      description: '',
      videoUrl: '',
      duration: '15m',
      isFreePreview: false
    };
    const newMods = [...formData.modules];
    newMods[mIdx].lessons.push(newLesson);
    setFormData({ ...formData, modules: newMods });
  };

  const updateLesson = (mIdx: number, lIdx: number, updates: Partial<Lesson>) => {
    const newMods = [...formData.modules];
    newMods[mIdx].lessons[lIdx] = { ...newMods[mIdx].lessons[lIdx], ...updates };
    setFormData({ ...formData, modules: newMods });
  };

  const removeLesson = (mIdx: number, lIdx: number) => {
    const newMods = [...formData.modules];
    newMods[mIdx].lessons = newMods[mIdx].lessons.filter((_, idx) => idx !== lIdx);
    setFormData({ ...formData, modules: newMods });
  };

  const updateArrayField = (field: 'learningOutcomes' | 'requirements', index: number, value: string) => {
    const newArr = [...formData[field]];
    newArr[index] = value;
    setFormData({ ...formData, [field]: newArr });
  };

  const addArrayItem = (field: 'learningOutcomes' | 'requirements') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (field: 'learningOutcomes' | 'requirements', index: number) => {
    const newArr = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArr.length ? newArr : [''] });
  };

  if (fetching) {
    return (
      <AdminLayout>
        <div className="p-24 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <button 
          onClick={() => navigate('/admin/courses')}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </button>

        {errorMessage && (
          <div className="p-4 rounded-xl text-sm font-medium bg-red-50 text-red-800 border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">
                {id ? 'Edit Course' : 'Create New Course'}
              </h1>
              <p className="text-sm text-neutral-500">Configure catalog information, prices, and upload direct lesson videos.</p>
            </div>
            <Button type="submit" className="gap-2 h-11 px-6 font-semibold" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save & Publish Course
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* General Course Info */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
                <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-xs border-b border-neutral-100 pb-2">
                  General Information
                </h3>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Course Title *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none text-sm"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Category *</label>
                    <select 
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option>Animation</option>
                      <option>Photoshop</option>
                      <option>3D & VFX</option>
                      <option>Art & Illustration</option>
                      <option>Motion Design</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Difficulty Level *</label>
                    <select 
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white text-sm"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>All Levels</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Instructor</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none"
                      value={formData.instructor}
                      onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 12 Weeks"
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Language</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none"
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Short Summary</label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 text-sm resize-none focus:outline-none"
                    placeholder="Brief 1-2 sentence hook displayed on course cards."
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Full Description</label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none"
                    placeholder="Comprehensive course syllabus, background, and overview."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Direct Media Uploads */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-5">
                <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-xs border-b border-neutral-100 pb-2">
                  Course Media & Cover Images (Upload File or Use Link)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FileUpload
                    label="Course Thumbnail Image *"
                    accept="image/*"
                    folder="courses/thumbnails"
                    currentUrl={formData.thumbnail || (formData as any).thumbnailUrl}
                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, thumbnail: url, thumbnailUrl: url }))}
                    helperText="Upload 16:9 thumbnail file or paste an image URL."
                  />
                  <FileUpload
                    label="Course Banner (Optional)"
                    accept="image/*"
                    folder="courses/banners"
                    currentUrl={formData.banner || (formData as any).bannerUrl}
                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, banner: url, bannerUrl: url }))}
                    helperText="Header banner file or external image link."
                  />
                </div>
              </div>

              {/* Learning Outcomes & Requirements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                    <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-xs">What Students Will Learn</h3>
                    <button type="button" onClick={() => addArrayItem('learningOutcomes')} className="text-brand-600 hover:text-brand-700">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {formData.learningOutcomes.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs focus:outline-none"
                        value={item}
                        onChange={(e) => updateArrayField('learningOutcomes', idx, e.target.value)}
                      />
                      <button type="button" onClick={() => removeArrayItem('learningOutcomes', idx)} className="text-neutral-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                    <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-xs">Requirements</h3>
                    <button type="button" onClick={() => addArrayItem('requirements')} className="text-brand-600 hover:text-brand-700">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {formData.requirements.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs focus:outline-none"
                        value={item}
                        onChange={(e) => updateArrayField('requirements', idx, e.target.value)}
                      />
                      <button type="button" onClick={() => removeArrayItem('requirements', idx)} className="text-neutral-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing, Status & Modules */}
            <div className="lg:col-span-5 space-y-6">
              {/* Pricing Card */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
                <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-xs border-b border-neutral-100 pb-2">
                  Pricing & Status Control
                </h3>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Catalog Status *</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white text-sm font-semibold"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Draft">Draft (Hidden)</option>
                    <option value="Published">Published (Public in Catalog)</option>
                    <option value="Coming Soon">Coming Soon</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <p className="text-[11px] text-neutral-400">Only Published courses appear publicly on the Courses page.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Full Price (₹) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 font-bold text-base focus:outline-none"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">Advance Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 font-bold text-base focus:outline-none"
                      value={formData.advancePrice}
                      onChange={(e) => setFormData({ ...formData, advancePrice: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex justify-between items-center text-xs">
                  <span className="text-neutral-500">Calculated Balance Due:</span>
                  <span className="font-bold text-neutral-900">₹{balancePrice.toLocaleString('en-IN')}</span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-sm font-medium text-neutral-700">Class Schedule</label>
                  <input
                    type="text"
                    placeholder="e.g. Mon & Wed 7:00 PM - 8:30 PM IST"
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none"
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  />
                </div>
              </div>

              {/* Lessons & Video Uploads Manager */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-xs">
                      Curriculum & Direct Video Lessons
                    </h3>
                    <p className="text-[11px] text-neutral-400">Directly upload MP4 video files from your device</p>
                  </div>
                  <Button type="button" size="sm" onClick={addModule} className="text-xs gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Module
                  </Button>
                </div>

                <div className="space-y-5">
                  {formData.modules.map((module, mIdx) => (
                    <div key={module.id} className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-brand-600 shrink-0" />
                        <input
                          type="text"
                          className="flex-1 font-semibold text-xs px-2 py-1 border border-neutral-200 rounded bg-white"
                          value={module.title}
                          onChange={(e) => updateModuleTitle(mIdx, e.target.value)}
                        />
                        <button type="button" onClick={() => removeModule(mIdx)} className="text-neutral-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Lessons inside Module */}
                      <div className="space-y-3 pl-2">
                        {module.lessons.map((lesson, lIdx) => (
                          <div key={lesson.id} className="bg-white p-3.5 rounded-xl border border-neutral-200/80 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <Film className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                              <input
                                type="text"
                                placeholder="Lesson Title"
                                className="flex-1 text-xs font-medium px-2 py-1 border border-neutral-200 rounded"
                                value={lesson.title}
                                onChange={(e) => updateLesson(mIdx, lIdx, { title: e.target.value })}
                              />
                              <button type="button" onClick={() => removeLesson(mIdx, lIdx)} className="text-neutral-400 hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Mux Direct Video Upload Component */}
                            <MuxVideoUpload
                              label="Lesson Video (Mux Direct Stream Upload)"
                              currentVideoUrl={lesson.videoUrl}
                              currentMuxPlaybackId={(lesson as any).muxPlaybackId}
                              currentMuxAssetId={(lesson as any).muxAssetId}
                              currentMuxStatus={(lesson as any).muxStatus}
                              onUploadComplete={(result) => updateLesson(mIdx, lIdx, {
                                videoUrl: result.videoUrl,
                                muxAssetId: result.muxAssetId,
                                muxPlaybackId: result.muxPlaybackId,
                                muxStatus: result.muxStatus
                              })}
                            />
                          </div>
                        ))}

                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addLesson(mIdx)} 
                          className="w-full text-xs gap-1 border-dashed"
                        >
                          <Plus className="h-3 w-3" /> Add Lesson to {module.title}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {formData.modules.length === 0 && (
                    <div className="py-8 text-center text-neutral-400 border border-dashed border-neutral-200 rounded-xl space-y-2">
                      <Film className="h-8 w-8 mx-auto text-neutral-300" />
                      <p className="text-xs">No curriculum modules added yet.</p>
                      <Button type="button" size="sm" variant="outline" onClick={addModule}>
                        Create First Module
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
