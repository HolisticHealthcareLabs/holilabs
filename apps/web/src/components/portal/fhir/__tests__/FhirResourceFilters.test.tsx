/** @jest-environment jsdom */
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FhirResourceFilters from '../FhirResourceFilters';

describe('FhirResourceFilters', () => {
  const defaultProps = {
    resourceTypeCounts: { Observation: 5, Encounter: 3 },
    selectedTypes: [],
    dateRange: {},
    onFilterChange: jest.fn(),
  };

  it('renders filter button', () => {
    render(<FhirResourceFilters {...defaultProps} />);
    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });

  it('shows filter controls when expanded', () => {
    render(<FhirResourceFilters {...defaultProps} />);
    fireEvent.click(screen.getByText('Filtros'));
    expect(screen.getByText('Tipo de Recurso')).toBeInTheDocument();
  });

  it('calls onFilterChange when a type checkbox is toggled', () => {
    const onFilterChange = jest.fn();
    render(<FhirResourceFilters {...defaultProps} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByText('Filtros'));
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onFilterChange).toHaveBeenCalled();
  });
});
