/**
 * Socket.io Server for Real-time Chat
 *
 * Handles real-time messaging between clinicians and patients
 * Features: typing indicators, read receipts, online status
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from './prisma';
import logger from './logger';
import { verifySocketToken } from './socket-auth';
import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import { MedicalAudioStreamer, type MedicalSegment } from './transcription/MedicalAudioStreamer';
import { getScribeService } from '@/lib/services/scribe.service';

export type SocketServer = SocketIOServer;

let io: SocketIOServer | undefined;

type LiveDgSession = {
  streamer: MedicalAudioStreamer;
  clinicianId: string;
  language: string;
  inputSampleRate: number;
  requestId?: string;
  lastUsedAt: number;
  activeSockets: Set<string>;
};

const dgSessions = new Map<string, LiveDgSession>();

const scribeService = getScribeService((sessionId, event, payload) => {
  if (!io) return;
  io.to(`co-pilot:${sessionId}`).emit(event, payload);
});

// Lightweight debug counters (dev-friendly): lets the client confirm the server is receiving audio.
const coPilotAudioCountersBySocket = new Map<string, { count: number; lastAt: number }>();

type InterimThrottleState = {
  timer: NodeJS.Timeout | null;
  latest: MedicalSegment[] | null;
};
const interimThrottle = new Map<string, InterimThrottleState>();

type PersistedTranscriptSegment = {
  speaker: string;
  speakerIndex: number;
  role: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence: number;
};

type LiveTranscriptState = {
  language: 'en' | 'es' | 'pt';
  model?: string;
  rawLines: string[];
  segments: PersistedTranscriptSegment[];
  speakerSet: Set<number>;
  maxEndSeconds: number;
  persistTimer: NodeJS.Timeout | null;
  lastPersistAt: number;
};

const liveTranscript = new Map<string, LiveTranscriptState>();

type StreamFailure = {
  untilMs: number;
  message: string;
};
const streamFailures = new Map<string, StreamFailure>();

function getEnvTag(): 'prod' | 'staging' | 'dev' {
  if (process.env.NODE_ENV === 'production') return 'prod';
  if (process.env.NODE_ENV === 'test') return 'dev';
  return 'dev';
}

function normalizeSpeechLanguage(input: unknown): 'en' | 'es' | 'pt' {
  const raw = String(input || 'en').toLowerCase();
  if (raw.startsWith('pt')) return 'pt';
  if (raw.startsWith('es')) return 'es';
  return 'en';
}

async function buildPatientContext(patientId: string): Promise<string[]> {
  // Server-derived context only (never trust client). Keep small & high-signal.
  try {
    const [meds, dx, allergies] = await Promise.all([
      prisma.medication.findMany({
        where: { patientId, isActive: true },
        select: { name: true, genericName: true, dose: true },
        take: 25,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.diagnosis.findMany({
        where: { patientId, status: 'ACTIVE' },
        select: { description: true, icd10Code: true },
        take: 20,
        orderBy: { diagnosedAt: 'desc' },
      }),
      prisma.allergy.findMany({
        where: { patientId, isActive: true },
        select: { allergen: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const terms: string[] = [];

    for (const m of meds) {
      if (m.name) terms.push(m.name);
      if (m.genericName) terms.push(m.genericName);
      if (m.dose) terms.push(`${m.name} ${m.dose}`.trim());
    }
    for (const d of dx) {
      if (d.description) terms.push(d.description);
      if (d.icd10Code) terms.push(d.icd10Code);
    }
    for (const a of allergies) {
      if (a.allergen) terms.push(a.allergen);
    }

    // Normalize, de-dupe, cap.
    const uniq = Array.from(
      new Set(
        terms
          .map((t) => String(t || '').trim())
          .filter(Boolean)
          .map((t) => (t.length > 80 ? t.slice(0, 80) : t))
      )
    );

    return uniq.slice(0, 60);
  } catch (e: any) {
    logger.warn({ event: 'patient_context_build_failed', patientId, error: e?.message || e }, 'Failed to build patient context');
    return [];
  }
}

function resamplePcm16(input: Int16Array, inputRate: number, outputRate: number): Int16Array {
  if (!input.length) return input;
  if (!Number.isFinite(inputRate) || inputRate <= 0) return input;
  if (inputRate === outputRate) return input;

  // Linear interpolation resampler (fast, good-enough for speech).
  const ratio = inputRate / outputRate;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Int16Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const idx = i * ratio;
    const idx0 = Math.floor(idx);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = idx - idx0;
    const s0 = input[idx0] || 0;
    const s1 = input[idx1] || 0;
    output[i] = (s0 + (s1 - s0) * frac) as any;
  }

  return output;
}

async function emitSanitizedSegments(params: {
  sessionId: string;
  segments: MedicalSegment[];
  isFinal: boolean;
  requestId?: string;
}): Promise<PersistedTranscriptSegment[]> {
  const { sessionId, segments, isFinal, requestId } = params;
  const out: PersistedTranscriptSegment[] = [];
  if (!io) return out;

  for (const seg of segments) {
    const presidioStart = Date.now();
    const safeText = await deidentifyTranscriptOrThrow(seg.text);
    const presidioMs = Date.now() - presidioStart;

    const startTime = Math.max(0, (seg.startTimeMs || 0) / 1000);
    const endTime = Math.max(0, (seg.endTimeMs || 0) / 1000);

    out.push({
      speaker: seg.speaker,
      speakerIndex: seg.speakerIndex,
      role: seg.role,
      text: safeText,
      startTime,
      endTime,
      confidence: seg.confidence,
    });

    io.to(`co-pilot:${sessionId}`).emit('co_pilot:transcript_update', {
      speaker: seg.speaker,
      speakerIndex: seg.speakerIndex,
      role: seg.role,
      text: safeText,
      confidence: seg.confidence,
      isFinal,
      // TranscriptViewer expects seconds (mm:ss formatting).
      startTime,
      endTime,
      metrics: { presidioMs, requestId },
    });
  }

  return out;
}

function getOrInitLiveTranscript(sessionId: string, language: 'en' | 'es' | 'pt'): LiveTranscriptState {
  const existing = liveTranscript.get(sessionId);
  if (existing) return existing;
  const next: LiveTranscriptState = {
    language,
    model: undefined,
    rawLines: [],
    segments: [],
    speakerSet: new Set<number>(),
    maxEndSeconds: 0,
    persistTimer: null,
    lastPersistAt: 0,
  };
  liveTranscript.set(sessionId, next);
  return next;
}

async function persistLiveTranscript(sessionId: string) {
  const st = liveTranscript.get(sessionId);
  if (!st) return;

  const rawText = st.rawLines.join('\n').trim();
  const wordCount = rawText ? rawText.split(/\s+/).length : 0;
  const speakerCount = st.speakerSet.size || 1;
  const confidence =
    st.segments.length > 0
      ? st.segments.reduce((sum, s) => sum + (Number.isFinite(s.confidence) ? s.confidence : 0.9), 0) / st.segments.length
      : 0.9;
  const durationSeconds = Math.max(0, st.maxEndSeconds);

  await prisma.transcription.upsert({
    where: { sessionId },
    update: {
      rawText: rawText || '(no transcript)',
      segments: st.segments as any,
      speakerCount,
      confidence,
      wordCount,
      durationSeconds,
      model: st.model || 'deepgram-live',
      language: st.language,
    },
    create: {
      sessionId,
      rawText: rawText || '(no transcript)',
      segments: st.segments as any,
      speakerCount,
      confidence,
      wordCount,
      durationSeconds,
      model: st.model || 'deepgram-live',
      language: st.language,
    },
  });

  st.lastPersistAt = Date.now();
}

function schedulePersist(sessionId: string, delayMs = 1500) {
  const st = liveTranscript.get(sessionId);
  if (!st) return;
  if (st.persistTimer) return;
  st.persistTimer = setTimeout(async () => {
    const cur = liveTranscript.get(sessionId);
    if (!cur) return;
    cur.persistTimer = null;
    try {
      await persistLiveTranscript(sessionId);
    } catch (e: any) {
      logger.warn({ event: 'live_transcript_persist_failed', sessionId, error: e?.message || e }, 'Failed to persist live transcript');
    }
  }, delayMs);
}

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    // IMPORTANT: Use the standard Socket.IO path to avoid conflicting with Next API routes.
    path: '/api/socket.io',
    cors: {
      origin: (origin, cb) => {
        // Allow same-origin and typical local dev ports.
        if (!origin) return cb(null, true);
        if (origin.startsWith('http://localhost:')) return cb(null, true);
        if (origin.startsWith('http://127.0.0.1:')) return cb(null, true);
        const allowed = process.env.NEXT_PUBLIC_APP_URL;
        if (allowed && origin === allowed) return cb(null, true);
        return cb(new Error('CORS blocked'), false);
      },
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn({
          event: 'socket_auth_failed',
          reason: 'no_token',
          socketId: socket.id,
        });
        return next(new Error('Authentication required'));
      }

      // Verify token
      const user = await verifySocketToken(token);

      if (!user) {
        logger.warn({
          event: 'socket_auth_failed',
          reason: 'invalid_token',
          socketId: socket.id,
        });
        return next(new Error('Invalid authentication token'));
      }

      // Attach user data to socket
      socket.data.userId = user.userId;
      socket.data.userType = user.userType;

      logger.info({
        event: 'socket_authenticated',
        userId: user.userId,
        userType: user.userType,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      logger.error({
        event: 'socket_auth_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id,
      });
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userType = socket.data.userType;

    logger.info({
      event: 'socket_connected',
      userId,
      userType,
      socketId: socket.id,
    });

    // Automatically join user room
    const roomId = `user:${userType}:${userId}`;
    socket.join(roomId);

    // Also join simplified user room for conversation notifications
    if (userType === 'CLINICIAN') {
      socket.join(`user:${userId}`);
    } else if (userType === 'PATIENT') {
      socket.join(`patient:${userId}`);
    }

    logger.info({
      event: 'user_auto_joined_room',
      userId,
      userType,
      roomId,
      socketId: socket.id,
    });

    // Update online status for all conversation participants
    void prisma.conversationParticipant.updateMany({
      where: {
        userId,
        userType: userType as 'CLINICIAN' | 'PATIENT',
        isActive: true,
      },
      data: {
        isOnline: true,
        lastSeenAt: new Date(),
      },
    }).catch((err) => {
      logger.warn({ event: 'update_online_status_failed', userId, error: err?.message });
    });

    // Notify user is online
    socket.broadcast.emit('user_online', { userId, userType });

    // Legacy join handler for backward compatibility (now authenticated)
    socket.on('join', ({ userId: requestedUserId, userType: requestedUserType }: { userId: string; userType: string }) => {
      // Verify the requested userId matches the authenticated user
      if (requestedUserId !== socket.data.userId || requestedUserType !== socket.data.userType) {
        logger.warn({
          event: 'unauthorized_join_attempt',
          authenticatedUserId: socket.data.userId,
          requestedUserId,
          socketId: socket.id,
        });
        socket.emit('error', { message: 'Unauthorized: Cannot join room for different user' });
        return;
      }

      const roomId = `user:${userType}:${userId}`;
      socket.join(roomId);

      logger.info({
        event: 'user_joined_room',
        userId,
        userType,
        roomId,
        socketId: socket.id,
      });
    });

    // Join conversation room
    socket.on('join_conversation', async ({ conversationId }: { conversationId: string }) => {
      // Verify user is a participant before joining
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
          userType: userType as 'CLINICIAN' | 'PATIENT',
          isActive: true,
        },
      });

      if (!participant) {
        socket.emit('error', { message: 'Not a participant of this conversation' });
        return;
      }

      socket.join(`conversation:${conversationId}`);

      // Update lastSeenAt when joining conversation
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastSeenAt: new Date() },
      }).catch((err) => {
        logger.warn({ event: 'update_last_seen_failed', conversationId, userId, error: err?.message });
      });

      // Notify others in the conversation
      socket.to(`conversation:${conversationId}`).emit('participant_joined', {
        conversationId,
        userId,
        userType,
      });

      logger.info({
        event: 'joined_conversation',
        conversationId,
        userId,
        userType,
        socketId: socket.id,
      });
    });

    // Leave conversation room
    socket.on('leave_conversation', async ({ conversationId }: { conversationId: string }) => {
      // Update lastSeenAt before leaving
      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId,
          userType: userType as 'CLINICIAN' | 'PATIENT',
          isActive: true,
        },
        data: { lastSeenAt: new Date() },
      }).catch((err) => {
        logger.warn({ event: 'update_last_seen_failed', conversationId, userId, error: err?.message });
      });

      // Notify others before leaving
      socket.to(`conversation:${conversationId}`).emit('participant_left', {
        conversationId,
        userId,
        userType,
      });

      socket.leave(`conversation:${conversationId}`);

      logger.info({
        event: 'left_conversation',
        conversationId,
        userId,
        userType,
        socketId: socket.id,
      });
    });

    // Typing indicator
    socket.on('typing_start', ({ conversationId, userId, userName }: {
      conversationId: string;
      userId: string;
      userName: string;
    }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        userName,
      });
    });

    socket.on('typing_stop', ({ conversationId, userId }: {
      conversationId: string;
      userId: string;
    }) => {
      socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
        conversationId,
        userId,
      });
    });

    // New message (sent from server after DB insert)
    socket.on('message_sent', (message: any) => {
      // Emit to recipient
      const recipientRoom = `user:${message.toUserType}:${message.toUserId}`;
      io?.to(recipientRoom).emit('new_message', message);

      // Emit to conversation room
      io?.to(`conversation:${message.conversationId}`).emit('message_received', message);
    });

    // Message read receipt
    socket.on('message_read', async ({ messageId, userId }: {
      messageId: string;
      userId: string;
    }) => {
      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: { readAt: new Date() },
          include: { patient: true },
        });

        // Notify sender
        const senderRoom = `user:${message.fromUserType}:${message.fromUserId}`;
        io?.to(senderRoom).emit('message_read_receipt', {
          messageId,
          readAt: message.readAt,
        });

        logger.info({
          event: 'message_marked_read',
          messageId,
          userId,
        });
      } catch (error) {
        logger.error({
          event: 'message_read_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          messageId,
        });
      }
    });

    // User disconnection
    socket.on('disconnect', () => {
      // Delegate cleanup to ScribeService (stops stream + persists transcript when orphaned).
      void scribeService.onDisconnect(socket.id).catch(() => {});

      // Update offline status for all conversation participants
      void prisma.conversationParticipant.updateMany({
        where: {
          userId,
          userType: userType as 'CLINICIAN' | 'PATIENT',
          isActive: true,
        },
        data: {
          isOnline: false,
          lastSeenAt: new Date(),
        },
      }).catch((err) => {
        logger.warn({ event: 'update_offline_status_failed', userId, error: err?.message });
      });

      // Notify user is offline
      socket.broadcast.emit('user_offline', { userId, userType });

      logger.info({
        event: 'socket_disconnected',
        socketId: socket.id,
        userId,
        userType,
      });
    });

    // Co-Pilot handlers
    socket.on('co_pilot:join_session', ({ sessionId }: { sessionId: string }) => {
      const roomId = `co-pilot:${sessionId}`;
      socket.join(roomId);
      scribeService.onJoinSession(sessionId, socket.id);
      // Let the client know the join succeeded (helps diagnose "no transcript" issues).
      socket.emit('co_pilot:server_ready', { sessionId, socketId: socket.id, serverTime: Date.now() });
      logger.info({
        event: 'co_pilot_session_joined',
        sessionId,
        userId,
        socketId: socket.id,
      });
    });

    socket.on('co_pilot:stop_stream', async ({ sessionId }: { sessionId: string }) => {
      try {
        if (socket.data.userType !== 'CLINICIAN') return;
        const clinicianId = socket.data.userId as string;

        const owns = await prisma.scribeSession.findFirst({
          where: { id: sessionId, clinicianId },
          select: { id: true },
        });
        if (!owns) return;

        await scribeService.stopStream(sessionId, clinicianId);
        logger.info({ event: 'co_pilot_stream_stopped', sessionId, clinicianId }, 'Stopped Deepgram stream');
      } catch (e: any) {
        logger.warn({ event: 'co_pilot_stop_stream_failed', sessionId, error: e?.message || e }, 'Failed to stop stream');
      }
    });

    socket.on('co_pilot:audio_chunk', async ({
      sessionId,
      audioData,
      language,
      sampleRate,
      patientContext,
    }: {
      sessionId: string;
      audioData: ArrayBuffer | Uint8Array;
      language?: string;
      sampleRate?: number;
      patientContext?: string[];
    }) => {
      try {
        // Debug: count inbound audio chunks (throttled ack every ~2s).
        const cur = coPilotAudioCountersBySocket.get(socket.id) || { count: 0, lastAt: 0 };
        cur.count += 1;
        const now = Date.now();
        const shouldAck = now - cur.lastAt > 2000;
        if (shouldAck) cur.lastAt = now;
        coPilotAudioCountersBySocket.set(socket.id, cur);

        await scribeService.handleAudioChunk({
          sessionId,
          socketId: socket.id,
          clinicianId: socket.data.userId as string,
          userType: socket.data.userType as string,
          audioData,
          language,
          sampleRate,
          deepgramApiKey: process.env.DEEPGRAM_API_KEY,
        });

        if (shouldAck) {
          socket.emit('co_pilot:audio_ack', {
            sessionId,
            chunksReceived: cur.count,
            serverTime: now,
          });
        }
      } catch (error) {
        logger.error({
          event: 'co_pilot_audio_processing_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          sessionId,
          socketId: socket.id,
        });
      }
    });

    socket.on('co_pilot:leave_session', ({ sessionId }: { sessionId: string }) => {
      socket.leave(`co-pilot:${sessionId}`);
      void scribeService.onLeaveSession(sessionId, socket.id).catch(() => {});
      logger.info({
        event: 'co_pilot_session_left',
        sessionId,
        userId,
        socketId: socket.id,
      });
    });

    // Prevention Hub handlers
    socket.on('authenticate', ({ userId: authUserId, token }: { userId: string; token?: string }) => {
      // Verify the requested userId matches the authenticated user
      if (authUserId !== socket.data.userId) {
        logger.warn({
          event: 'unauthorized_prevention_auth_attempt',
          authenticatedUserId: socket.data.userId,
          requestedUserId: authUserId,
          socketId: socket.id,
        });
        socket.emit('error', { message: 'Unauthorized: User ID mismatch' });
        return;
      }

      // Join user-specific prevention room
      const userRoom = `user:${authUserId}`;
      socket.join(userRoom);

      logger.info({
        event: 'prevention_user_authenticated',
        userId: authUserId,
        roomId: userRoom,
        socketId: socket.id,
      });

      socket.emit('authenticated', { success: true, userId: authUserId });
    });

    socket.on('join_room', ({ roomType, resourceId }: { roomType: string; resourceId: string }) => {
      const roomName = `${roomType}${resourceId}`;
      socket.join(roomName);

      logger.info({
        event: 'prevention_room_joined',
        roomType,
        resourceId,
        roomName,
        userId,
        socketId: socket.id,
      });

      socket.emit('room_joined', { roomName });
    });

    socket.on('leave_room', ({ roomType, resourceId }: { roomType: string; resourceId: string }) => {
      const roomName = `${roomType}${resourceId}`;
      socket.leave(roomName);

      logger.info({
        event: 'prevention_room_left',
        roomType,
        resourceId,
        roomName,
        userId,
        socketId: socket.id,
      });

      socket.emit('room_left', { roomName });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error({
        event: 'socket_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id,
      });
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | undefined {
  return io;
}

/**
 * Co-Pilot: Emit event to a session room (created by `co_pilot:join_session`)
 */
