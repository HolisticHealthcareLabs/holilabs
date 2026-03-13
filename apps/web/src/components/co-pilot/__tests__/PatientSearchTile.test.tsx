/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

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
  default: ({ children, title }: any) => <div data-testid="tile"><h3>{title}</h3>{children}</div>,
}));

import PatientSearchTile from '../PatientSearchTile';

const mockPatients: any[] = [
  { id: 'p1', firstName: 'Maria', lastName: 'Santos', email: 'maria@test.com', gender: 'female', dateOfBirth: '1980-01-01', phone: '+55111' },
  { id: 'p2', firstName: 'Carlos', lastName: 'Silva', email: 'carlos@test.com', gender: 'male', dateOfBirth: null, phone: null },
];

describe('PatientSearchTile', () => {
  const onSelectPatient = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders search input when no patient selected', () => {
    render(<PatientSearchTile patients={mockPatients} selectedPatient={null} onSelectPatient={onSelectPatient} />);
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders patient list items', () => {
    render(<PatientSearchTile patients={mockPatients} selectedPatient={null} onSelectPatient={onSelectPatient} />);
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
  });

  it('calls onSelectPatient when a patient is clicked', () => {
    render(<PatientSearchTile patients={mockPatients} selectedPatient={null} onSelectPatient={onSelectPatient} />);
    fireEvent.click(screen.getByText('Maria Santos'));
    expect(onSelectPatient).toHaveBeenCalledWith(mockPatients[0]);
  });
});
