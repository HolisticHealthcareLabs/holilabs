/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/components/ui/Button', () => ({ Button: ({ children, ...p }: any) => <button {...p}>{children}</button> }));
jest.mock('@/lib/governance/shared-types', () => ({
  OVERRIDE_REASON_CODES: ['BENEFIT_OUTWEIGHS_RISK', 'PATIENT_TOLERANT', 'PALLIATIVE_CARE', 'GUIDELINE_MISMATCH', 'OTHER'],
  isOverrideReasonCode: (v: any) => ['BENEFIT_OUTWEIGHS_RISK', 'PATIENT_TOLERANT', 'PALLIATIVE_CARE', 'GUIDELINE_MISMATCH', 'OTHER'].includes(v),
}));

import OverrideForm from '../OverrideForm';

describe('OverrideForm', () => {
  it('renders all override reason options', () => {
    render(<OverrideForm onOverride={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText(/Benefit outweighs risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Palliative/i)).toBeInTheDocument();
    expect(screen.getByText(/Other/i)).toBeInTheDocument();
  });

  it('submit button disabled until a reason is selected', () => {
    render(<OverrideForm onOverride={jest.fn()} onCancel={jest.fn()} />);
    const submit = screen.getByRole('button', { name: /Confirm Override/i });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Benefit outweighs risk/i));
    expect(submit).not.toBeDisabled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(<OverrideForm onOverride={jest.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
