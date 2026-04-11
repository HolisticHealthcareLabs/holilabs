'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * RUTH INVARIANTS:
 * - Recording consent modal shown here if encounter.recordConsent is required
 * - Patient must accept consent to proceed to join call
 *
 * CYRUS INVARIANTS:
 * - Device selection limited to user's own hardware (enforced client-side)
 * - Session token not sent until "Join Call" clicked
 */

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
}

export interface WaitingRoomProps {
  encounterId: string;
  userName: string;
  recordingConsentRequired?: boolean;
  onJoinCall: (config: {
    selectedVideoDevice: string;
    selectedAudioDevice: string;
    recordingConsentAccepted: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
}

interface AudioMetrics {
  level: number; // 0-100
  isSpeaking: boolean;
}

interface NetworkMetrics {
  rtt: number; // round-trip time in ms
  bandwidth: 'good' | 'fair' | 'poor';
  videoResolution: string;
}

/**
 * Pre-call setup screen:
 * - Device selection (camera, mic)
 * - Video preview with mirror
 * - Audio level meter
 * - Network quality indicator
 * - Setup test button
 * - Join call CTA (disabled until devices working)
 */
export const VideoWaitingRoom: React.FC<WaitingRoomProps> = ({
  encounterId,
  userName,
  recordingConsentRequired = false,
  onJoinCall,
  onCancel,
}) => {
  const { t } = useTranslation(['telemedicine']);
  const prefersReducedMotion = useReducedMotion();

  // Device management
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

  // Preview stream
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Metrics
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({ level: 0, isSpeaking: false });
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics>({
    rtt: 0,
    bandwidth: 'good',
    videoResolution: '1280x720',
  });

  // State flags
  const [isTestingSetup, setIsTestingSetup] = useState(false);
  const [setupTestPassed, setSetupTestPassed] = useState(false);
  const [recordingConsentAccepted, setRecordingConsentAccepted] = useState(!recordingConsentRequired);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enumerate media devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const cameras = devices.filter((d) => d.kind === 'videoinput');
      const mics = devices.filter((d) => d.kind === 'audioinput');

      setVideoDevices(cameras);
      setAudioDevices(mics);

      // Select first device by default
      if (cameras.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(cameras[0].deviceId);
      }
      if (mics.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(mics[0].deviceId);
      }
    } catch (err) {
      setError(t('telemedicine.enumerateDevicesError', { defaultValue: 'Failed to list devices' }));
    }
  }, [selectedVideoDevice, selectedAudioDevice, t]);

  // Initialize devices on mount
  useEffect(() => {
    enumerateDevices();

    // Listen for device changes (camera/mic plugged/unplugged)
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  // Start video preview
  const startPreview = useCallback(async () => {
    try {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setPreviewStream(stream);

      // Attach to video element (mirror mode)
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      // Set up audio analyser for level meter
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Monitor audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioMetrics({
          level: Math.min(100, (average / 256) * 100),
          isSpeaking: average > 30,
        });

        if (isTestingSetup) {
          requestAnimationFrame(updateLevel);
        }
      };

      updateLevel();
    } catch (err) {
      const msg = err instanceof DOMException ? `${err.name}: ${err.message}` : 'Failed to access camera/mic';
      setError(msg);
    }
  }, [selectedVideoDevice, selectedAudioDevice, isTestingSetup, previewStream]);

  // Start preview when devices change
  useEffect(() => {
    if (selectedVideoDevice && selectedAudioDevice) {
      startPreview();
    }
  }, [selectedVideoDevice, selectedAudioDevice, startPreview]);

  // Test setup: measure RTT and bandwidth
  const testSetup = useCallback(async () => {
    setIsTestingSetup(true);
    setSetupTestPassed(false);

    try {
      // Measure RTT by pinging health endpoint
      const startTime = performance.now();
      const healthRes = await fetch('/api/health', { method: 'HEAD' });
      const rtt = performance.now() - startTime;

      // Infer bandwidth from video stream constraints
      const videoTrack = previewStream?.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      const videoResolution = settings ? `${settings.width}x${settings.height}` : '1280x720';

      // Simple heuristic: if RTT < 50ms, bandwidth is good
      const bandwidth = rtt < 50 ? 'good' : rtt < 100 ? 'fair' : 'poor';

      setNetworkMetrics({
        rtt: Math.round(rtt),
        bandwidth,
        videoResolution,
      });

      // Require audio to be detected
      if (audioMetrics.level > 10) {
        setSetupTestPassed(true);
      } else {
        setError(t('telemedicine.noAudioDetected', { defaultValue: 'No audio detected. Check your microphone.' }));
      }
    } catch (err) {
      setError(t('telemedicine.testSetupFailed', { defaultValue: 'Setup test failed' }));
    } finally {
      setIsTestingSetup(false);
    }
  }, [previewStream, audioMetrics.level, t]);

  const handleJoinCall = useCallback(async () => {
    if (!setupTestPassed && !previewStream) {
      setError(t('telemedicine.setupTestRequired', { defaultValue: 'Please test your setup first' }));
      return;
    }

    if (recordingConsentRequired && !recordingConsentAccepted) {
      setError(t('telemedicine.consentRequired', { defaultValue: 'You must accept recording consent' }));
      return;
    }

    try {
      setIsJoining(true);
      await onJoinCall({
        selectedVideoDevice,
        selectedAudioDevice,
        recordingConsentAccepted,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join call');
    } finally {
      setIsJoining(false);
    }
  }, [setupTestPassed, previewStream, recordingConsentRequired, recordingConsentAccepted, selectedVideoDevice, selectedAudioDevice, onJoinCall, t]);

  const animationClass = prefersReducedMotion ? '' : 'transition-all duration-200';

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-spacing-md">
      <div className="max-w-2xl w-full bg-surface-elevated rounded-lg shadow-xl p-spacing-lg">
        {/* Header */}
        <h1 className="text-heading-lg mb-spacing-sm">
          {t('telemedicine.prepareForCall', { defaultValue: 'Prepare for Your Call' })}
        </h1>
        <p className="text-body text-surface-tertiary mb-spacing-lg">
          {t('telemedicine.setupInstructions', {
            defaultValue: `Let's set up your camera, microphone, and internet connection, {{name}}.`,
            name: userName,
          })}
        </p>

        {error && (
          <div
            className="mb-spacing-md p-spacing-md bg-severity-severe bg-opacity-10 border border-severity-severe rounded-md"
            role="alert"
          >
            <p className="text-severity-severe text-body">{error}</p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-lg mb-spacing-lg">
          {/* Video Preview */}
          <div>
            <label className="text-heading-sm block mb-spacing-sm">
              {t('telemedicine.cameraPreview', { defaultValue: 'Camera Preview' })}
            </label>
            <div className="relative bg-black rounded-lg overflow-hidden mb-spacing-md aspect-video">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
                aria-label={t('telemedicine.cameraPreviewLabel', { defaultValue: 'Your camera preview (mirrored)' })}
              />
              {!previewStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-overlay">
                  <p className="text-body text-white">
                    {t('telemedicine.cameraLoading', { defaultValue: 'Initializing camera...' })}
                  </p>
                </div>
              )}
            </div>

            {/* Audio Level Meter */}
            <div>
              <label className="text-body block mb-spacing-xs">
                {t('telemedicine.audioLevel', { defaultValue: 'Audio Level' })}
              </label>
              <div className="bg-surface-secondary rounded-md h-3 overflow-hidden">
                <div
                  className={`h-full ${
                    audioMetrics.isSpeaking ? 'bg-severity-minimal' : 'bg-severity-mild'
                  } ${animationClass}`}
                  style={{ width: `${audioMetrics.level}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(audioMetrics.level)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('telemedicine.microphoneLevel', {
                    defaultValue: `Microphone level: ${Math.round(audioMetrics.level)}%`,
                  })}
                />
              </div>
              {audioMetrics.isSpeaking && (
                <p className="text-caption text-severity-minimal mt-spacing-xs">
                  {t('telemedicine.microphoneActive', { defaultValue: 'Microphone is picking up audio' })}
                </p>
              )}
            </div>
          </div>

          {/* Device Selection & Network Quality */}
          <div className="space-y-spacing-md">
            {/* Camera select */}
            <div>
              <label htmlFor="camera-select" className="text-body block mb-spacing-xs font-semibold">
                {t('telemedicine.selectCamera', { defaultValue: 'Camera' })}
              </label>
              <select
                id="camera-select"
                value={selectedVideoDevice}
                onChange={(e) => {
                  setSelectedVideoDevice(e.target.value);
                  // Announce change for screen readers
                  const device = videoDevices.find((d) => d.deviceId === e.target.value);
                  if (device) {
                    announce(t('telemedicine.cameraChanged', { defaultValue: `Camera changed to {{label}}`, label: device.label }));
                  }
                }}
                className="w-full px-spacing-sm py-spacing-sm bg-surface-secondary border border-surface-tertiary rounded-md text-body focus:outline-none focus:ring-2 focus:ring-severity-minimal"
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone select */}
            <div>
              <label htmlFor="mic-select" className="text-body block mb-spacing-xs font-semibold">
                {t('telemedicine.selectMicrophone', { defaultValue: 'Microphone' })}
              </label>
              <select
                id="mic-select"
                value={selectedAudioDevice}
                onChange={(e) => {
                  setSelectedAudioDevice(e.target.value);
                  const device = audioDevices.find((d) => d.deviceId === e.target.value);
                  if (device) {
                    announce(t('telemedicine.microphoneChanged', { defaultValue: `Microphone changed to {{label}}`, label: device.label }));
                  }
                }}
                className="w-full px-spacing-sm py-spacing-sm bg-surface-secondary border border-surface-tertiary rounded-md text-body focus:outline-none focus:ring-2 focus:ring-severity-minimal"
              >
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Network Quality */}
            <div>
              <label className="text-body block mb-spacing-xs font-semibold">
                {t('telemedicine.networkQuality', { defaultValue: 'Network Quality' })}
              </label>
              <div className="bg-surface-secondary rounded-md p-spacing-sm space-y-spacing-xs">
                <div className="flex justify-between items-center">
                  <span className="text-caption">
                    {t('telemedicine.latency', { defaultValue: 'Latency' })}
                  </span>
                  <span className={`text-caption font-semibold ${
                    networkMetrics.bandwidth === 'good' ? 'text-severity-minimal' : 'text-severity-mild'
                  }`}>
                    {networkMetrics.rtt}ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-caption">
                    {t('telemedicine.bandwidth', { defaultValue: 'Bandwidth' })}
                  </span>
                  <span className={`text-caption font-semibold capitalize ${
                    networkMetrics.bandwidth === 'good'
                      ? 'text-severity-minimal'
                      : networkMetrics.bandwidth === 'fair'
                      ? 'text-severity-mild'
                      : 'text-severity-moderate'
                  }`}>
                    {networkMetrics.bandwidth}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-caption">
                    {t('telemedicine.resolution', { defaultValue: 'Resolution' })}
                  </span>
                  <span className="text-caption font-mono">{networkMetrics.videoResolution}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Setup Button */}
        <button
          onClick={testSetup}
          disabled={isTestingSetup || !previewStream}
          className="w-full px-spacing-md py-spacing-sm mb-spacing-md bg-surface-secondary hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-body font-semibold transition-colors"
          aria-label={t('telemedicine.testSetupButton', { defaultValue: 'Test my setup' })}
        >
          {isTestingSetup ? t('telemedicine.testing', { defaultValue: 'Testing...' }) : t('telemedicine.testSetup', { defaultValue: 'Test My Setup' })}
        </button>

        {/* Setup Test Result */}
        {setupTestPassed && (
          <div className="mb-spacing-md p-spacing-md bg-severity-minimal bg-opacity-10 border border-severity-minimal rounded-md">
            <p className="text-severity-minimal text-body font-semibold">
              {t('telemedicine.setupOk', { defaultValue: '✓ Your setup looks good!' })}
            </p>
          </div>
        )}

        {/* RUTH: Recording Consent Checkbox */}
        {recordingConsentRequired && (
          <div className="mb-spacing-md p-spacing-md bg-surface-secondary rounded-md border border-surface-tertiary">
            <label className="flex items-start gap-spacing-sm cursor-pointer">
              <input
                type="checkbox"
                checked={recordingConsentAccepted}
                onChange={(e) => setRecordingConsentAccepted(e.target.checked)}
                className="mt-spacing-xs"
                aria-label={t('telemedicine.recordingConsentCheckbox', {
                  defaultValue: 'I consent to recording for medical documentation per LGPD Article 7',
                })}
              />
              <span className="text-body">
                {t('telemedicine.recordingConsentText', {
                  defaultValue: 'I consent to recording this session for medical documentation. This complies with LGPD Article 7 (legitimate interest in healthcare).',
                })}
              </span>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-spacing-md">
          <button
            onClick={onCancel}
            className="flex-1 px-spacing-md py-spacing-sm bg-surface-secondary hover:bg-surface-elevated rounded-md text-body font-semibold transition-colors"
            aria-label={t('telemedicine.cancel', { defaultValue: 'Cancel' })}
          >
            {t('telemedicine.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            onClick={handleJoinCall}
            disabled={!previewStream || isJoining || (recordingConsentRequired && !recordingConsentAccepted)}
            className="flex-1 px-spacing-md py-spacing-sm bg-severity-minimal text-white rounded-md font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={t('telemedicine.joinCall', { defaultValue: 'Join Call' })}
          >
            {isJoining ? t('telemedicine.joining', { defaultValue: 'Joining...' }) : t('telemedicine.joinCall', { defaultValue: 'Join Call' })}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Utility: announce changes to screen readers
 */
function announce(message: string) {
  const div = document.createElement('div');
  div.setAttribute('role', 'status');
  div.setAttribute('aria-live', 'polite');
  div.setAttribute('aria-atomic', 'true');
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1000);
}

export default VideoWaitingRoom;
