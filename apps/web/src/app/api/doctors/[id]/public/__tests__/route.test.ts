import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/doctors/doc-1/public');
}

describe('GET /api/doctors/[id]/public', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when doctor is not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: { id: 'doc-missing' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('returns doctor public profile with credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'doc-1',
      firstName: 'Ana',
      lastName: 'Garcia',
      email: 'ana@clinic.com',
      specialty: 'Cardiology',
      licenseNumber: 'CRM-12345',
      npi: null,
      credentials: [
        {
          id: 'cred-1',
          credentialType: 'CRM',
          credentialNumber: 'CRM-12345',
          issuingAuthority: 'CFM',
          issuingCountry: 'BR',
          issuedDate: new Date(),
          expirationDate: null,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          verificationSource: 'CFM_REGISTRY',
        },
      ],
      providerAvailability: [
        { id: 'avl-1', dayOfWeek: 1, startTime: '08:00', endTime: '17:00', isActive: true },
      ],
    });

    const res = await GET(makeRequest(), { params: { id: 'doc-1' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.doctor.name).toBe('Dr. Ana Garcia');
    expect(data.doctor.isVerified).toBe(true);
    expect(data.doctor.hasAvailability).toBe(true);
  });

  it('returns doctor without credentials as unverified', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'doc-2',
      firstName: 'Pedro',
      lastName: 'Santos',
      email: 'pedro@clinic.com',
      specialty: 'General Practice',
      licenseNumber: null,
      npi: null,
      credentials: [],
      providerAvailability: [],
    });

    const res = await GET(makeRequest(), { params: { id: 'doc-2' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.doctor.isVerified).toBe(false);
    expect(data.doctor.hasAvailability).toBe(false);
  });
});
