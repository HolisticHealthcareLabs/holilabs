/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@react-email/components', () => ({
  Container: ({ children }: any) => <div>{children}</div>,
  Hr: () => <hr />,
  Img: ({ src, alt }: any) => <img src={src} alt={alt} />,
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  Section: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <p>{children}</p>,
}));

const { EmailLayout } = require('../EmailLayout');

describe('EmailLayout', () => {
  it('renders children inside the layout', () => {
    render(
      <EmailLayout baseUrl="https://holilabs.xyz">
        <p>Email body content</p>
      </EmailLayout>
    );
    expect(screen.getByText('Email body content')).toBeInTheDocument();
  });

  it('renders the Holi Labs brand name in the footer', () => {
    render(<EmailLayout baseUrl="https://holilabs.xyz"><span /></EmailLayout>);
    expect(screen.getByText('Holi Labs')).toBeInTheDocument();
  });

  it('renders custom footerText when provided', () => {
    render(
      <EmailLayout baseUrl="https://holilabs.xyz" footerText="Custom Footer Text">
        <span />
      </EmailLayout>
    );
    expect(screen.getByText('Custom Footer Text')).toBeInTheDocument();
  });
});
