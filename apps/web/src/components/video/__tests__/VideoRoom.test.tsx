/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('livekit-client', () => ({
  Room: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    localParticipant: {
      setMicrophoneEnabled: jest.fn(),
      setCameraEnabled: jest.fn(),
      setScreenShareEnabled: jest.fn(),
    },
    state: 'disconnected',
  })),
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
    TrackSubscribed: 'trackSubscribed',
    LocalTrackPublished: 'localTrackPublished',
    ConnectionQualityChanged: 'connectionQualityChanged',
    ActiveSpeakersChanged: 'activeSpeakersChanged',
  },
  ConnectionState: { Connected: 'connected', Disconnected: 'disconnected', Connecting: 'connecting' },
  Track: { Source: { Camera: 'camera', Microphone: 'microphone', ScreenShare: 'screenshare' } },
  ConnectionQuality: { Excellent: 'excellent', Good: 'good', Poor: 'poor', Unknown: 'unknown' },
  LocalParticipant: jest.fn(),
  RemoteParticipant: jest.fn(),
  LocalTrackPublication: jest.fn(),
  RemoteTrackPublication: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ token: 'mock-token' }),
  }) as any;
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import VideoRoom from '../VideoRoom';

describe('VideoRoom', () => {
  it('shows connecting/waiting state on mount', () => {
    render(
      <VideoRoom roomId="room-1" userName="Dr. Smith" userType="clinician" onLeave={jest.fn()} />
    );
    // Shows connecting text or waiting for participant
    expect(screen.getAllByText(/Conectando|Esperando/i).length).toBeGreaterThan(0);
  });

  it('renders without crashing for a patient user type', () => {
    render(
      <VideoRoom roomId="room-abc" userName="Patient One" userType="patient" onLeave={jest.fn()} />
    );
    expect(document.body).toBeTruthy();
  });

  it('renders control buttons', () => {
    render(
      <VideoRoom roomId="room-1" userName="Dr. Smith" userType="clinician" onLeave={jest.fn()} />
    );
    // Controls area has buttons for mute, video, etc.
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
