/**
 * Patient Settings (Legacy Route)
 *
 * We intentionally redirect this route to avoid having two separate settings pages
 * in the patient portal. Canonical route:
 *   /portal/dashboard/settings
 */

export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

export default function SettingsRedirectPage() {
  redirect('/portal/dashboard/settings');
}


