/** @jest-environment jsdom */
jest.mock('@/lib/api/fhir-client', () => ({
  getResourceDisplayName: (r: any) => r.code?.text || r.resourceType,
  formatFhirDateTime: (d: string) => d || '',
  formatFhirDate: (d: string) => d || '',
  getStatusColor: () => 'gray',
}));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FhirResourceCard from '../FhirResourceCard';

const observationResource: any = {
  resourceType: 'Observation',
  id: 'obs-1',
  status: 'final',
  code: { text: 'Blood Pressure' },
  valueQuantity: { value: 120, unit: 'mmHg' },
};

const encounterResource: any = {
  resourceType: 'Encounter',
  id: 'enc-1',
  status: 'finished',
  class: { display: 'Outpatient', code: 'AMB' },
  code: { text: 'Visit' },
};

describe('FhirResourceCard', () => {
  it('renders observation in grid mode', () => {
    render(<FhirResourceCard resource={observationResource} onClick={jest.fn()} viewMode="grid" />);
    expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
    expect(screen.getByText('120 mmHg')).toBeInTheDocument();
  });

  it('renders in list mode', () => {
    render(<FhirResourceCard resource={observationResource} onClick={jest.fn()} viewMode="list" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = jest.fn();
    render(<FhirResourceCard resource={observationResource} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
