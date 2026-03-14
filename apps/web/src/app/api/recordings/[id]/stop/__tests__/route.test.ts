import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scribeSession: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const USER_ID = 'doc-1';
const mockContext = {
  user: { id: USER_ID, email: 'doc@test.com' },
  params: { id: 'recording-1' },
};

const mockRecording = {
  id: 'recording-1',
  status: 'RECORDING',
  startedAt: new Date(Date.now() - 300000), // 5 minutes ago
  appointment: { clinician: { id: USER_ID } },
};

const mockUpdatedRecording = {
  id: 'recording-1',
  status: 'PROCESSING',
  endedAt: new Date(),
  audioDuration: 300,
  appointment: { title: 'Consultation' },
  patient: { firstName: 'Jane', lastName: 'Doe' },
};

describe('POST /api/recordings/[id]/stop', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stops an active recording session', async () => {
    (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue(mockRecording);
    (prisma.scribeSession.update as jest.Mock).mockResolvedValue(mockUpdatedRecording);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/recordings/recording-1/stop', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Grabación detenida');
    expect(data.data.status).toBe('PROCESSING');
  });

  it('returns 404 when recording not found', async () => {
    (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/recordings/missing/stop', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Grabación no encontrada');
  });

  it('returns 403 when user is not the recording owner', async () => {
    (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue({
      ...mockRecording,
      appointment: { clinician: { id: 'other-doc' } },
    });

    const req = new NextRequest('http://localhost:3000/api/recordings/recording-1/stop', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('permiso');
  });

  it('returns 400 when recording is not in RECORDING status', async () => {
    (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue({
      ...mockRecording,
      status: 'COMPLETED',
    });

    const req = new NextRequest('http://localhost:3000/api/recordings/recording-1/stop', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('detenida');
  });
});
