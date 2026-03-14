/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ title, subtitle }: any) => (
    <div>
      <span>{title}</span>
      {subtitle && <span>{subtitle}</span>}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

const { ChatWithSuggestions } = require('../ChatWithSuggestions');

describe('ChatWithSuggestions', () => {
  it('renders the Chat + Smart Suggestions heading', () => {
    render(<ChatWithSuggestions patientId="p1" />);
    expect(screen.getByText('Chat + Smart Suggestions')).toBeInTheDocument();
  });

  it('shows empty conversation placeholder when no initial messages', () => {
    render(<ChatWithSuggestions patientId="p1" />);
    expect(
      screen.getByText(/start a conversation about your patient/i)
    ).toBeInTheDocument();
  });

  it('renders the PHI safety disclaimer and input textarea', () => {
    render(<ChatWithSuggestions patientId="p1" />);
    expect(screen.getByPlaceholderText(/ask about your patient/i)).toBeInTheDocument();
    expect(screen.getByText(/de-identified before ai processing/i)).toBeInTheDocument();
  });
});
