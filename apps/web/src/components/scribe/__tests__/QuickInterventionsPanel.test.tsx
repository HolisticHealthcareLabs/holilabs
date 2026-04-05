/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickInterventionsPanel from '../QuickInterventionsPanel';

describe('QuickInterventionsPanel', () => {
  it('renders the panel heading', () => {
    render(<QuickInterventionsPanel onInsertText={jest.fn()} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('renders intervention buttons', () => {
    render(<QuickInterventionsPanel onInsertText={jest.fn()} />);
    // Should have clickable items for interventions
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onInsertText when an intervention button is clicked', () => {
    const onInsertText = jest.fn();
    render(<QuickInterventionsPanel onInsertText={onInsertText} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onInsertText).toHaveBeenCalled();
  });
});
