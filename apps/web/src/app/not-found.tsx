'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 animate-enter-up">
        <p className="text-[120px] sm:text-[180px] font-bold leading-none text-muted-foreground/10 select-none">
          404
        </p>
        <h2 className="text-2xl font-semibold text-foreground -mt-6 mb-2">
          Page not found
        </h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
