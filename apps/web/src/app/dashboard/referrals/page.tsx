/**
 * Referrals Dashboard Page
 *
 * Full-screen referral program interface for doctors
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ReferralDashboard from '@/components/referrals/ReferralDashboard';

export const metadata: Metadata = {
  title: 'Referral Program | Holi Labs',
  description: 'Invite colleagues and unlock rewards',
};

export default async function ReferralsPage() {
  const t = await getTranslations('dashboard.referrals');

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      <ReferralDashboard />
    </div>
  );
}
