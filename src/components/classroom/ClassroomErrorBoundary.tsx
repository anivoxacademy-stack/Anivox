import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home, WifiOff } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onLeave?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ClassroomErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CLASSROOM_UNCAUGHT_ERROR]:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  private handleLeave = () => {
    if (this.props.onLeave) {
      this.props.onLeave();
    } else {
      window.location.href = '/live';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full space-y-6">
            <div className="h-20 w-20 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 flex items-center justify-center mx-auto shadow-2xl">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">
                Unable to open this live class
              </h1>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Something went wrong while connecting to the classroom. You can retry the connection or return to your live classes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={this.handleRetry} 
                className="flex-1 bg-white hover:bg-neutral-100 text-neutral-900 font-bold gap-2 h-11 uppercase text-xs tracking-wider"
              >
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={this.handleLeave} 
                className="flex-1 border-white/10 text-white hover:bg-white/5 font-bold gap-2 h-11 uppercase text-xs tracking-wider"
              >
                <Home className="h-4 w-4" /> Return to My Live Classes
              </Button>
            </div>

            <div className="pt-6 border-t border-white/5 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
              Technical reference: CLASSROOM_CONNECTION_ERROR
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
