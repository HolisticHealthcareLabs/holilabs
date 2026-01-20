/**
 * Video Room Component
 *
 * Production-ready video telemedicine interface using LiveKit.
 * Beautiful UX with real WebRTC peer-to-peer connections.
 *
 * Phase: Telehealth Video Integration (OSS: LiveKit)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  LocalParticipant,
  RemoteParticipant,
  LocalTrackPublication,
  RemoteTrackPublication,
  ConnectionQuality,
} from 'livekit-client';
import { logger } from '@/lib/logger';

interface VideoRoomProps {
  roomId: string;
  userName: string;
  userType: 'clinician' | 'patient';
  onLeave: () => void;
}

type ConnectionQualityLevel = 'excellent' | 'good' | 'poor' | 'unknown';

export default function VideoRoom({
  roomId,
  userName,
  userType,
  onLeave,
}: VideoRoomProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQualityLevel>('unknown');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [remoteUserName, setRemoteUserName] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch token and connect to LiveKit
  const connectToRoom = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Fetch token from API
      const response = await fetch('/api/video/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, userName, userType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get video token');
      }

      const { data } = await response.json();
      const { token, url } = data;

      // Create room instance
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 30 },
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      roomRef.current = room;

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setIsConnecting(false);
        logger.info({ event: 'livekit_room_connected', roomId });
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        logger.info({ event: 'livekit_room_disconnected', roomId });
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        logger.info({ event: 'livekit_connection_state', roomId, state });
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        setRemoteUserName(participant.name || participant.identity);
        logger.info({
          event: 'livekit_participant_connected',
          roomId,
          participantId: participant.identity
        });
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        if (participant.identity) {
          setRemoteUserName('');
        }
        logger.info({
          event: 'livekit_participant_disconnected',
          roomId,
          participantId: participant.identity
        });
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        }
        if (track.kind === Track.Kind.Audio) {
          // Audio is automatically played
          const audioElement = track.attach();
          audioElement.play();
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      room.on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
        if (publication.track?.kind === Track.Kind.Video && localVideoRef.current) {
          publication.track.attach(localVideoRef.current);
        }
      });

      room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant) => {
        if (participant instanceof LocalParticipant) {
          const qualityMap: Record<ConnectionQuality, ConnectionQualityLevel> = {
            [ConnectionQuality.Excellent]: 'excellent',
            [ConnectionQuality.Good]: 'good',
            [ConnectionQuality.Poor]: 'poor',
            [ConnectionQuality.Lost]: 'poor',
            [ConnectionQuality.Unknown]: 'unknown',
          };
          setConnectionQuality(qualityMap[quality] || 'unknown');
        }
      });

      // Check for existing remote participants
      room.remoteParticipants.forEach((participant) => {
        setRemoteUserName(participant.name || participant.identity);
        participant.trackPublications.forEach((publication) => {
          if (publication.track && publication.kind === Track.Kind.Video && remoteVideoRef.current) {
            publication.track.attach(remoteVideoRef.current);
          }
        });
      });

      // Connect to room
      await room.connect(url, token);

      // Enable camera and microphone
      await room.localParticipant.enableCameraAndMicrophone();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setIsConnecting(false);
      logger.error({
        event: 'livekit_connect_error',
        roomId,
        userType,
        error: message,
      });
    }
  }, [roomId, userName, userType]);

  // Connect on mount
  useEffect(() => {
    connectToRoom();

    return () => {
      // Cleanup
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [connectToRoom]);

  // Call duration timer
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!showControls) return;

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const toggleMute = async () => {
    if (!roomRef.current) return;

    const newMuteState = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuteState);
    setIsMuted(newMuteState);
  };

  const toggleVideo = async () => {
    if (!roomRef.current) return;

    const newVideoState = !isVideoOff;
    await roomRef.current.localParticipant.setCameraEnabled(!newVideoState);
    setIsVideoOff(newVideoState);
  };

  const toggleScreenShare = async () => {
    if (!roomRef.current) return;

    try {
      if (isScreenSharing) {
        await roomRef.current.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await roomRef.current.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (err) {
      logger.error({
        event: 'screen_share_failed',
        roomId,
        userType,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleLeave = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
    onLeave();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-yellow-500';
      case 'poor':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Error state
  if (error) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={connectToRoom}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onLeave}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-screen bg-gray-900 overflow-hidden"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Remote Video (Main) */}
      <div className="absolute inset-0">
        {isConnected && remoteUserName ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {isConnecting ? 'Conectando...' : 'Esperando participante...'}
              </h3>
              <p className="text-gray-400">
                Esperando a que {userType === 'clinician' ? 'el paciente' : 'el médico'} se una
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute bottom-24 right-6 w-64 h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
        />
        {isVideoOff && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {userName[0].toUpperCase()}
              </span>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs font-medium text-white">
          Tú
        </div>
      </motion.div>

      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? getConnectionColor() : 'bg-gray-500 animate-pulse'}`} />
                  <span className="text-white font-medium">
                    {!isConnected && 'Conectando...'}
                    {isConnected && connectionQuality === 'excellent' && 'Excelente'}
                    {isConnected && connectionQuality === 'good' && 'Buena'}
                    {isConnected && connectionQuality === 'poor' && 'Mala'}
                    {isConnected && connectionQuality === 'unknown' && 'Conectado'}
                  </span>
                </div>
                {isConnected && (
                  <div className="text-white/80 text-sm">
                    {formatDuration(callDuration)}
                  </div>
                )}
              </div>
              <div className="text-white font-medium">
                {remoteUserName || 'Esperando...'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6"
          >
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMuted ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"
                    />
                  )}
                </svg>
              </motion.button>

              {/* Video Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isVideoOff
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isVideoOff ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  )}
                </svg>
              </motion.button>

              {/* Screen Share Button */}
              {userType === 'clinician' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleScreenShare}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isScreenSharing
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                  }`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </motion.button>
              )}

              {/* End Call Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLeave}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                  />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
