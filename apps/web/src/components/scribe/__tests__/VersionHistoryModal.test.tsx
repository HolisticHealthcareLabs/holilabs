/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@/components/scribe/VersionDiffViewer', () => ({ __esModule: true, default: () => null }));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ versions: [] }),
  }) as any;
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VersionHistoryModal from '../VersionHistoryModal';

describe('VersionHistoryModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <VersionHistoryModal noteId="note-1" isOpen={false} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal title when open', () => {
    render(<VersionHistoryModal noteId="note-1" isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText(/Historial de Versiones/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = jest.fn();
    render(<VersionHistoryModal noteId="note-1" isOpen={true} onClose={onClose} />);
    const closeButton = screen.getByRole('button', { name: /Cerrar/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
