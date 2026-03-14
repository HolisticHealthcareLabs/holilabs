/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));

import { MedicalImageViewer } from '../MedicalImageViewer';
import type { MedicalImage } from '../MedicalImageViewer';

beforeEach(() => jest.clearAllMocks());

const mockImage: MedicalImage = {
  id: 'img-1',
  pseudonymizedId: 'PSEUDO-001',
  imageUrl: 'https://example.com/image.png',
  originalHash: 'abc123',
  removedPHI: ['PatientName', 'DOB'],
  timestamp: '2026-01-01T10:00:00Z',
  auditLogId: 'audit-001',
  metadata: { modality: 'CT', fileSize: 2097152 },
};

describe('MedicalImageViewer', () => {
  it('renders HIPAA compliant badge', () => {
    render(<MedicalImageViewer image={mockImage} />);
    expect(screen.getByText('HIPAA Compliant • 2 PHI identifiers removed')).toBeInTheDocument();
  });

  it('increments zoom level when Zoom In is clicked', () => {
    render(<MedicalImageViewer image={mockImage} />);
    const zoomDisplay = screen.getByTitle('Reset Zoom');
    expect(zoomDisplay).toHaveTextContent('100%');
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(zoomDisplay).toHaveTextContent('125%');
  });

  it('shows metadata panel when Info button is clicked', () => {
    render(<MedicalImageViewer image={mockImage} />);
    fireEvent.click(screen.getByTitle('Toggle Metadata'));
    expect(screen.getByText('PSEUDO-001')).toBeInTheDocument();
    expect(screen.getByText('CT')).toBeInTheDocument();
  });
});
