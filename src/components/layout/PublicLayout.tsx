import React from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white font-sans selection:bg-white selection:text-neutral-950">
      <PublicHeader />
      <main className="flex-1 w-full min-w-0">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
