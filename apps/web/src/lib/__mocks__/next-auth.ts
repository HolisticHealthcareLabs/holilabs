/**
 * Mock next-auth for Jest tests
 * Prevents ESM parsing errors from next-auth dependencies
 */

// Mock Session type
export interface Session {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
  };
  expires: string;
}

// Mock account type
export interface Account {
  provider: string;
  type: string;
  providerAccountId: string;
  access_token?: string;
  refresh_token?: string;
}

// Mock NextAuth function
export default function NextAuth(config: any) {
  return {
    auth: jest.fn().mockResolvedValue(null),
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
    signIn: jest.fn(),
    signOut: jest.fn(),
  };
}

// Export named functions
export const getServerSession = jest.fn().mockResolvedValue(null);
export const auth = jest.fn().mockResolvedValue(null);
export const signIn = jest.fn();
export const signOut = jest.fn();
