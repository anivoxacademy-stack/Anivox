import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Loader2, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/Button';

export function Courses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'courses'), where('status', '==', 'Published'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setCourses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.warn("Notice listening to courses:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = ['All', 'Animation', 'Photoshop', 'Art', 'Design', '3D Modeling', 'VFX'];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || course.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="py-12 sm:py-16 max-w-7xl mx-auto px-6 space-y-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800/80 pb-8">
        <div className="space-y-2 max-w-2xl">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
            Academy Catalog
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Professional Masterclasses & Programs
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Industry-led creative curriculum in 2D Animation, Digital Painting, Photoshop Artistry, and Character Design.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Search masterclasses..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-all"
          />
        </div>
      </div>

      {/* Category Filter Controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-xs font-mono font-medium rounded-lg transition-all whitespace-nowrap ${
              cat === activeCategory 
                ? 'bg-white text-neutral-950 font-bold' 
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-xs font-mono uppercase tracking-wider">Loading course catalog...</p>
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course) => {
            const imgUrl = course.thumbnailUrl || course.thumbnail || course.bannerUrl || course.banner;
            return (
              <div 
                key={course.id} 
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between group shadow-xl"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="aspect-[16/10] overflow-hidden bg-neutral-950 relative">
                  {imgUrl ? (
                    <img 
                      src={imgUrl} 
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
                      <BookOpen className="h-10 w-10 text-neutral-700" />
                      <span className="text-xs font-mono text-neutral-500">{course.title}</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md bg-neutral-950/80 backdrop-blur-md border border-neutral-700/80 text-white text-[10px] font-mono uppercase tracking-wider">
                      {course.category || 'Masterclass'}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    {/* Unboxed Metadata Discipline */}
                    <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                      <span>{course.duration || 'Flexible'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{course.difficulty || 'All Levels'}</span>
                      {course.instructorName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{course.instructorName}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-neutral-200 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {course.shortDescription || course.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase tracking-wider font-mono">Tuition Fee</span>
                      <span className="font-mono font-bold text-white text-lg">₹{course.price}</span>
                    </div>
                    <Button 
                      size="sm"
                      className="bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs rounded-xl h-9 px-4 gap-1.5"
                    >
                      <span>Explore</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/50 p-8 space-y-4">
          <BookOpen className="h-10 w-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No masterclasses match your search</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Try adjusting your query or resetting category selection.
          </p>
          <Button 
            onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
            className="bg-white text-neutral-950 text-xs font-bold px-5 h-9 rounded-xl"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
