/** @jest-environment jsdom */
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientOnboardingWizard from '../PatientOnboardingWizard';

describe('PatientOnboardingWizard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not render when onboarding is already completed', () => {
    localStorage.setItem('patient_onboarding_completed', 'true');
    const { container } = render(<PatientOnboardingWizard />);
    expect(container.firstChild).toBeNull();
  });

  it('shows welcome message when onboarding is not complete', () => {
    render(<PatientOnboardingWizard />);
    expect(screen.getByText(/Welcome to Holi Labs/i)).toBeInTheDocument();
  });

  it('skips onboarding when skip button clicked', () => {
    render(<PatientOnboardingWizard />);
    fireEvent.click(screen.getByText(/Skip for now/i));
    expect(localStorage.getItem('patient_onboarding_completed')).toBe('true');
  });
});
