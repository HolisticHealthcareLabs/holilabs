import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type SidecarDownloadInfo = {
  release?: {
    tag: string;
    name: string;
    publishedAt: string;
  };
  assets: {
    macArm64Dmg?: string;
    macX64Dmg?: string;
    macArm64Zip?: string;
    macX64Zip?: string;
    winMsi?: string;
    winExe?: string;
  };
};

function pick(assets: any[], pred: (name: string) => boolean) {
  const a = assets.find((x) => typeof x?.name === 'string' && pred(x.name));
  return typeof a?.browser_download_url === 'string' ? a.browser_download_url : undefined;
}

export async function GET() {
  // Public repo access (no auth). If you want higher rate limits, set GITHUB_TOKEN server-side.
  const owner = process.env.SIDECAR_RELEASE_OWNER || 'holilabs';
  const repo = process.env.SIDECAR_RELEASE_REPO || 'holilabsv2';
  const token = process.env.GITHUB_TOKEN; // optional

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=20`, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch releases' },
        { status: 502 }
      );
    }

    const releases = (await res.json()) as any[];
    const rel = releases.find(
      (r) =>
        r &&
        r.draft === false &&
        r.prerelease === false &&
        typeof r.tag_name === 'string' &&
        r.tag_name.startsWith('sidecar-v')
    );

    if (!rel) {
      const empty: SidecarDownloadInfo = { assets: {} };
      return NextResponse.json(empty, { status: 200 });
    }

    const assets = Array.isArray(rel.assets) ? rel.assets : [];

    const info: SidecarDownloadInfo = {
      release: {
        tag: rel.tag_name,
        name: rel.name || rel.tag_name,
        publishedAt: rel.published_at,
      },
      assets: {
        macArm64Dmg: pick(assets, (n) => n.endsWith('.dmg') && /arm64/i.test(n)),
        macX64Dmg: pick(assets, (n) => n.endsWith('.dmg') && /(x64|intel|amd64)/i.test(n)),
        macArm64Zip: pick(assets, (n) => n.endsWith('.zip') && /arm64/i.test(n)),
        macX64Zip: pick(assets, (n) => n.endsWith('.zip') && /(x64|intel|amd64)/i.test(n)),
        winMsi: pick(assets, (n) => n.endsWith('.msi')),
        winExe: pick(assets, (n) => n.endsWith('.exe')),
      },
    };

    return NextResponse.json(info, { status: 200 });
  } catch {
    return NextResponse.json({ assets: {} satisfies SidecarDownloadInfo['assets'] }, { status: 200 });
  }
}

