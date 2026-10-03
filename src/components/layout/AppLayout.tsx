import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { PublicLayout } from './PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();

  // If user is NOT signed in, or if on login page, ALWAYS use the dedicated Public Shell
  if (!user || location.pathname === '/login') {
    return <PublicLayout>{children}</PublicLayout>;
  }

  // Full screen pages for authenticated users (classroom, live stream, restricted)
  const isFullWidthPage = location.pathname.startsWith('/live/') || 
                          location.pathname.startsWith('/classroom/') || 
                          location.pathname === '/restricted';

  if (isFullWidthPage) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  // Authenticated Student / Admin Dashboard Layout
  return (
    <div className="min-h-screen flex bg-[#FAF8FA]">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block w-72 shrink-0 border-r border-neutral-200/60 sticky top-0 h-screen overflow-y-auto">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}

