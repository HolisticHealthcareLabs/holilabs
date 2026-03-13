/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReferralTable } from '../ReferralTable';

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

jest.mock('date-fns', () => ({
  format: (_d: Date, fmt: string) => '1 Jan, 10:00',
}));

jest.mock('date-fns/locale', () => ({
  ptBR: {},
}));

describe('ReferralTable', () => {
  const baseReferral = {
    id: 'ref-1',
    targetSpecialty: 'CARDIOLOGY',
    status: 'PENDING',
    consentedAt: null,
    bookedSlotStart: null,
    createdAt: new Date('2025-06-01'),
    estimatedRevenueRetainedBrl: null,
    selectedProvider: null,
  };

  it('renders empty state when no referrals', () => {
    render(<ReferralTable referrals={[]} />);
    expect(screen.getByText(/Nenhuma indicação encontrada/)).toBeInTheDocument();
  });

  it('renders table headers when referrals exist', () => {
    render(<ReferralTable referrals={[baseReferral]} />);
    expect(screen.getByText('Especialidade')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Receita')).toBeInTheDocument();
  });

  it('renders specialty label and status badge', () => {
    render(<ReferralTable referrals={[baseReferral]} />);
    expect(screen.getByText('Cardiologia')).toBeInTheDocument();
    expect(screen.getByText('Aguardando')).toBeInTheDocument();
  });
});
