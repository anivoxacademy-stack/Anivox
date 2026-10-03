import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { RootPage } from './pages/RootPage';
import { StudentHome } from './pages/StudentHome';
import { Courses } from './pages/Courses';
import { CourseDetail } from './pages/CourseDetail';
import { CoursePlayer } from './pages/CoursePlayer';
import { Profile } from './pages/Profile';
import { MyCourses } from './pages/MyCourses';
import { MyPayments } from './pages/MyPayments';
import { MyLive } from './pages/MyLive';
import { Classroom } from './pages/Classroom';
import { GoogleMeetMeeting } from './pages/GoogleMeetMeeting';
import { Notifications } from './pages/Notifications';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminCourses } from './pages/admin/AdminCourses';
import { AdminCourseForm } from './pages/admin/AdminCourseForm';
import { AdminAbout } from './pages/admin/AdminAbout';
import { AdminBranding } from './pages/admin/AdminBranding';
import { AdminPortfolio } from './pages/admin/AdminPortfolio';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminEnrollments } from './pages/admin/AdminEnrollments';
import { AdminMessages } from './pages/admin/AdminMessages';
import { AdminLive } from './pages/admin/AdminLive';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminBroadcast } from './pages/admin/AdminBroadcast';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminSocialLinks } from './pages/admin/AdminSocialLinks';
import { AdminPaymentSettings } from './pages/admin/AdminPaymentSettings';
import { Login } from './pages/Login';
import { ProfileSetup } from './pages/ProfileSetup';
import { EditProfile } from './pages/EditProfile';
import { Checkout } from './pages/Checkout';
import { About } from './pages/About';
import { Portfolio } from './pages/Portfolio';

import { AccountRestricted } from './pages/AccountRestricted';
import { useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AcademyLoadingScreen } from './components/common/AcademyLoadingScreen';
import { AppLayout } from './components/layout/AppLayout';

// Temporary placeholder for missing pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="py-24 text-center">
    <h1 className="text-4xl font-display font-bold mb-4">{title}</h1>
    <p className="text-neutral-500">This section is available in your academy profile.</p>
  </div>
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  const currentPath = window.location.pathname;

  if (loading) {
    return <AcademyLoadingScreen />;
  }
  
  if (!user) return <Navigate to="/login" state={{ from: { pathname: currentPath } }} replace />;

  // Blocked status check (Requirement 16 & 50)
  if (profile?.status === 'blocked' && currentPath !== '/restricted') {
    return <Navigate to="/restricted" replace />;
  }

  const isProfileComplete = Boolean(
    profile && 
    (profile.profileCompleted === true || profile.phone) && 
    profile.displayName && 
    profile.phone
  );

  // If user profile is not complete, enforce mandatory onboarding
  if (!isProfileComplete && currentPath !== '/setup-profile') {
    return <Navigate to="/setup-profile" replace />;
  }

  // If already complete, never show onboarding again
  if (isProfileComplete && currentPath === '/setup-profile') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <AcademyLoadingScreen />;
  }
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function App() {
  const { profile } = useAuth();
  const isBlocked = profile?.status === 'blocked';
  
  return (
    <ErrorBoundary>
      <Router>
        {isBlocked && window.location.pathname !== '/restricted' && <Navigate to="/restricted" replace />}
        <Routes>
          {/* Root dispatcher: PublicHome for visitors, StudentHome for authenticated students */}
          <Route path="/" element={<AppLayout><RootPage /></AppLayout>} />
          
          {/* Explicit Student Home Route */}
          <Route path="/student" element={<PrivateRoute><AppLayout><StudentHome /></AppLayout></PrivateRoute>} />
          
          <Route path="/restricted" element={<AccountRestricted />} />
          <Route path="/courses" element={<AppLayout><Courses /></AppLayout>} />
          <Route path="/courses/:courseId" element={<AppLayout><CourseDetail /></AppLayout>} />
          <Route path="/courses/:courseId/learn" element={<PrivateRoute><CoursePlayer /></PrivateRoute>} />
          <Route path="/checkout/:courseId" element={<PrivateRoute><AppLayout><Checkout /></AppLayout></PrivateRoute>} />
          <Route path="/login" element={<AppLayout><Login /></AppLayout>} />
          <Route path="/setup-profile" element={<PrivateRoute><AppLayout><ProfileSetup /></AppLayout></PrivateRoute>} />
          <Route path="/about" element={<AppLayout><About /></AppLayout>} />
          <Route path="/portfolio" element={<AppLayout><Portfolio /></AppLayout>} />
          
          {/* Protected Student Routes */}
          <Route path="/profile" element={<PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>} />
          <Route path="/profile/edit" element={<PrivateRoute><AppLayout><EditProfile /></AppLayout></PrivateRoute>} />
          <Route path="/my-courses" element={<PrivateRoute><AppLayout><MyCourses /></AppLayout></PrivateRoute>} />
          <Route path="/live" element={<PrivateRoute><AppLayout><MyLive /></AppLayout></PrivateRoute>} />
          <Route path="/live/:classId" element={<PrivateRoute><Classroom /></PrivateRoute>} />
          <Route path="/live/:classId/meeting" element={<PrivateRoute><GoogleMeetMeeting /></PrivateRoute>} />
          <Route path="/live/class/:classId" element={<PrivateRoute><Classroom /></PrivateRoute>} />
          <Route path="/classroom/:classId" element={<PrivateRoute><Classroom /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><AppLayout><Notifications /></AppLayout></PrivateRoute>} />
          <Route path="/payments" element={<PrivateRoute><AppLayout><MyPayments /></AppLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><AppLayout><Placeholder title="Account Settings" /></AppLayout></PrivateRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
          <Route path="/admin/payment-settings" element={<AdminRoute><AdminPaymentSettings /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminAbout /></AdminRoute>} />
          <Route path="/admin/branding" element={<AdminRoute><AdminBranding /></AdminRoute>} />
          <Route path="/admin/portfolio" element={<AdminRoute><AdminPortfolio /></AdminRoute>} />
          <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
          <Route path="/admin/social" element={<AdminRoute><AdminSocialLinks /></AdminRoute>} />
          <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/admin/enrollments" element={<AdminRoute><AdminEnrollments /></AdminRoute>} />
          <Route path="/admin/messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
          <Route path="/admin/live" element={<AdminRoute><AdminLive /></AdminRoute>} />
          <Route path="/admin/live/:classId" element={<AdminRoute><Classroom /></AdminRoute>} />
          <Route path="/admin/live-class/:classId" element={<AdminRoute><Classroom /></AdminRoute>} />
          <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
          <Route path="/admin/broadcast" element={<AdminRoute><AdminBroadcast /></AdminRoute>} />
          <Route path="/admin/audit" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
          <Route path="/admin/courses/new" element={<AdminRoute><AdminCourseForm /></AdminRoute>} />
          <Route path="/admin/courses/edit/:id" element={<AdminRoute><AdminCourseForm /></AdminRoute>} />
          {/* Catch-all fallback for undefined routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
