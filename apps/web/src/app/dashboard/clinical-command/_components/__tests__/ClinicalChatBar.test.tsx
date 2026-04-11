/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

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
    expect(screen.getByLabelText('prompt mode')).toHaveValue('Planning');
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
    expect(screen.getByLabelText('stop listening')).toBeInTheDocument();
  });

  it('calls onMicToggle when mic button clicked', () => {
    const onMicToggle = jest.fn();
    render(<ClinicalChatBar {...defaultProps} onMicToggle={onMicToggle} />);
    fireEvent.click(screen.getByLabelText('start voice input'));
    expect(onMicToggle).toHaveBeenCalled();
  });
});
