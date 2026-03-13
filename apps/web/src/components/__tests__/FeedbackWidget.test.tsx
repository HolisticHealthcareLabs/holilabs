/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
  ChatBubbleLeftRightIcon: (props: any) => <svg data-testid="chat-icon" {...props} />,
  PaperAirplaneIcon: (props: any) => <svg data-testid="send-icon" {...props} />,
}));
jest.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn() }),
}));

const { FeedbackWidget } = require('../FeedbackWidget');

describe('FeedbackWidget', () => {
  it('renders floating button', () => {
    render(<FeedbackWidget />);
    expect(screen.getByLabelText('Enviar feedback')).toBeInTheDocument();
  });

  it('opens feedback panel on click', () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByLabelText('Enviar feedback'));
    expect(screen.getByText('Envíanos tu feedback')).toBeInTheDocument();
  });
});
