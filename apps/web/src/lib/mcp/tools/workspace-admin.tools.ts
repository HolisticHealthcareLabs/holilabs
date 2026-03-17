/**
 * MCP Workspace Admin Tools
 *
 * Tools for managing workspace settings and LLM configurations:
 * - get_workspace: Read workspace configuration
 * - update_workspace_settings: Update workspace metadata (name, timezone, language, region)
 * - get_workspace_llm_config: Read current workspace LLM config (with redacted API key)
 * - manage_workspace_llm_config: Set or delete workspace-level LLM API key
 *
 * All tools require ADMIN or COMPLIANCE_ADMIN roles.
 * API keys are encrypted using encryptPHIWithVersion() before storage.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { encryptPHIWithVersion, maskSensitiveString } from '@/lib/security/encryption';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const workspaceAdminTools: MCPTool[] = [
  // =========================================================================
  // GET WORKSPACE - Read current workspace configuration
  // =========================================================================
  {
    name: 'get_workspace',
    description: 'Get current workspace configuration including name, timezone, language, and billing region',
    category: 'workspace',
    inputSchema: z.object({
      workspaceId: z.string().optional().describe('Workspace ID. If not provided, uses current workspace from context.'),
    }),
    requiredPermissions: ['admin:read'],
    handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
      try {
        const workspaceId = input.workspaceId || context.clinicId;

        if (!workspaceId) {
          return {
            success: false,
            error: 'Workspace ID required',
            data: null,
          };
        }

        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: {
            id: true,
            name: true,
            timezone: true,
            defaultLanguage: true,
            billingRegion: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!workspace) {
          return {
            success: false,
            error: `Workspace ${workspaceId} not found`,
            data: null,
          };
        }

        logger.info({
          event: 'workspace_config_read',
          workspaceId,
          clinicianId: context.clinicianId,
          agentId: context.agentId,
        });

        return {
          success: true,
          data: workspace,
        };
      } catch (error: any) {
        logger.error({
          event: 'workspace_config_read_error',
          error: error?.message,
          clinicianId: context.clinicianId,
        });

        return {
          success: false,
          error: error?.message || 'Failed to read workspace',
          data: null,
        };
      }
    },
  },

  // =========================================================================
  // UPDATE WORKSPACE SETTINGS
  // =========================================================================
  {
    name: 'update_workspace_settings',
    description: 'Update workspace settings: name, timezone, defaultLanguage, billingRegion (all optional)',
    category: 'workspace',
    inputSchema: z.object({
      workspaceId: z.string().optional().describe('Workspace ID. If not provided, uses current workspace.'),
      name: z.string().optional().describe('New workspace name'),
      timezone: z.string().optional().describe('Timezone (e.g., "America/New_York")'),
      defaultLanguage: z.string().optional().describe('Default language code (e.g., "pt-BR")'),
      billingRegion: z.enum(['BR', 'MX', 'AR', 'BO', 'CO']).optional().describe('Billing region'),
    }),
    requiredPermissions: ['admin:write'],
    handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
      try {
        const workspaceId = input.workspaceId || context.clinicId;

        if (!workspaceId) {
          return {
            success: false,
            error: 'Workspace ID required',
            data: null,
          };
        }

        const updateData: Record<string, any> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.timezone !== undefined) updateData.timezone = input.timezone;
        if (input.defaultLanguage !== undefined) updateData.defaultLanguage = input.defaultLanguage;
        if (input.billingRegion !== undefined) updateData.billingRegion = input.billingRegion;

        if (Object.keys(updateData).length === 0) {
          return {
            success: false,
            error: 'No fields to update',
            data: null,
          };
        }

        const updated = await prisma.workspace.update({
          where: { id: workspaceId },
          data: updateData,
          select: {
            id: true,
            name: true,
            timezone: true,
            defaultLanguage: true,
            billingRegion: true,
            updatedAt: true,
          },
        });

        logger.info({
          event: 'workspace_settings_updated',
          workspaceId,
          updatedFields: Object.keys(updateData),
          clinicianId: context.clinicianId,
          agentId: context.agentId,
        });

        return {
          success: true,
          data: updated,
        };
      } catch (error: any) {
        logger.error({
          event: 'workspace_settings_update_error',
          error: error?.message,
          clinicianId: context.clinicianId,
        });

        return {
          success: false,
          error: error?.message || 'Failed to update workspace settings',
          data: null,
        };
      }
    },
  },

  // =========================================================================
  // GET WORKSPACE LLM CONFIG - Read current LLM config (redacted)
  // =========================================================================
  {
    name: 'get_workspace_llm_config',
    description: 'Get workspace-level LLM configuration. API keys are redacted in response.',
    category: 'workspace',
    inputSchema: z.object({
      workspaceId: z.string().optional().describe('Workspace ID. If not provided, uses current workspace.'),
    }),
    requiredPermissions: ['admin:read'],
    handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
      try {
        const workspaceId = input.workspaceId || context.clinicId;

        if (!workspaceId) {
          return {
            success: false,
            error: 'Workspace ID required',
            data: null,
          };
        }

        const config = await prisma.workspaceLLMConfig.findUnique({
          where: { workspaceId },
          select: {
            workspaceId: true,
            provider: true,
            modelName: true,
            apiKey: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!config) {
          return {
            success: true,
            data: {
              workspaceId,
              configured: false,
              message: 'No workspace LLM config. Will use default from environment.',
            },
          };
        }

        return {
          success: true,
          data: {
            workspaceId: config.workspaceId,
            configured: true,
            provider: config.provider,
            modelName: config.modelName,
            apiKeyMasked: config.apiKey ? maskSensitiveString(config.apiKey) : null,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
          },
        };
      } catch (error: any) {
        logger.error({
          event: 'workspace_llm_config_read_error',
          error: error?.message,
          clinicianId: context.clinicianId,
        });

        return {
          success: false,
          error: error?.message || 'Failed to read workspace LLM config',
          data: null,
        };
      }
    },
  },

  // =========================================================================
  // MANAGE WORKSPACE LLM CONFIG - Set or delete encrypted API key
  // =========================================================================
  {
    name: 'manage_workspace_llm_config',
    description: 'Set or delete workspace-level LLM API key. If action=set, apiKey will be encrypted before storage. If action=delete, removes the configuration.',
    category: 'workspace',
    inputSchema: z.object({
      workspaceId: z.string().optional().describe('Workspace ID. If not provided, uses current workspace.'),
      action: z.enum(['set', 'delete']).describe('Action: "set" to configure, "delete" to remove'),
      provider: z.string().optional().describe('LLM provider (e.g., "anthropic", "openai", "ollama"). Required if action=set.'),
      modelName: z.string().optional().describe('Model name (e.g., "claude-3-sonnet", "gpt-4"). Required if action=set.'),
      apiKey: z.string().optional().describe('API key. Required if action=set. Will be encrypted.'),
    }),
    requiredPermissions: ['admin:write'],
    handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
      try {
        const workspaceId = input.workspaceId || context.clinicId;

        if (!workspaceId) {
          return {
            success: false,
            error: 'Workspace ID required',
            data: null,
          };
        }

        if (input.action === 'delete') {
          // Delete the config
          await prisma.workspaceLLMConfig.delete({
            where: { workspaceId },
          }).catch(() => null); // Ignore if not found

          logger.info({
            event: 'workspace_llm_config_deleted',
            workspaceId,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
          });

          return {
            success: true,
            data: {
              workspaceId,
              action: 'delete',
              status: 'deleted',
            },
          };
        }

        // action === 'set'
        if (!input.provider || !input.modelName || !input.apiKey) {
          return {
            success: false,
            error: 'provider, modelName, and apiKey are required when action=set',
            data: null,
          };
        }

        // Encrypt API key (CYRUS requirement: encryptPHIWithVersion)
        const encryptedKey = await encryptPHIWithVersion(input.apiKey);

        const config = await prisma.workspaceLLMConfig.upsert({
          where: { workspaceId },
          update: {
            provider: input.provider,
            modelName: input.modelName,
            apiKey: encryptedKey,
          },
          create: {
            workspaceId,
            provider: input.provider,
            modelName: input.modelName,
            apiKey: encryptedKey,
          },
          select: {
            workspaceId: true,
            provider: true,
            modelName: true,
            apiKey: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        logger.info({
          event: 'workspace_llm_config_set',
          workspaceId,
          provider: input.provider,
          modelName: input.modelName,
          clinicianId: context.clinicianId,
          agentId: context.agentId,
        });

        return {
          success: true,
          data: {
            workspaceId: config.workspaceId,
            action: 'set',
            status: 'saved',
            provider: config.provider,
            modelName: config.modelName,
            apiKeyMasked: maskSensitiveString(input.apiKey),
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
          },
        };
      } catch (error: any) {
        logger.error({
          event: 'workspace_llm_config_manage_error',
          error: error?.message,
          clinicianId: context.clinicianId,
        });

        return {
          success: false,
          error: error?.message || 'Failed to manage workspace LLM config',
          data: null,
        };
      }
    },
  },
];
