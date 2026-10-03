import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Play, 
  Palette, 
  Loader2, 
  BookOpen, 
  Radio, 
  Sparkles, 
  ChevronDown, 
  Clock,
  User,
  Shield,
  Award,
  Star,
  CheckCircle2
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';

export function PublicHome() {
  const navigate = useNavigate();
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [showcaseProjects, setShowcaseProjects] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showcaseLoading, setShowcaseLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    // 1. Fetch real published courses
    const qCourses = query(
      collection(db, 'courses'), 
      where('status', '==', 'Published'),
      limit(6)
    );

    const unsubCourses = onSnapshot(qCourses, (snapshot) => {
      setFeaturedCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCoursesLoading(false);
    }, (error) => {
      console.warn("Notice listening to published courses:", error);
      setCoursesLoading(false);
    });

    // 2. Fetch real public student portfolios for showcase
    const fetchShowcase = async () => {
      try {
        const qPortfolio = query(
          collection(db, 'portfolios'),
          where('visibility', '==', 'Public'),
          limit(3)
        );
        const snap = await getDocs(qPortfolio);
        setShowcaseProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.warn("Notice loading showcase:", err);
      } finally {
        setShowcaseLoading(false);
      }
    };

    fetchShowcase();

    return () => unsubCourses();
  }, []);

  const faqs = [
    {
      q: 'Do I need prior animation or drawing experience to enroll?',
      a: 'No prior experience is required. Our foundational modules start from core drawing principles, frame timing, and digital tool setups before progressing to studio-grade production workflows.'
    },
    {
      q: 'How do interactive live classrooms work at Anivox Academy?',
      a: 'Live masterclasses run directly in your browser. Instructors stream high-definition video, share screens, review student artwork live, and answer questions via real-time microphone or chat.'
    },
    {
      q: 'What software and drawing hardware will I need?',
      a: 'You will need a computer capable of running digital painting software (such as Photoshop, Clip Studio, or Krita), and a drawing tablet (Wacom, XP-Pen, Huion, or iPad) is recommended.'
    },
    {
      q: 'Are course recordings available if I miss a live session?',
      a: 'Yes, all live workshops are recorded in full high-definition and uploaded to your enrolled course dashboard so you can review lessons anytime.'
    },
    {
      q: 'Will I receive an official verified certificate upon completion?',
      a: 'Yes, students who submit their required module assignments and complete the final capstone project receive a verified Anivox Academy digital certificate.'
    }
  ];

  return (
    <div className="flex flex-col bg-neutral-950 text-white min-h-screen">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-neutral-800/80 bg-neutral-950 pt-12 pb-24">
        {/* Ambient Dark Overlay Backdrop */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/src/assets/images/hero_animation_studio_1790484559658.jpg" 
            alt="Anivox Creative Studio Environment"
            className="w-full h-full object-cover opacity-25 filter brightness-75 contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-transparent to-neutral-950" />
        </div>

        <div className="container mx-auto px-6 relative z-10 max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl space-y-8"
          >
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-700/80 text-neutral-300 text-xs font-mono tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span>Professional Creative Academy</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.05] text-balance">
              Master 2D Animation, Digital Art & Storytelling
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-neutral-300 max-w-2xl leading-relaxed font-normal">
              Industry-standard training designed by professional animators and visual artists. Learn through interactive live masterclasses, hands-on feedback, and studio-grade portfolio projects.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button 
                onClick={() => navigate('/courses')}
                size="lg" 
                className="bg-white text-neutral-950 hover:bg-neutral-200 font-bold px-8 h-13 rounded-xl shadow-lg transition-all text-sm gap-2"
              >
                <span>Explore Courses</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                size="lg" 
                variant="outline" 
                className="bg-transparent text-white border-neutral-700 hover:bg-neutral-900 font-bold px-8 h-13 rounded-xl transition-all text-sm"
              >
                Sign In to Learn
              </Button>
            </div>

            {/* Proof Metric Strip */}
            <div className="pt-8 border-t border-neutral-800/80 flex flex-wrap items-center gap-8 text-xs text-neutral-400 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span>Live Studio Feedback</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span>Recorded HD Archives</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span>Verified Industry Credentials</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. FEATURED COURSES SECTION */}
      <section className="py-24 bg-neutral-950 border-b border-neutral-800/80">
        <div className="container mx-auto px-6 max-w-7xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-16">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
                Studio Curriculum
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
                Featured Academy Programs
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Comprehensive courses crafted to develop practical mastery across animation pipelines, digital painting, and visual arts.
              </p>
            </div>
            
            <Link 
              to="/courses" 
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-white hover:text-neutral-300 transition-colors uppercase tracking-wider border-b border-neutral-700 pb-1"
            >
              <span>View All Programs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coursesLoading ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <p className="text-xs font-mono uppercase tracking-wider">Loading published courses...</p>
              </div>
            ) : featuredCourses.length > 0 ? (
              featuredCourses.map((course) => {
                const imgUrl = course.thumbnailUrl || course.thumbnail || course.bannerUrl || course.banner;
                return (
                  <div 
                    key={course.id} 
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="group cursor-pointer flex flex-col bg-neutral-900 border border-neutral-800 hover:border-neutral-500 transition-all duration-300 rounded-2xl overflow-hidden shadow-xl"
                  >
                    {/* Media Container */}
                    <div className="aspect-[16/10] bg-neutral-950 relative overflow-hidden">
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
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2 p-6 text-center">
                          <BookOpen className="h-10 w-10 text-neutral-700" />
                          <span className="text-xs font-mono text-neutral-500">{course.title}</span>
                        </div>
                      )}

                      {/* Category Tag Overlay */}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-md bg-neutral-950/80 backdrop-blur-md border border-neutral-700/80 text-white text-[10px] font-mono uppercase tracking-wider">
                          {course.category || 'Creative'}
                        </span>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-3">
                        {/* Unboxed Metadata Discipline */}
                        <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                          <span>{course.duration || '8 Weeks'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{course.difficulty || 'All Levels'}</span>
                          {course.instructorName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{course.instructorName}</span>
                            </>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-white group-hover:text-neutral-200 transition-colors line-clamp-1">
                          {course.title}
                        </h3>

                        <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {course.shortDescription || course.description || 'Master professional creative techniques in this guided academy module.'}
                        </p>
                      </div>

                      {/* Footer Row */}
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">Tuition Fee</span>
                          <span className="text-lg font-mono font-bold text-white">₹{course.price || 0}</span>
                        </div>
                        <span className="text-xs font-bold text-white group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          <span>Course Details</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/50 p-8 space-y-3">
                <BookOpen className="h-10 w-10 text-neutral-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Courses Registering</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  New animation and visual art masterclasses are being scheduled. Check back soon or view all catalog listings.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. VALUE PROPOSITION / ACADEMY ADVANTAGE */}
      <section className="py-24 bg-neutral-950 border-b border-neutral-800/80">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="max-w-xl mb-16 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
              Why Choose Anivox
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Built for Serious Creative Mastery
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed">
              We eliminate fluff and generic lectures, providing hands-on studio training designed to make you industry-ready.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-neutral-900/90 p-8 rounded-2xl border border-neutral-800 space-y-4 hover:border-neutral-700 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-white text-neutral-950 flex items-center justify-center font-bold">
                <Radio className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Interactive Live Classrooms</h3>
              <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                Participate in high-definition live workshops with real-time screen sharing, microphone questions, and direct live feedback on your artwork.
              </p>
            </div>

            <div className="bg-neutral-900/90 p-8 rounded-2xl border border-neutral-800 space-y-4 hover:border-neutral-700 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-white text-neutral-950 flex items-center justify-center font-bold">
                <Play className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Recorded HD Archives</h3>
              <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                Never worry about missing a session. Full high-definition recordings of every live class and assignment review are available 24/7 in your dashboard.
              </p>
            </div>

            <div className="bg-neutral-900/90 p-8 rounded-2xl border border-neutral-800 space-y-4 hover:border-neutral-700 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-white text-neutral-950 flex items-center justify-center font-bold">
                <Palette className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Studio Portfolio Projects</h3>
              <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                Develop verified character rigs, 2D animations, and digital illustrations ready for client commissions and studio job applications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. STUDENT SHOWCASE / PORTFOLIO HIGHLIGHT */}
      {showcaseProjects.length > 0 && (
        <section className="py-24 bg-neutral-950 border-b border-neutral-800/80">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-16">
              <div className="space-y-2 max-w-xl">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
                  Gallery Showcase
                </span>
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
                  Student & Instructor Artworks
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Real creative projects produced by students enrolled in Anivox Academy masterclasses.
                </p>
              </div>

              <Link 
                to="/portfolio" 
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-white hover:text-neutral-300 transition-colors uppercase tracking-wider border-b border-neutral-700 pb-1"
              >
                <span>View Full Gallery</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {showcaseProjects.map((project) => (
                <div 
                  key={project.id} 
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col justify-between group"
                >
                  <div className="aspect-[16/10] bg-neutral-950 overflow-hidden relative">
                    {project.imageUrl ? (
                      <img 
                        src={project.imageUrl} 
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Palette className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                      {project.category || 'Digital Art'}
                    </div>
                    <h4 className="font-bold text-white text-base line-clamp-1">{project.title}</h4>
                    <div className="flex items-center gap-2 pt-2 text-xs text-neutral-400 border-t border-neutral-800">
                      <User className="h-3.5 w-3.5 text-neutral-500" />
                      <span>{project.studentName || 'Academy Artist'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. HOW IT WORKS / ROADMAP */}
      <section className="py-24 bg-neutral-950 border-b border-neutral-800/80">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
              Roadmap
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Your Journey to Art Mastery
            </h2>
            <p className="text-neutral-400 text-sm">Four structured steps to build your creative career.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <span className="text-2xl font-mono font-bold text-neutral-600">01</span>
              <h4 className="font-bold text-base text-white">Select Program</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">Choose from 2D Frame-by-Frame Animation, Digital Painting, or Photoshop Artistry.</p>
            </div>
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <span className="text-2xl font-mono font-bold text-neutral-600">02</span>
              <h4 className="font-bold text-base text-white">Secure Seat</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">Complete instant UPI enrollment to activate your student profile and live class portal.</p>
            </div>
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <span className="text-2xl font-mono font-bold text-neutral-600">03</span>
              <h4 className="font-bold text-base text-white">Live Masterclasses</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">Attend interactive live sessions, receive personalized artwork feedback, and ask questions.</p>
            </div>
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <span className="text-2xl font-mono font-bold text-neutral-600">04</span>
              <h4 className="font-bold text-base text-white">Build Portfolio</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">Complete capstone assignments and publish your verified projects to the academy gallery.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="py-24 bg-neutral-950 border-b border-neutral-800/80">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-16 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
              Questions
            </span>
            <h2 className="text-3xl font-display font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-neutral-400 text-sm">Essential information about learning at Anivox Academy.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between font-bold text-sm text-white hover:text-neutral-200"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${openFaq === index ? 'rotate-180 text-white' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-neutral-400 leading-relaxed border-t border-neutral-800/80">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. HIGH CONVERSION CTA BANNER */}
      <section className="py-24 bg-neutral-900 text-white">
        <div className="container mx-auto px-6 text-center max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-mono text-neutral-300">
            <span>Admissions Open for Upcoming Batches</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-white leading-tight">
            Ready to Take Your Artwork to Professional Standards?
          </h2>

          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            Join driven creators mastering animation and digital art with industry mentors.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button 
              onClick={() => navigate('/courses')}
              size="lg" 
              className="bg-white text-neutral-950 hover:bg-neutral-200 font-bold px-8 h-13 rounded-xl shadow-lg transition-all text-sm"
            >
              Explore Available Courses
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              size="lg" 
              variant="outline" 
              className="border-neutral-700 text-white hover:bg-neutral-800 font-bold px-8 h-13 rounded-xl transition-all text-sm"
            >
              Student Portal Sign In
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