export function emitCoPilotEvent(sessionId: string, event: string, payload: any) {
  if (!io) return;
  io.to(`co-pilot:${sessionId}`).emit(event, payload);
}

/**
 * Emit a new message to the recipient
 */
export function emitNewMessage(message: any) {
  if (!io) return;

  const recipientRoom = `user:${message.toUserType}:${message.toUserId}`;
  io.to(recipientRoom).emit('new_message', message);

  // Also emit to conversation room
  const conversationRoom = `conversation:${message.patientId}`;
  io.to(conversationRoom).emit('new_message', message);
}

/**
 * Emit read receipt when messages are marked as read
 */
export function emitReadReceipt(data: {
  conversationId: string;
  readerId: string;
  readerType: 'CLINICIAN' | 'PATIENT';
  messageIds: string[];
  readAt: Date;
}) {
  if (!io) return;

  // Emit to conversation room
  const conversationRoom = `conversation:${data.conversationId}`;
  io.to(conversationRoom).emit('messages_read', {
    conversationId: data.conversationId,
    readerId: data.readerId,
    readerType: data.readerType,
    messageIds: data.messageIds,
    readAt: data.readAt.toISOString(),
  });

  logger.info({
    event: 'read_receipt_emitted',
    conversationId: data.conversationId,
    readerId: data.readerId,
    messageCount: data.messageIds.length,
  });
}

