import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PublicHome } from './PublicHome';
import { StudentHome } from './StudentHome';
import { AcademyLoadingScreen } from '../components/common/AcademyLoadingScreen';

export function RootPage() {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return <AcademyLoadingScreen />;
  }

  if (!user) {
    return <PublicHome />;
  }

  if (profile?.status === 'blocked') {
    return <Navigate to="/restricted" replace />;
  }

  const isProfileComplete = Boolean(
    profile && 
    (profile.profileCompleted === true || profile.phone) && 
    profile.displayName && 
    profile.phone
  );

  if (!isProfileComplete) {
    return <Navigate to="/setup-profile" replace />;
  }

  return <StudentHome />;
}
