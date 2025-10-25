"use strict";
/**
 * Error Boundary Component
 *
 * Catches React errors and reports them to Sentry
 * Provides a fallback UI when errors occur
 *
 * Usage:
 *   <ErrorBoundary fallback={<ErrorFallback />}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
'use client';
/**
 * Error Boundary Component
 *
 * Catches React errors and reports them to Sentry
 * Provides a fallback UI when errors occur
 *
 * Usage:
 *   <ErrorBoundary fallback={<ErrorFallback />}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = void 0;
exports.SectionErrorFallback = SectionErrorFallback;
const react_1 = __importStar(require("react"));
const Sentry = __importStar(require("@sentry/nextjs"));
class ErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorType: 'generic',
            retryCount: 0,
        };
    }
    static getDerivedStateFromError(error) {
        // Determine error type
        let errorType = 'generic';
        if (error.message.includes('fetch') || error.message.includes('network')) {
            errorType = 'network';
        }
        else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorType = 'auth';
        }
        else if (error.message.includes('404') || error.message.includes('not found')) {
            errorType = 'notfound';
        }
        return {
            hasError: true,
            error,
            errorType,
        };
    }
    handleRetry = () => {
        this.setState((prevState) => ({
            hasError: false,
            error: null,
            retryCount: prevState.retryCount + 1,
        }));
    };
    componentDidCatch(error, errorInfo) {
        // Report to Sentry
        Sentry.captureException(error, {
            contexts: {
                react: {
                    componentStack: errorInfo.componentStack,
                },
            },
        });
        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by ErrorBoundary:', error, errorInfo);
        }
    }
    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }
            // Default fallback UI
            return (<DefaultErrorFallback error={this.state.error} errorType={this.state.errorType} retryCount={this.state.retryCount} onRetry={this.handleRetry}/>);
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
/**
 * Default Error Fallback UI
 */
function DefaultErrorFallback({ error, errorType, retryCount, onRetry, }) {
    const maxRetries = 3;
    const handleReload = () => {
        window.location.reload();
    };
    const getErrorConfig = () => {
        switch (errorType) {
            case 'network':
                return {
                    title: 'Problema de Conexión',
                    message: 'No pudimos conectarnos al servidor. Verifica tu conexión a internet e intenta nuevamente.',
                };
            case 'auth':
                return {
                    title: 'Sesión Expirada',
                    message: 'Tu sesión ha expirado. Inicia sesión nuevamente para continuar.',
                };
            case 'notfound':
                return {
                    title: 'Recurso No Encontrado',
                    message: 'El recurso que buscas no existe o fue eliminado.',
                };
            default:
                return {
                    title: 'Algo salió mal',
                    message: 'Ocurrió un error inesperado. Intenta nuevamente o contacta a soporte si el problema persiste.',
                };
        }
    };
    const errorConfig = getErrorConfig();
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
          </div>

          {/* Error Message */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
            {errorConfig.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            {errorConfig.message}
          </p>

          {/* Error Details (dev only) */}
          {process.env.NODE_ENV === 'development' && error && (<details className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
              <summary className="cursor-pointer font-medium text-gray-900 dark:text-gray-100 mb-2">
                Detalles técnicos
              </summary>
              <pre className="font-mono text-red-800 dark:text-red-300 break-all overflow-auto">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>)}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {retryCount < maxRetries && errorType !== 'auth' ? (<button onClick={onRetry} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all inline-flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Reintentar {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </button>) : (<button onClick={handleReload} className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 transition-all">
                Recargar página
              </button>)}

            {errorType === 'auth' ? (<a href="/login" className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all text-center">
                Iniciar Sesión
              </a>) : (<button onClick={() => window.history.back()} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                Volver
              </button>)}
          </div>

          {/* Support Link */}
          <div className="mt-4 text-center">
            <a href="mailto:support@holilabs.com" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              ¿Necesitas ayuda? Contacta soporte
            </a>
          </div>

          {retryCount >= maxRetries && (<p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              Si el problema persiste, contacta a soporte técnico.
            </p>)}
        </div>
      </div>
    </div>);
}
/**
 * Custom Error Fallback for Specific Sections
 */
function SectionErrorFallback({ title = 'Error en esta sección', onRetry, }) {
    return (<div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">
            No se pudo cargar esta sección. Por favor, intenta de nuevo.
          </p>
          {onRetry && (<button onClick={onRetry} className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
              Reintentar →
            </button>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=ErrorBoundary.js.map