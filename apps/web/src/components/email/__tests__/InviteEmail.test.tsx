/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@react-email/components', () => ({
  Body: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, href }: any) => <a href={href}>{children}</a>,
  Container: ({ children }: any) => <div>{children}</div>,
  Head: () => null,
  Heading: ({ children }: any) => <h1>{children}</h1>,
  Hr: () => <hr />,
  Html: ({ children }: any) => <div>{children}</div>,
  Img: ({ src, alt }: any) => <img src={src} alt={alt} />,
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  Preview: ({ children }: any) => <span>{children}</span>,
  Section: ({ children }: any) => <div>{children}</div>,
  Tailwind: ({ children }: any) => <>{children}</>,
  Text: ({ children }: any) => <p>{children}</p>,
}));

const { InviteEmail } = require('../InviteEmail');

describe('InviteEmail', () => {
  it('renders the Welcome to the Secure Enclave heading', () => {
    render(<InviteEmail />);
    expect(screen.getByText('Welcome to the Secure Enclave')).toBeInTheDocument();
  });

  it('renders Accept Invite & Download CTA linked to the invite URL', () => {
    render(<InviteEmail inviteLink="https://holilabs.xyz/invite/abc" />);
    const btn = screen.getByRole('link', { name: /accept invite/i });
    expect(btn).toHaveAttribute('href', 'https://holilabs.xyz/invite/abc');
  });

  it('personalises the greeting when recipientName is provided', () => {
    render(<InviteEmail recipientName="Dr. Souza" />);
    expect(screen.getByText(/hello dr\. souza/i)).toBeInTheDocument();
  });
});
