/**
 * NextAuth Configuration
 *
 * Handles clinician authentication via Supabase
 */

import { NextAuthOptions } from 'next-auth';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { prisma } from '@/lib/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import logger from '@/lib/logger';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          role: 'CLINICIAN',
        };
      },
    }),

    // Development Credentials Provider (for testing)
    CredentialsProvider({
      id: 'dev-credentials',
      name: 'Development Email',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "doctor@holilabs.com" }
      },
      async authorize(credentials) {
        // Only allow in development
        if (process.env.NODE_ENV !== 'development') {
          return null;
        }

        if (!credentials?.email) {
          return null;
        }

        // In development, automatically create/login user with any email
        return {
          id: credentials.email,
          email: credentials.email,
          name: credentials.email.split('@')[0],
          role: 'CLINICIAN',
        };
      },
    }),

    // Supabase authentication for clinicians (if configured)
    ...(process.env.SUPABASE_CLIENT_ID && process.env.SUPABASE_CLIENT_SECRET
      ? [{
          id: 'supabase',
          name: 'Supabase',
          type: 'oauth' as const,
          wellKnown: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/openid-configuration`,
          authorization: { params: { scope: 'openid email' } },
          checks: ['pkce' as const, 'state' as const],
          clientId: process.env.SUPABASE_CLIENT_ID,
          clientSecret: process.env.SUPABASE_CLIENT_SECRET,
          idToken: true,
          profile(profile: any) {
            return {
              id: profile.sub,
              email: profile.email,
              name: profile.name || profile.email,
              role: 'CLINICIAN',
            };
          },
        }]
      : []),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;

        // Fetch user details from database
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.role = dbUser.role;
        }

        logger.info({
          event: 'user_signed_in',
          userId: token.id,
          email: token.email,
        });
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.role = token.role as any;
      }

      return session;
    },

    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          return false;
        }

        // Check if user exists in database
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // Create user if doesn't exist
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              firstName: profile?.name?.split(' ')[0] || 'User',
              lastName: profile?.name?.split(' ').slice(1).join(' ') || '',
              role: 'CLINICIAN',
            },
          });

          logger.info({
            event: 'new_user_created',
            userId: dbUser.id,
            email: dbUser.email,
          });
        }

        return true;
      } catch (error) {
        logger.error({
          event: 'signin_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          email: user.email,
        });
        return false;
      }
    },
  },

  events: {
    async signOut({ token }) {
      logger.info({
        event: 'user_signed_out',
        userId: token?.id,
      });
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Get user session token for Socket.io authentication
 * @compliance Phase 2.4: Security Hardening - Proper JWT signing
 */
export async function getUserSessionToken(userId: string): Promise<string | null> {
  try {
    const { SignJWT } = await import('jose');

    // Get JWT secret from environment - REQUIRED
    const jwtSecretString = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecretString) {
      throw new Error('CRITICAL: JWT secret not configured. Set NEXTAUTH_SECRET or SESSION_SECRET');
    }

    const secret = new TextEncoder().encode(jwtSecretString);

    // Generate signed JWT token with expiration
    const token = await new SignJWT({ userId, type: 'CLINICIAN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(secret);

    return token;
  } catch (error) {
    logger.error({
      event: 'get_session_token_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    return null;
  }
}

/**
 * Verify Socket.io authentication token
 * @compliance Phase 2.4: Security Hardening - Remove fallback secrets
 */
export async function verifySocketToken(token: string): Promise<{ userId: string; userType: 'CLINICIAN' | 'PATIENT' } | null> {
  try {
    // Try to parse as patient JWT first (from patient-session cookie)
    if (token.includes('.')) {
      // This looks like a JWT token - likely from patient session
      try {
        const { jwtVerify } = await import('jose');

        // Get JWT secret from environment - REQUIRED
        const jwtSecretString = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
        if (!jwtSecretString) {
          throw new Error('CRITICAL: JWT secret not configured. Set NEXTAUTH_SECRET or SESSION_SECRET');
        }

        const JWT_SECRET = new TextEncoder().encode(jwtSecretString);

        const { payload } = await jwtVerify(token, JWT_SECRET);

        if (payload.type === 'patient' && payload.patientId) {
          // Verify patient exists
          const patient = await prisma.patientUser.findUnique({
            where: { id: payload.patientId as string },
            select: { id: true },
          });

          if (!patient) return null;

          return {
            userId: payload.patientId as string,
            userType: 'PATIENT',
          };
        }
      } catch (jwtError) {
        // Not a valid JWT, try base64 decode
        logger.debug({
          event: 'jwt_verify_failed',
          error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
        });
      }
    }

    // Try base64 decode for simple tokens (clinician)
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

    if (!decoded.userId || !decoded.type) {
      return null;
    }

    // Verify user exists in database
    if (decoded.type === 'CLINICIAN') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true },
      });

      if (!user) return null;

      return {
        userId: decoded.userId,
        userType: 'CLINICIAN',
      };
    } else if (decoded.type === 'PATIENT') {
      const patient = await prisma.patientUser.findUnique({
        where: { id: decoded.userId },
        select: { id: true },
      });

      if (!patient) return null;

      return {
        userId: decoded.userId,
        userType: 'PATIENT',
      };
    }

    return null;
  } catch (error) {
    logger.error({
      event: 'verify_socket_token_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
