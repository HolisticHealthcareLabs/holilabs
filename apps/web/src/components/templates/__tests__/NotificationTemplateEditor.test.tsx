/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/components/templates/VariablePicker', () => ({ VariablePicker: () => null }));
jest.mock('@/components/templates/TemplatePreview', () => ({ TemplatePreview: () => null }));

jest.mock('@/lib/notifications/template-renderer', () => ({
  getDefaultTemplate: jest.fn().mockReturnValue('Hello {{patient.firstName}}'),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NotificationTemplateEditor } from '../NotificationTemplateEditor';

describe('NotificationTemplateEditor', () => {
  it('renders the editor in create mode', () => {
    render(
      <NotificationTemplateEditor
        mode="create"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText(/Nuevo Template|New Template|Crear/i) || document.querySelector('form')).toBeTruthy();
  });

  it('renders template type selector', () => {
    render(
      <NotificationTemplateEditor
        mode="create"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText(/Recordatorio de Cita|REMINDER/i)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(
      <NotificationTemplateEditor
        mode="create"
        onSave={jest.fn()}
        onCancel={onCancel}
      />
    );
    const cancelBtns = screen.getAllByText(/Cancelar|Cancel/i);
    const cancelBtn = cancelBtns.find(el => el.tagName === 'BUTTON') || cancelBtns[cancelBtns.length - 1];
    cancelBtn.click();
    expect(onCancel).toHaveBeenCalled();
  });
});
