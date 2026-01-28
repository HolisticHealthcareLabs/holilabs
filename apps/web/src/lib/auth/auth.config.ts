/**
 * NextAuth v5 Configuration
 *
 * Clinician portal authentication (doctors, nurses, staff).
 *
 * Patient portal uses separate auth endpoints under `/api/portal/auth/*`
 * and a separate cookie/JWT session (`patient-session`).
 */

import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Login schema
const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const authConfig: NextAuthConfig = {
  // adapter: PrismaAdapter(prisma) as any, // Disabled for JWT-only strategy

  // CRITICAL: Required for NextAuth v5 in development
  trustHost: true,

  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
      : []),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.log('🔐 [Auth] Starting authorization for:', credentials?.email);
          const validation = LoginSchema.safeParse(credentials);

          if (!validation.success) {
            console.log('❌ [Auth] Validation failed:', validation.error.errors);
            return null;
          }

          const { email, password } = validation.data;

          // =================================================================
          // [DEMO HOTFIX] Robust Login Strategy - DB-FREE
          // =================================================================
          const isDemoUser = email === 'demo-clinician@holilabs.xyz' && password === 'Demo123!@#';

          if (isDemoUser) {
            console.log('✅ [Auth] Demo Login Successful (DB-FREE MODE)');
            // Return hardcoded demo user without touching database
            // (Production DB schema is incompatible)
            return {
              id: 'demo-clinician-id',
              email: 'demo-clinician@holilabs.xyz',
              name: 'Demo Clinician',
              role: 'CLINICIAN',
              firstName: 'Demo',
              lastName: 'Clinician',
            };
          }

          console.log('🔎 [Auth] Looking up user:', email);
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              passwordHash: true,
              specialty: true,
              permissions: true,
              lastLoginAt: true,
            }
          });

          if (!user || !user.passwordHash) {
            console.log('❌ [Auth] User not found or no password');
            return null;
          }

          console.log('🗝 [Auth] Verifying password...');
          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            console.log('❌ [Auth] Password verification failed');
            return null;
          }

          // Update last login (fire and forget)
          prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          }).catch((err: unknown) => console.warn('Failed to update last login', err));

          console.log('✅ [Auth] Login successful for user:', user.id);

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        } catch (error) {
          console.error('💥 [Auth] CRITICAL ERROR during authorize:', error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Add custom fields to JWT on sign in
      if (user) {
        token.role = user.role;
        token.iat = Math.floor(Date.now() / 1000); // Issued at
        token.sessionId = crypto.randomBytes(16).toString('hex'); // Unique session ID
      }

      // Token rotation: Refresh token on update trigger
      if (trigger === 'update' && token.iat) {
        const now = Math.floor(Date.now() / 1000);
        const tokenAge = now - (token.iat as number);

        // Rotate token if older than 5 minutes
        if (tokenAge > 5 * 60) {
          token.iat = now;
          token.rotatedAt = now;
        }
      }

      // Store refresh token if available
      if (account?.refresh_token) {
        token.refreshToken = account.refresh_token;
      }

      return token;
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },

    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Check if user is authenticated
      const isAuthenticated = !!auth?.user;

      // Protect clinician app routes
      const isClinicianRoute =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/clinician');

      if (isClinicianRoute) {
        return isAuthenticated;
      }

      return true;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // 15 minutes idle timeout (sliding window)
    updateAge: 5 * 60, // Update session every 5 minutes of activity
  },

  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours absolute timeout
  },

  // Security (let NextAuth handle dev vs prod cookie naming)
  useSecureCookies: process.env.NODE_ENV === 'production',

  events: {
    async signIn({ user, account }) {
      console.log(`✅ [Auth] Event: User ${user.id} signed in via ${account?.provider}`);
    },
    async signOut(message) {
      console.log('👋 [Auth] Event: User signed out');
    },
  },
};
