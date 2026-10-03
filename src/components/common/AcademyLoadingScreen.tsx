import React from 'react';
import { Loader2 } from 'lucide-react';

export function AcademyLoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 select-none">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm animate-in fade-in duration-300">
        <div className="h-12 w-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-display font-black text-xl shadow-lg">
          A
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-display font-bold tracking-tight text-neutral-900">
            Anivox Academy
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Loading your academy session...
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2 text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-900" />
          <span className="text-[11px] font-mono uppercase tracking-wider">Initializing</span>
        </div>
      </div>
    </div>
  );
}
