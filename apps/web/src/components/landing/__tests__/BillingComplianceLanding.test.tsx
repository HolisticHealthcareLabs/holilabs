/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => {
  const motionProxy = new Proxy({}, {
    get: (_, tag: string) => {
      return React.forwardRef((props: any, ref: any) => React.createElement(tag, { ...props, ref }));
    },
  });
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: any) => children,
    useScroll: () => ({ scrollYProgress: { get: () => 0, on: () => () => {} } }),
    useTransform: () => ({ get: () => 0, on: () => () => {} }),
    useInView: () => true,
    useMotionValue: () => ({ get: () => 0, set: () => {}, on: () => () => {} }),
    useSpring: () => ({ get: () => 0, on: () => () => {} }),
    animate: () => ({ stop: () => {} }),
  };
});
jest.mock('next-intl', () => ({
  useTranslations: () => Object.assign((k: string) => k, { raw: () => [] }),
  useLocale: () => 'en',
}));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {} }),
  usePathname: () => '/',
}));
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: () => {} }),
  usePathname: () => '/',
}));

import { BillingComplianceLanding } from '../BillingComplianceLanding';

describe('BillingComplianceLanding', () => {
  it('renders without crashing', () => {
    const { container } = render(<BillingComplianceLanding />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the navigation header', () => {
    render(<BillingComplianceLanding />);
    expect(document.querySelector('header')).toBeInTheDocument();
  });

  it('renders Holi Labs brand name', () => {
    render(<BillingComplianceLanding />);
    expect(screen.getByText(/Holi Labs/i)).toBeInTheDocument();
  });
});
