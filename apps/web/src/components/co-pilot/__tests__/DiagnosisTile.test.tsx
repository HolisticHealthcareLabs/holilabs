/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../CommandCenterTile', () => ({
  __esModule: true,
  default: ({ children, title, subtitle }: any) => (
    <div data-testid="tile"><h3>{title}</h3><span>{subtitle}</span>{children}</div>
  ),
}));

import DiagnosisTile from '../DiagnosisTile';

describe('DiagnosisTile', () => {
  it('renders empty state when no chief complaint', () => {
    render(<DiagnosisTile />);
    expect(screen.getByText('No Analysis Available')).toBeInTheDocument();
  });

  it('renders tile with correct title', () => {
    render(<DiagnosisTile />);
    expect(screen.getByText('AI Diagnosis Assistant')).toBeInTheDocument();
  });

  it('displays chief complaint when provided', () => {
    render(<DiagnosisTile chiefComplaint="Chest pain" symptoms={[]} />);
    expect(screen.getByText('Chief Complaint')).toBeInTheDocument();
    expect(screen.getByText('Chest pain')).toBeInTheDocument();
  });
});
