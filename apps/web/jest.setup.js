/**
 * Jest Setup File
 * Runs before each test file
 * Sets up global test environment, mocks, and database
 */

import '@testing-library/jest-dom';

// ==============================================================================
// Global Polyfills
// ==============================================================================

// IntersectionObserver mock — used by Framer Motion, infinite scrolls, etc.
if (typeof window !== 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) { this.callback = callback; }
    disconnect() { return null; }
    observe() { return null; }
    unobserve() { return null; }
    takeRecords() { return []; }
  };

  // ResizeObserver mock
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) { this.callback = callback; }
    disconnect() { return null; }
    observe() { return null; }
    unobserve() { return null; }
  };

  // matchMedia mock — used for dark mode, mobile responsiveness
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Canvas mock
  HTMLCanvasElement.prototype.getContext = jest.fn();

  // URL.createObjectURL mock — used for image previews, blobs
  URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = jest.fn();
}

// navigator.mediaDevices — used by video, voice, QR scanner
if (typeof navigator !== 'undefined') {
  const mockMediaDevices = {
    getUserMedia: function() {
      return Promise.resolve({
        getTracks: () => [],
        stop: () => {},
      });
    },
    enumerateDevices: function() {
      return Promise.resolve([]);
    },
  };

  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: mockMediaDevices,
      configurable: true,
      writable: true
    });
  } else {
    // Supplement existing mediaDevices
    if (!navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia = mockMediaDevices.getUserMedia;
    }
    if (!navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices = mockMediaDevices.enumerateDevices;
    }
  }
}

// Mock uuid globally — uuid@13 ships ESM-only, bypasses broken pnpm transform
jest.mock('uuid', () => ({
  v4: () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  v1: () => 'test-uuid-v1-000000',
  validate: () => true,
  NIL: '00000000-0000-0000-0000-000000000000',
}));

// Mock framer-motion globally — includes both motion and m exports
jest.mock('framer-motion', () => {
  const mockMotionComponent = ({ children, ...props }) => children;
  mockMotionComponent.displayName = 'MockMotionComponent';
  return {
    motion: {
      div: mockMotionComponent,
      span: mockMotionComponent,
      section: mockMotionComponent,
      article: mockMotionComponent,
      p: mockMotionComponent,
      h1: mockMotionComponent,
      h2: mockMotionComponent,
      h3: mockMotionComponent,
      button: mockMotionComponent,
      a: mockMotionComponent,
    },
    m: {
      div: mockMotionComponent,
      span: mockMotionComponent,
      section: mockMotionComponent,
      article: mockMotionComponent,
      p: mockMotionComponent,
      h1: mockMotionComponent,
      h2: mockMotionComponent,
      h3: mockMotionComponent,
      button: mockMotionComponent,
      a: mockMotionComponent,
    },
    AnimatePresence: ({ children }) => children,
    useMotionValue: () => 0,
    useTransform: () => 0,
    useAnimation: () => ({ start: jest.fn(), set: jest.fn() }),
    useSpring: () => 0,
  };
});

// Mock @simplewebauthn/server globally
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn().mockResolvedValue({ challenge: 'mock-challenge' }),
  verifyRegistrationResponse: jest.fn().mockResolvedValue({ verified: true }),
  generateAuthenticationOptions: jest.fn().mockResolvedValue({ challenge: 'mock-challenge' }),
  verifyAuthenticationResponse: jest.fn().mockResolvedValue({ verified: true }),
}));

// Mock next-auth globally — next-auth@5 beta ships ESM-only (all subpaths)
jest.mock('next-auth', () => {
  const noop = () => {};
  const noopAsync = () => Promise.resolve(null);
  const handlers = { GET: noopAsync, POST: noopAsync };
  const NextAuth = () => ({ handlers, auth: noopAsync, signIn: noopAsync, signOut: noopAsync });
  NextAuth.handlers = handlers;
  NextAuth.auth = noopAsync;
  NextAuth.signIn = noopAsync;
  NextAuth.signOut = noopAsync;
  return { __esModule: true, default: NextAuth, NextAuth, getServerSession: noopAsync };
});
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: () => ({ id: 'credentials', name: 'Credentials', type: 'credentials' })
}));
jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: () => ({ id: 'google', name: 'Google', type: 'oidc' })
}));
jest.mock('next-auth/jwt', () => ({
  __esModule: true,
  encode: jest.fn(() => Promise.resolve('mock-jwt-token')),
  decode: jest.fn(() => Promise.resolve({ sub: 'user-1' })),
}));
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: () => {},
  signOut: () => {},
  SessionProvider: ({ children }) => children,
}));
jest.mock('@auth/core', () => ({
  Auth: () => {},
  customFetch: () => {}
}));
jest.mock('@auth/core/providers/credentials', () => ({
  __esModule: true,
  default: () => ({})
}));

// Mock SWR globally — plain functions survive resetMocks: true
jest.mock('swr', () => {
  const noop = () => {};
  const useSWR = () => ({ data: undefined, error: undefined, isLoading: false, isValidating: false, mutate: noop });
  return {
    default: useSWR,
    useSWR,
    useSWRInfinite: () => ({ data: undefined, error: undefined, isLoading: false, isValidating: false, mutate: noop, size: 1, setSize: noop }),
    useSWRConfig: () => ({ mutate: noop, cache: new Map() }),
    mutate: noop,
    SWRConfig: ({ children }) => children,
  };
});

// Mock next-intl globally — plain functions survive resetMocks: true
jest.mock('next-intl', () => {
  const t = (key) => {
    // Convert camelCase or dot.path to space-separated lowercase
    // e.g. "syncWithCdss" -> "sync with cdss"
    // e.g. "portal.transcriptPane.digital" -> "digital"
    const parts = key.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
  };
  return {
    useTranslations: () => t,
    useLocale: () => 'en',
    useMessages: () => ({}),
    useNow: () => new Date(),
    useTimeZone: () => 'America/Sao_Paulo',
    NextIntlClientProvider: ({ children }) => children,
  };
});

// Mock bcryptjs (ESM module)
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue(10),
}));

// Mock @upstash/redis globally
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    mget: jest.fn().mockResolvedValue([]),
    mset: jest.fn().mockResolvedValue('OK'),
  })),
}));

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
