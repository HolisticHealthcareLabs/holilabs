/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const { ReviewQueueWidget } = require('../ReviewQueueWidget');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReviewQueueWidget', () => {
  it('shows loading spinner on initial render', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    render(<ReviewQueueWidget />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    ) as jest.Mock;
    render(<ReviewQueueWidget />);
    await waitFor(() =>
      expect(screen.getByText(/failed to load review queue/i)).toBeInTheDocument()
    );
  });

  it('shows all-caught-up message when queue is empty', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, data: { items: [], stats: { totalPending: 0, totalInReview: 0, highPriorityCount: 0, avgConfidence: 1 } } }),
      })
    ) as jest.Mock;
    render(<ReviewQueueWidget />);
    await waitFor(() =>
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    );
  });
});
