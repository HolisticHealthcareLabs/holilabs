import type { Metadata } from 'next';
import { DemoPlayground } from '@/components/demo/DemoPlayground';

export const metadata: Metadata = {
  title: 'Cortex Demo — Clinical Decision Support',
  description:
    'Experience Cortex clinical decision support in action. Try 5 patient scenarios and see how Cortex catches drug interactions, lab abnormalities, and compliance gaps.',
};

export default function DemoPage() {
  return <DemoPlayground />;
}
