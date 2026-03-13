/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

import { PatientConsentModal } from '../PatientConsentModal';

describe('PatientConsentModal', () => {
  const defaultProps = {
    isOpen: true,
    onConsent: jest.fn(),
    onDecline: jest.fn(),
    patientName: 'Maria Garcia',
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<PatientConsentModal {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders patient name and consent text when open', () => {
    render(<PatientConsentModal {...defaultProps} />);
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Recording Consent Required')).toBeInTheDocument();
  });

  it('disables consent button until checkbox is checked', () => {
    render(<PatientConsentModal {...defaultProps} />);
    const consentBtn = screen.getByText('I Consent');
    expect(consentBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(consentBtn).not.toBeDisabled();
  });
});
