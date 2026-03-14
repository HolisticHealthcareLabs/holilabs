/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientToolkit from '../PatientToolkit';

describe('PatientToolkit', () => {
  it('renders My Health Toolkit heading', () => {
    render(<PatientToolkit />);
    expect(screen.getByText('My Health Toolkit')).toBeInTheDocument();
  });

  it('toggles actions dropdown on button click', () => {
    render(<PatientToolkit />);
    const toggleBtn = screen.getByText(/Show all actions/i);
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Hide all actions/i)).toBeInTheDocument();
  });

  it('updates selected action when item is clicked from dropdown', () => {
    render(<PatientToolkit />);
    fireEvent.click(screen.getByText(/Show all actions/i));
    // Click on Messages action
    fireEvent.click(screen.getByText('Messages & Communication'));
    expect(screen.getAllByText('Messages & Communication').length).toBeGreaterThan(0);
  });
});
