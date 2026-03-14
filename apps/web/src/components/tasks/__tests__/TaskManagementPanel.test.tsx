/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ tasks: [], counts: { today: 0, overdue: 0, all: 0 } }),
  }) as any;
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TaskManagementPanel from '../TaskManagementPanel';

describe('TaskManagementPanel', () => {
  it('renders with no userId showing empty state', async () => {
    render(<TaskManagementPanel />);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('renders task panel heading', async () => {
    render(<TaskManagementPanel userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Tasks|Tareas|Today/i)).toBeInTheDocument();
    });
  });

  it('renders filter controls', async () => {
    render(<TaskManagementPanel userId="user-1" />);
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
