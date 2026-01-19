# Scribe (Client) — Architecture & Contracts

This folder contains **client-side** utilities that orchestrate the Scribe flows in the clinician UI.

## Supported flows (source of truth)

### 1) Traditional (record → upload → finalize)
- **UI** records audio locally in the browser (MediaRecorder).
- Audio is uploaded to:
  - `POST /api/scribe/sessions/:id/audio`
- Then the session is finalized:
  - `POST /api/scribe/sessions/:id/finalize`

Client entrypoints:
- `startTraditionalRecorder()` in `traditional-recorder.ts`
- `completeTraditionalScribeSession()` in `scribe-api.ts`

Why this exists:
- Works without realtime streaming.
- Produces a persisted transcription + (optional) persisted SOAP note.
- Keeps PHI handling server-side (encryption at rest, de-id gate before LLM).

### 2) Realtime (server-mediated only)
Realtime is **allowed only** when the browser streams to our server (Socket.IO), and the server streams to the transcription vendor.

Hard requirements:
- Browser **must not** connect directly to vendor WebSockets.
- De-identification **must** occur server-side before emitting transcript text to UI or persisting to DB.

Implementation lives outside this folder (Socket.IO server + `ScribeService`).

## Security rules (non-negotiable)

### Never expose vendor API keys to browsers
Long-lived vendor API keys must never be returned to the client in production.

- The deprecated route `GET /api/scribe/deepgram-token` is **disabled by default** and should remain that way.
- Prefer server-mediated streaming and server-side transcription calls.

### De-identification gate
All transcript text that reaches UI/DB must pass through the transcript gate:
- `deidentifyTranscriptOrThrow(...)`

This is enforced by tests in `src/lib/deid/__tests__/hard-gate-usage.test.ts`.

## Best-practice patterns
- Keep **session lifecycle** concerns in `scribe-api.ts` (HTTP contracts).
- Keep **recording** concerns in `traditional-recorder.ts` (MediaRecorder).
- Keep UI pages thin; reuse these modules to avoid “3 versions of truth”.

