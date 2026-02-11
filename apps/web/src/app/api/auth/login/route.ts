import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * POST /api/auth/login
 *
 * Streamlined same-origin login endpoint for the web app.
 * Proxies to the standalone API service if `API_BASE_URL` is configured.
 *
 * This removes hardcoded `localhost:3001` usage in the browser.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const baseUrl = env.API_BASE_URL || 'http://localhost:3001';
  const target = `${baseUrl.replace(/\/$/, '')}/auth/login`;

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
      // Do not forward cookies/headers; backend returns a token in JSON.
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Login backend unreachable' },
      { status: 502 }
    );
  }
}

