export type RecordedAudio = {
  blob: Blob;
  mimeType: string;
  size: number;
};

export type TraditionalRecorderHandle = {
  /** Underlying MediaRecorder instance (for pause/resume if needed). */
  recorder: MediaRecorder;
  /** Stop recording and resolve the final Blob. */
  stop: () => Promise<RecordedAudio>;
};

function pickMimeType(preferred: string[]): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const t of preferred) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // ignore
    }
  }
  return undefined;
}

/**
 * Start a browser MediaRecorder and collect chunks.
 *
 * Design goals:
 * - Single-responsibility: this module only records and returns a Blob.
 * - Deterministic stop(): resolves exactly once, even if stop is called repeatedly.
 * - Safe defaults: prefers Opus/WebM, falls back to browser default if unsupported.
 */
export function startTraditionalRecorder(params: {
  stream: MediaStream;
  /** Milliseconds between `dataavailable` events. Default: 1000. */
  timesliceMs?: number;
  /** Preferred MIME types in order. */
  preferredMimeTypes?: string[];
}): TraditionalRecorderHandle {
  const {
    stream,
    timesliceMs = 1000,
    preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'],
  } = params;

  const mimeType = pickMimeType(preferredMimeTypes);
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

  const chunks: BlobPart[] = [];
  let resolved = false;
  let stoppedPromise: Promise<RecordedAudio> | null = null;

  recorder.ondataavailable = (event) => {
    try {
      if (event?.data && event.data.size > 0) chunks.push(event.data);
    } catch {
      // ignore
    }
  };

  const stop = () => {
    if (stoppedPromise) return stoppedPromise;

    stoppedPromise = new Promise<RecordedAudio>((resolve, reject) => {
      const onStop = () => {
        if (resolved) return;
        resolved = true;
        const outType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: outType });
        resolve({ blob, mimeType: outType, size: blob.size });
      };
      const onError = (e: any) => {
        if (resolved) return;
        resolved = true;
        reject(new Error(e?.error?.message || e?.message || 'MediaRecorder error'));
      };

      recorder.addEventListener('stop', onStop, { once: true });
      recorder.addEventListener('error', onError, { once: true } as any);

      try {
        if (recorder.state !== 'inactive') recorder.stop();
        else onStop();
      } catch (e: any) {
        onError(e);
      }
    });

    return stoppedPromise;
  };

  recorder.start(timesliceMs);
  return { recorder, stop };
}

