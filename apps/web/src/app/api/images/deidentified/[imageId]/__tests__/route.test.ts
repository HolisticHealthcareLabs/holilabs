import { NextRequest } from 'next/server';
import fs from 'fs/promises';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: opts?.userMessage ?? 'Internal server error' }, { status: 500 });
  }),
}));

const { GET, DELETE } = require('../route');

const ctx = {
  user: { id: 'u1', role: 'CLINICIAN' },
  params: { imageId: 'img-123' },
};

describe('GET /api/images/deidentified/[imageId]', () => {
  it('returns 400 for path-traversal imageId', async () => {
    const req = new NextRequest('http://localhost:3000/api/images/deidentified/../etc/passwd');
    const res = await GET(req, { ...ctx, params: { imageId: '../etc/passwd' } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid image ID');
  });

  it('returns 404 when image file is not found', async () => {
    jest.spyOn(fs, 'access').mockRejectedValue(new Error('ENOENT'));

    const req = new NextRequest('http://localhost:3000/api/images/deidentified/missing');
    const res = await GET(req, { ...ctx, params: { imageId: 'missing' } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain('Image not found');
  });

  it('returns image buffer with correct headers when found', async () => {
    const fakeBuffer = Buffer.from('fake-png-data');
    jest.spyOn(fs, 'access').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readFile').mockResolvedValue(fakeBuffer as any);

    const req = new NextRequest('http://localhost:3000/api/images/deidentified/img-123');
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Image-Type')).toBe('deidentified');
    expect(res.headers.get('Content-Length')).toBe(String(fakeBuffer.length));
  });
});

describe('DELETE /api/images/deidentified/[imageId]', () => {
  it('returns 400 for invalid imageId with slashes', async () => {
    const req = new NextRequest('http://localhost:3000/api/images/deidentified/a/b', { method: 'DELETE' });
    const res = await DELETE(req, { ...ctx, params: { imageId: 'a/b' } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid image ID');
  });

  it('deletes image and returns success', async () => {
    jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/images/deidentified/img-123', { method: 'DELETE' });
    const res = await DELETE(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('deleted');
  });

  it('returns 404 when no image file found to delete', async () => {
    jest.spyOn(fs, 'unlink').mockRejectedValue(new Error('ENOENT'));

    const req = new NextRequest('http://localhost:3000/api/images/deidentified/missing', { method: 'DELETE' });
    const res = await DELETE(req, { ...ctx, params: { imageId: 'missing' } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Image not found');
  });
});
