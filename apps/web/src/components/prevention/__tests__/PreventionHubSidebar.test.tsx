/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/prevention/condition-detection', () => ({ detectConditionsForPatient: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/prevention/international-protocols', () => ({ getApplicableProtocols: jest.fn().mockReturnValue([]) }));
jest.mock('@/hooks/useRealtimePreventionUpdates', () => ({
  usePreventionDetection: () => ({ connected: false, conditions: [], recommendations: [], processingTimeMs: null, clearDetections: jest.fn() }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreventionHubSidebar } from '../PreventionHubSidebar';

describe('PreventionHubSidebar', () => {
  it('shows collapsed button when no conditions detected', () => {
    render(<PreventionHubSidebar patientId="pat-1" />);
    expect(document.querySelector('button[title="Prevention Hub"]')).toBeInTheDocument();
  });

  it('expands when the shield button is clicked', () => {
    render(<PreventionHubSidebar patientId="pat-1" />);
    fireEvent.click(document.querySelector('button[title="Prevention Hub"]')!);
    expect(screen.getByText('Prevention Hub')).toBeInTheDocument();
  });

  it('calls onViewFullHub when footer button is clicked', () => {
    const onViewFullHub = jest.fn();
    render(<PreventionHubSidebar patientId="pat-1" onViewFullHub={onViewFullHub} />);
    fireEvent.click(document.querySelector('button[title="Prevention Hub"]')!);
    fireEvent.click(screen.getByText(/Open Full Prevention Hub/i));
    expect(onViewFullHub).toHaveBeenCalled();
  });
});
