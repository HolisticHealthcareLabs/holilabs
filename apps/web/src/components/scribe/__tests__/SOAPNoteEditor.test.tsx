/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/solid', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/lib/templates/soap-templates', () => ({
  getTemplatesByLanguage: jest.fn().mockReturnValue([]),
}));

jest.mock('@/components/scribe/VersionHistoryModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/scribe/VoiceInputButton', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/scribe/QuickInterventionsPanel', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/scribe/PainScaleSelector', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/templates/TemplatePicker', () => ({ TemplatePicker: () => null }));
jest.mock('@/components/voice/VoiceCommandFeedback', () => ({ VoiceCommandFeedback: () => null }));

jest.mock('@/hooks/useVoiceCommands', () => ({
  useVoiceCommands: () => ({
    isListening: false,
    isProcessing: false,
    transcript: '',
    lastCommand: null,
    error: null,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    availableCommands: [],
  }),
}));

jest.mock('@/lib/voice/soapEditorCommands', () => ({
  createSOAPEditorCommands: jest.fn().mockReturnValue([]),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import SOAPNoteEditor from '../SOAPNoteEditor';

const mockNote = {
  id: 'note-1',
  chiefComplaint: 'Chest pain',
  subjective: 'Patient reports chest pain',
  subjectiveConfidence: 0.9,
  objective: 'BP 120/80',
  objectiveConfidence: 0.85,
  assessment: 'Atypical chest pain',
  assessmentConfidence: 0.8,
  plan: 'EKG ordered',
  planConfidence: 0.9,
  overallConfidence: 0.86,
  status: 'DRAFT',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('SOAPNoteEditor', () => {
  it('renders SOAP note fields', () => {
    render(<SOAPNoteEditor note={mockNote as any} onSave={jest.fn()} patientId="pat-1" />);
    expect(screen.getByText(/Subjective|S:/i) || document.querySelector('textarea')).toBeTruthy();
  });

  it('renders the chief complaint', () => {
    render(<SOAPNoteEditor note={mockNote as any} onSave={jest.fn()} patientId="pat-1" />);
    expect(screen.getByDisplayValue('Chest pain') || screen.getByText('Chest pain')).toBeTruthy();
  });

  it('renders Save button', () => {
    render(<SOAPNoteEditor note={mockNote as any} onSave={jest.fn()} patientId="pat-1" />);
    const saveButton = screen.getByText(/Save|Guardar/i);
    expect(saveButton).toBeInTheDocument();
  });
});
