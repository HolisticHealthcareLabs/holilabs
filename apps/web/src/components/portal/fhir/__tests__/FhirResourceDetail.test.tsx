/** @jest-environment jsdom */
jest.mock('@headlessui/react', () => {
  const React = require('react');
  function Dialog({ children }: any) { return React.createElement('div', { role: 'dialog' }, children); }
  Dialog.Panel = function Panel({ children }: any) { return React.createElement('div', null, children); };
  Dialog.Title = function Title({ children }: any) { return React.createElement('h3', null, children); };
  function Transition({ children }: any) { return React.createElement(React.Fragment, null, children); }
  Transition.Child = function Child({ children }: any) {
    return React.createElement(React.Fragment, null, typeof children === 'function' ? children({}) : children);
  };
  return { Dialog, Transition, Fragment: React.Fragment };
});
jest.mock('@/lib/api/fhir-client', () => ({
  formatFhirDateTime: (d: string) => d || '',
  formatFhirDate: (d: string) => d || '',
  getStatusColor: () => 'blue',
  getResourceDisplayName: (r: any) => r.code?.text || r.id || 'Resource',
}));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FhirResourceDetail from '../FhirResourceDetail';

const resource: any = {
  resourceType: 'Observation',
  id: 'obs-1',
  status: 'final',
  code: { text: 'Hemoglobin', coding: [{ system: 'http://loinc.org', code: '718-7' }] },
  valueQuantity: { value: 14.5, unit: 'g/dL' },
};

describe('FhirResourceDetail', () => {
  it('renders resource type and id', () => {
    render(<FhirResourceDetail resource={resource} onClose={jest.fn()} />);
    expect(screen.getByText('Observation')).toBeInTheDocument();
    expect(screen.getByText(/obs-1/)).toBeInTheDocument();
  });

  it('renders observation value', () => {
    render(<FhirResourceDetail resource={resource} onClose={jest.fn()} />);
    expect(screen.getByText('14.5')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(<FhirResourceDetail resource={resource} onClose={onClose} />);
    // Footer close button
    fireEvent.click(screen.getByText('Cerrar'));
    expect(onClose).toHaveBeenCalled();
  });
});
