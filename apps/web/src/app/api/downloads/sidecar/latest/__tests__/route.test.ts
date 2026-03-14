import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

const { GET } = require('../route');

const mockRelease = {
  tag_name: 'sidecar-v1.2.3',
  name: 'Sidecar v1.2.3',
  published_at: '2026-03-01T00:00:00Z',
  draft: false,
  prerelease: false,
  assets: [
    { name: 'Sidecar-arm64.dmg', browser_download_url: 'https://github.com/releases/Sidecar-arm64.dmg' },
    { name: 'Sidecar-x64.dmg', browser_download_url: 'https://github.com/releases/Sidecar-x64.dmg' },
    { name: 'Sidecar-arm64.zip', browser_download_url: 'https://github.com/releases/Sidecar-arm64.zip' },
    { name: 'Sidecar-Setup.msi', browser_download_url: 'https://github.com/releases/Sidecar-Setup.msi' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SIDECAR_RELEASE_OWNER = 'holilabs';
  process.env.SIDECAR_RELEASE_REPO = 'holilabsv2';
});

describe('GET /api/downloads/sidecar/latest', () => {
  it('returns release info and asset URLs when a sidecar release exists', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([mockRelease]),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/downloads/sidecar/latest');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.release.tag).toBe('sidecar-v1.2.3');
    expect(json.assets.macArm64Dmg).toContain('arm64.dmg');
    expect(json.assets.winMsi).toContain('.msi');
  });

  it('returns empty assets when no sidecar release is found', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        { tag_name: 'app-v1.0.0', draft: false, prerelease: false, assets: [] },
      ]),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/downloads/sidecar/latest');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets).toEqual({});
    expect(json.release).toBeUndefined();
  });

  it('returns 502 when GitHub API request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'Not Found' }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/downloads/sidecar/latest');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBeDefined();
  });

  it('returns empty assets when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const req = new NextRequest('http://localhost:3000/api/downloads/sidecar/latest');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets).toBeDefined();
  });
});
