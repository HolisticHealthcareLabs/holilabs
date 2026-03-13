/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}));

const { FindingsTimeline } = require('../FindingsTimeline');

describe('FindingsTimeline', () => {
  it('renders nothing when sessionId is not provided', () => {
    const { container } = render(
      <FindingsTimeline sessionId={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when sessionId is undefined', () => {
    const { container } = render(
      <FindingsTimeline />
    );
    expect(container.firstChild).toBeNull();
  });
});
