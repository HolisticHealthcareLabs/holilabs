jest.mock('@/lib/prisma', () => ({
  prisma: {
    roleAssignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { prisma } = require('@/lib/prisma');
const { roleAdminTools, CyrusVetoError } = require('../role-admin.tools');

const listTool = roleAdminTools.find((t: any) => t.name === 'list_role_assignments');
const grantTool = roleAdminTools.find((t: any) => t.name === 'grant_role');
const revokeTool = roleAdminTools.find((t: any) => t.name === 'revoke_role');

const mockContext = {
  clinicianId: 'clinician-123',
  agentId: 'agent-1',
  sessionId: 'session-1',
  roles: ['ADMIN'],
};

const mockContextClinician = {
  clinicianId: 'clinician-456',
  agentId: 'agent-2',
  sessionId: 'session-2',
  roles: ['CLINICIAN'],
};

const mockAssignment = {
  id: 'assignment-1',
  granteeId: 'user-1',
  grantorId: 'user-2',
  role: 'PHYSICIAN',
  scope: null,
  grantedAt: new Date('2026-03-17T10:00:00Z'),
  revokedAt: null,
  grantee: { id: 'user-1', email: 'user1@example.com', name: 'User One' },
  grantor: { id: 'user-2', email: 'user2@example.com', name: 'User Two' },
};

const mockRevokedAssignment = {
  ...mockAssignment,
  revokedAt: new Date('2026-03-17T11:00:00Z'),
};

const mockUser = {
  id: 'user-1',
  email: 'user1@example.com',
  name: 'User One',
};

describe('Role Admin Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // list_role_assignments Tests
  // =========================================================================

  describe('list_role_assignments', () => {
    it('is registered in roleAdminTools', () => {
      expect(listTool).toBeDefined();
      expect(listTool.name).toBe('list_role_assignments');
      expect(listTool.category).toBe('admin');
    });

    it('lists all active assignments by default', async () => {
      (prisma.roleAssignment.findMany as jest.Mock).mockResolvedValue([mockAssignment]);

      const result = await listTool.handler({}, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(1);
      expect(result.data.assignments[0].id).toBe('assignment-1');
      expect(result.data.assignments[0].role).toBe('PHYSICIAN');

      expect(prisma.roleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { revokedAt: null },
        })
      );
    });

    it('filters by userId', async () => {
      (prisma.roleAssignment.findMany as jest.Mock).mockResolvedValue([mockAssignment]);

      const result = await listTool.handler({ userId: 'user-1' }, mockContext);

      expect(result.success).toBe(true);
      expect(prisma.roleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ granteeId: 'user-1', revokedAt: null }),
        })
      );
    });

    it('filters by role', async () => {
      (prisma.roleAssignment.findMany as jest.Mock).mockResolvedValue([mockAssignment]);

      const result = await listTool.handler({ role: 'PHYSICIAN' }, mockContext);

      expect(result.success).toBe(true);
      expect(prisma.roleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'PHYSICIAN', revokedAt: null }),
        })
      );
    });

    it('includes revoked assignments when flag is set', async () => {
      (prisma.roleAssignment.findMany as jest.Mock).mockResolvedValue([
        mockAssignment,
        mockRevokedAssignment,
      ]);

      const result = await listTool.handler({ includeRevoked: true }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(2);

      expect(prisma.roleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('excludes revoked assignments by default', async () => {
      (prisma.roleAssignment.findMany as jest.Mock).mockResolvedValue([mockAssignment]);

      const result = await listTool.handler({}, mockContext);

      expect(result.success).toBe(true);
      expect(prisma.roleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { revokedAt: null },
        })
      );
    });
  });

  // =========================================================================
  // grant_role Tests
  // =========================================================================

  describe('grant_role', () => {
    it('is registered in roleAdminTools', () => {
      expect(grantTool).toBeDefined();
      expect(grantTool.name).toBe('grant_role');
      expect(grantTool.category).toBe('admin');
    });

    it('creates assignment with grantorId set to context.clinicianId', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.roleAssignment.create as jest.Mock).mockResolvedValue(mockAssignment);

      const result = await grantTool.handler(
        { granteeId: 'user-1', role: 'PHYSICIAN' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.assignmentId).toBe('assignment-1');

      expect(prisma.roleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            granteeId: 'user-1',
            grantorId: 'clinician-123',
            role: 'PHYSICIAN',
            grantedAt: expect.any(Date),
          }),
        })
      );
    });

    it('throws CyrusVetoError for LICENSE_OWNER', async () => {
      expect.assertions(3);

      try {
        await grantTool.handler(
          { granteeId: 'user-1', role: 'LICENSE_OWNER' },
          mockContext
        );
      } catch (err: any) {
        expect(err).toBeInstanceOf(CyrusVetoError);
        expect(err.invariantViolated).toContain('LICENSE_OWNER');
        expect(err.name).toBe('CyrusVetoError');
      }
    });

    it('throws CyrusVetoError for COMPLIANCE_ADMIN', async () => {
      expect.assertions(3);

      try {
        await grantTool.handler(
          { granteeId: 'user-1', role: 'COMPLIANCE_ADMIN' },
          mockContext
        );
      } catch (err: any) {
        expect(err).toBeInstanceOf(CyrusVetoError);
        expect(err.invariantViolated).toContain('COMPLIANCE_ADMIN');
        expect(err.name).toBe('CyrusVetoError');
      }
    });

    it('returns error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await grantTool.handler(
        { granteeId: 'nonexistent', role: 'PHYSICIAN' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
      expect(prisma.roleAssignment.create).not.toHaveBeenCalled();
    });

    it('includes scope when provided', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.roleAssignment.create as jest.Mock).mockResolvedValue({
        ...mockAssignment,
        scope: 'clinic-1',
      });

      const result = await grantTool.handler(
        { granteeId: 'user-1', role: 'PHYSICIAN', scope: 'clinic-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(prisma.roleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scope: 'clinic-1',
          }),
        })
      );
    });
  });

  // =========================================================================
  // revoke_role Tests
  // =========================================================================

  describe('revoke_role', () => {
    it('is registered in roleAdminTools', () => {
      expect(revokeTool).toBeDefined();
      expect(revokeTool.name).toBe('revoke_role');
      expect(revokeTool.category).toBe('admin');
    });

    it('revokes assignment and sets revokedAt', async () => {
      (prisma.roleAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment);
      (prisma.roleAssignment.update as jest.Mock).mockResolvedValue(mockRevokedAssignment);

      const result = await revokeTool.handler(
        { assignmentId: 'assignment-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.assignmentId).toBe('assignment-1');
      expect(result.data.revokedAt).toBe(mockRevokedAssignment.revokedAt.toISOString());

      expect(prisma.roleAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assignment-1' },
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
          }),
        })
      );
    });

    it('returns error if assignment not found', async () => {
      (prisma.roleAssignment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await revokeTool.handler(
        { assignmentId: 'nonexistent' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Role assignment not found');
      expect(prisma.roleAssignment.update).not.toHaveBeenCalled();
    });

    it('returns error if already revoked', async () => {
      (prisma.roleAssignment.findUnique as jest.Mock).mockResolvedValue(mockRevokedAssignment);

      const result = await revokeTool.handler(
        { assignmentId: 'assignment-1' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already revoked');
      expect(prisma.roleAssignment.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Permission Tests
  // =========================================================================

  describe('permission checks', () => {
    it('grant_role requires admin:write permission', () => {
      expect(grantTool.requiredPermissions).toContain('admin:write');
    });

    it('revoke_role requires admin:write permission', () => {
      expect(revokeTool.requiredPermissions).toContain('admin:write');
    });

    it('list_role_assignments requires admin:write permission', () => {
      expect(listTool.requiredPermissions).toContain('admin:write');
    });
  });
});
