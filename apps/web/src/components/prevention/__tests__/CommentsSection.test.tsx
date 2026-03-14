/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CommentsSection from '../CommentsSection';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('CommentsSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<CommentsSection templateId="tmpl-1" />);
    // Loading state renders a wrapper div with flex justify-center; comments list is not yet visible
    expect(screen.queryByText(/Comentarios/)).toBeNull();
  });

  it('shows empty state when no comments', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: { comments: [] } }) });
    render(<CommentsSection templateId="tmpl-1" />);
    await waitFor(() => expect(screen.getByText(/No hay comentarios aún/i)).toBeInTheDocument());
  });

  it('renders comment form textarea', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: { comments: [] } }) });
    render(<CommentsSection templateId="tmpl-1" />);
    await waitFor(() => expect(screen.getByPlaceholderText(/Escribe un comentario/i)).toBeInTheDocument());
  });
});
