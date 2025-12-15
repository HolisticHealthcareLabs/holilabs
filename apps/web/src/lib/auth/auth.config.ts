/**
 * NextAuth v5 Configuration
 *
 * Patient portal authentication with email/password, magic links, and OAuth
 */

import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
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

          // Find patient user
          const patientUser = await prisma.patientUser.findUnique({
            where: { email },
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  dateOfBirth: true,
                },
              },
            },
          });

          if (!patientUser || !patientUser.passwordHash) {
            logger.warn({
              event: 'auth_user_not_found',
              email,
            });
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(password, patientUser.passwordHash);

          if (!isValid) {
            logger.warn({
              event: 'auth_invalid_password',
              email,
            });
            return null;
          }

          // Check if account is verified
          if (!patientUser.emailVerifiedAt) {
            logger.warn({
              event: 'auth_email_not_verified',
              email,
            });
            return null;
          }

          // Update last login
          await prisma.patientUser.update({
            where: { id: patientUser.id },
            data: { lastLoginAt: new Date() },
          });

          logger.info({
            event: 'auth_login_success',
            userId: patientUser.id,
            patientId: patientUser.patientId,
          });

          // Return user object
          return {
            id: patientUser.id,
            email: patientUser.email,
            name: `${patientUser.patient?.firstName} ${patientUser.patient?.lastName}`,
            patientId: patientUser.patientId,
            role: 'patient',
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

    // TODO: Add OAuth providers
    // Google({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],

  pages: {
    signIn: '/portal/login',
    error: '/portal/error',
    verifyRequest: '/portal/verify-email',
  },

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Add custom fields to JWT on sign in
      if (user) {
        token.patientId = user.patientId || '';
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
        session.user.patientId = token.patientId as string;
        session.user.role = token.role as string;
      }
      return session;
    },

    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Check if user is authenticated
      const isAuthenticated = !!auth?.user;

      // Protected portal routes
      const isPortalRoute = pathname.startsWith('/portal') && pathname !== '/portal/login';

      if (isPortalRoute) {
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

  // SOC 2 Control CC6.7: Secure cookies
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  // Security
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
