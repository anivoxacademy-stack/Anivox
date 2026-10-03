import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Bell, 
  BookOpen, 
  LogOut, 
  Video, 
  Palette, 
  Phone, 
  MapPin, 
  Calendar, 
  Sparkles,
  Edit3,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AdminLoginDialog } from '../components/admin/AdminLoginDialog';
import { useAuth } from '../contexts/AuthContext';

export function Profile() {
  const { user, profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const menuItems = [
    { icon: BookOpen, label: 'My Courses', href: '/my-courses', desc: 'Active learning, lessons, and course access' },
    { icon: Video, label: 'Live Classes', href: '/live', desc: 'Scheduled interactive live streaming classes' },
    { icon: CreditCard, label: 'My Payments', href: '/payments', desc: 'UPI transactions, receipts, and verification status' },
    { icon: Palette, label: 'My Portfolio', href: '/portfolio', desc: 'Showcase your creative artwork and projects' },
    { icon: Bell, label: 'Notifications', href: '/notifications', desc: 'Class alerts, payment approvals, and announcements' },
  ];

  if (!user || !profile) return null;

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-purple-600" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Account Management
          </span>
        </div>
        <h1 className="text-3xl font-display font-bold text-neutral-900">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Manage your academy identity, contact details, and enrolled masterclasses.
        </p>
      </div>

      {/* Main Profile Card (Reference-inspired rounded surface) */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with ring */}
          <div className="h-24 w-24 rounded-3xl bg-neutral-100 flex items-center justify-center ring-4 ring-purple-100 overflow-hidden shrink-0 shadow-sm">
            {profile.photoURL || user.photoURL ? (
              <img 
                src={profile.photoURL || user.photoURL} 
                alt={profile.displayName} 
                className="h-full w-full object-cover" 
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl">
                {profile.displayName?.charAt(0) || 'S'}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-display font-bold text-neutral-900">
                  {profile.displayName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider border border-purple-100">
                  Student Member
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">{profile.email}</p>
            </div>

            {/* Quick Metadata Chips */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8FA] border border-neutral-100 text-neutral-600 font-medium">
                <Phone className="h-3.5 w-3.5 text-neutral-400" />
                {profile.phone || 'Phone on file'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8FA] border border-neutral-100 text-neutral-600 font-medium">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                {profile.city || 'City set'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8FA] border border-neutral-100 text-neutral-600 font-medium">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                Age: {profile.age || 'N/A'}
              </span>
            </div>

            {(profile.learningInterests || profile.interests) && (
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Learning Focus: </strong>
                  <span>{profile.learningInterests || profile.interests}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <Link to="/profile/edit">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5">
                <Edit3 className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-100 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 group-hover:text-purple-700 transition-colors">
                  {item.label}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      {/* Hidden Owner / Admin Passkey Trigger Button */}
      <div className="pt-8 text-center">
        <button
          onClick={() => setIsAdminDialogOpen(true)}
          className="text-neutral-400 hover:text-neutral-700 text-xs font-bold uppercase tracking-widest transition-colors inline-flex items-center gap-1.5"
        >
          <span>G Chandu</span>
        </button>
      </div>

      <AdminLoginDialog
        isOpen={isAdminDialogOpen}
        onClose={() => setIsAdminDialogOpen(false)}
      />
    </div>
  );
}
