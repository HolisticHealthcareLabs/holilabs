/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className}>{children}</p>
    ),
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@heroicons/react/24/outline', () => ({
  CheckCircleIcon: (props: any) => <svg data-testid="check-icon" {...props} />,
  XCircleIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
  ExclamationTriangleIcon: (props: any) => <svg data-testid="warning-icon" {...props} />,
  InformationCircleIcon: (props: any) => <svg data-testid="info-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="close-icon" {...props} />,
}));

const Toast = require('../Toast').default;
const { ToastContainer } = require('../Toast');

describe('Toast', () => {
  it('renders success toast with title', () => {
    render(
      <Toast id="t1" type="success" title="Saved!" onClose={jest.fn()} />
    );
    expect(screen.getByText('Saved!')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('renders error toast with message', () => {
    render(
      <Toast id="t2" type="error" title="Error" message="Something went wrong" onClose={jest.fn()} />
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(
      <Toast id="t3" type="info" title="Info" onClose={jest.fn()} />
    );
    expect(screen.getByTestId('close-icon')).toBeInTheDocument();
  });
});

describe('ToastContainer', () => {
  it('renders multiple toasts', () => {
    const toasts = [
      { id: 'a', type: 'success' as const, title: 'First' },
      { id: 'b', type: 'warning' as const, title: 'Second' },
    ];
    render(<ToastContainer toasts={toasts} onClose={jest.fn()} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
