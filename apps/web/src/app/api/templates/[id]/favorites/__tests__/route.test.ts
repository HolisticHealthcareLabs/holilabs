import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    clinicalTemplate: { findUnique: jest.fn() },
    templateFavorite: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST, DELETE } = require('../route');
const prisma = require('@/lib/prisma').default;

const USER_ID = 'user-1';
const mockContext = {
  user: { id: USER_ID },
  params: { id: 'tpl-1' },
};

const mockTemplate = { id: 'tpl-1', name: 'SOAP Template' };
const mockFavorite = {
  id: 'fav-1',
  userId: USER_ID,
  templateId: 'tpl-1',
  sortOrder: 1,
  createdAt: new Date(),
};

describe('POST /api/templates/[id]/favorites', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds template to favorites', async () => {
    (prisma.clinicalTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.templateFavorite.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.templateFavorite.aggregate as jest.Mock).mockResolvedValue({ _max: { sortOrder: 0 } });
    (prisma.templateFavorite.create as jest.Mock).mockResolvedValue(mockFavorite);

    const req = new NextRequest('http://localhost:3000/api/templates/tpl-1/favorites', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Template added to favorites');
  });

  it('returns 404 when template not found', async () => {
    (prisma.clinicalTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/templates/missing/favorites', {
      method: 'POST',
    });
    const res = await POST(req, { ...mockContext, params: { id: 'missing' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });

  it('returns 400 when template already in favorites', async () => {
    (prisma.clinicalTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.templateFavorite.findUnique as jest.Mock).mockResolvedValue(mockFavorite);

    const req = new NextRequest('http://localhost:3000/api/templates/tpl-1/favorites', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Template already in favorites');
  });

  it('returns 400 when templateId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/templates//favorites', {
      method: 'POST',
    });
    const res = await POST(req, { user: { id: USER_ID }, params: {} });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Template ID required');
  });
});

describe('DELETE /api/templates/[id]/favorites', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes template from favorites', async () => {
    (prisma.templateFavorite.findUnique as jest.Mock).mockResolvedValue(mockFavorite);
    (prisma.templateFavorite.delete as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/templates/tpl-1/favorites', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Template removed from favorites');
  });

  it('returns 404 when template not in favorites', async () => {
    (prisma.templateFavorite.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/templates/tpl-1/favorites', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Template not in favorites');
  });
});
