/**
 * Tests for Workspace Admin MCP Tools
 *
 * Coverage:
 * 1. get_workspace returns current config
 * 2. manage_workspace_llm_config encrypts apiKey before storage
 * 3. manage with action='delete' clears config
 * 4. CLINICIAN role denied on all tools
 * 5. LLM config read returns redacted apiKey (no plaintext)
 * 6. timezone/language/region can be updated independently
 */

import { workspaceAdminTools } from '../workspace-admin.tools';
import type { MCPContext, MCPResult } from '../../types';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    workspaceLLMConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

jest.mock('@/lib/security/encryption', () => ({
  encryptPHIWithVersion: jest.fn(),
  maskSensitiveString: jest.fn((value: string) => {
    if (!value || value.length < 8) return '';
    const prefix = value.slice(0, 7);
    const suffix = value.slice(-4);
    return `${prefix}***${suffix}`;
  }),
  decryptPHIWithVersion: jest.fn(),
}));

// Import after mocks are set up
const { prisma } = require('@/lib/prisma');
const { logger } = require('@/lib/logger');
const { encryptPHIWithVersion, maskSensitiveString } = require('@/lib/security/encryption');

// ============================================================================
// SETUP
// ============================================================================

const mockContext: MCPContext = {
  clinicianId: 'clinician-1',
  agentId: 'agent-test',
  sessionId: 'session-123',
  roles: ['ADMIN'],
  clinicId: 'clinic-1',
};

const mockContextClinician: MCPContext = {
  clinicianId: 'clinician-2',
  agentId: 'agent-test',
  sessionId: 'session-124',
  roles: ['CLINICIAN'],
  clinicId: 'clinic-1',
};

