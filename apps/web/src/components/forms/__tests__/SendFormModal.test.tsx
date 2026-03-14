/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SendFormModal from '../SendFormModal';

const mockTemplate = {
  id: 'tpl-1',
  title: 'Patient Intake Form',
  description: 'Basic intake',
  estimatedMinutes: 5,
  category: 'intake',
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ patients: [] }),
  }) as any;
});

describe('SendFormModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <SendFormModal isOpen={false} onClose={jest.fn()} template={mockTemplate} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal with title when open', async () => {
    render(
      <SendFormModal isOpen={true} onClose={jest.fn()} template={mockTemplate} />
    );
    expect(screen.getByText('Enviar Formulario')).toBeInTheDocument();
    expect(screen.getByText('Patient Intake Form')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const onClose = jest.fn();
    render(
      <SendFormModal isOpen={true} onClose={onClose} template={mockTemplate} />
    );
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });
});
