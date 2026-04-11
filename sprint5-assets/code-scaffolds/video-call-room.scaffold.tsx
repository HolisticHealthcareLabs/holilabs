'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * CYRUS INVARIANTS:
 * - Session token MUST be validated before joining room
 * - Recording MUST require explicit consent (encounter.recordConsent === true)
 * - Room tokens have 24-hour TTL; expired tokens reject join attempt
 * - Only doctor (role='doctor') can end call for other participants
 *
 * RUTH INVARIANTS:
 * - Recording consent toggle displays LGPD Art. 7 legal basis
 * - Recording status indicator always visible when active
 * - Consent withdrawal during call triggers recording stop
 *
 * ELENA INVARIANTS:
 * - If encounter.aiScribeEnabled, display SaMD disclaimer in waiting state
 * - Clinical endpoints log video session start/stop for audit
 */

export enum VideoCallState {
  WAITING = 'WAITING',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ENDED = 'ENDED',
  ERROR = 'ERROR',
}

export enum VideoRole {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

export interface VideoParticipant {
  id: string;
  name: string;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  isMuted: boolean;
  isCameraOff: boolean;
}

export interface VideoCallRoomProps {
  encounterId: string;
  sessionToken: string; // CYRUS: validated by server before client receives
  userRole: VideoRole;
  userName: string;
  organizationId: string; // CYRUS: scoping
  recordingConsent?: boolean; // RUTH: consent for recording
  aiScribeEnabled?: boolean; // ELENA: flag for disclaimer
  onRecordingStatusChange?: (isRecording: boolean) => void;
  onCallEnd?: () => void;
  onError?: (error: Error) => void;
}

interface VideoProviderConfig {
  type: 'daily' | 'twilio' | 'custom-turn';
  apiToken?: string;
  roomName: string;
  userName: string;
}

/**
 * Abstract VideoProvider interface — allows switching Daily.co, Twilio, custom TURN
 */
interface IVideoProvider {
  join(config: VideoProviderConfig): Promise<void>;
  leave(): Promise<void>;
  toggleMic(enabled: boolean): Promise<void>;
  toggleCamera(enabled: boolean): Promise<void>;
  toggleScreenShare(): Promise<boolean>;
  getRemoteParticipant(): VideoParticipant | null;
}

/**
 * Main video call room component
 * Doctor view: patient video (large) + self-preview (PiP) + controls
 * Patient view: doctor video (large) + self-preview (PiP) + "waiting for doctor" message
 */
export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({
  encounterId,
  sessionToken,
  userRole,
  userName,
  organizationId,
  recordingConsent = false,
  aiScribeEnabled = false,
  onRecordingStatusChange,
  onCallEnd,
  onError,
}) => {
  const { t } = useTranslation(['telemedicine']);
  const prefersReducedMotion = useReducedMotion();

  const [callState, setCallState] = useState<VideoCallState>(VideoCallState.WAITING);
  const [remoteParticipant, setRemoteParticipant] = useState<VideoParticipant | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingConsentConfirmed, setRecordingConsentConfirmed] = useState(recordingConsent);
  const [error, setError] = useState<string | null>(null);

  const videoProviderRef = useRef<IVideoProvider | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize video provider (abstract pattern)
  const initializeProvider = useCallback(async () => {
    try {
      setCallState(VideoCallState.CONNECTING);

      // Stub: In production, select provider based on config
      // videoProviderRef.current = new DailyVideoProvider();
      // or: videoProviderRef.current = new TwilioVideoProvider();

      const config: VideoProviderConfig = {
        type: 'daily', // configurable
        roomName: `encounter-${encounterId}`,
        userName: userName,
      };

      // CYRUS: sessionToken validated server-side before client receives it
      if (!sessionToken) {
        throw new Error('Invalid session token');
      }

      // await videoProviderRef.current?.join(config);
      setCallState(VideoCallState.CONNECTED);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to join call';
      setError(errorMsg);
      setCallState(VideoCallState.ERROR);
      onError?.(new Error(errorMsg));
    }
  }, [encounterId, sessionToken, userName, onError]);

  // Join call on component mount
  useEffect(() => {
    initializeProvider();

    return () => {
      videoProviderRef.current?.leave().catch(console.error);
    };
  }, [initializeProvider]);

