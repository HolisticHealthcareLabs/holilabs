/**
 * NextAuth Type Extensions
 *
 * Extends NextAuth types to include custom user fields
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
    patientId?: string; // Optional for clinician users
    role: string;
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
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    patientId: string;
    role: string;
  }
}
