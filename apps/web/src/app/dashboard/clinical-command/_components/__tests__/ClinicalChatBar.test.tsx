/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
      React.forwardRef(({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<unknown>) => {
        const tag = typeof prop === 'string' ? prop : 'button';
        return React.createElement(tag, { ...rest, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../CdssAlertsPane', () => ({}));

const { ClinicalChatBar } = require('../ClinicalChatBar');

const defaultProps = {
  value: '',
  onChange: jest.fn(),
  onSend: jest.fn(),
  onSync: jest.fn(),
  onUpload: jest.fn(),
  onMicToggle: jest.fn(),
  isListening: false,
  isSyncing: false,
  isReplying: false,
  disabled: false,
  promptMode: 'Planning' as const,
  onPromptModeChange: jest.fn(),
  activeModel: 'anthropic' as const,
  onModelChange: jest.fn(),
};

describe('ClinicalChatBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ClinicalChatBar {...defaultProps} />);
    expect(screen.getByLabelText('Clinical chat input')).toBeInTheDocument();
  });

  it('renders prompt mode selector with default mode', () => {
    render(<ClinicalChatBar {...defaultProps} />);
    expect(screen.getByLabelText('Prompt mode')).toHaveValue('Planning');
  });

  it('calls onChange when user types in textarea', () => {
    const onChange = jest.fn();
    render(<ClinicalChatBar {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Clinical chat input'), {
      target: { value: 'What is the dosage?' },
    });
    expect(onChange).toHaveBeenCalledWith('What is the dosage?');
  });

  it('shows listening state on mic button when isListening=true', () => {
    render(<ClinicalChatBar {...defaultProps} isListening={true} />);
    expect(screen.getByLabelText('Stop listening')).toBeInTheDocument();
  });

  it('calls onMicToggle when mic button clicked', () => {
    const onMicToggle = jest.fn();
    render(<ClinicalChatBar {...defaultProps} onMicToggle={onMicToggle} />);
    fireEvent.click(screen.getByLabelText('Start voice input'));
    expect(onMicToggle).toHaveBeenCalled();
  });
});
