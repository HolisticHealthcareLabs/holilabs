/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));

const { LoadingScreen } = require('../LoadingScreen');

describe('LoadingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
  });

  it('renders without crashing', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Skip Intro button', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Skip Intro')).toBeInTheDocument();
  });

  it('calls onComplete when Skip Intro is clicked', () => {
    const onComplete = jest.fn();
    render(<LoadingScreen onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Skip Intro'));
    expect(onComplete).toHaveBeenCalled();
  });
});
