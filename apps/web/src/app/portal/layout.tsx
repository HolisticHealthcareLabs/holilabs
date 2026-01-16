/**
 * Patient Portal Layout
 *
 * Shared layout for all patient portal pages
 * Features:
 * - Protected routes (requires authentication)
 * - Mobile-first responsive navigation
 * - Side navigation for desktop
 * - Top bar with user menu
 * - Breadcrumbs
 * - Quick actions
 * - Conditionally hides navigation on auth pages (login, register, etc.)
 */

// Force dynamic rendering for portal (requires authentication and session cookies)
export const dynamic = 'force-dynamic';

import { getPatientSession } from '@/lib/auth/patient-session';
import PortalLayoutWrapper from '@/components/portal/PortalLayoutWrapper';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated
  const session = await getPatientSession();

  return (
    <PortalLayoutWrapper patientId={session?.userId}>
      {children}
    </PortalLayoutWrapper>
  );
}
