/**
 * SearchParamsHandler Component
 *
 * Wrapper component that provides useSearchParams with proper Suspense boundary.
 * This prevents build errors when using search params in client components.
 *
 * @example
 * ```tsx
 * <SearchParamsHandler>
 *   {(searchParams) => (
 *     <YourComponent query={searchParams.get('query')} />
 *   )}
 * </SearchParamsHandler>
 * ```
 */

'use client';

import { Suspense, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReadonlyURLSearchParams } from 'next/navigation';

interface SearchParamsHandlerProps {
  children: (searchParams: ReadonlyURLSearchParams) => ReactNode;
  fallback?: ReactNode;
}

function SearchParamsContent({ children }: { children: (searchParams: ReadonlyURLSearchParams) => ReactNode }) {
  const searchParams = useSearchParams();
  return <>{children(searchParams)}</>;
}

export default function SearchParamsHandler({ children, fallback }: SearchParamsHandlerProps) {
  return (
    <Suspense fallback={fallback || <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <SearchParamsContent>{children}</SearchParamsContent>
    </Suspense>
  );
}
