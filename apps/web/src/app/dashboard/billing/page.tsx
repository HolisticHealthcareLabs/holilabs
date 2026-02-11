import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Billing - Holi Labs',
  description: 'Manage your plan, invoices, and payment method.',
};

export default function BillingPage() {
  redirect('/dashboard/settings?tab=billing');
}

