/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUploader from '../FileUploader';

describe('FileUploader', () => {
  it('renders the drag and drop zone', () => {
    render(<FileUploader onUploadComplete={jest.fn()} />);
    expect(screen.getByText(/drag|drop|Arrastr|Select file/i)).toBeInTheDocument();
  });

  it('renders the file input', () => {
    render(<FileUploader onUploadComplete={jest.fn()} />);
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it('shows accepted file types hint', () => {
    render(<FileUploader onUploadComplete={jest.fn()} accept=".pdf,.jpg" maxSize={10} />);
    expect(screen.getByText(/.pdf|PDF|up to/i)).toBeInTheDocument();
  });
});
