/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ElectronicSignature from '../ElectronicSignature';

describe('ElectronicSignature', () => {
  it('renders PIN entry by default', () => {
    render(<ElectronicSignature onSign={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Electronic Signature')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/4-6 digit PIN/i)).toBeInTheDocument();
  });

  it('disables sign button when PIN is too short', () => {
    render(<ElectronicSignature onSign={jest.fn()} onCancel={jest.fn()} />);
    const pinInput = screen.getByPlaceholderText(/4-6 digit PIN/i);
    fireEvent.change(pinInput, { target: { value: '123' } });
    const signBtn = screen.getByText(/Sign Prescription/i).closest('button');
    expect(signBtn).toBeDisabled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn();
    render(<ElectronicSignature onSign={jest.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('switches to signature pad mode', () => {
    render(<ElectronicSignature onSign={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByText('Signature Pad'));
    expect(screen.getByText('Draw Your Signature')).toBeInTheDocument();
  });
});
