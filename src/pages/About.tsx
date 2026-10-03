import React from 'react';
import { Loader2, Palette, Users, Globe, BookOpen } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function About() {
  const [content, setContent] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAbout = async () => {
      try {
        const docRef = doc(db, 'appSettings', 'about');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent(docSnap.data());
        } else {
          // Create default content for first-time use
          const defaultContent = {
            academyName: "Anivox Academy",
            creator: "G Chandu",
            description: "Anivox Academy is a premier creative-learning platform dedicated to mastering the art of Animation, Photoshop, and Digital Design.",
            mission: "Our mission is to empower the next generation of creative professionals with industry-standard skills and practical knowledge.",
            teachingPhilosophy: "We believe in a 'Learning by Doing' approach, where students work on real-world projects from day one.",
            instructorInfo: "Led by G Chandu, our programs are built on years of experience in the animation and digital art industry."
          };
          setContent(defaultContent);
        }
      } catch (error) {
        console.error("Error fetching about content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAbout();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="py-20 sm:py-28 bg-neutral-950 text-white min-h-screen">
      <div className="container mx-auto px-6 max-w-4xl space-y-20">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-500 font-bold">
            About Anivox Academy
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white leading-tight">
            Empowering the <span className="text-neutral-400 italic">Creative Minds</span> of Tomorrow
          </h1>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal pt-2">
            {content?.description}
          </p>
        </div>

        {/* Mission & Philosophy Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-display font-bold text-white">Our Mission</h2>
            <p className="text-neutral-300 text-sm leading-relaxed">
              {content?.mission}
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-display font-bold text-white">Teaching Philosophy</h2>
            <p className="text-neutral-300 text-sm leading-relaxed">
              {content?.teachingPhilosophy}
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 sm:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center space-y-2">
              <div className="h-10 w-10 bg-neutral-800 rounded-xl flex items-center justify-center mx-auto text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Courses</p>
              <h3 className="text-2xl font-bold font-mono text-white">12+</h3>
            </div>
            <div className="text-center space-y-2">
              <div className="h-10 w-10 bg-neutral-800 rounded-xl flex items-center justify-center mx-auto text-white">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Students</p>
              <h3 className="text-2xl font-bold font-mono text-white">500+</h3>
            </div>
            <div className="text-center space-y-2">
              <div className="h-10 w-10 bg-neutral-800 rounded-xl flex items-center justify-center mx-auto text-white">
                <Palette className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Projects</p>
              <h3 className="text-2xl font-bold font-mono text-white">2.5k</h3>
            </div>
            <div className="text-center space-y-2">
              <div className="h-10 w-10 bg-neutral-800 rounded-xl flex items-center justify-center mx-auto text-white">
                <Globe className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Global</p>
              <h3 className="text-2xl font-bold font-mono text-white">15+</h3>
            </div>
          </div>
        </div>

        {/* Creator Section */}
        <div className="flex flex-col md:flex-row items-center gap-10 bg-neutral-900/60 border border-neutral-800 p-8 sm:p-10 rounded-2xl">
          <div className="h-36 w-36 rounded-2xl bg-white text-neutral-950 shrink-0 flex items-center justify-center font-display font-black text-3xl shadow-lg">
            GC
          </div>
          <div className="space-y-3 text-center md:text-left">
            <h2 className="text-2xl font-display font-bold text-white">
              Meet the Lead Instructor: {content?.creator}
            </h2>
            <p className="text-neutral-300 text-sm leading-relaxed">
              {content?.instructorInfo}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
