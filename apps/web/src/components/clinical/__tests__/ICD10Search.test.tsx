/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

import { ICD10Search } from '../ICD10Search';

describe('ICD10Search', () => {
  it('renders search input without crashing', () => {
    render(<ICD10Search />);
    expect(screen.getByPlaceholderText('Buscar diagnóstico ICD-10...')).toBeInTheDocument();
  });

  it('shows common diagnoses by default', () => {
    render(<ICD10Search showCommon />);
    expect(screen.getByText('Diagnósticos Comunes')).toBeInTheDocument();
  });

  it('filters results on search input', () => {
    render(<ICD10Search />);
    const input = screen.getByPlaceholderText('Buscar diagnóstico ICD-10...');
    fireEvent.change(input, { target: { value: 'Diabetes' } });
    expect(screen.getByText('E11.9')).toBeInTheDocument();
  });
});
