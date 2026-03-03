import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { BillingComplianceLanding } from '@/components/landing/BillingComplianceLanding';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    if (session.user.onboardingCompleted) {
      redirect('/dashboard/prevention');
    } else {
      redirect('/onboarding');
    }
  }

  return <BillingComplianceLanding />;
}
