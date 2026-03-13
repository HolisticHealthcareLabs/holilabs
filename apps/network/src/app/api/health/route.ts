import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok', version: '1.0.0', app: 'holi-network' });
}
