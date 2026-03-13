/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, role, ...props }: any) => (
      <div className={className} role={role} aria-modal={props['aria-modal']} aria-label={props['aria-label']}>{children}</div>
    ),
    h1: ({ children, className, ...props }: any) => <h1 className={className}>{children}</h1>,
    p: ({ children, className, ...props }: any) => <p className={className}>{children}</p>,
    button: ({ children, onClick, className, ref: _ref, ...props }: any) => (
      <button onClick={onClick} className={className}>{children}</button>
    ),
  },
}));

const WelcomeModal = require('../WelcomeModal').default;

describe('WelcomeModal', () => {
  const defaultProps = {
    doctorName: 'Silva',
    specialty: 'Cardiology',
    onStartTour: jest.fn(),
    onDismiss: jest.fn(),
  };

  it('renders welcome message with doctor name', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText(/Welcome, Dr\. Silva/)).toBeInTheDocument();
  });

  it('renders workspace ready text with specialty', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText(/Cardiology workspace is ready/)).toBeInTheDocument();
  });

  it('renders tour and explore buttons', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText(/75-second guided tour/)).toBeInTheDocument();
    expect(screen.getByText(/explore on my own/i)).toBeInTheDocument();
  });
});
