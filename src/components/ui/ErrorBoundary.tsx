import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="h-20 w-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Unable to open this live class</h1>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Something went wrong while connecting to the classroom. Our team has been notified.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1 bg-white text-neutral-900 font-bold gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/live'} 
                className="flex-1 border-white/10 text-white hover:bg-white/5 gap-2"
              >
                <Home className="h-4 w-4" /> Return to Classes
              </Button>
            </div>

            <div className="pt-8 border-t border-white/5 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
              Technical reference: CLASSROOM_CONNECTION_ERROR
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
