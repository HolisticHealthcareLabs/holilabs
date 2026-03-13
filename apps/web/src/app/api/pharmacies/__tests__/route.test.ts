import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pharmacy: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@clinic.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const validPharmacyBody = {
  name: 'Farmacia Central',
  chain: 'GUADALAJARA',
  address: 'Av. Principal 123',
  city: 'Monterrey',
  state: 'Nuevo León',
  postalCode: '64000',
};

describe('POST /api/pharmacies', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a pharmacy with valid data', async () => {
    const created = { id: 'pharm-1', ...validPharmacyBody, isActive: true };
    (prisma.pharmacy.create as jest.Mock).mockResolvedValue(created);

    const req = new NextRequest('http://localhost:3000/api/pharmacies', {
      method: 'POST',
      body: JSON.stringify(validPharmacyBody),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Farmacia Central');
  });

  it('throws ZodError when required fields are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/pharmacies', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }), // missing required fields
    });

    await expect(POST(req, mockContext)).rejects.toThrow();
  });

  it('throws ZodError when chain is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/pharmacies', {
      method: 'POST',
      body: JSON.stringify({ ...validPharmacyBody, chain: 'INVALID_CHAIN' }),
    });

    await expect(POST(req, mockContext)).rejects.toThrow();
  });
});

describe('GET /api/pharmacies', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns active pharmacies', async () => {
    (prisma.pharmacy.findMany as jest.Mock).mockResolvedValue([
      { id: 'pharm-1', name: 'Farmacia Central', chain: 'GUADALAJARA' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/pharmacies');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(prisma.pharmacy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) })
    );
  });

  it('filters by city when provided', async () => {
    (prisma.pharmacy.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/pharmacies?city=Monterrey');
    await GET(req, mockContext);

    expect(prisma.pharmacy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ city: 'Monterrey' }) })
    );
  });

  it('filters by delivery when hasDelivery=true', async () => {
    (prisma.pharmacy.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/pharmacies?hasDelivery=true');
    await GET(req, mockContext);

    expect(prisma.pharmacy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ hasDelivery: true }) })
    );
  });
});
