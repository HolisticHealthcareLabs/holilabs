/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { GranularAccessManager } from '../GranularAccessManager';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GranularAccessManager', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading text initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<GranularAccessManager patientId="pat-1" />);
    expect(screen.getByText(/Loading granular access grants/i)).toBeInTheDocument();
  });

  it('shows empty state when no grants', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, grants: [] }) });
    render(<GranularAccessManager patientId="pat-1" />);
    await waitFor(() => expect(screen.getByText(/No granular access grants found/i)).toBeInTheDocument());
  });

  it('toggles grant form on button click', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, grants: [] }) });
    render(<GranularAccessManager patientId="pat-1" />);
    await waitFor(() => screen.getByText('+ Grant Access'));
    fireEvent.click(screen.getByText('+ Grant Access'));
    expect(screen.getByText('Grant Granular Access')).toBeInTheDocument();
  });
});
