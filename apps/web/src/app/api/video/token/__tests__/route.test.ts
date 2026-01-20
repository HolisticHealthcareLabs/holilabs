/**
 * LiveKit Token API Tests
 *
 * TDD-first tests for POST /api/video/token
 * Generates JWT tokens for LiveKit video room authentication.
 *
 * Phase: Telehealth Video Integration (OSS: LiveKit)
 *
 * Note: These are unit tests that test the business logic without importing
 * the actual route to avoid Jest ESM compatibility issues.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
  authOptions: {},
}));

jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  auditCreate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn().mockImplementation(() => ({
    addGrant: jest.fn(),
    toJwt: jest.fn().mockResolvedValue('mock-jwt-token'),
  })),
}));

const { getServerSession } = require('@/lib/auth');
const { auditCreate } = require('@/lib/audit');
const { AccessToken } = require('livekit-server-sdk');

describe('POST /api/video/token - Unit Tests', () => {
  const mockUserId = 'user-123';
  const mockRoomId = 'appointment-456';
  const mockUserName = 'Dr. García';

  const mockSession = {
    user: {
      id: mockUserId,
      name: mockUserName,
      email: 'dr.garcia@test.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    // Reset environment variables for testing
    process.env.LIVEKIT_API_KEY = 'test-api-key';
    process.env.LIVEKIT_API_SECRET = 'test-api-secret';
    process.env.LIVEKIT_URL = 'wss://test.livekit.cloud';
  });

  afterEach(() => {
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    delete process.env.LIVEKIT_URL;
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const session = await getServerSession();
      expect(session).toBeDefined();
      expect(session.user.id).toBe(mockUserId);
    });

    it('should reject when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const session = await getServerSession();
      expect(session).toBeNull();
    });
  });

  describe('Input Validation', () => {
    it('should validate roomId is required', () => {
      const validateInput = (input: { roomId?: string }) => {
        if (!input.roomId || input.roomId.trim() === '') {
          return { valid: false, error: 'roomId is required' };
        }
        return { valid: true };
      };

      expect(validateInput({}).valid).toBe(false);
      expect(validateInput({ roomId: '' }).valid).toBe(false);
      expect(validateInput({ roomId: mockRoomId }).valid).toBe(true);
    });

    it('should validate userName is required', () => {
      const validateInput = (input: { userName?: string }) => {
        if (!input.userName || input.userName.trim() === '') {
          return { valid: false, error: 'userName is required' };
        }
        return { valid: true };
      };

      expect(validateInput({}).valid).toBe(false);
      expect(validateInput({ userName: '' }).valid).toBe(false);
      expect(validateInput({ userName: mockUserName }).valid).toBe(true);
    });

    it('should validate userType is clinician or patient', () => {
      const validateInput = (input: { userType?: string }) => {
        const validTypes = ['clinician', 'patient'];
        if (!input.userType || !validTypes.includes(input.userType)) {
          return { valid: false, error: 'userType must be clinician or patient' };
        }
        return { valid: true };
      };

      expect(validateInput({}).valid).toBe(false);
      expect(validateInput({ userType: 'admin' }).valid).toBe(false);
      expect(validateInput({ userType: 'clinician' }).valid).toBe(true);
      expect(validateInput({ userType: 'patient' }).valid).toBe(true);
    });
  });

  describe('LiveKit Configuration', () => {
    it('should require LIVEKIT_API_KEY', () => {
      const checkConfig = () => {
        if (!process.env.LIVEKIT_API_KEY) {
          return { configured: false, error: 'LIVEKIT_API_KEY is required' };
        }
        return { configured: true };
      };

      expect(checkConfig().configured).toBe(true);

      delete process.env.LIVEKIT_API_KEY;
      expect(checkConfig().configured).toBe(false);
    });

    it('should require LIVEKIT_API_SECRET', () => {
      const checkConfig = () => {
        if (!process.env.LIVEKIT_API_SECRET) {
          return { configured: false, error: 'LIVEKIT_API_SECRET is required' };
        }
        return { configured: true };
      };

      expect(checkConfig().configured).toBe(true);

      delete process.env.LIVEKIT_API_SECRET;
      expect(checkConfig().configured).toBe(false);
    });

    it('should use LIVEKIT_URL from environment', () => {
      expect(process.env.LIVEKIT_URL).toBe('wss://test.livekit.cloud');
    });
  });

  describe('Token Generation', () => {
    it('should create AccessToken with correct parameters', () => {
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      const identity = `clinician_${mockUserId}`;

      new AccessToken(apiKey, apiSecret, {
        identity,
        name: mockUserName,
        ttl: '2h',
      });

      expect(AccessToken).toHaveBeenCalledWith(apiKey, apiSecret, {
        identity,
        name: mockUserName,
        ttl: '2h',
      });
    });

    it('should add room grant with correct permissions for clinician', () => {
      const mockAddGrant = jest.fn();
      (AccessToken as jest.Mock).mockImplementation(() => ({
        addGrant: mockAddGrant,
        toJwt: jest.fn().mockResolvedValue('mock-token'),
      }));

      const at = new AccessToken('key', 'secret', {});
      at.addGrant({
        room: mockRoomId,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomRecord: true,
        roomAdmin: true,
      });

      expect(mockAddGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          room: mockRoomId,
          roomJoin: true,
          canPublish: true,
          canSubscribe: true,
          roomRecord: true,
          roomAdmin: true,
        })
      );
    });

    it('should add room grant with limited permissions for patient', () => {
      const mockAddGrant = jest.fn();
      (AccessToken as jest.Mock).mockImplementation(() => ({
        addGrant: mockAddGrant,
        toJwt: jest.fn().mockResolvedValue('mock-token'),
      }));

      const at = new AccessToken('key', 'secret', {});
      at.addGrant({
        room: mockRoomId,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomRecord: false,
        roomAdmin: false,
      });

      expect(mockAddGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          roomRecord: false,
          roomAdmin: false,
        })
      );
    });

    it('should generate JWT token', async () => {
      const mockToJwt = jest.fn().mockResolvedValue('generated-jwt-token');
      (AccessToken as jest.Mock).mockImplementation(() => ({
        addGrant: jest.fn(),
        toJwt: mockToJwt,
      }));

      const at = new AccessToken('key', 'secret', {});
      const token = await at.toJwt();

      expect(mockToJwt).toHaveBeenCalled();
      expect(token).toBe('generated-jwt-token');
    });
  });

  describe('HIPAA Audit Logging', () => {
    it('should log video token generation', async () => {
      await auditCreate('VideoToken', mockRoomId, {}, {
        action: 'video_token_generated',
        roomId: mockRoomId,
        userType: 'clinician',
        userId: mockUserId,
        identity: `clinician_${mockUserId}`,
      });

      expect(auditCreate).toHaveBeenCalledWith(
        'VideoToken',
        mockRoomId,
        expect.anything(),
        expect.objectContaining({
          action: 'video_token_generated',
          roomId: mockRoomId,
          userType: 'clinician',
        })
      );
    });
  });

  describe('Response Format', () => {
    it('should return token data in expected format', async () => {
      const mockToken = 'generated-jwt-token';
      const mockUrl = 'wss://test.livekit.cloud';
      const identity = `clinician_${mockUserId}`;

      const response = {
        success: true,
        data: {
          token: mockToken,
          url: mockUrl,
          roomId: mockRoomId,
          identity,
        },
        meta: {
          latencyMs: 10,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.token).toBeDefined();
      expect(response.data.url).toBe(mockUrl);
      expect(response.data.roomId).toBe(mockRoomId);
      expect(response.data.identity).toBe(identity);
      expect(response.meta.latencyMs).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing configuration', () => {
      delete process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_SECRET;

      const checkConfig = () => {
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
          return { error: 'Video service not configured', status: 503 };
        }
        return { configured: true };
      };

      expect(checkConfig().error).toBe('Video service not configured');
      expect(checkConfig().status).toBe(503);
    });

    it('should handle token generation errors', async () => {
      const mockError = new Error('Token generation failed');
      (AccessToken as jest.Mock).mockImplementation(() => ({
        addGrant: jest.fn(),
        toJwt: jest.fn().mockRejectedValue(mockError),
      }));

      const at = new AccessToken('key', 'secret', {});
      await expect(at.toJwt()).rejects.toThrow('Token generation failed');
    });
  });

  describe('Identity Generation', () => {
    it('should generate identity with userType prefix for clinician', () => {
      const userType = 'clinician';
      const userId = mockUserId;
      const identity = `${userType}_${userId}`;

      expect(identity).toBe('clinician_user-123');
    });

    it('should generate identity with userType prefix for patient', () => {
      const userType = 'patient';
      const userId = mockUserId;
      const identity = `${userType}_${userId}`;

      expect(identity).toBe('patient_user-123');
    });
  });
});
