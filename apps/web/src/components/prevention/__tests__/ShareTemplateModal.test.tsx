/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ShareTemplateModal from '../ShareTemplateModal';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ShareTemplateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: { shares: [] } }) });
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ShareTemplateModal templateId="tmpl-1" templateName="My Template" isOpen={false} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders template name in header when open', async () => {
    render(<ShareTemplateModal templateId="tmpl-1" templateName="My Template" isOpen onClose={jest.fn()} />);
    expect(screen.getByText('My Template')).toBeInTheDocument();
  });

  it('shows empty shares state after load', async () => {
    render(<ShareTemplateModal templateId="tmpl-1" templateName="My Template" isOpen onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/No hay compartidos aún/i)).toBeInTheDocument());
  });
});
