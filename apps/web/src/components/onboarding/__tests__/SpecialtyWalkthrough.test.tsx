/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('react-joyride', () => {
  return function MockJoyride({ steps, run }: any) {
    if (!run) return null;
    return (
      <div data-testid="joyride">
        {steps?.map((s: any, i: number) => (
          <div key={i} data-testid={`step-${i}`}>
            {typeof s.title === 'string' ? s.title : ''}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('lucide-react', () => ({
  Volume2: (props: any) => <svg {...props} />,
  VolumeX: (props: any) => <svg {...props} />,
}));

const SpecialtyWalkthrough = require('../SpecialtyWalkthrough').default;

describe('SpecialtyWalkthrough', () => {
  it('renders nothing when not active', () => {
    const { container } = render(
      <SpecialtyWalkthrough
        active={false}
        onComplete={jest.fn()}
        doctorName="Silva"
        specialty="Cardiology"
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders Joyride when active (after delay)', async () => {
    jest.useFakeTimers();
    render(
      <SpecialtyWalkthrough
        active={true}
        onComplete={jest.fn()}
        doctorName="Silva"
        specialty="Cardiology"
      />
    );
    jest.advanceTimersByTime(500);
    expect(screen.getByTestId('joyride')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('renders step titles in English by default', () => {
    jest.useFakeTimers();
    render(
      <SpecialtyWalkthrough
        active={true}
        onComplete={jest.fn()}
        doctorName="Silva"
        specialty="Cardiology"
        language="en"
      />
    );
    jest.advanceTimersByTime(500);
    expect(screen.getByText('My Day')).toBeInTheDocument();
    jest.useRealTimers();
  });
});