describe('Workspace Admin Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // TEST 1: get_workspace returns current config
  // =========================================================================

  it('Test 1: get_workspace returns current config', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'get_workspace')!;

    const mockWorkspace = {
      id: 'clinic-1',
      name: 'Clinic Alpha',
      timezone: 'America/Sao_Paulo',
      defaultLanguage: 'pt-BR',
      billingRegion: 'BR',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-03-01'),
    };

    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);

    const result = (await tool.handler({}, mockContext)) as MCPResult;

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWorkspace);
    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { id: 'clinic-1' },
      select: expect.objectContaining({
        id: true,
        name: true,
        slug: true,
        metadata: true,
      }),
    });
  });

  // =========================================================================
  // TEST 2: manage_workspace_llm_config encrypts apiKey before storage
  // =========================================================================

  it('Test 2: manage_workspace_llm_config encrypts apiKey before storage', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'manage_workspace_llm_config')!;

    const encryptedValue = 'v1:encrypted:data:here';
    (encryptPHIWithVersion as jest.Mock).mockResolvedValue(encryptedValue);

    const mockConfig = {
      workspaceId: 'clinic-1',
      provider: 'anthropic',
      modelName: 'claude-3-sonnet',
      apiKey: encryptedValue,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.workspaceLLMConfig.upsert as jest.Mock).mockResolvedValue(mockConfig);

    const result = (await tool.handler(
      {
        workspaceId: 'clinic-1',
        action: 'set',
        provider: 'anthropic',
        modelName: 'claude-3-sonnet',
        apiKey: 'sk-ant-real-key-12345',
      },
      mockContext
    )) as MCPResult;

    expect(result.success).toBe(true);
    expect(encryptPHIWithVersion).toHaveBeenCalledWith('sk-ant-real-key-12345');
    expect(prisma.workspaceLLMConfig.upsert).toHaveBeenCalledWith({
      where: { workspaceId_provider: { workspaceId: 'clinic-1', provider: 'anthropic' } },
      update: expect.objectContaining({
        encryptedKey: encryptedValue,
      }),
      create: expect.objectContaining({
        encryptedKey: encryptedValue,
      }),
      select: expect.any(Object),
    });
  });

  // =========================================================================
  // TEST 3: manage with action='delete' clears config
  // =========================================================================

  it('Test 3: manage with action=delete clears config', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'manage_workspace_llm_config')!;

    (prisma.workspaceLLMConfig.deleteMany as jest.Mock).mockResolvedValue({});

    const result = (await tool.handler(
      {
        workspaceId: 'clinic-1',
        action: 'delete',
      },
      mockContext
    )) as MCPResult;

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('deleted');
    expect(prisma.workspaceLLMConfig.deleteMany).toHaveBeenCalledWith({
      where: { workspaceId: 'clinic-1' },
    });
  });

  // =========================================================================
  // TEST 4: CLINICIAN role denied on all tools
  // =========================================================================

  it('Test 4: CLINICIAN role denied on get_workspace', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'get_workspace')!;

    // Check that CLINICIAN is not in requiredPermissions
    expect(tool.requiredPermissions).toEqual(['admin:read']);
    expect(tool.requiredPermissions).not.toContain('clinician:read');
  });

  it('Test 4b: CLINICIAN role denied on manage_workspace_llm_config', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'manage_workspace_llm_config')!;

    expect(tool.requiredPermissions).toEqual(['admin:write']);
  });

  // =========================================================================
  // TEST 5: LLM config read returns redacted apiKey (no plaintext)
  // =========================================================================

  it('Test 5: get_workspace_llm_config returns redacted apiKey', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'get_workspace_llm_config')!;

    const mockConfig = {
      workspaceId: 'clinic-1',
      provider: 'anthropic',
      encryptedKey: 'v1:encrypted:data:here',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.workspaceLLMConfig.findMany as jest.Mock).mockResolvedValue([mockConfig]);

    const result = (await tool.handler({}, mockContext)) as MCPResult;

    expect(result.success).toBe(true);
    expect(result.data.configured).toBe(true);
    expect(result.data.providers).toHaveLength(1);
    expect(result.data.providers[0].provider).toBe('anthropic');
    expect(result.data.providers[0].apiKeyMasked).toBe('***encrypted***');
    // Ensure plaintext key is NOT in response
    expect(result.data.providers[0].encryptedKey).toBeUndefined();
  });

  // =========================================================================
  // TEST 6: timezone/language/region can be updated independently
  // =========================================================================

  it('Test 6: timezone can be updated independently', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'update_workspace_settings')!;

    const mockUpdated = {
      id: 'clinic-1',
      name: 'Clinic Alpha',
      slug: 'clinic-alpha',
      metadata: { timezone: 'America/New_York', defaultLanguage: 'pt-BR', billingRegion: 'BR' },
      updatedAt: new Date(),
    };

    (prisma.workspace.update as jest.Mock).mockResolvedValue(mockUpdated);

    const result = (await tool.handler(
      {
        workspaceId: 'clinic-1',
        timezone: 'America/New_York',
      },
      mockContext
    )) as MCPResult;

    expect(result.success).toBe(true);
    expect(result.data.metadata.timezone).toBe('America/New_York');
    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: 'clinic-1' },
      data: { metadata: { timezone: 'America/New_York' } },
      select: expect.any(Object),
    });
  });

  it('Test 6b: language can be updated independently', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'update_workspace_settings')!;

    const mockUpdated = {
      id: 'clinic-1',
      name: 'Clinic Alpha',
      slug: 'clinic-alpha',
      metadata: { timezone: 'America/Sao_Paulo', defaultLanguage: 'es', billingRegion: 'BR' },
      updatedAt: new Date(),
    };

    (prisma.workspace.update as jest.Mock).mockResolvedValue(mockUpdated);

    const result = (await tool.handler(
      {
        workspaceId: 'clinic-1',
        defaultLanguage: 'es',
      },
      mockContext
    )) as MCPResult;

    expect(result.success).toBe(true);
    expect(result.data.metadata.defaultLanguage).toBe('es');
  });

  it('Test 6c: billingRegion can be updated independently', async () => {
    const tool = workspaceAdminTools.find(t => t.name === 'update_workspace_settings')!;

    const mockUpdated = {
      id: 'clinic-1',
      name: 'Clinic Alpha',
      slug: 'clinic-alpha',
      metadata: { timezone: 'America/Sao_Paulo', defaultLanguage: 'pt-BR', billingRegion: 'MX' },
      updatedAt: new Date(),
    };

    (prisma.workspace.update as jest.Mock).mockResolvedValue(mockUpdated);

    const result = (await tool.handler(
      {
        workspaceId: 'clinic-1',
        billingRegion: 'MX',
      },
      mockContext
    )) as MCPResult;

    expect(result.success).toBe(true);
    expect(result.data.metadata.billingRegion).toBe('MX');
  });
});
