import path from 'node:path';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

export const runtime = 'nodejs';

/**
 * Email-safe logo renderer.
 *
 * Many email clients (including Gmail) do not reliably render SVGs in <img>.
 * This route converts our SVG logo into a PNG so it displays everywhere.
 *
 * Used by React Email templates (e.g., `InviteEmail`).
 */
export async function GET() {
  const svgPath = path.join(process.cwd(), 'public', 'logos', 'holilabs-helix-blue-dark.svg');

  const svg = await readFile(svgPath);

  const png = await sharp(svg, { density: 300 })
    .resize(128, 128, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  // Wrap Buffer in a Blob for web Response typing compatibility.
  // (Convert Buffer -> Uint8Array to satisfy TS BlobPart typing.)
  const body = new Blob([new Uint8Array(png)], { type: 'image/png' });

  return new Response(body, {
    headers: {
      'Content-Type': 'image/png',
      // Cache aggressively; logo updates are rare. Bust cache by changing the URL path if needed.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