/**
 * Emit unread count update to a specific user
 */
export function emitUnreadCountUpdate(
  userId: string,
  userType: 'CLINICIAN' | 'PATIENT',
  conversationId: string,
  unreadCount: number
) {
  if (!io) return;

  const userRoom = `user:${userType}:${userId}`;
  io.to(userRoom).emit('unread_count_update', {
    conversationId,
    unreadCount,
  });

  logger.info({
    event: 'unread_count_update_emitted',
    userId,
    userType,
    conversationId,
    unreadCount,
  });
}

/**
 * Emit typing indicator
 */
export function emitTypingIndicator(conversationId: string, userId: string, userName: string) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit('user_typing', {
    conversationId,
    userId,
    userName,
  });
}

/**
 * Emit user online status
 */
export function emitUserOnline(userId: string, userType: string) {
  if (!io) return;

  io.emit('user_online', { userId, userType });
}

/**
 * Emit user offline status
 */
export function emitUserOffline(userId: string, userType: string) {
  if (!io) return;

  io.emit('user_offline', { userId, userType });
}

/**
 * Emit appointment notification
 */
export function emitAppointmentNotification(
  userId: string,
  userType: 'CLINICIAN' | 'PATIENT',
  data: { date: string; time?: string; provider?: string }
) {
  if (!io) return;

  const roomId = `user:${userType}:${userId}`;
  io.to(roomId).emit('notification:appointment', data);

  logger.info({
    event: 'notification_sent',
    type: 'appointment',
    userId,
    userType,
  });
}

