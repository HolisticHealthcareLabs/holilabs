/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en' }),
}));
jest.mock('@/components/landing/copy', () => ({
  getLandingCopy: () => ({
    footer: {
      product: 'Product',
      howItWorks: 'How It Works',
      modules: 'Modules',
      audit: 'Audit',
      requestAccess: 'Request Access',
      company: 'Company',
      about: 'About',
      careers: 'Careers',
      blog: 'Blog',
      press: 'Press',
      legal: 'Legal',
      privacy: 'Privacy',
      terms: 'Terms',
      cookies: 'Cookies',
      dpa: 'DPA',
      resources: 'Resources',
      docs: 'Documentation',
      community: 'Community',
      changelog: 'Changelog',
      status: 'Status',
      copyright: '© 2025 Holi Labs. All rights reserved.',
      certifications: 'Certifications',
    },
  }),
}));

const { Footer } = require('../Footer');

describe('Footer', () => {
  it('renders without crashing', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).toBeTruthy();
  });

  it('renders brand name', () => {
    render(<Footer />);
    expect(screen.getByText('Holi Labs')).toBeInTheDocument();
  });

  it('renders product section', () => {
    render(<Footer />);
    expect(screen.getByText('Product')).toBeInTheDocument();
  });
});
