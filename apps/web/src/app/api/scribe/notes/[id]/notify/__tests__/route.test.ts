import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sOAPNote: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/notifications/whatsapp', () => ({
  notifyPatientSOAPReady: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any) =>
    require('next/server').NextResponse.json({ error: 'Internal error' }, { status: 500 })
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { notifyPatientSOAPReady } = require('@/lib/notifications/whatsapp');

const USER_ID = 'doc-1';
const mockContext = {
  user: { id: USER_ID },
  params: { id: 'note-1' },
};

const mockNote = {
  id: 'note-1',
  clinicianId: USER_ID,
  patient: { firstName: 'Jane', lastName: 'Doe', phone: '+55119988776655', country: 'BR' },
  clinician: { firstName: 'Dr.', lastName: 'Smith' },
};

describe('POST /api/scribe/notes/[id]/notify', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends WhatsApp notification to patient', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(mockNote);
    (notifyPatientSOAPReady as jest.Mock).mockResolvedValue({ messageSid: 'SM123' });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1/notify', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.messageSid).toBe('SM123');
    expect(data.data.language).toBe('pt'); // Brazil -> Portuguese
  });

  it('returns 404 when note not found or access denied', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/missing/notify', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('SOAP note not found or access denied');
  });

  it('returns 400 when patient has no phone number', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue({
      ...mockNote,
      patient: { ...mockNote.patient, phone: null },
    });

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1/notify', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('phone number');
  });

  it('uses Spanish for non-Brazil patients', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue({
      ...mockNote,
      patient: { ...mockNote.patient, country: 'MX' },
    });
    (notifyPatientSOAPReady as jest.Mock).mockResolvedValue({ messageSid: 'SM456' });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1/notify', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.language).toBe('es');
  });
});
