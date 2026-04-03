/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

const motionCache: Record<string, React.FC<any>> = {};
jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: any, tag: string) => {
      if (!motionCache[tag]) {
        const Comp = React.forwardRef(({ children, ...props }: any, ref: any) =>
          React.createElement(tag, { ...props, ref }, children)
        );
        Comp.displayName = `motion.${tag}`;
        motionCache[tag] = Comp;
      }
      return motionCache[tag];
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: () => {} }),
  useMotionValue: () => ({ set: () => {}, get: () => 0 }),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, back: () => {}, replace: () => {} }), usePathname: () => '/test', useSearchParams: () => new URLSearchParams() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', email: 'dr@test.com', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (key: string) => key }) }));

beforeEach(() => {
  global.fetch = (() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    })
  ) as any;
});

const { CommandKPatientSelector } = require('../CommandKPatientSelector');

describe('CommandKPatientSelector', () => {
  it('renders the trigger button', () => {
    render(<CommandKPatientSelector />);
    expect(screen.getByText('Search patients...')).toBeInTheDocument();
  });

  it('shows keyboard shortcut hint', () => {
    render(<CommandKPatientSelector />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });
});