/**
 * Emit medication reminder notification
 */
export function emitMedicationReminder(
  userId: string,
  data: { message: string; medicationName?: string }
) {
  if (!io) return;

  const roomId = `user:PATIENT:${userId}`;
  io.to(roomId).emit('notification:medication', data);

  logger.info({
    event: 'notification_sent',
    type: 'medication',
    userId,
  });
}

/**
 * Emit lab result notification
 */
export function emitLabResultNotification(
  userId: string,
  userType: 'CLINICIAN' | 'PATIENT',
  data: { message: string; testName?: string }
) {
  if (!io) return;

  const roomId = `user:${userType}:${userId}`;
  io.to(roomId).emit('notification:lab', data);

  logger.info({
    event: 'notification_sent',
    type: 'lab',
    userId,
    userType,
  });
}

/**
 * Prevention Hub - Emit event to specific user
 */
export function emitPreventionEventToUser(
  userId: string,
  event: string,
  notification: any
) {
  if (!io) return;

  const userRoom = `user:${userId}`;
  io.to(userRoom).emit(event, notification);

  logger.info({
    event: 'prevention_event_sent',
    eventType: event,
    userId,
    notificationId: notification.id,
  });
}

/**
 * Prevention Hub - Emit event to specific room
 */
export function emitPreventionEventToRoom(
  roomType: string,
  resourceId: string,
  event: string,
  notification: any
) {
  if (!io) return;

  const roomName = `${roomType}${resourceId}`;
  io.to(roomName).emit(event, notification);

  logger.info({
    event: 'prevention_event_sent_to_room',
    eventType: event,
    roomType,
    resourceId,
    roomName,
    notificationId: notification.id,
  });
}

