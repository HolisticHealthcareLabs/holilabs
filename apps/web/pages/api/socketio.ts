import type { NextApiRequest, NextApiResponse } from 'next';
import { initSocketServer } from '../../src/lib/socket-server';

/**
 * Socket.IO bootstrap endpoint.
 *
 * Why this exists:
 * - Next.js (pages/api) runs on a single Node HTTP server in dev/self-host.
 * - We attach Socket.IO to that HTTP server exactly once and let it handle
 *   `/api/socket.io/*` thereafter.
 * - The client should `fetch('/api/socketio')` once before calling `io(...)`.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyRes = res as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyServer = anyRes?.socket?.server as any;

  if (!anyServer) {
    res.status(500).json({ ok: false, error: 'No HTTP server found for Socket.IO' });
    return;
  }

  if (!anyServer.__holiSocketIO) {
    if (typeof initSocketServer !== 'function') {
      res.status(500).json({ ok: false, error: 'Socket.IO bootstrap import failed' });
      return;
    }
    anyServer.__holiSocketIO = initSocketServer(anyServer);
  }

  res.status(200).json({ ok: true });
}


