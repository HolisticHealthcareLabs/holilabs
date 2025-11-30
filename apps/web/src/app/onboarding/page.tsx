/**
 * Onboarding Page
 *
 * Professional medical command center onboarding experience
 * Implements P4 Medicine principles with notification-gated tour
 */

import { Metadata } from 'next';
import { ProfessionalOnboarding } from '@/components/onboarding/ProfessionalOnboarding';

export const metadata: Metadata = {
  title: 'Welcome | Holi Labs',
  description: 'Clinical command center for P4 Medicine',
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen">
      <ProfessionalOnboarding />
    </div>
  );
}
