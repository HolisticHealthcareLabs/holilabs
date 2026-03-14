/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ title, subtitle }: any) => (
    <div>
      <span>{title}</span>
      {subtitle && <span>{subtitle}</span>}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));
jest.mock('@/hooks/useJobStatus', () => ({
  useDocumentParseStatus: () => ({
    status: 'waiting',
    progress: 0,
    result: null,
    error: null,
    isComplete: false,
    isFailed: false,
  }),
}));

const { DocumentUpload } = require('../DocumentUpload');

describe('DocumentUpload', () => {
  it('renders the Pre-Visit Documents heading', () => {
    render(<DocumentUpload patientId="p1" />);
    expect(screen.getByText('Pre-Visit Documents')).toBeInTheDocument();
  });

  it('renders the drag-and-drop zone with instructions', () => {
    render(<DocumentUpload patientId="p1" />);
    expect(
      screen.getByText(/drag and drop files here, or click to browse/i)
    ).toBeInTheDocument();
  });

  it('lists supported file formats', () => {
    render(<DocumentUpload patientId="p1" />);
    expect(
      screen.getByText(/supported: pdf, images.*word documents/i)
    ).toBeInTheDocument();
  });
});
