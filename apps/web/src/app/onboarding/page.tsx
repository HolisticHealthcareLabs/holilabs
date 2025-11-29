/**
 * Onboarding Page
 *
 * First-time user experience with demo patient setup
 */

import { Metadata } from 'next';
import DemoPatientSetup from '@/components/onboarding/DemoPatientSetup';

export const metadata: Metadata = {
  title: 'Welcome | Holi Labs',
  description: 'Get started with Holi Labs',
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <DemoPatientSetup />
    </div>
  );
}
