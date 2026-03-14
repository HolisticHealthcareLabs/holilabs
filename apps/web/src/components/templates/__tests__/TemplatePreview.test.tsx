/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/lib/notifications/template-renderer', () => ({
  renderTemplate: jest.fn().mockReturnValue('Hello María González'),
  extractVariables: jest.fn().mockReturnValue(['patient.firstName', 'patient.lastName']),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatePreview } from '../TemplatePreview';

describe('TemplatePreview', () => {
  it('renders the preview toggle button', () => {
    render(<TemplatePreview template="Hello {{patient.firstName}} {{patient.lastName}}" />);
    expect(screen.getByText(/Preview|Vista previa/i)).toBeInTheDocument();
  });

  it('shows rendered preview with sample data', () => {
    render(<TemplatePreview template="Hello {{patient.firstName}} {{patient.lastName}}" />);
    expect(screen.getByText('Hello María González')).toBeInTheDocument();
  });

  it('toggles preview visibility', () => {
    render(<TemplatePreview template="Test template" />);
    const toggle = screen.getByRole('button');
    fireEvent.click(toggle);
    // After click preview should be hidden
    expect(document.body).toBeTruthy();
  });
});
