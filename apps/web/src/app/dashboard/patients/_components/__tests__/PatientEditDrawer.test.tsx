/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      editPatient: 'Edit Patient',
      firstName: 'First Name',
      lastName: 'Last Name',
      dateOfBirth: 'Date of Birth',
      sex: 'Sex',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      email: 'Email',
      personal: 'Personal',
      contact: 'Contact',
      ids: 'IDs',
      insurance: 'Insurance',
      emergency: 'Emergency',
      clinical: 'Clinical',
      cancel: 'Cancel',
      saveChanges: 'Save Changes',
      saved: 'Saved!',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      state: 'State',
      postalCode: 'Postal Code',
      country: 'Country',
      streetPlaceholder: 'Street address',
      brazilianIds: 'Brazilian IDs',
      cpf: 'CPF',
      cnsSus: 'CNS (SUS)',
      rg: 'RG',
      primaryPayer: 'Primary Payer',
      primaryContactName: 'Primary Contact Name',
      primaryContactPhone: 'Primary Contact Phone',
      emergencyContactName: 'Emergency Contact Name',
      emergencyContactPhone: 'Emergency Contact Phone',
      primaryDiagnosis: 'Primary Diagnosis',
      icd10Code: 'ICD-10 Code',
      allergies: 'Allergies',
      activeMedications: 'Active Medications',
      noKnownAllergies: 'No known allergies',
      noActiveMedications: 'No active medications',
    };
    return map[key] ?? key;
  },
}));

jest.mock('lucide-react', () => ({
  X: (props: any) => <svg data-testid="x-icon" {...props} />,
  Save: (props: any) => <svg data-testid="save-icon" {...props} />,
  User: (props: any) => <svg {...props} />,
  Mail: (props: any) => <svg {...props} />,
  Phone: (props: any) => <svg {...props} />,
  Shield: (props: any) => <svg {...props} />,
  Heart: (props: any) => <svg {...props} />,
  Building2: (props: any) => <svg {...props} />,
  AlertTriangle: (props: any) => <svg {...props} />,
  AlertCircle: (props: any) => <svg {...props} />,
  CheckCircle2: (props: any) => <svg {...props} />,
}));

const { PatientEditDrawer } = require('../PatientEditDrawer');

const mockPatient = {
  id: 'pat-1',
  firstName: 'Maria',
  lastName: 'Santos',
  mrn: 'MRN-001',
  dateOfBirth: '1990-05-15',
  sex: 'F' as const,
  email: 'maria@test.com',
};

describe('PatientEditDrawer', () => {
  it('renders patient name and MRN in header', () => {
    render(
      <PatientEditDrawer patient={mockPatient} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByText('Edit Patient')).toBeInTheDocument();
    expect(screen.getByText(/Maria Santos/)).toBeInTheDocument();
    expect(screen.getByText(/MRN-001/)).toBeInTheDocument();
  });

  it('renders tab buttons', () => {
    render(
      <PatientEditDrawer patient={mockPatient} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Clinical')).toBeInTheDocument();
  });

  it('renders save and cancel buttons', () => {
    render(
      <PatientEditDrawer patient={mockPatient} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });
});