/**
 * Prevention Hub - Emit event to all users
 */
export function emitPreventionEventToAll(event: string, notification: any) {
  if (!io) return;

  io.emit(event, notification);

  logger.info({
    event: 'prevention_event_broadcast',
    eventType: event,
    notificationId: notification.id,
  });
}

/**
 * Prevention Hub - Emit event to multiple users
 */
export function emitPreventionEventToUsers(
  userIds: string[],
  event: string,
  notification: any
) {
  if (!io) return;

  userIds.forEach((userId) => {
    emitPreventionEventToUser(userId, event, notification);
  });

  logger.info({
    event: 'prevention_event_sent_to_multiple_users',
    eventType: event,
    userCount: userIds.length,
    notificationId: notification.id,
  });
}

/**
 * Conversation - Emit new message to conversation participants
 */
export function emitConversationMessage(
  conversationId: string,
  message: {
    id: string;
    senderId: string;
    senderType: 'CLINICIAN' | 'PATIENT';
    senderName: string;
    content: string;
    messageType: string;
    attachments?: unknown;
    replyTo?: { id: string; content: string; senderId: string; senderType: string } | null;
    deliveredAt: Date | null;
    createdAt: Date;
  }
) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit('new_message', {
    ...message,
    conversationId,
  });

  logger.info({
    event: 'conversation_message_emitted',
    conversationId,
    messageId: message.id,
  });
}

