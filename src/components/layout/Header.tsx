import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  User as UserIcon, 
  LogIn, 
  Bell, 
  LogOut, 
  BookOpen, 
  Video, 
  CreditCard, 
  Settings, 
  ChevronDown,
  Sparkles,
  Search,
  ShieldCheck
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, profile, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    }, (err) => {
      console.warn("Notice listening to unread notifications:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const displayName = profile?.displayName || user?.displayName || 'Creative Learner';
  const photoURL = profile?.photoURL || user?.photoURL;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Mobile Menu Toggle & Brand for mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-2xl bg-neutral-100/80 text-neutral-700 hover:bg-neutral-200/80 transition-colors"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="flex items-center gap-2.5 lg:hidden">
              <div className="h-8 w-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-display font-black text-sm shadow-sm">
                A
              </div>
              <span className="text-lg font-display font-bold tracking-tight text-neutral-900">
                Anivox Academy
              </span>
            </Link>

            {/* Desktop breadcrumb / context */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-neutral-400">
              <span className="text-neutral-900 font-bold">Anivox Academy</span>
              <span>/</span>
              <span className="text-neutral-500 capitalize">
                {location.pathname === '/' ? 'Dashboard' : location.pathname.split('/')[1]?.replace('-', ' ') || 'Overview'}
              </span>
            </div>
          </div>

          {/* Center Search Input (Inspired by reference search bar) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div 
              onClick={() => navigate('/courses')}
              className="w-full flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-neutral-100/70 border border-neutral-200/60 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors cursor-pointer"
            >
              <Search className="h-4 w-4 text-neutral-400" />
              <span>Search courses, masterclasses, and digital art...</span>
            </div>
          </div>

          {/* Right Actions: Notifications & Avatar */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notification Bell */}
                <Link
                  to="/notifications"
                  className="relative p-2.5 rounded-2xl bg-white border border-neutral-200/80 hover:bg-neutral-50 transition-colors text-neutral-700 shadow-sm"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-2xl border border-neutral-200/80 hover:bg-neutral-50 transition-colors"
                  >
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt={displayName}
                        className="h-8 w-8 rounded-xl object-cover ring-2 ring-purple-50"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 font-bold text-xs text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-400 hidden sm:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-3xl bg-white p-2 shadow-xl border border-neutral-200/80 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-3 border-b border-neutral-100">
                        <p className="text-xs font-bold text-neutral-900 truncate">{displayName}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
                      </div>

                      <div className="py-1 space-y-0.5">
                        <Link
                          to="/profile"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100/70 rounded-xl transition-colors"
                        >
                          <UserIcon className="h-3.5 w-3.5 text-neutral-500" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          to="/my-courses"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100/70 rounded-xl transition-colors"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-neutral-500" />
                          <span>My Enrolled Courses</span>
                        </Link>
                        <Link
                          to="/live"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100/70 rounded-xl transition-colors"
                        >
                          <Video className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Live Classes</span>
                        </Link>
                        <Link
                          to="/payments"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100/70 rounded-xl transition-colors"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Payments & UTR</span>
                        </Link>

                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                            <span>Admin Portal</span>
                          </Link>
                        )}
                      </div>

                      <div className="pt-1 border-t border-neutral-100">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/courses"
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-2 hidden sm:block"
                >
                  Explore Courses
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Reference Style Sidebar) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-[#FAF4F8] shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <Sidebar 
              onCloseMobile={() => setIsMobileMenuOpen(false)} 
              unreadNotificationsCount={unreadCount}
            />
          </div>
        </div>
      )}
    </>
  );
}
