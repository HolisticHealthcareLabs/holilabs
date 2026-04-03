/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => {
  const React = require('react');
  const cache: Record<string, React.ComponentType<any>> = {};
  const handler = {
    get: (_target: any, prop: string) => {
      if (!cache[prop]) {
        cache[prop] = React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, layout, ...rest }: any, ref: any) => {
          const tag = typeof prop === 'string' ? prop : 'div';
          return React.createElement(tag, { ...rest, ref }, children);
        });
      }
      return cache[prop];
    },
  };
  const motionProxy = new Proxy({}, handler);
  return {
    __esModule: true,
    motion: motionProxy,
    m: motionProxy,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

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
