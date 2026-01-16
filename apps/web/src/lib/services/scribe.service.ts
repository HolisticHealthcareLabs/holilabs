/**
 * ScribeService (V3)
 * -----------------
 * Server-side service that owns realtime scribe streaming lifecycle:
 * - Validates clinician/session ownership
 * - Manages per-session Deepgram streamer
 * - Applies Presidio de-identification gate before emitting transcript to UI
 * - Persists de-identified transcript to Prisma so /finalize can succeed without audio upload
 * - Circuit-breaker to prevent toast spam / Deepgram thrash
 *
 * This is intentionally framework-agnostic: Socket.IO server delegates to this service.
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import { MedicalAudioStreamer, type MedicalSegment } from '@/lib/transcription/MedicalAudioStreamer';

export type ScribeLanguage = 'en' | 'es' | 'pt';

export type CoPilotEmit = (sessionId: string, event: string, payload: any) => void;

type LiveSession = {
  streamer: MedicalAudioStreamer;
  clinicianId: string;
  language: ScribeLanguage;
  inputSampleRate: number;
  requestId?: string;
  activeSockets: Set<string>;
  patientId: string;
};

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
  language: ScribeLanguage;
  model?: string;
  rawLines: string[];
  segments: PersistedTranscriptSegment[];
  speakerSet: Set<number>;
  maxEndSeconds: number;
  persistTimer: NodeJS.Timeout | null;
};

type StreamFailure = {
  untilMs: number;
  message: string;
};

function normalizeSpeechLanguage(input: unknown): ScribeLanguage {
  const raw = String(input || 'en').toLowerCase();
  if (raw.startsWith('pt')) return 'pt';
  if (raw.startsWith('es')) return 'es';
  return 'en';
}

function getEnvTag(): 'prod' | 'staging' | 'dev' {
  if (process.env.NODE_ENV === 'production') return 'prod';
  if (process.env.NODE_ENV === 'test') return 'dev';
  return 'dev';
}

async function buildPatientContext(patientId: string): Promise<string[]> {
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
    logger.warn({ event: 'patient_context_build_failed', patientId, error: e?.message || e });
    return [];
  }
}

function resamplePcm16(input: Int16Array, inputRate: number, outputRate: number): Int16Array {
  if (!input.length) return input;
  if (!Number.isFinite(inputRate) || inputRate <= 0) return input;
  if (inputRate === outputRate) return input;

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

export class ScribeService {
  private readonly sessions = new Map<string, LiveSession>();
  private readonly liveTranscript = new Map<string, LiveTranscriptState>();
  private readonly failures = new Map<string, StreamFailure>();

  constructor(private readonly emit: CoPilotEmit) {}

  onJoinSession(sessionId: string, socketId: string) {
    const s = this.sessions.get(sessionId);
    if (s) s.activeSockets.add(socketId);
  }

  async onLeaveSession(sessionId: string, socketId: string) {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    s.activeSockets.delete(socketId);
    if (s.activeSockets.size === 0) {
      await this.stopAndPersist(sessionId).catch(() => {});
    }
  }

  async onDisconnect(socketId: string) {
    for (const [sessionId, s] of this.sessions.entries()) {
      if (s.activeSockets.has(socketId)) {
        s.activeSockets.delete(socketId);
        if (s.activeSockets.size === 0) {
          await this.stopAndPersist(sessionId).catch(() => {});
        }
      }
    }
  }

  async stopStream(sessionId: string, clinicianId: string) {
    const s = this.sessions.get(sessionId);
    if (!s || s.clinicianId !== clinicianId) return;
    await this.stopAndPersist(sessionId);
  }

  private getOrInitTranscript(sessionId: string, language: ScribeLanguage): LiveTranscriptState {
    const existing = this.liveTranscript.get(sessionId);
    if (existing) return existing;
    const next: LiveTranscriptState = {
      language,
      model: undefined,
      rawLines: [],
      segments: [],
      speakerSet: new Set<number>(),
      maxEndSeconds: 0,
      persistTimer: null,
    };
    this.liveTranscript.set(sessionId, next);
    return next;
  }

  private schedulePersist(sessionId: string) {
    const st = this.liveTranscript.get(sessionId);
    if (!st || st.persistTimer) return;
    st.persistTimer = setTimeout(async () => {
      const cur = this.liveTranscript.get(sessionId);
      if (!cur) return;
      cur.persistTimer = null;
      await this.persistTranscript(sessionId).catch((e: any) => {
        logger.warn({ event: 'live_transcript_persist_failed', sessionId, error: e?.message || e });
      });
    }, 1500);
  }

  private async persistTranscript(sessionId: string) {
    const st = this.liveTranscript.get(sessionId);
    if (!st) return;

    const rawText = st.rawLines.join('\n').trim();
    const wordCount = rawText ? rawText.split(/\s+/).length : 0;
    const speakerCount = st.speakerSet.size || 1;
    const confidence =
      st.segments.length > 0
        ? st.segments.reduce((sum, seg) => sum + (Number.isFinite(seg.confidence) ? seg.confidence : 0.9), 0) /
          st.segments.length
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
  }

  private async stopAndPersist(sessionId: string) {
    const s = this.sessions.get(sessionId);
    if (s) {
      await s.streamer.stop().catch(() => {});
      this.sessions.delete(sessionId);
    }
    await this.persistTranscript(sessionId).catch(() => {});
    this.liveTranscript.delete(sessionId);
    this.failures.delete(sessionId);
  }

  private async emitSanitizedSegments(params: {
    sessionId: string;
    requestId?: string;
    segments: MedicalSegment[];
    isFinal: boolean;
  }): Promise<PersistedTranscriptSegment[]> {
    const { sessionId, requestId, segments, isFinal } = params;
    const out: PersistedTranscriptSegment[] = [];

    for (const seg of segments) {
      const presidioStart = Date.now();
      const safeText = await deidentifyTranscriptOrThrow(seg.text);
      const presidioMs = Date.now() - presidioStart;
      const startTime = Math.max(0, (seg.startTimeMs || 0) / 1000);
      const endTime = Math.max(0, (seg.endTimeMs || 0) / 1000);

      const persisted: PersistedTranscriptSegment = {
        speaker: seg.speaker,
        speakerIndex: seg.speakerIndex,
        role: seg.role,
        text: safeText,
        startTime,
        endTime,
        confidence: seg.confidence,
      };
      out.push(persisted);

      this.emit(sessionId, 'co_pilot:transcript_update', {
        ...persisted,
        isFinal,
        metrics: { presidioMs, requestId },
      });
    }

    return out;
  }

  async handleAudioChunk(input: {
    sessionId: string;
    socketId: string;
    clinicianId: string;
    userType: string;
    audioData: ArrayBuffer | Uint8Array;
    language?: unknown;
    sampleRate?: unknown;
    deepgramApiKey?: string;
  }) {
    const { sessionId, socketId, clinicianId, userType } = input;

    const failure = this.failures.get(sessionId);
    if (failure && Date.now() < failure.untilMs) return;

    if (userType !== 'CLINICIAN') {
      this.emit(sessionId, 'co_pilot:transcription_error', { message: 'Unauthorized: clinician required for scribe streaming' });
      return;
    }
    if (!input.deepgramApiKey) {
      this.emit(sessionId, 'co_pilot:transcription_error', { message: 'DEEPGRAM_API_KEY is not configured' });
      return;
    }

    // Verify ownership
    const owns = await prisma.scribeSession.findFirst({
      where: { id: sessionId, clinicianId },
      select: { id: true, patientId: true },
    });
    if (!owns) {
      this.emit(sessionId, 'co_pilot:transcription_error', { message: 'Unauthorized: session not found or access denied' });
      return;
    }

    const lang = normalizeSpeechLanguage(input.language);
    const srIn = Number(input.sampleRate || 48000);

    // Ensure session exists
    let s = this.sessions.get(sessionId);
    if (!s || s.clinicianId !== clinicianId || s.language !== lang || s.inputSampleRate !== srIn) {
      try {
        await s?.streamer?.stop?.();
      } catch {}

      const contextTerms = await buildPatientContext(owns.patientId);

      const streamer = new MedicalAudioStreamer({
        apiKey: input.deepgramApiKey,
        language: lang,
        sampleRateHz: 16000,
        channels: 1,
        chunkMs: 100,
        keepAliveMs: 5000,
        endpointingMs: 300,
        utteranceEndMs: 1000,
        patientContext: contextTerms,
        tag: {
          clinic_id: process.env.CLINIC_ID || 'local',
          user_id: clinicianId,
          env: getEnvTag(),
        },
        logger,
      });

      streamer.on('open', ({ model }) => {
        const st = this.getOrInitTranscript(sessionId, lang);
        st.model = model;
      });

      streamer.on('metadata', ({ requestId }) => {
        const cur = this.sessions.get(sessionId);
        if (cur && requestId) cur.requestId = requestId;
        this.emit(sessionId, 'co_pilot:transcription_metadata', { requestId });
      });

      streamer.on('interim', async (segments: MedicalSegment[]) => {
        try {
          const cur = this.sessions.get(sessionId);
          await this.emitSanitizedSegments({ sessionId, requestId: cur?.requestId, segments, isFinal: false });
        } catch (e: any) {
          this.emit(sessionId, 'co_pilot:transcription_error', { message: e?.message || 'De-identification failed' });
        }
      });

      streamer.on('final', async (segments: MedicalSegment[]) => {
        try {
          const cur = this.sessions.get(sessionId);
          const safe = await this.emitSanitizedSegments({ sessionId, requestId: cur?.requestId, segments, isFinal: true });
          const st = this.getOrInitTranscript(sessionId, lang);
          for (const seg of safe) {
            st.segments.push(seg);
            st.speakerSet.add(seg.speakerIndex);
            st.maxEndSeconds = Math.max(st.maxEndSeconds, seg.endTime || 0);
            st.rawLines.push(`[${seg.role}] ${seg.text}`);
          }
          this.schedulePersist(sessionId);
        } catch (e: any) {
          this.emit(sessionId, 'co_pilot:transcription_error', { message: e?.message || 'De-identification failed' });
        }
      });

      streamer.on('error', ({ message }) => {
        this.emit(sessionId, 'co_pilot:transcription_error', { message });
      });

      try {
        await streamer.startStream();
      } catch (e: any) {
        const msg = e?.message || 'Failed to start Deepgram live stream';
        this.failures.set(sessionId, { untilMs: Date.now() + 6000, message: msg });
        this.emit(sessionId, 'co_pilot:transcription_error', { message: `${msg}. Run GET /api/health/deepgram-live to verify Live WS access.` });
        return;
      }

      s = {
        streamer,
        clinicianId,
        language: lang,
        inputSampleRate: srIn,
        requestId: undefined,
        activeSockets: new Set([socketId]),
        patientId: owns.patientId,
      };
      this.sessions.set(sessionId, s);
    } else {
      s.activeSockets.add(socketId);
    }

    const audioBytes = Buffer.isBuffer(input.audioData) ? (input.audioData as any) : Buffer.from(input.audioData as any);
    const sampleCount = Math.floor(audioBytes.byteLength / 2);
    const inSamples = new Int16Array(audioBytes.buffer, audioBytes.byteOffset, sampleCount);
    const normalized = resamplePcm16(inSamples, srIn, 16000);
    s.streamer.sendAudioChunk(Buffer.from(normalized.buffer));
  }
}

let singleton: ScribeService | null = null;
export function getScribeService(emit: CoPilotEmit): ScribeService {
  if (!singleton) singleton = new ScribeService(emit);
  return singleton;
}


