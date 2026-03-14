/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn().mockReturnValue({
    getRootProps: () => ({ onClick: jest.fn() }),
    getInputProps: () => ({ type: 'file', accept: '*/*' }),
    isDragActive: false,
  }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import FileUploadZone from '../FileUploadZone';

describe('FileUploadZone', () => {
  it('renders the upload zone', () => {
    render(<FileUploadZone patientId="pat-1" />);
    expect(screen.getByText(/drag|drop|upload|Arrastr/i)).toBeInTheDocument();
  });

  it('renders category selector', () => {
    render(<FileUploadZone patientId="pat-1" />);
    expect(screen.getByText(/Lab Results|Imaging|Other/i)).toBeInTheDocument();
  });

  it('renders without crashing with custom maxFiles', () => {
    render(<FileUploadZone patientId="pat-1" maxFiles={5} />);
    expect(document.body).toBeTruthy();
  });
});
