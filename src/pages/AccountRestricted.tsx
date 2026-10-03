import React from 'react';
import { ShieldAlert, Mail, LogOut } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function AccountRestricted() {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-100 shadow-premium p-10 space-y-8">
        <div className="h-24 w-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
          <ShieldAlert className="h-12 w-12" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-bold text-neutral-900 uppercase tracking-tight">Account Restricted</h1>
          <p className="text-neutral-500 text-sm leading-relaxed">
            Your Anivox Academy account is currently restricted. You cannot access course materials or live sessions at this time.
          </p>
          {profile?.blockReason && (
            <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-left">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Reason for restriction:</span>
              <p className="text-xs text-neutral-700 font-medium italic">"{profile.blockReason}"</p>
            </div>
          )}
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Button className="w-full gap-2 h-12 text-sm font-bold" onClick={() => window.location.href = 'mailto:support@anivox.com'}>
            <Mail className="h-4 w-4" /> Contact Academy Support
          </Button>
          <Button variant="outline" className="w-full gap-2 h-12 text-sm font-bold text-red-600 border-red-100 hover:bg-red-50" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>

        <div className="pt-4 border-t border-neutral-50 text-[10px] text-neutral-400 uppercase tracking-widest">
          Account ID: {profile?.uid || 'REF_BLOCKED'}
        </div>
      </div>
    </div>
  );
}
