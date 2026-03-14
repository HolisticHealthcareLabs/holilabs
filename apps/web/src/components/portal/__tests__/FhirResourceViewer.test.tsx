/** @jest-environment jsdom */
jest.mock('next/navigation', () => ({ useSearchParams: () => ({ get: () => null }) }));
jest.mock('@/lib/api/fhir-client', () => ({
  fetchPatientFhirBundle: jest.fn(),
  extractResourcesByType: jest.fn(() => []),
}));
jest.mock('../fhir/FhirResourceCard', () => ({ __esModule: true, default: () => <div data-testid="fhir-card" /> }));
jest.mock('../fhir/FhirResourceFilters', () => ({ __esModule: true, default: ({ disabled }: any) => <div data-testid="fhir-filters" data-disabled={disabled} /> }));
jest.mock('../fhir/FhirResourceDetail', () => ({ __esModule: true, default: () => <div data-testid="fhir-detail" /> }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import FhirResourceViewer from '../FhirResourceViewer';

const { fetchPatientFhirBundle } = require('@/lib/api/fhir-client');

describe('FhirResourceViewer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading skeletons while fetching', () => {
    fetchPatientFhirBundle.mockImplementation(() => new Promise(() => {}));
    render(<FhirResourceViewer patientTokenId="TK001" />);
    expect(document.querySelectorAll('[aria-label="Loading medical records"]').length).toBeGreaterThan(0);
  });

  it('shows error state when fetch fails', async () => {
    fetchPatientFhirBundle.mockRejectedValue(new Error('Network error'));
    render(<FhirResourceViewer patientTokenId="TK001" />);
    await waitFor(() => expect(screen.getByText(/Reintentar/i)).toBeInTheDocument());
  });

  it('shows empty state when bundle has no entries', async () => {
    fetchPatientFhirBundle.mockResolvedValue({ entry: [] });
    render(<FhirResourceViewer patientTokenId="TK001" />);
    await waitFor(() => expect(screen.getByText(/No hay registros médicos/i)).toBeInTheDocument());
  });
});
