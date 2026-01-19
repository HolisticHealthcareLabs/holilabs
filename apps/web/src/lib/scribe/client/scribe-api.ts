export type ApiResult<T> = { success: true; data: T } | { success: false; error: string; message?: string };

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function uploadScribeSessionAudio(params: {
  sessionId: string;
  audio: Blob;
  durationSeconds: number;
  filename?: string;
}): Promise<ApiResult<{ sessionId: string; status: string }>> {
  const { sessionId, audio, durationSeconds, filename = 'recording.webm' } = params;
  const fd = new FormData();
  fd.append('audio', audio, filename);
  fd.append('duration', String(Math.max(0, Math.round(durationSeconds))));

  const res = await fetch(`/api/scribe/sessions/${sessionId}/audio`, {
    method: 'POST',
    body: fd,
  });
  const json = await safeJson(res);
  if (!res.ok) {
    return { success: false, error: json?.error || 'Failed to upload audio', message: json?.message };
  }
  return { success: true, data: { sessionId, status: json?.data?.status || 'PROCESSING' } };
}

export async function createScribeSession(params: {
  patientId: string;
  accessReason?: string;
  accessPurpose?: string;
  appointmentId?: string;
}): Promise<ApiResult<any>> {
  const { patientId, accessReason = 'DIRECT_PATIENT_CARE', accessPurpose = 'AI_SCRIBE_RECORDING', appointmentId } = params;

  const res = await fetch('/api/scribe/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId, accessReason, accessPurpose, appointmentId }),
  });
  const json = await safeJson(res);
  if (!res.ok) return { success: false, error: json?.error || 'Failed to create session', message: json?.message };
  return { success: true, data: json?.data };
}

export async function finalizeScribeSession(sessionId: string): Promise<ApiResult<any>> {
  const res = await fetch(`/api/scribe/sessions/${sessionId}/finalize`, { method: 'POST' });
  const json = await safeJson(res);
  if (!res.ok) return { success: false, error: json?.error || 'Failed to finalize session', message: json?.message };
  return { success: true, data: json?.data };
}

export async function fetchScribeSession(sessionId: string): Promise<ApiResult<any>> {
  const res = await fetch(`/api/scribe/sessions/${sessionId}`, { cache: 'no-store' });
  const json = await safeJson(res);
  if (!res.ok) return { success: false, error: json?.error || 'Failed to fetch session', message: json?.message };
  return { success: true, data: json?.data };
}

export async function fetchSoapNote(noteId: string): Promise<ApiResult<any>> {
  const res = await fetch(`/api/scribe/notes/${noteId}`, { cache: 'no-store' });
  const json = await safeJson(res);
  if (!res.ok) return { success: false, error: json?.error || 'Failed to fetch SOAP note', message: json?.message };
  return { success: true, data: json?.data };
}

/**
 * Traditional scribe pipeline (client):
 * 1) Upload audio
 * 2) Finalize session (transcribe + de-id + generate SOAP, depending on env)
 * 3) Fetch session + optional SOAP note
 */
export async function completeTraditionalScribeSession(params: {
  sessionId: string;
  audio: Blob;
  durationSeconds: number;
  filename?: string;
}): Promise<ApiResult<{ session: any; transcription: any | null; soapNote: any | null; finalize: any }>> {
  const { sessionId, audio, durationSeconds, filename } = params;

  const up = await uploadScribeSessionAudio({ sessionId, audio, durationSeconds, filename });
  if (!up.success) return up as any;

  const fin = await finalizeScribeSession(sessionId);
  if (!fin.success) return fin as any;

  const sess = await fetchScribeSession(sessionId);
  if (!sess.success) return sess as any;

  const noteId = fin.data?.soapNote?.id as string | undefined;
  let soapNote: any | null = null;
  if (noteId) {
    const noteRes = await fetchSoapNote(noteId);
    if (noteRes.success) soapNote = noteRes.data;
  }

  return {
    success: true,
    data: {
      session: sess.data,
      transcription: sess.data?.transcription ?? null,
      soapNote,
      finalize: fin.data,
    },
  };
}

export async function patchSoapNote(noteId: string, updates: any): Promise<ApiResult<any>> {
  const res = await fetch(`/api/scribe/notes/${noteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const json = await safeJson(res);
  if (!res.ok) return { success: false, error: json?.error || 'Failed to update SOAP note', message: json?.message };
  return { success: true, data: json?.data };
}

export async function signSoapNote(noteId: string): Promise<ApiResult<any>> {
  const res = await fetch(`/api/scribe/notes/${noteId}/sign`, { method: 'POST' });
  const json = await safeJson(res);
  if (!res.ok) return { success: false, error: json?.error || 'Failed to sign SOAP note', message: json?.message };
  return { success: true, data: json?.data };
}

export async function notifySoapNote(noteId: string): Promise<ApiResult<any>> {
  const res = await fetch(`/api/scribe/notes/${noteId}/notify`, { method: 'POST' });
  const json = await safeJson(res);
  if (!res.ok) return { success: false, error: json?.error || 'Failed to notify patient', message: json?.message };
  return { success: true, data: json?.data };
}

