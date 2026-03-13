/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}));

const PainScaleSelector = require('../PainScaleSelector').default;

describe('PainScaleSelector', () => {
  it('renders without crashing', () => {
    const onSelect = jest.fn();
    render(<PainScaleSelector onSelectPainScore={onSelect} />);
    expect(screen.getByText('soapTemplates.painScale.title')).toBeInTheDocument();
  });

  it('renders 11 pain scale buttons (0–10)', () => {
    const onSelect = jest.fn();
    render(<PainScaleSelector onSelectPainScore={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(11);
  });

  it('calls onSelectPainScore when a button is clicked', () => {
    const onSelect = jest.fn();
    render(<PainScaleSelector onSelectPainScore={onSelect} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith(0, expect.any(String));
  });
});
