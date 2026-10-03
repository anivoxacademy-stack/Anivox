import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowUpRight } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-800 text-neutral-400 py-16 sm:py-20 text-xs">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white text-neutral-950 flex items-center justify-center font-display font-black text-sm">
                A
              </div>
              <span className="text-lg font-display font-bold tracking-tight text-white">
                ANIVOX ACADEMY
              </span>
            </Link>
            <p className="text-neutral-400 leading-relaxed max-w-xs font-normal">
              Premier creative learning platform for 2D Animation, Digital Art, and Photoshop Mastery. Built for serious creators and future studio pros.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-white transition-colors">All Courses</Link>
              </li>
              <li>
                <Link to="/portfolio" className="hover:text-white transition-colors">Student Showcase</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About Academy</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">Student Portal</Link>
              </li>
            </ul>
          </div>

          {/* Disciplines */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Disciplines
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/courses" className="hover:text-white transition-colors">2D Frame-by-Frame Animation</Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-white transition-colors">Digital Illustration & Painting</Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-white transition-colors">Photoshop & Art Fundamentals</Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-white transition-colors">Character Design & Rigging</Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-white transition-colors">Live Masterclass Workshops</Link>
              </li>
            </ul>
          </div>

          {/* Contact / Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Academy Contacts
            </h4>
            <p className="text-neutral-400 leading-relaxed">
              Have questions about upcoming admissions or course details? Reach our team directly.
            </p>
            <div className="pt-2">
              <a 
                href="mailto:anivoxacademy@gmail.com" 
                className="inline-flex items-center gap-1.5 text-white hover:text-neutral-300 font-medium transition-colors border-b border-neutral-700 pb-0.5"
              >
                <span>anivoxacademy@gmail.com</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500 font-mono">
          <p>© {new Date().getFullYear()} ANIVOX ACADEMY. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <span>TERMS OF SERVICE</span>
            <span>·</span>
            <span>PRIVACY POLICY</span>
            <span>·</span>
            <span>ACADEMY CREDENTIALS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