/**
 * Conversation - Emit conversation list update to a user
 */
export function emitConversationListUpdate(
  userId: string,
  userType: 'CLINICIAN' | 'PATIENT',
  update: {
    conversationId: string;
    lastMessageAt: Date;
    lastMessageText: string;
    hasNewMessage?: boolean;
    unreadCount?: number;
  }
) {
  if (!io) return;

  const userRoom = userType === 'CLINICIAN' ? `user:${userId}` : `patient:${userId}`;
  io.to(userRoom).emit('conversation_update', update);

  logger.info({
    event: 'conversation_list_update_emitted',
    userId,
    userType,
    conversationId: update.conversationId,
  });
}

/**
 * Conversation - Emit presence update to conversation
 */
export function emitConversationPresence(
  conversationId: string,
  presence: {
    userId: string;
    userType: 'CLINICIAN' | 'PATIENT';
    isOnline: boolean;
    lastSeenAt: Date;
  }
) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit('presence_update', {
    conversationId,
    ...presence,
  });

  logger.info({
    event: 'conversation_presence_emitted',
    conversationId,
    userId: presence.userId,
    isOnline: presence.isOnline,
  });
}

// ============================================================================
// Clinical Data Events (Agent-Native UI Integration)
// ============================================================================

/**
 * Clinical - Emit patient event (created/updated/deleted)
 */
export function emitPatientEvent(data: {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientName?: string;
  mrn?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = `clinical:patient:${data.action}`;
  const payload = { ...data, timestamp: new Date() };

  // Emit to clinic room so all users in clinic see updates
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  // Emit to patient room for patient-specific subscribers
  io.to(`patient:${data.id}`).emit(event, payload);

  logger.info({
    event: 'clinical_patient_event_emitted',
    action: data.action,
    patientId: data.id,
    clinicId: data.clinicId,
  });
}

/**
 * Clinical - Emit clinical note event
 */
export function emitClinicalNoteEvent(data: {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  noteType?: string;
  encounterId?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = `clinical:note:${data.action}`;
  const payload = { ...data, timestamp: new Date() };

  // Emit to patient room
  io.to(`patient:${data.patientId}`).emit(event, payload);

  // Emit to encounter room if active encounter
  if (data.encounterId) {
    io.to(`encounter:${data.encounterId}`).emit(event, payload);
  }

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'clinical_note_event_emitted',
    action: data.action,
    noteId: data.id,
    patientId: data.patientId,
  });
}

/**
 * Clinical - Emit medication event
 */
export function emitMedicationEvent(data: {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  medicationName: string;
  dose?: string;
  frequency?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = `clinical:medication:${data.action}`;
  const payload = { ...data, timestamp: new Date() };

  // Emit to patient room
  io.to(`patient:${data.patientId}`).emit(event, payload);

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'clinical_medication_event_emitted',
    action: data.action,
    medicationId: data.id,
    patientId: data.patientId,
    medicationName: data.medicationName,
  });
}

/**
 * Clinical - Emit allergy event
 */
export function emitAllergyEvent(data: {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  allergen: string;
  severity?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = `clinical:allergy:${data.action}`;
  const payload = { ...data, timestamp: new Date() };

  // Emit to patient room
  io.to(`patient:${data.patientId}`).emit(event, payload);

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'clinical_allergy_event_emitted',
    action: data.action,
    allergyId: data.id,
    patientId: data.patientId,
    allergen: data.allergen,
  });
}

