/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_: any, tag: string) => tag }),
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

const { QuickActionsMenu } = require('../QuickActionsMenu');

describe('QuickActionsMenu', () => {
  it('renders the Quick Actions heading', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('shows primary action buttons including New Patient and Co-Pilot', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('New Patient')).toBeInTheDocument();
    expect(screen.getByText('Co-Pilot')).toBeInTheDocument();
  });

  it('reveals additional actions when More Actions is clicked', () => {
    render(<QuickActionsMenu />);
    expect(screen.queryByText('AI Scribe')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('More Actions'));
    expect(screen.getByText('AI Scribe')).toBeInTheDocument();
    expect(screen.getByText('Show Less')).toBeInTheDocument();
  });
});
