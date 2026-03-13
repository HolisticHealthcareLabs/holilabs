/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

const SupportContact = require('../SupportContact').default;

describe('SupportContact', () => {
  it('renders default variant without crashing', () => {
    const { container } = render(<SupportContact />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders title text', () => {
    render(<SupportContact />);
    expect(screen.getByText('¿Necesitas ayuda?')).toBeInTheDocument();
  });

  it('renders WhatsApp and Email links', () => {
    render(<SupportContact />);
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders compact variant', () => {
    const { container } = render(<SupportContact variant="compact" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders inline variant', () => {
    const { container } = render(<SupportContact variant="inline" />);
    expect(container.firstChild).toBeTruthy();
  });
});
