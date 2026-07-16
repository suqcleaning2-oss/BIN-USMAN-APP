import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  props!: Props;
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught exception in component tree:", error, errorInfo);
    
    // Proactively clear navigation/state cache if it was likely a corrupted state restoration error
    if (
      error.message.includes("null") || 
      error.message.includes("undefined") || 
      error.message.includes("reading") || 
      error.message.includes("JSON")
    ) {
      console.warn("Detected potential state restoration issue. Resetting local navigation cache...");
      try {
        localStorage.removeItem('binusman_last_route');
      } catch (e) {
        // Ignore
      }
    }
  }

  private handleReset = () => {
    try {
      // Clear navigation and form caches completely to ensure a clean slate
      localStorage.removeItem('binusman_last_route');
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('binusman_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      // Ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-secondary shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-10 text-center space-y-8 animate-in fade-in duration-700">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight text-heading uppercase">Something Went Wrong</h1>
              <p className="text-xs text-body/60 leading-relaxed uppercase tracking-wider">
                The application encountered an unexpected state restoration issue and has recovered safely.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 rounded-xl bg-neutral-50 text-left font-mono text-[10px] text-red-600/80 max-h-32 overflow-y-auto border border-secondary select-all">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="primary-button w-full h-14 flex items-center justify-center gap-2 text-[10px] uppercase"
              >
                <RefreshCw size={12} />
                <span>Reset & Restart</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="secondary-button w-full h-14 flex items-center justify-center gap-2 text-[10px] uppercase"
              >
                <Home size={12} />
                <span>Go Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
