/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

import PatientSearch from '../PatientSearch';

beforeEach(() => jest.clearAllMocks());

describe('PatientSearch', () => {
  it('renders most-viewed patients by default', () => {
    render(<PatientSearch />);
    expect(screen.getByText('Most Viewed Patients')).toBeInTheDocument();
    expect(screen.getByText('María González')).toBeInTheDocument();
  });

  it('filters patients by search query', () => {
    render(<PatientSearch />);
    fireEvent.change(screen.getByPlaceholderText(/search patients/i), { target: { value: 'Carlos' } });
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    expect(screen.queryByText('Ana Rodríguez')).not.toBeInTheDocument();
  });

  it('calls onSelectPatient with patient id when clicked', () => {
    const onSelect = jest.fn();
    render(<PatientSearch onSelectPatient={onSelect} />);
    fireEvent.click(screen.getAllByText('María González')[0].closest('div')!);
    expect(onSelect).toHaveBeenCalledWith('pt-001');
  });
});
