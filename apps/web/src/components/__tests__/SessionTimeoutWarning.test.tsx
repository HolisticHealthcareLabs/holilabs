/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));

import { SessionTimeoutWarning } from '../SessionTimeoutWarning';

beforeEach(() => jest.clearAllMocks());

const defaultProps = { isOpen: true, timeRemaining: 90000, onExtend: jest.fn(), onLogout: jest.fn() };

describe('SessionTimeoutWarning', () => {
  it('renders countdown when isOpen is true', () => {
    render(<SessionTimeoutWarning {...defaultProps} />);
    expect(screen.getByText('Sesión a punto de expirar')).toBeInTheDocument();
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<SessionTimeoutWarning {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onExtend and onLogout callbacks on button clicks', () => {
    const onExtend = jest.fn();
    const onLogout = jest.fn();
    render(<SessionTimeoutWarning {...defaultProps} onExtend={onExtend} onLogout={onLogout} />);
    fireEvent.click(screen.getByText('Seguir Trabajando'));
    expect(onExtend).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Cerrar Sesión'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
