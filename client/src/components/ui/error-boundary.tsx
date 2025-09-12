import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
          <p className="text-red-600 text-center mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred in this component.'}
          </p>
          <Button 
            onClick={this.handleRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for easier usage
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  title?: string;
  description?: string;
}

export function ErrorFallback({ 
  error, 
  resetError, 
  title = "Something went wrong",
  description 
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
      <p className="text-red-600 text-center mb-4 max-w-md">
        {description || error.message || 'An unexpected error occurred.'}
      </p>
      <div className="space-y-2 text-xs text-red-500 max-w-md mb-4">
        <details className="cursor-pointer">
          <summary>Technical Details</summary>
          <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
            {error.stack}
          </pre>
        </details>
      </div>
      <Button 
        onClick={resetError}
        variant="outline"
        className="flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    </div>
  );
}

// Hook for functional components error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const handleError = React.useCallback((error: Error) => {
    console.error('Handled error:', error);
    setError(error);
  }, []);

  // Reset error when component unmounts or dependencies change
  React.useEffect(() => {
    return () => setError(null);
  }, []);

  return {
    error,
    handleError,
    resetError,
    hasError: error !== null
  };
}