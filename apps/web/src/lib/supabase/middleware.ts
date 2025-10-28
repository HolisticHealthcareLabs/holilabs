// Stub file - Supabase removed, replaced with demo mode
// This middleware stub prevents build/runtime errors

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Supabase session management removed - using demo mode
  // Simply return the response without session updates
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export function createClient() {
  throw new Error('Supabase has been removed. Using demo mode authentication.');
}
