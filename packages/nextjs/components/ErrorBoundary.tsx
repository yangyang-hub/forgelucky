"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ error, resetError }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-error/10 border border-error/20 rounded-lg p-6 text-center">
      <div className="text-error text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-error mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-600 mb-4">
        An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
      </p>
      {error && process.env.NODE_ENV === "development" && (
        <details className="text-left mb-4 p-3 bg-gray-100 rounded text-xs">
          <summary className="cursor-pointer font-medium">Error Details (Dev Mode)</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">
            {error.message}
            {error.stack && `\n${error.stack}`}
          </pre>
        </details>
      )}
      <div className="flex gap-2 justify-center">
        <button onClick={resetError} className="btn btn-primary btn-sm">
          Try Again
        </button>
        <button onClick={() => window.location.reload()} className="btn btn-outline btn-sm">
          Refresh Page
        </button>
      </div>
    </div>
  </div>
);

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Higher-order component that wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    setError(errorObj);
    console.error("Error handled by useErrorHandler:", errorObj);
  }, []);

  // If there's an error, throw it to be caught by error boundary
  if (error) {
    throw error;
  }

  return { handleError, resetError };
}
