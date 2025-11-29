'use client';

/**
 * Error Boundary Component
 *
 * Catches React component errors and provides graceful fallback UI
 * Logs errors to audit trail for compliance monitoring
 *
 * @inspiration Medplum error handling patterns
 * @compliance LGPD Art. 48 (Security incident notification)
 */

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to audit trail (async, don't block UI)
    this.logErrorToAudit(error, errorInfo);
  }

  private async logErrorToAudit(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await fetch('/api/audit/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (logError) {
      console.error('[ErrorBoundary] Failed to log error:', logError);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Error Title */}
            <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4 text-center">
              Erro Inesperado
            </h2>

            {/* Error Message */}
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
              Ocorreu um erro ao processar sua solicitação. Nossa equipe foi notificada
              automaticamente e está trabalhando para resolver o problema.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  🔧 Detalhes Técnicos (Desenvolvimento)
                </summary>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong className="text-red-600 dark:text-red-400">Erro:</strong>
                    <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded overflow-x-auto text-xs">
                      {this.state.error.message}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong className="text-red-600 dark:text-red-400">Stack Trace:</strong>
                      <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded overflow-x-auto text-xs">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong className="text-red-600 dark:text-red-400">Component Stack:</strong>
                      <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded overflow-x-auto text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Voltar ao Dashboard
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              Se o problema persistir, entre em contato com o suporte técnico.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error handler for functional components
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { handleError } = useErrorHandler();
 *
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (error) {
 *       handleError(error);
 *     }
 *   };
 * }
 * ```
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: unknown) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    setError(errorObj);

    // Log to audit trail
    fetch('/api/audit/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorMessage: errorObj.message,
        errorStack: errorObj.stack,
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  if (error) {
    throw error;
  }

  return { handleError };
}
