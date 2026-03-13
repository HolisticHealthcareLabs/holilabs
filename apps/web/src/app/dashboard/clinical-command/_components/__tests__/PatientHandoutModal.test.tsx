/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      outboundCommunication: 'Outbound Communication',
      reviewAndSendSummary: 'Review and send visit summary',
      messagePreview: 'Message Preview',
      deliveryMethod: 'Delivery Method',
      patientApp: 'Patient App',
      whatsApp: 'WhatsApp',
      emailLabel: 'Email',
      cancel: 'Cancel',
      approveAndSend: 'Approve & Send',
      sent: 'Sent!',
    };
    return map[key] ?? key;
  },
}));

import { PatientHandoutModal } from '../PatientHandoutModal';

describe('PatientHandoutModal', () => {
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when closed', () => {
    const { container } = render(<PatientHandoutModal isOpen={false} onClose={onClose} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders header when open', () => {
    render(<PatientHandoutModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Outbound Communication')).toBeInTheDocument();
  });

  it('renders delivery method options', () => {
    render(<PatientHandoutModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Patient App')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });
});
