import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

const mockDelete = jest.fn();
jest.mock('next/headers', () => ({
  cookies: () => ({ delete: mockDelete }),
}));

jest.mock('@/lib/auth/patient-session', () => ({
  getPatientSession: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() },
}));

const { POST } = require('../route');
const { getPatientSession } = require('@/lib/auth/patient-session');
const { createAuditLog } = require('@/lib/audit');

describe('POST /api/auth/patient/logout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears session cookie and returns success', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue({ patientId: 'p1' });

    const req = new NextRequest('http://localhost:3000/api/auth/patient/logout', {
      method: 'POST',
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('patient-session');
  });

  it('creates audit log when session exists', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue({ patientId: 'p1' });

    const req = new NextRequest('http://localhost:3000/api/auth/patient/logout', {
      method: 'POST',
    });
    await POST(req);

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGOUT', resource: 'PatientAuth' })
    );
  });

  it('succeeds even without existing session', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/patient/logout', {
      method: 'POST',
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(createAuditLog).not.toHaveBeenCalled();
  });
});
