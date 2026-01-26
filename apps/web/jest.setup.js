/**
 * Jest Setup File
 * Runs before each test file
 * Sets up global test environment, mocks, and database
 */

import '@testing-library/jest-dom';

// ==============================================================================
// Environment Variables
// ==============================================================================

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://nicolacapriroloteran@localhost:5432/holi_labs_test?schema=public';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-minimum-32-characters-long';
process.env.SESSION_SECRET = 'test-session-secret-key-minimum-32-characters';
process.env.OPT_OUT_SECRET_KEY = 'test-opt-out-secret-key-for-encryption';
process.env.CRON_SECRET = 'test-cron-secret-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-supabase-anon-key-for-testing';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-supabase-service-role-key';
// 32-byte (64-hex char) test encryption key for PHI encryption
process.env.ENCRYPTION_KEY = 'test-encryption-key-00000000000000000000000000000000000000000000';

// ==============================================================================
// Global Test Utilities
// ==============================================================================

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(), // Mock console.error
  warn: jest.fn(),  // Mock console.warn
  log: jest.fn(),   // Mock console.log (optional)
};

// ==============================================================================
// Mock External Services
// ==============================================================================

// Mock @auth/prisma-adapter (ESM module that Jest can't transform)
jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({
    createUser: jest.fn(),
    getUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserByAccount: jest.fn(),
    updateUser: jest.fn(),
    linkAccount: jest.fn(),
    createSession: jest.fn(),
    getSessionAndUser: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
    createVerificationToken: jest.fn(),
    useVerificationToken: jest.fn(),
  })),
}));

// Mock next-auth and its providers (ESM modules that Jest can't transform)
jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: 'google',
    name: 'Google',
    type: 'oauth',
  })),
}));

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: 'credentials',
    name: 'Credentials',
    type: 'credentials',
  })),
}));

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    auth: jest.fn().mockResolvedValue(null),
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
  getServerSession: jest.fn().mockResolvedValue(null),
}));

// Mock Twilio SMS (to avoid real API calls)
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      }),
    },
  }));
});

// Mock Resend Email (to avoid real API calls)
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({
          id: 'test-email-id',
        }),
      },
    })),
  };
});

// Mock uuid (ESM module)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-v4-' + Math.random().toString(36).substring(7)),
  v7: jest.fn(() => 'test-uuid-v7-' + Date.now().toString(36)),
  validate: jest.fn(() => true),
  version: jest.fn(() => 4),
}));

// Mock Web Push Notifications
jest.mock('web-push', () => ({
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
  setVapidDetails: jest.fn(),
}));

// Mock AWS S3
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

// Mock Supabase server client (to avoid cookies issues in tests)
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-supabase-user-id',
          email: 'test@example.com',
          role: 'authenticated'
        }
      },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-supabase-user-id' },
          access_token: 'test-token'
        }
      },
      error: null,
    }),
    signIn: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock Next.js server components
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name) => ({ name, value: 'test-cookie-value' })),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(() => false),
    getAll: jest.fn(() => []),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Logger mock is handled via manual mock in src/lib/__mocks__/logger.ts
// Test files should call jest.mock('@/lib/logger') to use the manual mock

// ==============================================================================
// Database Helpers
// ==============================================================================

// Helper to generate test user ID
global.generateTestUserId = () => `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;

// Helper to generate test patient ID
global.generateTestPatientId = () => `test-patient-${Date.now()}-${Math.random().toString(36).substring(7)}`;

// ==============================================================================
// Cleanup
// ==============================================================================

// Global teardown
afterAll(async () => {
  // Close any open database connections
  // Note: Prisma client will be cleaned up automatically
});
