/** @jest-environment jsdom */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));

import { IntroAnimation } from '../IntroAnimation';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  sessionStorage.clear();
});
afterEach(() => jest.useRealTimers());

describe('IntroAnimation', () => {
  it('renders logo and brand name on first visit', () => {
    render(<IntroAnimation />);
    expect(screen.getByText('Holi Labs')).toBeInTheDocument();
  });

  it('calls onComplete and hides after duration', () => {
    const onComplete = jest.fn();
    render(<IntroAnimation onComplete={onComplete} duration={500} />);
    act(() => { jest.advanceTimersByTime(500); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips animation if already seen in session', () => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    const onComplete = jest.fn();
    render(<IntroAnimation onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Holi Labs')).not.toBeInTheDocument();
  });
});
