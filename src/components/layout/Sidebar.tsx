import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  Layers, 
  Video, 
  Sparkles, 
  Bell, 
  CreditCard, 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Compass,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  onCloseMobile?: () => void;
  unreadNotificationsCount?: number;
}

export function Sidebar({ onCloseMobile, unreadNotificationsCount = 0 }: SidebarProps) {
  const { user, profile, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logout();
      if (onCloseMobile) onCloseMobile();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const displayName = profile?.displayName || user?.displayName || 'Creative Learner';
  const firstName = displayName.split(' ')[0];
  const photoURL = profile?.photoURL || user?.photoURL;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/student';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { name: 'Home', href: user ? '/' : '/', icon: Home },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    ...(user ? [
      { name: 'My Courses', href: '/my-courses', icon: Layers },
      { name: 'Live Classes', href: '/live', icon: Video },
    ] : []),
    { name: 'Portfolio', href: '/portfolio', icon: Sparkles },
    ...(user ? [
      { 
        name: 'Notifications', 
        href: '/notifications', 
        icon: Bell, 
        badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined 
      },
      { name: 'My Payments', href: '/payments', icon: CreditCard },
      { name: 'Profile', href: '/profile', icon: User },
    ] : []),
  ];

  return (
    <aside className="w-full h-full flex flex-col justify-between p-5 bg-[#FAF4F8] select-none">
      <div className="space-y-6">
        {/* Brand & Close on Mobile */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link 
            to="/" 
            onClick={onCloseMobile}
            className="flex items-center gap-3 group"
          >
            <div className="h-10 w-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-display font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <span className="text-xl font-display font-bold tracking-tight text-neutral-900 block leading-tight">
                Anivox
              </span>
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Academy
              </span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden h-9 w-9 rounded-xl bg-white/80 border border-neutral-200/60 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* User Card Pill (Reference Style: "Hi John") */}
        {user ? (
          <div className="bg-white rounded-2xl p-3 border border-neutral-200/70 shadow-sm flex items-center gap-3">
            <div className="relative">
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt={displayName} 
                  className="h-10 w-10 rounded-xl object-cover ring-2 ring-purple-100" 
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-neutral-400 font-medium block">Welcome</span>
              <h4 className="text-sm font-bold text-neutral-900 truncate">
                Hi, {firstName}
              </h4>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-3.5 border border-neutral-200/70 shadow-sm">
            <p className="text-xs text-neutral-500 mb-2">Join Anivox to attend live masterclasses and learn animation.</p>
            <Link 
              to="/login"
              onClick={onCloseMobile}
              className="w-full inline-flex items-center justify-center py-2 px-3 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
            >
              Sign In with Google
            </Link>
          </div>
        )}

        {/* Navigation Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-2.5 border border-neutral-200/60 shadow-sm space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200",
                  active
                    ? "bg-[#EDE8FF] text-purple-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-1.5 rounded-xl transition-colors",
                    active ? "bg-purple-600 text-white shadow-sm" : "text-neutral-500"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.name}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={onCloseMobile}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 mt-2 border-t border-neutral-100",
                isActive('/admin')
                  ? "bg-amber-100 text-amber-900 font-bold"
                  : "text-amber-800 hover:bg-amber-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Admin Portal</span>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Bottom Promo & Sign Out */}
      <div className="pt-4 space-y-3">
        {/* Subtle Academy Feature Pill Card (Inspired by reference bottom card) */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold tracking-tight">Anivox Live Studio</span>
          </div>
          <p className="text-[11px] text-purple-100 leading-snug">
            Interactive live classrooms with screen sharing and instant chat.
          </p>
        </div>

        {user && (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-neutral-500 hover:text-neutral-900 hover:bg-white/80 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
