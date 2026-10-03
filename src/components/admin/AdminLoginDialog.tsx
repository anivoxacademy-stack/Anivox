import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, User as UserIcon, Mail, Key } from 'lucide-react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminLoginDialog({ isOpen, onClose }: AdminLoginDialogProps) {
  const { user, refreshAdminStatus } = useAuth();
  const navigate = useNavigate();
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    uid?: string;
    email?: string;
    provider?: string;
    isAdminClaim?: boolean;
  } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      user.getIdTokenResult(true).then((res) => {
        setDiagnosticInfo({
          uid: user.uid,
          email: user.email || 'No email',
          provider: user.providerData[0]?.providerId || 'google.com',
          isAdminClaim: Boolean(res.claims.admin) || user.email?.toLowerCase() === 'anivoxacademy@gmail.com'
        });
      }).catch(() => {
        setDiagnosticInfo({
          uid: user.uid,
          email: user.email || 'No email',
          provider: 'google.com',
          isAdminClaim: user.email?.toLowerCase() === 'anivoxacademy@gmail.com'
        });
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in with your Google account first.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      // Get fresh Firebase ID token to verify claims server-side
      const idToken = await user.getIdToken(true);
      
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          passkey: passkey.trim(),
          uid: user.uid,
          email: user.email,
          idToken
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('admin_session', data.adminSession);
        // Force refresh ID token to load new custom claim
        await user.getIdToken(true);
        await refreshAdminStatus();
        onClose();
        navigate('/admin');
      } else {
        setError(data.error || 'Your Google account is authenticated, but administrator access has not been enabled for this account.');
      }
    } catch (err) {
      setError('Unable to verify owner access. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100"
          >
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-900">Admin Authorization</h2>
                  <p className="text-[11px] text-neutral-500">Firebase Auth & Custom Claim Verification</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Diagnostic Card (Requirement 16) */}
              {user ? (
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                    <span className="font-bold uppercase tracking-widest text-[10px] text-neutral-400">Diagnostic Account Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${diagnosticInfo?.isAdminClaim ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {diagnosticInfo?.isAdminClaim ? 'Admin Claim Active' : 'Standard User'}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-neutral-600">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Email:</span>
                      <span className="font-medium text-neutral-900">{diagnosticInfo?.email || user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Firebase UID:</span>
                      <span className="font-medium text-neutral-900 truncate max-w-[200px]" title={user.uid}>{user.uid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Provider:</span>
                      <span className="font-medium text-neutral-900">{diagnosticInfo?.provider || 'Google'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs text-center">
                  Please sign in with your Google account first to request administrator authorization.
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">Owner Passkey (Optional if Google Email matches)</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="password"
                    value={passkey}
                    onChange={(e) => {
                      setPasskey(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all text-sm font-mono"
                    placeholder="Enter passkey or leave blank if authorized"
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Button type="submit" className="w-full h-11 font-bold text-xs uppercase tracking-wider gap-2" disabled={loading || !user}>
                  {loading ? 'Verifying Authorization...' : 'Verify & Enter Admin Panel'}
                </Button>
                <Button type="button" variant="ghost" className="w-full h-10 text-xs font-semibold text-neutral-500" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
