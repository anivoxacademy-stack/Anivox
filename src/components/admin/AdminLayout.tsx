import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Video, 
  CreditCard, 
  CheckCircle, 
  MessageSquare, 
  Image, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Plus,
  ChevronLeft,
  BarChart3,
  Share2,
  Palette,
  QrCode,
  Megaphone,
  Shield
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, signOutAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Megaphone, label: 'Broadcast', href: '/admin/broadcast' },
    { icon: Shield, label: 'Audit Logs', href: '/admin/audit' },
    { icon: Users, label: 'Students', href: '/admin/students' },
    { icon: BookOpen, label: 'Courses', href: '/admin/courses' },
    { icon: Video, label: 'Live Classes', href: '/admin/live' },
    { icon: CreditCard, label: 'Payments', href: '/admin/payments' },
    { icon: QrCode, label: 'Payment Settings', href: '/admin/payment-settings' },
    { icon: CheckCircle, label: 'Enrollments', href: '/admin/enrollments' },
    { icon: MessageSquare, label: 'Messages', href: '/admin/messages' },
    { icon: Image, label: 'Portfolio', href: '/admin/portfolio' },
    { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
    { icon: Share2, label: 'Social Links', href: '/admin/social' },
    { icon: Palette, label: 'Branding', href: '/admin/branding' },
    { icon: Settings, label: 'About & Content', href: '/admin/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  const handleSignOutAdmin = async () => {
    await signOutAdmin();
    navigate('/profile');
  };

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-950 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl tracking-tight">Anivox Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href) 
                  ? 'bg-brand-600 text-white' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 mb-4">
            <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs uppercase">
              {profile?.displayName?.slice(0, 2) || 'AD'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{profile?.displayName || 'Admin'}</p>
              <p className="text-xs text-neutral-500 truncate">{profile?.role || 'Administrator'}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOutAdmin}
            className="w-full flex items-center gap-3 px-3 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
            title="Terminate admin session and return to student view"
          >
            <LogOut className="h-4 w-4" /> Sign Out Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => navigate('/profile')} 
              className="text-neutral-400 hover:text-neutral-900 flex items-center gap-1 text-sm font-medium"
            >
              <ChevronLeft className="h-4 w-4" /> Exit Admin
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-neutral-500 hover:text-neutral-900">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <Button size="sm" className="gap-2" onClick={() => navigate('/admin/courses/new')}>
              <Plus className="h-4 w-4" /> Add Course
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
