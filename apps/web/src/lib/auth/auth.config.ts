/**
 * NextAuth v5 Configuration
 *
 * Clinician portal authentication (doctors, nurses, staff).
 *
 * Fields flow: DB → authorize() → JWT callback → Session callback → Frontend
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
import logger from '@/lib/logger';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const authConfig: NextAuthConfig = {
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
          const validation = LoginSchema.safeParse(credentials);

          if (!validation.success) {
            return null;
          }

          const { email, password } = validation.data;

          // Demo users — ephemeral accounts provisioned by /api/demo/provision
          if (process.env.NODE_ENV !== 'production') {
            const isDemoEmail =
              (email === 'dr.silva@holilabs.xyz' && password === 'Cortex2026!') ||
              (email === 'demo-clinician@holilabs.xyz' && password === 'Demo123!@#') ||
              (/^demo-[a-f0-9]+@holilabs\.xyz$/.test(email) && password === 'Cortex2026!');

            if (isDemoEmail) {
              const demoUser = await prisma.user.findUnique({
                where: { email },
                select: { id: true, email: true, firstName: true, lastName: true, role: true, username: true },
              });
              if (demoUser) {
                return {
                  id: demoUser.id,
                  email: demoUser.email,
                  name: `${demoUser.firstName} ${demoUser.lastName}`,
                  role: demoUser.role as string,
                  firstName: demoUser.firstName,
                  lastName: demoUser.lastName,
                  username: demoUser.username ?? undefined,
                  onboardingCompleted: true,
                };
              }
              // Legacy hardcoded fallback for dr.silva when not seeded
              if (email === 'dr.silva@holilabs.xyz') {
                return {
                  id: 'demo-dr-silva-id',
                  email,
                  name: 'Dr. Ricardo Silva',
                  role: 'CLINICIAN',
                  firstName: 'Ricardo',
                  lastName: 'Silva',
                  username: 'dr.silva',
                  onboardingCompleted: true,
                };
              }
            }
          }

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              passwordHash: true,
              username: true,
              onboardingCompleted: true,
            },
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            return null;
          }

          prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          }).catch((e) => logger.error('[auth] lastLoginAt update failed', { userId: user.id, error: e }));

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            onboardingCompleted: user.onboardingCompleted,
          };
        } catch (error) {
          logger.error('[Auth] Authorization error', { error });
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
      // Initial sign-in: copy fields from authorize() return into JWT
      if (user) {
        token.role = user.role;
        token.username = user.username ?? null;
        token.onboardingCompleted = user.onboardingCompleted ?? false;
        token.iat = Math.floor(Date.now() / 1000);
        token.sessionId = crypto.randomBytes(16).toString('hex');
      }

      // Magic link / OAuth: resolve fields from DB since authorize() isn't called
      if (account && !token.role && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { role: true, id: true, username: true, onboardingCompleted: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.username = dbUser.username;
          token.onboardingCompleted = dbUser.onboardingCompleted;
        }
      }

      // Session update trigger: refresh fields from DB (called after onboarding completes)
      if (trigger === 'update' && token.sub) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { username: true, onboardingCompleted: true, role: true },
          });
          if (freshUser) {
            token.username = freshUser.username;
            token.onboardingCompleted = freshUser.onboardingCompleted;
            token.role = freshUser.role;
          }
        } catch {
          // Non-critical — keep existing token values
        }
      }

      if (account?.refresh_token) {
        token.refreshToken = account.refresh_token;
      }

      return token;
    },

    async session({ session, token }) {
      const VALID_ROLES = ['LICENSE_OWNER', 'ADMIN', 'COMPLIANCE_ADMIN', 'PHYSICIAN', 'NURSE', 'RECEPTIONIST', 'LAB_TECH', 'PHARMACIST', 'CLINICIAN', 'STAFF', 'RESEARCHER'];
      if (token && session.user) {
        session.user.id = token.sub!;
        const role = typeof token.role === 'string' && VALID_ROLES.includes(token.role) ? token.role : 'CLINICIAN';
        session.user.role = role;
        session.user.username = token.username ?? null;
        session.user.onboardingCompleted = token.onboardingCompleted ?? false;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Prevent open redirect: only allow same-origin or relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) return url;
      } catch {
        // Invalid URL — fall through to baseUrl
      }
      return baseUrl;
    },

    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthenticated = !!auth?.user;

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
    maxAge: 30 * 60, // 30 min — aligned with patient-session.ts REGULAR_TIMEOUT
    updateAge: 5 * 60, // Sliding window: refresh every 5 min of activity
  },

  jwt: {
    maxAge: 30 * 60, // 30 min — must match session.maxAge to prevent ghost tokens
  },

  useSecureCookies: process.env.NODE_ENV === 'production',

  events: {
    async signIn({ user, account }) {
      logger.info('[Auth] User signed in', { userId: user.id, provider: account?.provider });
    },
    async signOut() {
      logger.info('[Auth] User signed out');
    },
  },
};
