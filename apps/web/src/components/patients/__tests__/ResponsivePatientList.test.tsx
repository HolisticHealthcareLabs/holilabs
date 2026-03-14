/** @jest-environment jsdom */
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));
jest.mock('../MobilePatientCard', () => ({ MobilePatientCard: ({ patient }: any) => <div data-testid="mobile-card">{patient.firstName}</div> }));
jest.mock('../DesktopPatientTable', () => ({ DesktopPatientTable: ({ patients }: any) => <div data-testid="desktop-table">{patients.length} patients</div> }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsivePatientList } from '../ResponsivePatientList';

const patients = [
  { id: '1', mrn: 'MRN001', firstName: 'Alice', lastName: 'Smith', dateOfBirth: new Date('1985-01-01') },
];

describe('ResponsivePatientList', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        addEventList: jest.fn(),
        removeEventListener: jest.fn(),
        addEventListener: jest.fn(),
      })),
    });
  });

  it('renders loading state when loading and no patients', () => {
    render(<ResponsivePatientList patients={[]} loading />);
    expect(screen.getByText(/loading patients/i)).toBeInTheDocument();
  });

  it('renders empty state when not loading and no patients', () => {
    render(<ResponsivePatientList patients={[]} loading={false} />);
    expect(screen.getByText(/no patients found/i)).toBeInTheDocument();
  });

  it('renders desktop table on desktop breakpoint', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
    render(<ResponsivePatientList patients={patients} />);
    expect(screen.getByTestId('desktop-table')).toBeInTheDocument();
  });
});
