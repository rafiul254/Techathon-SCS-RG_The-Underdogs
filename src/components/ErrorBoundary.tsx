import React, { useState, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ErrorBoundary({ children, fallback }: Props) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleReset = () => {
    setHasError(false);
    setError(null);
    window.location.reload();
  };

  if (hasError) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">
            Something went wrong
          </h1>
          
          <p className="text-slate-400 mb-6">
            The application encountered an unexpected error. We've been notified and are working to fix it.
          </p>
          
          {error && (
            <details className="mb-6 text-left">
              <summary className="text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                Error details
              </summary>
              <div className="mt-2 p-4 bg-slate-950 rounded text-xs text-red-400 font-mono overflow-auto max-h-40">
                {error.toString()}
              </div>
            </details>
          )}
          
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
