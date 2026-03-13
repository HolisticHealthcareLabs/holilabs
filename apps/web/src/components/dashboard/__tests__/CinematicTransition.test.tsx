/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
    h1: 'h1', h2: 'h2', section: 'section',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'u1', name: 'Dr. Smith', email: 'dr@test.com', role: 'CLINICIAN' } },
    status: 'authenticated',
  }),
}));

const { CinematicTransition } = require('../CinematicTransition');

describe('CinematicTransition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children', () => {
    render(
      <CinematicTransition>
        <div>Dashboard Content</div>
      </CinematicTransition>
    );
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
