import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockDoctors = [
  {
    id: 'doc-1',
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@clinic.com',
    specialty: 'Cardiology',
    licenseNumber: 'CRM-123',
    npi: null,
    credentials: [
      { id: 'c1', credentialType: 'MEDICAL_LICENSE', verificationStatus: 'VERIFIED', verifiedAt: new Date() },
    ],
  },
  {
    id: 'doc-2',
    firstName: 'Pedro',
    lastName: 'Torres',
    email: 'pedro@clinic.com',
    specialty: 'Neurology',
    licenseNumber: 'CRM-456',
    npi: null,
    credentials: [],
  },
];

const ctx = {
  user: { id: 'u1', role: 'ADMIN' },
};

describe('GET /api/doctors/search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated doctor list', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue(mockDoctors);
    (prisma.user.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost:3000/api/doctors/search');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.doctors).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
  });

  it('filters by query parameter', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockDoctors[0]]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost:3000/api/doctors/search?q=Maria');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(json.doctors).toHaveLength(1);
    expect(json.doctors[0].firstName).toBe('Maria');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ firstName: { contains: 'Maria', mode: 'insensitive' } }),
          ]),
        }),
      })
    );
  });

  it('computes verification stats for each doctor', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue(mockDoctors);
    (prisma.user.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost:3000/api/doctors/search');
    const res = await GET(req, ctx);
    const json = await res.json();

    const verified = json.doctors.find((d: any) => d.id === 'doc-1');
    expect(verified.isVerified).toBe(true);
    expect(verified.verifiedCredentials).toBe(1);
    expect(verified.verificationPercentage).toBe(100);

    const unverified = json.doctors.find((d: any) => d.id === 'doc-2');
    expect(unverified.isVerified).toBe(false);
    expect(unverified.verificationPercentage).toBe(0);
  });

  it('filters to only verified doctors when verified=true', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue(mockDoctors);
    (prisma.user.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost:3000/api/doctors/search?verified=true');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(json.doctors).toHaveLength(1);
    expect(json.doctors[0].id).toBe('doc-1');
  });
});
