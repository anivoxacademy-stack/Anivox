import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function PublicHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Courses', path: '/courses' },
    { name: 'Showcase', path: '/portfolio' },
    { name: 'About', path: '/about' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 text-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        
        {/* Zone 1: Brand Wordmark */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="h-9 w-9 rounded-xl bg-white text-neutral-950 flex items-center justify-center font-display font-black text-base shadow-sm group-hover:scale-105 transition-transform">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-display font-bold tracking-tight text-white leading-none">
              ANIVOX
            </span>
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase leading-none mt-1">
              Creative Academy
            </span>
          </div>
        </Link>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors relative py-1 ${
                  active
                    ? 'text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {link.name}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <button
              onClick={() => navigate('/student')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-neutral-950 text-xs font-bold hover:bg-neutral-100 transition-all shadow-sm"
            >
              <span>Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs font-semibold text-neutral-300 hover:text-white px-3 py-2 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="h-3.5 w-3.5 text-neutral-400" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-neutral-950 text-xs font-bold hover:bg-neutral-100 transition-all shadow-sm"
              >
                <span>Explore Courses</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-950 px-6 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                  isActive(link.path)
                    ? 'bg-neutral-900 text-white font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-neutral-800 flex flex-col gap-2">
            {user ? (
              <button
                onClick={() => navigate('/student')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-neutral-950 text-xs font-bold"
              >
                <span>Go to Student Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-800 text-white text-xs font-bold hover:bg-neutral-900"
                >
                  <LogIn className="h-4 w-4 text-neutral-400" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/courses"
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-neutral-950 text-xs font-bold"
                >
                  <span>Explore Courses</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
