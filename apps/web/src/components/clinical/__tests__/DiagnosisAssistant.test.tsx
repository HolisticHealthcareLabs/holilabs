/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', email: 'dr@test.com', role: 'CLINICIAN' } }, status: 'authenticated' }),
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
});

import DiagnosisAssistant from '../DiagnosisAssistant';

describe('DiagnosisAssistant', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders heading without crashing', () => {
    render(<DiagnosisAssistant />);
    expect(screen.getByText('Clinical Reasoning')).toBeInTheDocument();
  });

  it('renders patient information form', () => {
    render(<DiagnosisAssistant />);
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
  });

  it('shows ready-to-assist state when no results', () => {
    render(<DiagnosisAssistant />);
    expect(screen.getByText('Ready to Assist')).toBeInTheDocument();
  });
});
