/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock canvas context
const mockGetContext = jest.fn().mockReturnValue({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  roundRect: jest.fn(),
  fill: jest.fn(),
});

HTMLCanvasElement.prototype.getContext = mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  cb(0);
  return 0;
});
global.cancelAnimationFrame = jest.fn();

const { AudioWaveform } = require('../AudioWaveform');

describe('AudioWaveform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Prevent infinite animation loop in tests
    let callCount = 0;
    global.requestAnimationFrame = jest.fn((cb) => {
      if (callCount++ < 1) cb(0);
      return callCount;
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<AudioWaveform isRecording={false} volume={0} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders canvas with correct dimensions', () => {
    const { container } = render(<AudioWaveform isRecording={false} volume={0} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toHaveAttribute('width', '128');
    expect(canvas).toHaveAttribute('height', '32');
  });

  it('renders in recording state without crashing', () => {
    const { container } = render(<AudioWaveform isRecording={true} volume={0.7} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('calls getContext on the canvas', () => {
    render(<AudioWaveform isRecording={false} volume={0} />);
    expect(mockGetContext).toHaveBeenCalledWith('2d');
  });
});
