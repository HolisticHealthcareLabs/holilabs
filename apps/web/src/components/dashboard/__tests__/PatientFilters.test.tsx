/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));

import PatientFilters from '../PatientFilters';

beforeEach(() => jest.clearAllMocks());

describe('PatientFilters', () => {
  it('renders search input', () => {
    render(<PatientFilters onFilterChange={jest.fn()} />);
    expect(screen.getByPlaceholderText(/search patients/i)).toBeInTheDocument();
  });

  it('calls onFilterChange with search term when typing', () => {
    const onFilterChange = jest.fn();
    render(<PatientFilters onFilterChange={onFilterChange} />);
    fireEvent.change(screen.getByPlaceholderText(/search patients/i), { target: { value: 'Maria' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'Maria' }));
  });

  it('shows active filter count badge and clears on "Clear all"', () => {
    const onFilterChange = jest.fn();
    render(<PatientFilters onFilterChange={onFilterChange} />);
    fireEvent.change(screen.getByPlaceholderText(/search patients/i), { target: { value: 'test' } });
    expect(screen.getByText('1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear all'));
    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }));
  });
});
