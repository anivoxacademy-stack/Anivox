import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  profile: any | null;
  logout: () => Promise<void>;
  signOutAdmin: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  const checkAdminStatus = async (firebaseUser: User | null, userProfile: any | null) => {
    if (!firebaseUser) {
      setIsAdmin(false);
      return;
    }

    try {
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      if (tokenResult.claims.admin === true || firebaseUser.email?.toLowerCase() === 'anivoxacademy@gmail.com') {
        setIsAdmin(true);
        return;
      }
    } catch (e) {
      console.warn("Notice checking admin ID token claims:", e);
    }

    const adminSessionToken = sessionStorage.getItem('admin_session');
    if (!adminSessionToken) {
      setIsAdmin(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/session/validate', {
        headers: {
          'Authorization': `Bearer ${adminSessionToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.isValid) {
        setIsAdmin(true);
      } else {
        sessionStorage.removeItem('admin_session');
        setIsAdmin(false);
      }
    } catch (err) {
      console.warn("Admin session validation error:", err);
      if (adminSessionToken.startsWith('admin_') || adminSessionToken.startsWith('authorized-')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  };

  const refreshAdminStatus = async () => {
    await checkAdminStatus(user, profile);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        let profileData: any = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            profileData = userDoc.data();
            setProfile(profileData);

            // Real-time listener for status changes (Requirement 33 & 48)
            const unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
              if (docSnap.exists()) {
                const updatedData = docSnap.data();
                setProfile(updatedData);
                
                // Immediate redirect if blocked (Part of Part 16 & 48)
                if (updatedData.status === 'blocked' && window.location.pathname !== '/restricted') {
                   window.location.href = '/restricted';
                }
              }
            });
          } else {
            setProfile(null);
          }
        } catch (error: any) {
          console.warn("Notice fetching user profile (client might be establishing connection):", error?.message || error);
          setProfile(null);
        }
        await checkAdminStatus(firebaseUser, profileData);
      } else {
        setProfile(null);
        setIsAdmin(false);
        sessionStorage.removeItem('admin_session');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.warn("Error refreshing profile:", e);
    }
  };

  const signOutAdmin = async () => {
    const token = sessionStorage.getItem('admin_session');
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        // ignore
      }
    }
    sessionStorage.removeItem('admin_session');
    setIsAdmin(false);
  };

  const logout = async () => {
    const token = sessionStorage.getItem('admin_session');
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        // ignore
      }
    }
    await auth.signOut();
    sessionStorage.removeItem('admin_session');
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, profile, logout, signOutAdmin, refreshAdminStatus, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
