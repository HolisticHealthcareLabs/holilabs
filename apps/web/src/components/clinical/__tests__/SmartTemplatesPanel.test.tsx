/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: (_, k) => () => null }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { SmartTemplatesPanel } from '../SmartTemplatesPanel';

const mockDefinition = {
  contentDefinitionId: 'def-1',
  canonicalKey: 'chief-complaint-generic',
  kind: 'template',
  title: 'Chief Complaint Template',
  summary: 'Generic chief complaint',
  version: 1,
  disciplineSource: 'universal',
  priority: 1,
  overlapGroup: null,
  schemaPayload: {
    templateContent: 'Patient presents with {complaint}.',
    variables: [{ name: 'complaint', type: 'string', required: true }],
    keywords: ['chief', 'complaint'],
    voiceCommand: 'new complaint',
    category: 'chief-complaint',
  },
  metadata: null,
  blocks: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ definitions: [mockDefinition], error: undefined }),
  });
});

describe('SmartTemplatesPanel', () => {
  it('shows loading skeleton initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<SmartTemplatesPanel onInsertTemplate={jest.fn()} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders template list after fetch', async () => {
    render(<SmartTemplatesPanel onInsertTemplate={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Chief Complaint Template')).toBeInTheDocument());
  });

  it('calls onInsertTemplate with filled content when Insert Template is clicked', async () => {
    const onInsert = jest.fn();
    render(<SmartTemplatesPanel onInsertTemplate={onInsert} />);
    await waitFor(() => screen.getByText('Chief Complaint Template'));
    fireEvent.click(screen.getByText('Chief Complaint Template'));
    fireEvent.change(screen.getByPlaceholderText(/enter complaint/i), { target: { value: 'chest pain' } });
    fireEvent.click(screen.getByText('Insert Template'));
    expect(onInsert).toHaveBeenCalledWith('Patient presents with chest pain.');
  });
});
