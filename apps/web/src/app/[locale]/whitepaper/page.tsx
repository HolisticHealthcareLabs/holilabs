import type { Metadata } from 'next';
import WhitepaperContent from './WhitepaperContent';

export const metadata: Metadata = {
  title: 'Cortex — Clinical Safety Infrastructure for Latin America | Holi Labs',
  description:
    'Latin American healthcare loses over $12 billion annually to adverse drug events, preventable readmissions, billing denials, and clinical workflow failures. Cortex is a deterministic clinical safety protocol-layer built natively for LATAM regulatory frameworks.',
  alternates: {
    canonical: '/whitepaper',
  },
  openGraph: {
    title: 'Cortex — Clinical Safety Infrastructure for Latin America | Holi Labs',
    description:
      'Latin American healthcare loses over $12 billion annually to adverse drug events, preventable readmissions, billing denials, and clinical workflow failures. Cortex is a deterministic clinical safety protocol-layer built natively for LATAM regulatory frameworks.',
    type: 'article',
  },
};

export default function WhitepaperPage() {
  return <WhitepaperContent />;
}