/**
 * Clinical - Emit diagnosis event
 */
export function emitDiagnosisEvent(data: {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  icd10Code?: string;
  description?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = `clinical:diagnosis:${data.action}`;
  const payload = { ...data, timestamp: new Date() };

  // Emit to patient room
  io.to(`patient:${data.patientId}`).emit(event, payload);

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'clinical_diagnosis_event_emitted',
    action: data.action,
    diagnosisId: data.id,
    patientId: data.patientId,
    icd10Code: data.icd10Code,
  });
}

/**
 * Clinical - Emit lab result event
 */
export function emitLabResultEvent(data: {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  testName: string;
  value?: string;
  unit?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = `clinical:lab:${data.action}`;
  const payload = { ...data, timestamp: new Date() };

  // Emit to patient room
  io.to(`patient:${data.patientId}`).emit(event, payload);

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'clinical_lab_event_emitted',
    action: data.action,
    labResultId: data.id,
    patientId: data.patientId,
    testName: data.testName,
  });
}

/**
 * Clinical - Emit traffic light evaluation event
 */
export function emitTrafficLightEvent(data: {
  evaluationId: string;
  patientId: string;
  action: string;
  color: 'RED' | 'YELLOW' | 'GREEN';
  signalCount: number;
  overridden?: boolean;
  clinicId?: string;
  userId: string;
}) {
  if (!io) return;

  const event = data.overridden ? 'clinical:traffic_light:override' : 'clinical:traffic_light:evaluated';
  const payload = { ...data, timestamp: new Date() };

  // Emit to patient room
  io.to(`patient:${data.patientId}`).emit(event, payload);

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'clinical_traffic_light_event_emitted',
    evaluationId: data.evaluationId,
    patientId: data.patientId,
    color: data.color,
    overridden: data.overridden,
  });
}

/**
 * Clinical - Emit primitive execution event
 */
export function emitPrimitiveEvent(data: {
  primitiveId: string;
  primitiveName: string;
  patientId?: string;
  result: 'success' | 'failure';
  latencyMs: number;
  clinicId?: string;
  userId: string;
}) {
  if (!io) return;

  const event = 'clinical:primitive:executed';
  const payload = { ...data, timestamp: new Date() };

  // Emit to patient room if patient-specific
  if (data.patientId) {
    io.to(`patient:${data.patientId}`).emit(event, payload);
  }

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'clinical_primitive_event_emitted',
    primitiveId: data.primitiveId,
    primitiveName: data.primitiveName,
    result: data.result,
    latencyMs: data.latencyMs,
  });
}

/**
 * Clinical - Emit appointment event
 */
export function emitAppointmentEvent(data: {
  id: string;
  action: 'created' | 'updated' | 'cancelled' | 'completed';
  patientId: string;
  patientName?: string;
  clinicianId: string;
  clinicianName?: string;
  appointmentType?: string;
  startTime?: Date;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = `clinical:appointment:${data.action}`;
  const payload = { ...data, timestamp: new Date() };

  // Emit to patient room
  io.to(`patient:${data.patientId}`).emit(event, payload);

  // Emit to clinician's user room
  io.to(`user:${data.clinicianId}`).emit(event, payload);

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'clinical_appointment_event_emitted',
    action: data.action,
    appointmentId: data.id,
    patientId: data.patientId,
    clinicianId: data.clinicianId,
  });
}

// ============================================================================
// Governance Events (Safety-Critical Real-Time)
// ============================================================================

/**
 * Governance - Emit governance log created event
 * Safety-critical: Broadcasts immediately when governance rules fire
 */
export function emitGovernanceLogEvent(data: {
  id: string;
  sessionId: string;
  eventType: 'BLOCKED' | 'FLAGGED' | 'PASSED' | 'OVERRIDE' | 'SHADOW_BLOCK';
  ruleId?: string;
  ruleName?: string;
  severity: 'INFO' | 'SOFT_NUDGE' | 'HARD_BLOCK';
  description?: string;
  provider?: string;
  clinicId?: string;
  userId?: string;
  userName?: string;
}) {
  if (!io) return;

  const event = 'governance:log:created';
  const payload = { ...data, timestamp: new Date() };

  // Emit to clinic room for all users monitoring governance
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  // Also emit to user who triggered the event
  if (data.userId) {
    io.to(`user:${data.userId}`).emit(event, payload);
  }

  // Emit to global governance monitoring room
  io.to('governance:monitor').emit(event, payload);

  logger.info({
    event: 'governance_log_event_emitted',
    eventType: data.eventType,
    ruleId: data.ruleId,
    severity: data.severity,
    sessionId: data.sessionId,
  });
}

/**
 * Governance - Emit override event
 * Broadcasts when a clinician overrides a governance rule
 */
