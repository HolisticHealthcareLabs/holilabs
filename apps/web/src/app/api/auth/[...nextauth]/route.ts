/**
 * NextAuth API Route Handler
 *
 * Handles all NextAuth.js authentication routes
 * Route: /api/auth/*
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
