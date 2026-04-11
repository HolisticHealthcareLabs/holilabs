'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
      <h2 className="text-xl font-semibold dark:text-white" style={{ color: 'var(--text-primary)' }}>Something went wrong</h2>
      <p className="dark:text-gray-400 text-sm text-center max-w-md" style={{ color: 'var(--text-tertiary)' }}>An unexpected error occurred. Please try again.</p>
      <button onClick={reset} className="px-4 py-2 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity" style={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--text-primary)' }}>
        Try again
      </button>
    </div>
  );
}
