/**
 * NextAuth Type Extensions
 *
 * Extends NextAuth types to include custom user fields.
 * These fields flow: DB → authorize() → JWT → Session → Frontend
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    patientId?: string;
    role: string;
    username?: string | null;
    onboardingCompleted?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      patientId?: string;
      role: string;
      username?: string | null;
      onboardingCompleted?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    patientId: string;
    role: string;
    username?: string | null;
    onboardingCompleted?: boolean;
  }
}
