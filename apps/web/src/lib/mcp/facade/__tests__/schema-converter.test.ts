/**
 * Schema Converter Tests — Zod → MCP JSON Schema 2020-12
 *
 * Validates roundtrip fidelity: Zod schemas convert correctly to
 * MCP-compatible JSON Schema with metadata preserved.
 */

import { z } from 'zod';

// QUINN: jest.mock first, require after
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { zodToMCPJsonSchema, convertToolToMCPSchema, convertAllToolsToMCPSchemas } =
  require('../schema-converter') as typeof import('../schema-converter');

describe('schema-converter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('zodToMCPJsonSchema', () => {
    it('converts a simple object schema', () => {
      const schema = z.object({
        patientId: z.string().describe('The patient ID'),
        limit: z.number().optional(),
      });

      const result = zodToMCPJsonSchema(schema);

      expect(result).toHaveProperty('type', 'object');
      expect(result).toHaveProperty('properties.patientId');
      expect(result).toHaveProperty('properties.limit');
      expect((result as Record<string, unknown>).properties).toHaveProperty('patientId');
      expect(result).not.toHaveProperty('$schema');
    });

    it('preserves required fields', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const result = zodToMCPJsonSchema(schema) as Record<string, unknown>;

      expect(result.required).toContain('required');
      expect(result.required).not.toContain('optional');
    });

    it('handles nested objects', () => {
      const schema = z.object({
        patient: z.object({
          id: z.string(),
          name: z.string(),
        }),
      });

      const result = zodToMCPJsonSchema(schema) as Record<string, unknown>;
      const props = result.properties as Record<string, unknown>;

      expect(props.patient).toHaveProperty('type', 'object');
    });

    it('handles arrays', () => {
      const schema = z.object({
        ids: z.array(z.string()),
      });

      const result = zodToMCPJsonSchema(schema) as Record<string, unknown>;
      const props = result.properties as Record<string, unknown>;
      const idsSchema = props.ids as Record<string, unknown>;

      expect(idsSchema.type).toBe('array');
    });

    it('handles enums', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      });

      const result = zodToMCPJsonSchema(schema) as Record<string, unknown>;
      const props = result.properties as Record<string, unknown>;
      const statusSchema = props.status as Record<string, unknown>;

      expect(statusSchema.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('strips $schema field from output', () => {
      const schema = z.object({ id: z.string() });
      const result = zodToMCPJsonSchema(schema);

      expect(result).not.toHaveProperty('$schema');
    });
  });

  describe('convertToolToMCPSchema', () => {
    it('converts an MCPTool to MCPToolSchema with metadata', () => {
      const tool = {
        name: 'get_patient',
        description: 'Retrieve patient data',
        category: 'patient' as const,
        inputSchema: z.object({ patientId: z.string() }),
        requiredPermissions: ['patient:read'],
        handler: jest.fn(),
      };

      const result = convertToolToMCPSchema(tool);

      expect(result.name).toBe('get_patient');
      expect(result.description).toBe('Retrieve patient data');
      expect(result.inputSchema).toHaveProperty('type', 'object');
      expect(result.metadata.category).toBe('patient');
      expect(result.metadata.requiredPermissions).toEqual(['patient:read']);
    });

    it('includes optional metadata when present', () => {
      const tool = {
        name: 'old_tool',
        description: 'Deprecated tool',
        category: 'patient' as const,
        inputSchema: z.object({}),
        requiredPermissions: [],
        handler: jest.fn(),
        deprecated: true,
        alternatives: ['new_tool'],
        dependsOn: ['auth_tool'],
        examples: [{ description: 'Example', input: { id: '1' } }],
      };

      const result = convertToolToMCPSchema(tool);

      expect(result.metadata.deprecated).toBe(true);
      expect(result.metadata.alternatives).toEqual(['new_tool']);
      expect(result.metadata.dependsOn).toEqual(['auth_tool']);
      expect(result.metadata.examples).toHaveLength(1);
    });

    it('omits optional metadata when absent', () => {
      const tool = {
        name: 'simple_tool',
        description: 'Simple tool',
        category: 'admin' as const,
        inputSchema: z.object({}),
        requiredPermissions: [],
        handler: jest.fn(),
      };

      const result = convertToolToMCPSchema(tool);

      expect(result.metadata).not.toHaveProperty('deprecated');
      expect(result.metadata).not.toHaveProperty('alternatives');
      expect(result.metadata).not.toHaveProperty('dependsOn');
    });
  });

  describe('convertAllToolsToMCPSchemas', () => {
    it('batch converts multiple tools', () => {
      const tools = [
        {
          name: 'tool_a',
          description: 'A',
          category: 'patient' as const,
          inputSchema: z.object({ id: z.string() }),
          requiredPermissions: ['patient:read'],
          handler: jest.fn(),
        },
        {
          name: 'tool_b',
          description: 'B',
          category: 'medication' as const,
          inputSchema: z.object({ rxId: z.string() }),
          requiredPermissions: ['medication:read'],
          handler: jest.fn(),
        },
      ];

      const results = convertAllToolsToMCPSchemas(tools);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('tool_a');
      expect(results[1].name).toBe('tool_b');
      expect(results[0].metadata.category).toBe('patient');
      expect(results[1].metadata.category).toBe('medication');
    });
  });
});
