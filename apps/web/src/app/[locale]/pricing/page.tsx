import type { Metadata } from 'next';
import { PricingPage } from '@/components/landing/PricingPage';

export const metadata: Metadata = {
  title: 'Pricing — Cortex by Holi Labs',
  description:
    'Transparent pricing for clinical decision support. Plans for clinics, hospitals, and enterprise insurers across Latin America.',
};

export default function Pricing() {
  return <PricingPage />;
}
