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
import React, { Component, ReactNode } from 'react';
interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorType: 'generic' | 'network' | 'auth' | 'notfound';
    retryCount: number;
}
export declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>;
    handleRetry: () => void;
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    render(): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<React.AwaitedReactNode> | React.JSX.Element | null | undefined;
}
/**
 * Custom Error Fallback for Specific Sections
 */
export declare function SectionErrorFallback({ title, onRetry, }: {
    title?: string;
    onRetry?: () => void;
}): React.JSX.Element;
export {};
//# sourceMappingURL=ErrorBoundary.d.ts.map