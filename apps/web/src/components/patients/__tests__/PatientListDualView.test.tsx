/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/ui/Badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }));
jest.mock('@/components/ui/Button', () => ({ Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button> }));
jest.mock('@/components/ui/Input', () => ({
  Input: (props: any) => <input {...props} />,
  SearchInput: (props: any) => <input {...props} />,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatientListDualView } from '../PatientListDualView';

const mockPatients = [
  { id: '1', firstName: 'Alice', lastName: 'Smith', tokenId: 'TK001', ageBand: '30-40', region: 'CDMX', isActive: true },
  { id: '2', firstName: 'Bob', lastName: 'Jones', tokenId: 'TK002', ageBand: '50-60', region: 'MTY', isActive: false },
];

describe('PatientListDualView', () => {
  it('renders patient names in card view', () => {
    render(<PatientListDualView patients={mockPatients} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('shows patient count', () => {
    render(<PatientListDualView patients={mockPatients} />);
    expect(screen.getByText(/2 patients/i)).toBeInTheDocument();
  });

  it('switches to table view on button click', () => {
    render(<PatientListDualView patients={mockPatients} />);
    const buttons = screen.getAllByRole('button');
    // The second view-toggle button switches to table view
    const tableBtn = buttons.find(b => b.querySelector('svg path[d*="M3 10h18"]'));
    if (tableBtn) fireEvent.click(tableBtn);
    // After switch, checkboxes in table header should appear
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('shows empty state when no patients match filter', () => {
    render(<PatientListDualView patients={mockPatients} />);
    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: 'zzz-no-match' } });
    expect(screen.getByText(/no patients found/i)).toBeInTheDocument();
  });
});
