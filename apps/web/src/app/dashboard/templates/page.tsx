'use client';

/**
 * Redirect from old templates route to new integrated Forms page
 * Templates are now integrated into the Forms page with a tabs interface
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TemplatesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Forms page with notifications tab active
    router.replace('/dashboard/forms?tab=notifications');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Redirigiendo a Plantillas...
        </p>
      </div>
    </div>
  );
}
