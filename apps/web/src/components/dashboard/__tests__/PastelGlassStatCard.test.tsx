/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
    path: 'path', circle: 'circle', svg: 'svg',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

const PastelGlassStatCard = require('../PastelGlassStatCard').default || require('../PastelGlassStatCard').PastelGlassStatCard;

describe('PastelGlassStatCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PastelGlassStatCard
        label="Patients"
        value="42"
        variant="default"
      />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
