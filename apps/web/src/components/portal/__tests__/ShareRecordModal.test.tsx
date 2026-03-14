/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareRecordModal from '../ShareRecordModal';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ShareRecordModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ShareRecordModal isOpen={false} onClose={jest.fn()} recordId="rec-1" recordTitle="My Record" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders form when open', () => {
    render(<ShareRecordModal isOpen onClose={jest.fn()} recordId="rec-1" recordTitle="My Record" />);
    expect(screen.getByText('Compartir Registro Médico')).toBeInTheDocument();
    expect(screen.getByText('My Record')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<ShareRecordModal isOpen onClose={onClose} recordId="rec-1" recordTitle="My Record" />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
