/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_: any, tag: string) => tag }),
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => null,
}));

const { WidgetStore } = require('../WidgetStore');

const sampleWidgets = [
  { id: 'w1', name: 'KPI Overview', description: 'Key performance indicators', enabled: true, category: 'kpi' as const },
  { id: 'w2', name: 'Patient List', description: 'Active patient roster', enabled: false, category: 'clinical' as const },
];

describe('WidgetStore', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <WidgetStore widgets={sampleWidgets} onToggle={jest.fn()} isOpen={false} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the Widget Store heading when open', () => {
    render(
      <WidgetStore widgets={sampleWidgets} onToggle={jest.fn()} isOpen={true} onClose={jest.fn()} />
    );
    expect(screen.getByText('Widget Store')).toBeInTheDocument();
    expect(screen.getByText('KPI Overview')).toBeInTheDocument();
  });

  it('filters widgets by search query', () => {
    render(
      <WidgetStore widgets={sampleWidgets} onToggle={jest.fn()} isOpen={true} onClose={jest.fn()} />
    );
    fireEvent.change(screen.getByPlaceholderText(/search widgets/i), { target: { value: 'KPI' } });
    expect(screen.getByText('KPI Overview')).toBeInTheDocument();
    expect(screen.queryByText('Patient List')).not.toBeInTheDocument();
  });
});
