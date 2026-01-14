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
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '@/lib/logger';

// Login schema
const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as any, // Type cast to resolve @auth/core version conflict

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
          // Validate credentials
          const validation = LoginSchema.safeParse(credentials);

          if (!validation.success) {
            logger.warn({
              event: 'auth_validation_failed',
              errors: validation.error.errors,
            });
            return null;
          }

          const { email, password } = validation.data;

          // Find clinician user
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              passwordHash: true,
            },
          });

          if (!user || !user.passwordHash) {
            logger.warn({
              event: 'auth_user_not_found',
              email,
            });
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            logger.warn({
              event: 'auth_invalid_password',
              email,
            });
            return null;
          }

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          logger.info({
            event: 'auth_login_success',
            userId: user.id,
            role: user.role,
          });

          // Return user object
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
          };
        } catch (error) {
          logger.error({
            event: 'auth_error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
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

          logger.info({
            event: 'token_rotated',
            userId: token.sub,
            tokenAge,
          });
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
      logger.info({
        event: 'user_signed_in',
        userId: user.id,
        provider: account?.provider,
      });
    },
    async signOut(message: any) {
      logger.info({
        event: 'user_signed_out',
        userId: message.token?.sub,
      });
    },
  },
};
