import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (user && !loading) {
      const isProfileComplete = Boolean(
        profile && 
        (profile.profileCompleted === true || profile.phone) && 
        profile.displayName && 
        profile.phone
      );

      const from = (location.state as any)?.from?.pathname || '/';
      if (isProfileComplete) {
        navigate(from === '/login' ? '/' : from, { replace: true });
      } else {
        navigate('/setup-profile', { replace: true });
      }
    }
  }, [user, profile, loading, navigate, location]);

  const handleLogin = async () => {
    setLoggingIn(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Auth change listener handles state & redirect
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error("Login failed", err);
      setError(err?.message || "Google sign-in was cancelled or encountered an issue.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-neutral-50/50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200/80 shadow-xl p-8 md:p-12 text-center space-y-6">
        <div className="h-16 w-16 bg-neutral-900 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md">
          <LogIn className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-neutral-900">Welcome to Anivox</h1>
          <p className="text-neutral-500 text-sm leading-relaxed">
            Sign in with your Google account to access your courses, live classes, and creative portfolio.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 text-left">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <Button 
          onClick={handleLogin}
          disabled={loggingIn || loading}
          className="w-full h-14 text-sm font-bold bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 shadow-sm gap-3 hover:border-neutral-300"
        >
          {loggingIn ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-neutral-700" />
              <span>Connecting Google Account...</span>
            </>
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
              <span>Continue with Google</span>
            </>
          )}
        </Button>

        <p className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
          By signing in, you agree to Anivox Academy's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
