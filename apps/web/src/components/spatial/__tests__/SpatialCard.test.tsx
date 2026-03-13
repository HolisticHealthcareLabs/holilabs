/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const {
  SpatialCard,
  SpatialCardHeader,
  SpatialCardContent,
  SpatialCardFooter,
} = require('../SpatialCard');

describe('SpatialCard', () => {
  it('renders children', () => {
    render(<SpatialCard>Card content</SpatialCard>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders elevated variant without crashing', () => {
    const { container } = render(<SpatialCard variant="elevated">Elevated</SpatialCard>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders floating variant without crashing', () => {
    const { container } = render(<SpatialCard variant="floating" glow>Floating</SpatialCard>);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('SpatialCardHeader / Content / Footer', () => {
  it('renders header, content, footer together', () => {
    render(
      <SpatialCard>
        <SpatialCardHeader>Header</SpatialCardHeader>
        <SpatialCardContent>Body</SpatialCardContent>
        <SpatialCardFooter>Footer</SpatialCardFooter>
      </SpatialCard>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