export function emitGovernanceOverrideEvent(data: {
  sessionId: string;
  ruleId?: string;
  reason: string;
  userId?: string;
  userName?: string;
  clinicId?: string;
}) {
  if (!io) return;

  const event = 'governance:override';
  const payload = { ...data, timestamp: new Date() };

  // Emit to clinic room
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  // Emit to global governance monitoring room
  io.to('governance:monitor').emit(event, payload);

  logger.info({
    event: 'governance_override_event_emitted',
    ruleId: data.ruleId,
    sessionId: data.sessionId,
    reason: data.reason,
  });
}

/**
 * Governance - Emit blocked event
 * Broadcasts when content is blocked by governance rules
 */
export function emitGovernanceBlockedEvent(data: {
  sessionId: string;
  ruleId?: string;
  ruleName?: string;
  severity: 'SOFT_NUDGE' | 'HARD_BLOCK';
  description?: string;
  clinicId?: string;
  userId?: string;
}) {
  if (!io) return;

  const event = 'governance:blocked';
  const payload = { ...data, timestamp: new Date() };

  // Emit to user who triggered the block
  if (data.userId) {
    io.to(`user:${data.userId}`).emit(event, payload);
  }

  // Emit to clinic room for monitoring
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  // Emit to global governance monitoring room
  io.to('governance:monitor').emit(event, payload);

  logger.info({
    event: 'governance_blocked_event_emitted',
    ruleId: data.ruleId,
    severity: data.severity,
    sessionId: data.sessionId,
  });
}

// ============================================================================
// Task Events (Provider Task Management)
// ============================================================================

/**
 * Task - Emit task created event
 */
export function emitTaskCreatedEvent(data: {
  id: string;
  title: string;
  category: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
  assignedTo: string;
  assigneeName?: string;
  dueDate?: Date;
  relatedType?: string;
  relatedId?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = 'task:created';
  const payload = { ...data, action: 'created' as const, timestamp: new Date() };

  // Emit to assignee's user room
  io.to(`user:${data.assignedTo}`).emit(event, payload);

  // Emit to clinic room if available
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'task_created_event_emitted',
    taskId: data.id,
    assignedTo: data.assignedTo,
    priority: data.priority,
  });
}

/**
 * Task - Emit task updated event
 */
export function emitTaskUpdatedEvent(data: {
  id: string;
  title: string;
  category: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
  assignedTo: string;
  assigneeName?: string;
  dueDate?: Date;
  relatedType?: string;
  relatedId?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = 'task:updated';
  const payload = { ...data, action: 'updated' as const, timestamp: new Date() };

  // Emit to assignee's user room
  io.to(`user:${data.assignedTo}`).emit(event, payload);

  // Emit to clinic room if available
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'task_updated_event_emitted',
    taskId: data.id,
    assignedTo: data.assignedTo,
    status: data.status,
  });
}

/**
 * Task - Emit task completed event
 */
export function emitTaskCompletedEvent(data: {
  id: string;
  title: string;
  category: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  assignedTo: string;
  assigneeName?: string;
  completedAt: Date;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = 'task:completed';
  const payload = {
    ...data,
    action: 'completed' as const,
    status: 'COMPLETED' as const,
    timestamp: new Date(),
  };

  // Emit to assignee's user room
  io.to(`user:${data.assignedTo}`).emit(event, payload);

  // Emit to clinic room if available
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'task_completed_event_emitted',
    taskId: data.id,
    assignedTo: data.assignedTo,
    completedAt: data.completedAt,
  });
}

/**
 * Task - Emit task dismissed event
 */
export function emitTaskDismissedEvent(data: {
  id: string;
  title: string;
  category: string;
  assignedTo: string;
  dismissedAt: Date;
  clinicId?: string;
  userId: string;
  userName?: string;
}) {
  if (!io) return;

  const event = 'task:dismissed';
  const payload = {
    ...data,
    action: 'dismissed' as const,
    status: 'DISMISSED' as const,
    timestamp: new Date(),
  };

  // Emit to assignee's user room
  io.to(`user:${data.assignedTo}`).emit(event, payload);

  // Emit to clinic room if available
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'task_dismissed_event_emitted',
    taskId: data.id,
    assignedTo: data.assignedTo,
  });
}

/**
 * Task - Emit task deleted event
 */
export function emitTaskDeletedEvent(data: {
  id: string;
  title?: string;
  assignedTo: string;
  clinicId?: string;
  userId: string;
}) {
  if (!io) return;

  const event = 'task:deleted';
  const payload = { ...data, action: 'deleted' as const, timestamp: new Date() };

  // Emit to assignee's user room
  io.to(`user:${data.assignedTo}`).emit(event, payload);

  // Emit to clinic room if available
  if (data.clinicId) {
    io.to(`clinic:${data.clinicId}`).emit(event, payload);
  }

  logger.info({
    event: 'task_deleted_event_emitted',
    taskId: data.id,
    assignedTo: data.assignedTo,
  });
}
