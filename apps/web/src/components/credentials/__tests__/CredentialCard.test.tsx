/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  CheckCircle2: (props: any) => <svg data-testid="check-icon" {...props} />,
  Clock: (props: any) => <svg data-testid="clock-icon" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="alert-icon" {...props} />,
  XCircle: (props: any) => <svg data-testid="x-icon" {...props} />,
  FileText: (props: any) => <svg data-testid="file-icon" {...props} />,
  Calendar: (props: any) => <svg data-testid="calendar-icon" {...props} />,
  MapPin: (props: any) => <svg data-testid="map-icon" {...props} />,
  Shield: (props: any) => <svg data-testid="shield-icon" {...props} />,
  Eye: (props: any) => <svg data-testid="eye-icon" {...props} />,
}));

const { CredentialCard } = require('../CredentialCard');

const mockCredential = {
  id: 'cred-1',
  credentialType: 'MEDICAL_LICENSE',
  credentialNumber: 'ML-12345',
  issuingAuthority: 'Medical Board',
  issuingCountry: 'US',
  issuingState: 'CA',
  issuedDate: '2023-01-15',
  expirationDate: '2025-01-15',
  neverExpires: false,
  verificationStatus: 'VERIFIED',
  verifiedAt: '2023-02-01',
  autoVerified: true,
  manualVerified: false,
  verificationSource: 'State Registry',
};

describe('CredentialCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<CredentialCard credential={mockCredential} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays credential type', () => {
    render(<CredentialCard credential={mockCredential} />);
    expect(screen.getByText('Medical License')).toBeInTheDocument();
  });

  it('displays issuing authority', () => {
    render(<CredentialCard credential={mockCredential} />);
    expect(screen.getByText('Medical Board')).toBeInTheDocument();
  });

  it('calls onView when View Details clicked', () => {
    const onView = jest.fn();
    render(<CredentialCard credential={mockCredential} onView={onView} />);
    fireEvent.click(screen.getByText('View Details'));
    expect(onView).toHaveBeenCalledWith('cred-1');
  });
});
