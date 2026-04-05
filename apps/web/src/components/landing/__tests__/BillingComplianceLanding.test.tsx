/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en', setLocale: jest.fn(), t: (k: string) => k }),
}));

import { BillingComplianceLanding } from '../BillingComplianceLanding';

describe('BillingComplianceLanding', () => {
  it('renders without crashing', () => {
    const { container } = render(<BillingComplianceLanding />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the navigation', () => {
    render(<BillingComplianceLanding />);
    expect(document.querySelector('nav')).toBeInTheDocument();
  });

  it('renders Holi Labs brand name', () => {
    render(<BillingComplianceLanding />);
    expect(screen.getAllByText(/Holi Labs/i).length).toBeGreaterThan(0);
  });

  it('renders hero section with headline', () => {
    render(<BillingComplianceLanding />);
    expect(screen.getByText(/reimagined the future of healthcare/i)).toBeInTheDocument();
  });

  it('renders contact form', () => {
    render(<BillingComplianceLanding />);
    expect(screen.getByText(/Start the conversation/i)).toBeInTheDocument();
  });

  it('contains no SOAP note references', () => {
    const { container } = render(<BillingComplianceLanding />);
    const text = container.textContent?.toLowerCase() ?? '';
    expect(text).not.toContain('soap');
    expect(text).not.toContain('chart notes');
    expect(text).not.toContain('medical records system');
  });
});
