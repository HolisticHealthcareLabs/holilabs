/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
    svg: 'svg', circle: 'circle',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@heroicons/react/24/outline', () => ({
  PlayIcon: (props: any) => <svg data-testid="play-icon" {...props} />,
  PauseIcon: (props: any) => <svg data-testid="pause-icon" {...props} />,
  StopIcon: (props: any) => <svg data-testid="stop-icon" {...props} />,
}));

const { FocusTimer } = require('../FocusTimer');

describe('FocusTimer', () => {
  it('renders without crashing', () => {
    const { container } = render(<FocusTimer />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays initial time of 25:00', () => {
    render(<FocusTimer />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });
});
