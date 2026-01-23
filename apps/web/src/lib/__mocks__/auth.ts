/**
 * Mock @/lib/auth for Jest tests
 * Prevents ESM parsing errors from next-auth dependencies
 */

// Re-export mock types
export interface Session {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
    role?: string;
  };
  expires: string;
}

export type NextAuthOptions = any;

// Mock authOptions
export const authOptions = {
  adapter: {},
  providers: [],
  session: {
    strategy: 'jwt',
    maxAge: 15 * 60,
    updateAge: 5 * 60,
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  callbacks: {},
};

// Default mock session for tests
export const defaultMockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'clinician',
  },
  expires: '2099-01-01T00:00:00.000Z',
};

// Mock getServerSession - returns session by default, tests can override with mockResolvedValue(null)
export const getServerSession = jest.fn().mockResolvedValue(defaultMockSession);

// Mock auth handlers
export const handlers = {
  GET: jest.fn(),
  POST: jest.fn(),
};

export const auth = jest.fn().mockResolvedValue(null);
export const signIn = jest.fn();
export const signOut = jest.fn();
