import { completeTraditionalScribeSession, createScribeSession } from '@/lib/scribe/client/scribe-api';

type MockJson = any;

function mockFetchResponse(params: { ok: boolean; json: MockJson }) {
  return {
    ok: params.ok,
    json: async () => params.json,
  } as any;
}

function queueFetchResponses(responses: Array<{ ok: boolean; json: MockJson }>) {
  const queue = [...responses];
  (global as any).fetch = jest.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error('No more mocked fetch responses in queue');
    return mockFetchResponse(next);
  });
}

describe('completeTraditionalScribeSession()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('uploads, finalizes, fetches session, then fetches soap note when note id exists', async () => {
    queueFetchResponses([
      // upload
      { ok: true, json: { success: true, data: { status: 'PROCESSING' } } },
      // finalize
      { ok: true, json: { success: true, data: { soapNote: { id: 'note_1' } } } },
      // fetch session
      { ok: true, json: { success: true, data: { id: 'sess_1', transcription: { rawText: 'hello', confidence: 0.9 } } } },
      // fetch note
      { ok: true, json: { success: true, data: { id: 'note_1', subjective: 'S' } } },
    ]);

    const audio = new Blob(['abc'], { type: 'audio/webm' });
    const res = await completeTraditionalScribeSession({
      sessionId: 'sess_1',
      audio,
      durationSeconds: 12.6,
      filename: 'recording.webm',
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.session.id).toBe('sess_1');
    expect(res.data.transcription?.rawText).toBe('hello');
    expect(res.data.soapNote?.id).toBe('note_1');
    expect(res.data.finalize?.soapNote?.id).toBe('note_1');

    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(4);

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/scribe/sessions/sess_1/audio');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);

    const fd = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    // Industry-grade guardrail: ensure the payload contract can't silently regress.
    expect(fd.get('duration')).toBe('13'); // rounded from 12.6
    const audioPart = fd.get('audio');
    expect(audioPart).toBeTruthy();

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/scribe/sessions/sess_1/finalize');
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST');

    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/scribe/sessions/sess_1');
    expect(fetchMock.mock.calls[3]?.[0]).toBe('/api/scribe/notes/note_1');
  });

  it('does not fetch soap note when finalize returns none', async () => {
    queueFetchResponses([
      { ok: true, json: { success: true, data: { status: 'PROCESSING' } } },
      { ok: true, json: { success: true, data: { soapNote: null } } },
      { ok: true, json: { success: true, data: { id: 'sess_2', transcription: null } } },
    ]);

    const audio = new Blob(['abc'], { type: 'audio/webm' });
    const res = await completeTraditionalScribeSession({
      sessionId: 'sess_2',
      audio,
      durationSeconds: 1,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.soapNote).toBeNull();

    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map((c: any[]) => c[0])).toEqual([
      '/api/scribe/sessions/sess_2/audio',
      '/api/scribe/sessions/sess_2/finalize',
      '/api/scribe/sessions/sess_2',
    ]);
  });

  it('stops early when upload fails', async () => {
    queueFetchResponses([
      { ok: false, json: { error: 'upload failed' } },
    ]);

    const audio = new Blob(['abc'], { type: 'audio/webm' });
    const res = await completeTraditionalScribeSession({
      sessionId: 'sess_3',
      audio,
      durationSeconds: 1,
    });

    expect(res.success).toBe(false);
    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops early when finalize fails', async () => {
    queueFetchResponses([
      { ok: true, json: { success: true, data: { status: 'PROCESSING' } } },
      { ok: false, json: { error: 'finalize failed' } },
    ]);

    const audio = new Blob(['abc'], { type: 'audio/webm' });
    const res = await completeTraditionalScribeSession({
      sessionId: 'sess_4',
      audio,
      durationSeconds: 1,
    });

    expect(res.success).toBe(false);
    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops early when session fetch fails', async () => {
    queueFetchResponses([
      { ok: true, json: { success: true, data: { status: 'PROCESSING' } } },
      { ok: true, json: { success: true, data: {} } },
      { ok: false, json: { error: 'session fetch failed' } },
    ]);

    const audio = new Blob(['abc'], { type: 'audio/webm' });
    const res = await completeTraditionalScribeSession({
      sessionId: 'sess_5',
      audio,
      durationSeconds: 1,
    });

    expect(res.success).toBe(false);
    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('createScribeSession()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('POSTs /api/scribe/sessions with HIPAA defaults', async () => {
    queueFetchResponses([
      { ok: true, json: { success: true, data: { id: 'sess_10' } } },
    ]);

    const res = await createScribeSession({ patientId: 'pt_1' });
    expect(res.success).toBe(true);

    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/scribe/sessions');

    const init = fetchMock.mock.calls[0]?.[1] || {};
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(String(init.body || '{}'));
    expect(body).toEqual({
      patientId: 'pt_1',
      accessReason: 'DIRECT_PATIENT_CARE',
      accessPurpose: 'AI_SCRIBE_RECORDING',
      appointmentId: undefined,
    });
  });

  it('allows overriding accessReason/accessPurpose and appointmentId', async () => {
    queueFetchResponses([
      { ok: true, json: { success: true, data: { id: 'sess_11' } } },
    ]);

    const res = await createScribeSession({
      patientId: 'pt_2',
      accessReason: 'EMERGENCY_ACCESS',
      accessPurpose: 'LIVE_SCRIBE',
      appointmentId: 'appt_1',
    });
    expect(res.success).toBe(true);

    const fetchMock = (global as any).fetch as jest.Mock;
    const init = fetchMock.mock.calls[0]?.[1] || {};
    const body = JSON.parse(String(init.body || '{}'));
    expect(body).toEqual({
      patientId: 'pt_2',
      accessReason: 'EMERGENCY_ACCESS',
      accessPurpose: 'LIVE_SCRIBE',
      appointmentId: 'appt_1',
    });
  });

  it('returns failure when the server returns non-OK', async () => {
    queueFetchResponses([
      { ok: false, json: { error: 'Access reason is required for HIPAA compliance' } },
    ]);

    const res = await createScribeSession({ patientId: 'pt_3', accessReason: '' as any });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe('Access reason is required for HIPAA compliance');
  });
});

