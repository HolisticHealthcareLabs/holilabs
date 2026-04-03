/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

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
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      coPilotHeader: 'Co-Pilot',
      aiThinking: 'AI is thinking...',
      hiThere: 'Hi there',
      whereToStart: 'Where to start?',
      suggestionsAdapt: 'Suggestions adapt to your workflow',
      noAiAvailable: 'API Key Required',
      apiKeyRequired: 'API Key Required',
      modelNotConfigured: `${params?.model ?? ''} is not configured`,
      addByokKey: 'Add your BYOK key in Settings',
      configureByok: 'Configure BYOK',
    };
    return map[key] ?? key;
  },
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Dr. Test', organizationId: 'org-1' } } }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

jest.mock('../ClinicalChatBar', () => ({
  ClinicalChatBar: () => <div data-testid="chat-bar">ChatBar</div>,
}));

jest.mock('../useMicrophoneSTT', () => ({
  useMicrophoneSTT: () => ({ isListening: false, startListening: jest.fn(), stopListening: jest.fn() }),
}));

import { CdssAlertsPane } from '../CdssAlertsPane';

describe('CdssAlertsPane', () => {
  const baseProps = {
    activeModel: 'anthropic' as const,
    modelConfigs: { anthropic: { isConfigured: true, isActive: true } },
    onModelChange: jest.fn(),
    cdssAlerts: [],
    isSyncing: false,
    onSync: jest.fn(),
    syncError: null,
    patientSelected: false,
    hasTranscript: false,
    onOpenHandout: jest.fn(),
  };

  it('renders Co-Pilot header', () => {
    render(<CdssAlertsPane {...baseProps} />);
    expect(screen.getByText('Co-Pilot')).toBeInTheDocument();
  });

  it('renders empty state greeting when no messages', () => {
    render(<CdssAlertsPane {...baseProps} />);
    expect(screen.getByText('Where to start?')).toBeInTheDocument();
  });

  it('shows API key overlay when model not configured', () => {
    render(
      <CdssAlertsPane
        {...baseProps}
        modelConfigs={{ anthropic: { isConfigured: false, isActive: true } }}
      />
    );
    expect(screen.getByText('API Key Required')).toBeInTheDocument();
  });
});
