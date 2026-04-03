/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...p }: any) => <a {...p}>{children}</a>
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/'
}));

jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en', t: (k: string) => k })
}));

jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: (p: any) => ({ ...p, onClick: jest.fn() }),
    getInputProps: (p: any) => ({ ...p, type: 'file' }),
    isDragActive: false,
  }),
}));

import FileUploadZone from '../FileUploadZone';

describe('FileUploadZone', () => {
  it('renders the upload zone', () => {
    render(<FileUploadZone patientId="pat-1" />);
    expect(screen.getByText(/Drag|drop|upload/i)).toBeInTheDocument();
  });

  it('renders category selector', () => {
    render(<FileUploadZone patientId="pat-1" />);
    expect(screen.getAllByText(/Lab Results|Imaging|Other/i).length).toBeGreaterThan(0);
  });

  it('renders without crashing with custom maxFiles', () => {
    render(<FileUploadZone patientId="pat-1" maxFiles={5} />);
    expect(document.body).toBeTruthy();
  });
});
