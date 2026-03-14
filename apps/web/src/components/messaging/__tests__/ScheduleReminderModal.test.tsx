/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('../PatientSelectorModal', () => ({ __esModule: true, default: () => null }));

const ScheduleReminderModal = require('../ScheduleReminderModal').default;

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  template: null,
};

describe('ScheduleReminderModal', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns null when isOpen is false', () => {
    const { container } = render(<ScheduleReminderModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Schedule Reminder" heading when open', () => {
    render(<ScheduleReminderModal {...defaultProps} />);
    expect(screen.getByText('Schedule Reminder')).toBeInTheDocument();
  });

  it('shows template name when template prop is provided', () => {
    const template = { name: 'Follow-up Reminder', category: 'general', message: 'Hi', variables: [] };
    render(<ScheduleReminderModal {...defaultProps} template={template} />);
    expect(screen.getByText(/Follow-up Reminder/)).toBeInTheDocument();
  });
});
