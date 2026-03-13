import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { BillingComplianceLanding } from '@/components/landing/BillingComplianceLanding';

export const dynamic = 'force-dynamic';

export default async function RootHomePage() {
  try {
    const session = await auth();

    if (session?.user) {
      if (session.user.onboardingCompleted) {
        redirect('/dashboard/prevention');
      } else {
        redirect('/onboarding');
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error && 'digest' in error) {
      throw error;
    }
  }

  return <BillingComplianceLanding />;
}