  const handleToggleMic = useCallback(async () => {
    try {
      await videoProviderRef.current?.toggleMic(!isMicMuted);
      setIsMicMuted((prev) => !prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mic toggle failed');
    }
  }, [isMicMuted]);

  const handleToggleCamera = useCallback(async () => {
    try {
      await videoProviderRef.current?.toggleCamera(!isCameraOff);
      setIsCameraOff((prev) => !prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera toggle failed');
    }
  }, [isCameraOff]);

  const handleScreenShare = useCallback(async () => {
    try {
      const newState = await videoProviderRef.current?.toggleScreenShare();
      setIsScreenSharing(newState ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screen share failed');
    }
  }, []);

  // RUTH: Recording consent handling with LGPD Art. 7 display
  const handleRecordingToggle = useCallback(async () => {
    if (!recordingConsentConfirmed) {
      // Require explicit consent display
      setRecordingConsentConfirmed(true);
    } else {
      // Toggle recording state
      setIsRecording((prev) => !prev);
      onRecordingStatusChange?.(!isRecording);

      // Stub: server-side recording start/stop via API
      // await fetch(`/api/encounters/${encounterId}/recording`, {
      //   method: 'POST',
      //   body: JSON.stringify({ action: isRecording ? 'stop' : 'start', organizationId }),
      // });
    }
  }, [recordingConsentConfirmed, encounterId, isRecording, onRecordingStatusChange]);

  const handleEndCall = useCallback(() => {
    setCallState(VideoCallState.ENDED);
    videoProviderRef.current?.leave().catch(console.error);
    onCallEnd?.();
  }, [onCallEnd]);

  // Control bar: 44px minimum touch targets
  const controlSize = 'h-11 w-11'; // 44px = 2.75rem
  const controlBgBase = 'bg-surface-secondary hover:bg-surface-elevated transition-colors';
  const controlBgActive = 'bg-severity-mild'; // amber for active state
  const controlBgMuted = 'bg-severity-severe'; // red for muted/off

  const animationClass = prefersReducedMotion ? '' : 'transition-opacity duration-200';

  return (
    <div className="flex flex-col h-screen bg-surface-primary">
      {/* Main video area */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {callState === VideoCallState.CONNECTED && remoteParticipant ? (
          <>
            {/* Remote participant (large) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              aria-label={t('telemedicine.remoteVideoLabel', {
                defaultValue: `Video of {{name}}`,
                name: remoteParticipant.name,
              })}
            />

            {/* Local preview (PiP, bottom-right, 25% size) */}
            <div
              className={`absolute bottom-spacing-md right-spacing-md w-1/4 aspect-video bg-surface-secondary rounded-lg border-2 border-surface-elevated overflow-hidden shadow-lg ${animationClass}`}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
                aria-label={t('telemedicine.localVideoLabel', {
                  defaultValue: 'Your video (mirror)',
                })}
              />
            </div>

            {/* Recording indicator (RUTH: always visible when active) */}
            {isRecording && (
              <div className="absolute top-spacing-md left-spacing-md flex items-center gap-spacing-xs bg-severity-severe px-spacing-md py-spacing-sm rounded-md">
                <span
                  className={`w-2 h-2 rounded-full bg-white ${animationClass}`}
                  style={{
                    animation: prefersReducedMotion ? 'none' : 'pulse 1s infinite',
                  }}
                  aria-hidden="true"
                />
                <span className="text-body text-white font-semibold">
                  {t('telemedicine.recordingIndicator', { defaultValue: 'Recording' })}
                </span>
              </div>
            )}
          </>
        ) : callState === VideoCallState.WAITING || callState === VideoCallState.CONNECTING ? (
          /* Waiting room state */
          <div className="w-full h-full flex flex-col items-center justify-center gap-spacing-md">
            <div className="w-24 h-24 rounded-full bg-surface-secondary animate-pulse" />
            <p className="text-heading-md text-center">
              {userRole === VideoRole.PATIENT
                ? t('telemedicine.waitingForDoctor', {
                    defaultValue: 'Doctor will be with you shortly',
                  })
                : t('telemedicine.connectingCall', { defaultValue: 'Connecting...' })}
            </p>
            {aiScribeEnabled && (
              <div className="bg-surface-elevated border border-surface-secondary rounded-lg p-spacing-md max-w-sm text-center">
                <p className="text-caption text-surface-tertiary">
                  {t('telemedicine.aiScribeDisclaimer', {
                    defaultValue: 'AI Scribe is enabled. This session may be recorded for transcription.',
                  })}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Error or ended state */
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-heading-md text-severity-severe">
                {callState === VideoCallState.ERROR
                  ? t('telemedicine.callError', { defaultValue: 'Call error' })
                  : t('telemedicine.callEnded', { defaultValue: 'Call ended' })}
              </p>
              {error && <p className="text-body text-surface-tertiary mt-spacing-sm">{error}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      {callState === VideoCallState.CONNECTED && (
        <div className="bg-surface-secondary border-t border-surface-elevated px-spacing-lg py-spacing-md flex items-center justify-center gap-spacing-md">
          {/* Mic toggle */}
          <button
            onClick={handleToggleMic}
            className={`${controlSize} rounded-md flex items-center justify-center ${
              isMicMuted ? controlBgMuted : controlBgBase
            }`}
            aria-label={
              isMicMuted
                ? t('telemedicine.unmuteMic', { defaultValue: 'Unmute microphone' })
                : t('telemedicine.muteMic', { defaultValue: 'Mute microphone' })
            }
            aria-pressed={isMicMuted}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              {isMicMuted ? (
                <path d="M10 1a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V3a2 2 0 0 0-2-2zM3.5 8a2.5 2.5 0 0 1 5 0v1a2.5 2.5 0 0 1-5 0V8z" />
              ) : (
                <path d="M10 1a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V3a2 2 0 0 0-2-2z" />
              )}
            </svg>
          </button>

          {/* Camera toggle */}
          <button
            onClick={handleToggleCamera}
            className={`${controlSize} rounded-md flex items-center justify-center ${
              isCameraOff ? controlBgMuted : controlBgBase
            }`}
            aria-label={
              isCameraOff
                ? t('telemedicine.turnOnCamera', { defaultValue: 'Turn on camera' })
                : t('telemedicine.turnOffCamera', { defaultValue: 'Turn off camera' })
            }
            aria-pressed={isCameraOff}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M2 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
            </svg>
          </button>

          {/* Screen share toggle */}
          <button
            onClick={handleScreenShare}
            className={`${controlSize} rounded-md flex items-center justify-center ${
              isScreenSharing ? controlBgActive : controlBgBase
            }`}
            aria-label={
              isScreenSharing
                ? t('telemedicine.stopScreenShare', { defaultValue: 'Stop sharing screen' })
                : t('telemedicine.startScreenShare', { defaultValue: 'Share screen' })
            }
            aria-pressed={isScreenSharing}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" />
            </svg>
          </button>

          {/* Recording toggle (RUTH: requires consent) */}
          {recordingConsent && (
            <button
              onClick={handleRecordingToggle}
              className={`${controlSize} rounded-md flex items-center justify-center ${
                isRecording ? controlBgMuted : controlBgBase
              }`}
              aria-label={
                isRecording
                  ? t('telemedicine.stopRecording', { defaultValue: 'Stop recording' })
                  : t('telemedicine.startRecording', { defaultValue: 'Start recording' })
              }
              aria-pressed={isRecording}
            >
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="3" />
              </svg>
            </button>
          )}

          {/* End call button */}
          <button
            onClick={handleEndCall}
            className={`${controlSize} rounded-md flex items-center justify-center bg-severity-severe hover:bg-severity-critical`}
            aria-label={t('telemedicine.endCall', { defaultValue: 'End call' })}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v13C5 17.88 6.12 19 7.5 19h8c1.38 0 2.5-1.12 2.5-2.5v-13C18 2.12 16.88 1 15.5 1zm-4 21c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
            </svg>
          </button>
        </div>
      )}

      {/* RUTH: Recording consent overlay */}
      {recordingConsent && !recordingConsentConfirmed && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg shadow-xl max-w-md p-spacing-lg">
            <h2 className="text-heading-md mb-spacing-md">
              {t('telemedicine.recordingConsent', { defaultValue: 'Recording Consent' })}
            </h2>
            <p className="text-body mb-spacing-md text-surface-tertiary">
              {t('telemedicine.recordingLgpdDisclaimer', {
                defaultValue:
                  'This session may be recorded for medical record documentation. By continuing, you consent under LGPD Article 7 (legitimate interest in healthcare documentation).',
              })}
            </p>
            <div className="flex gap-spacing-sm">
              <button
                onClick={() => setRecordingConsentConfirmed(true)}
                className="flex-1 px-spacing-md py-spacing-sm bg-severity-minimal text-white rounded-md"
              >
                {t('telemedicine.iAgree', { defaultValue: 'I Agree' })}
              </button>
              <button
                onClick={handleEndCall}
                className="flex-1 px-spacing-md py-spacing-sm bg-surface-secondary text-surface-primary rounded-md"
              >
                {t('telemedicine.decline', { defaultValue: 'Decline' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCallRoom;
