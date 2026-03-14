/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));

import FileAttachmentDisplay from '../FileAttachment';
import type { FileAttachment } from '../FileAttachment';

beforeEach(() => jest.clearAllMocks());

const pdfAttachment: FileAttachment = {
  fileName: 'report.pdf',
  originalName: 'Lab Report.pdf',
  fileUrl: 'https://example.com/report.pdf',
  fileType: 'application/pdf',
  fileSize: 1048576,
};

const imageAttachment: FileAttachment = {
  fileName: 'photo.png',
  originalName: 'patient-photo.png',
  fileUrl: 'https://example.com/photo.png',
  fileType: 'image/png',
  fileSize: 512,
  thumbnailUrl: 'https://example.com/thumb.png',
};

describe('FileAttachmentDisplay', () => {
  it('renders file name and formatted size for a PDF', () => {
    render(<FileAttachmentDisplay attachment={pdfAttachment} />);
    expect(screen.getByText('Lab Report.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
  });

  it('renders thumbnail for image attachment', () => {
    render(<FileAttachmentDisplay attachment={imageAttachment} />);
    const img = screen.getByAltText('patient-photo.png') as HTMLImageElement;
    expect(img.src).toContain('thumb.png');
  });

  it('calls onDownload callback when clicked', () => {
    const onDownload = jest.fn();
    render(<FileAttachmentDisplay attachment={pdfAttachment} onDownload={onDownload} />);
    fireEvent.click(screen.getByText('Lab Report.pdf').closest('div')!);
    expect(onDownload).toHaveBeenCalledWith(pdfAttachment);
  });
});
