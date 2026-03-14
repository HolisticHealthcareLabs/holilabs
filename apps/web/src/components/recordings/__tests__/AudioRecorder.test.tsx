/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import AudioRecorder from '../AudioRecorder';

describe('AudioRecorder', () => {
  it('renders the recording UI with patient name', () => {
    render(
      <AudioRecorder
        appointmentId="apt-1"
        patientId="pat-1"
        patientName="Maria Garcia"
        onRecordingComplete={jest.fn()}
      />
    );
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Grabación de Consulta')).toBeInTheDocument();
  });

  it('shows the start recording instructions', () => {
    render(
      <AudioRecorder
        appointmentId="apt-1"
        patientId="pat-1"
        patientName="Carlos Ruiz"
        onRecordingComplete={jest.fn()}
      />
    );
    expect(screen.getByText(/Presiona el botón/)).toBeInTheDocument();
  });

  it('shows the tip box for recording quality', () => {
    render(
      <AudioRecorder
        appointmentId="apt-1"
        patientId="pat-1"
        patientName="Test Patient"
        onRecordingComplete={jest.fn()}
      />
    );
    expect(screen.getByText(/Consejo/)).toBeInTheDocument();
  });
});
