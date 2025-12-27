/**
 * NextAuth Configuration
 *
 * Handles clinician authentication via Prisma + Google OAuth
 */

// Re-export NextAuth types for backward compatibility
export type { Session } from 'next-auth';
export type NextAuthOptions = any; // v5 doesn't use NextAuthOptions anymore
import { prisma } from '@/lib/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { UserRole } from '@prisma/client';

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
          role: UserRole.CLINICIAN,
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

        if (!credentials?.email || typeof credentials.email !== 'string') {
          return null;
        }

        const email = credentials.email as string;

        // In development, automatically create/login user with any email
        return {
          id: email,
          email: email,
          name: email.split('@')[0],
          role: UserRole.CLINICIAN,
        };
      },
    }),

  ],

  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // 15 minutes idle timeout (sliding window)
    updateAge: 5 * 60, // Update session every 5 minutes of activity
  },

  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours absolute timeout
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  callbacks: {
    async jwt({ token, user, account, trigger }: { token: any; user: any; account: any; trigger?: string }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.iat = Math.floor(Date.now() / 1000); // Issued at
        token.sessionId = crypto.randomBytes(16).toString('hex'); // Unique session ID

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
            userId: token.id,
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

    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.role = token.role as any;
      }

      return session;
    },

    async signIn({ user, account, profile }: { user: any; account: any; profile: any }) {
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
    async signOut({ token }: { token: any }) {
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
 * NextAuth v5 Compatibility Wrapper
 *
 * NextAuth v5 removed getServerSession() in favor of auth()
 * This wrapper provides backward compatibility for existing code
 */
import NextAuth from 'next-auth';

// Convert v4 authOptions to v5 config
const clinicianAuthConfig = {
  adapter: authOptions.adapter,
  providers: authOptions.providers,
  session: authOptions.session,
  pages: authOptions.pages,
  callbacks: authOptions.callbacks,
  events: authOptions.events,
  secret: authOptions.secret,
  debug: authOptions.debug,
};

// Create v5 auth instance for clinicians
const clinicianAuth = NextAuth(clinicianAuthConfig);

/**
 * Backward compatible getServerSession function
 * Drop-in replacement for NextAuth v4's getServerSession()
 */
export async function getServerSession(_authOptions?: any) {
  return await clinicianAuth.auth();
}

// Export v5 auth instance for direct use
export const { auth: clinicianAuthFunction } = clinicianAuth;

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
