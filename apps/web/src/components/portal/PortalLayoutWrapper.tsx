'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import PatientNavigation from '@/components/portal/PatientNavigation';
import { OfflineDetector } from '@/components/OfflineDetector';
import PatientPortalWrapper from '@/components/portal/PatientPortalWrapper';

interface PortalLayoutWrapperProps {
  children: ReactNode;
  patientId?: string;
}

export default function PortalLayoutWrapper({ children, patientId }: PortalLayoutWrapperProps) {
  const pathname = usePathname();

  // Auth routes that should not show navigation
  const authRoutes = ['/portal/login', '/portal/register', '/portal/forgot-password', '/portal/reset-password'];
  const isAuthPage = authRoutes.some(route => pathname?.startsWith(route));

  // If it's an auth page, render without navigation
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Regular portal pages with navigation
  return (
    <AuthProvider>
      <PatientPortalWrapper patientId={patientId}>
        <div className="min-h-screen bg-gray-50">
          <OfflineDetector />
          <PatientNavigation />
          <main className="lg:ml-64 min-h-screen">
            {children}
          </main>
        </div>
      </PatientPortalWrapper>
    </AuthProvider>
  );
}
