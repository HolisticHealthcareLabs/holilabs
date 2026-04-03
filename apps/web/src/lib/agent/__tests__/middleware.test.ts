/**
 * Agent Middleware Contract Tests
 *
 * Validates DI-based middleware factories:
 * - RBAC: blocks on missing permissions (CVI-001)
 * - Consent: LGPD Art. 7/11 verification
 * - DeId: strips PII from inputs (RVI-006)
 * - Audit: append-only write (CVI-004/005)
 * - Cost: records tool usage
 * - buildStandardMiddleware: correct phase/priority order
 */

import {
  createRBACMiddleware,
  createConsentMiddleware,
  createDeIdMiddleware,
  createAuditMiddleware,
  createCostMiddleware,
  buildStandardMiddleware,
} from '@holi/shared-kernel/agent/middleware';
import type {
  RBACChecker,
  ConsentVerifier,
  DeIdentifier,
  AuditWriter,
  CostTracker,
} from '@holi/shared-kernel/agent/middleware';
import type { ToolContext, AgentRequest } from '@holi/shared-kernel/agent/types';

function makeToolContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    toolCall: { id: 'tc-1', name: 'get_patient', input: { patientId: 'p1' } },
    request: {
      prompt: 'test',
      provider: { type: 'claude', model: 'test' },
      tools: [],
      middleware: [],
      tenantContext: {
        organizationId: 'org-1',
        clinicianId: 'doc-1',
        roles: ['CLINICIAN'],
        sessionId: 'sess-1',
        agentId: 'agent-1',
      },
    } as AgentRequest,
    ...overrides,
  };
}

describe('Agent Middleware', () => {
  describe('createRBACMiddleware', () => {
    const checker: RBACChecker = {
      checkPermission(roles, required) {
        const missing = required.filter(p => !roles.includes(p));
        return { allowed: missing.length === 0, missing };
      },
    };

    it('allows when roles satisfy required permissions', async () => {
      const mw = createRBACMiddleware(checker, { get_patient: ['patient:read'] });
      const ctx = makeToolContext();
      ctx.request.tenantContext = { ...ctx.request.tenantContext!, roles: ['patient:read'] };

      const result = await mw.handler(ctx);
      expect(result.blocked).toBe(false);
    });

    it('blocks when roles lack required permissions (CVI-001)', async () => {
      const mw = createRBACMiddleware(checker, { get_patient: ['patient:write'] });
      const ctx = makeToolContext();
      ctx.request.tenantContext = { ...ctx.request.tenantContext!, roles: ['patient:read'] };

      const result = await mw.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('RBAC');
      expect(result.reason).toContain('patient:write');
    });

    it('allows tools without explicit permission requirements', async () => {
      const mw = createRBACMiddleware(checker, {});
      const result = await mw.handler(makeToolContext());
      expect(result.blocked).toBe(false);
    });

    it('suggests escalation for clinical permissions', async () => {
      const mw = createRBACMiddleware(checker, { prescribe_med: ['prescribe'] });
      const ctx = makeToolContext({
        toolCall: { id: 'tc-1', name: 'prescribe_med', input: {} },
      });
      ctx.request.tenantContext = { ...ctx.request.tenantContext!, roles: ['NURSE'] };

      const result = await mw.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.suggestion).toContain('CLINICIAN');
    });

    it('has pre phase and priority 10', () => {
      const mw = createRBACMiddleware(checker, {});
      expect(mw.phase).toBe('pre');
      expect(mw.priority).toBe(10);
      expect(mw.name).toBe('rbac');
    });
  });

  describe('createConsentMiddleware', () => {
    it('allows when consent is granted', async () => {
      const verifier: ConsentVerifier = {
        async verifyConsent() { return { granted: true }; },
      };
      const mw = createConsentMiddleware(verifier, { get_patient: 'clinical_data' });
      const result = await mw.handler(makeToolContext());
      expect(result.blocked).toBe(false);
    });

    it('blocks when consent is denied (LGPD)', async () => {
      const verifier: ConsentVerifier = {
        async verifyConsent() { return { granted: false, reason: 'Patient withdrew consent' }; },
      };
      const mw = createConsentMiddleware(verifier, { get_patient: 'clinical_data' });
      const result = await mw.handler(makeToolContext());
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('LGPD_CONSENT_DENIED');
    });

    it('skips consent for tools without mapping', async () => {
      const verifier: ConsentVerifier = {
        async verifyConsent() { return { granted: false }; },
      };
      const mw = createConsentMiddleware(verifier, {});
      const result = await mw.handler(makeToolContext());
      expect(result.blocked).toBe(false);
    });

    it('passes emergency override to verifier', async () => {
      let receivedOverride = false;
      const verifier: ConsentVerifier = {
        async verifyConsent(_pid, _type, override) {
          receivedOverride = override ?? false;
          return { granted: true };
        },
      };
      const mw = createConsentMiddleware(verifier, { get_patient: 'clinical_data' });
      const ctx = makeToolContext();
      ctx.request.tenantContext = {
        ...ctx.request.tenantContext!,
        emergencyOverride: true,
        emergencyJustification: 'Critical patient',
      };
      await mw.handler(ctx);
      expect(receivedOverride).toBe(true);
    });

    it('has pre phase and priority 20', () => {
      const verifier: ConsentVerifier = {
        async verifyConsent() { return { granted: true }; },
      };
      const mw = createConsentMiddleware(verifier, {});
      expect(mw.phase).toBe('pre');
      expect(mw.priority).toBe(20);
      expect(mw.name).toBe('consent');
    });
  });

  describe('createDeIdMiddleware', () => {
    it('mutates input for tools requiring de-id (RVI-006)', async () => {
      const deidentifier: DeIdentifier = {
        async deidentify(input) {
          return { ...input, patientId: '[REDACTED]' };
        },
      };
      const mw = createDeIdMiddleware(deidentifier, new Set(['get_patient']));
      const result = await mw.handler(makeToolContext());
      expect(result.blocked).toBe(false);
      expect(result.mutatedInput).toEqual({ patientId: '[REDACTED]' });
    });

    it('passes through tools not requiring de-id', async () => {
      const deidentifier: DeIdentifier = {
        async deidentify() { throw new Error('should not be called'); },
      };
      const mw = createDeIdMiddleware(deidentifier, new Set(['other_tool']));
      const result = await mw.handler(makeToolContext());
      expect(result.blocked).toBe(false);
      expect(result.mutatedInput).toBeUndefined();
    });

    it('hard-blocks on de-id failure (RVI-006)', async () => {
      const deidentifier: DeIdentifier = {
        async deidentify() { throw new Error('Presidio unavailable'); },
      };
      const mw = createDeIdMiddleware(deidentifier, new Set(['get_patient']));
      const result = await mw.handler(makeToolContext());
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('DE_ID_FAILED');
    });

    it('has pre phase and priority 30', () => {
      const deidentifier: DeIdentifier = {
        async deidentify(i) { return i; },
      };
      const mw = createDeIdMiddleware(deidentifier, new Set());
      expect(mw.phase).toBe('pre');
      expect(mw.priority).toBe(30);
      expect(mw.name).toBe('deid');
    });
  });

  describe('createAuditMiddleware', () => {
    it('writes audit entry after tool execution (CVI-004)', async () => {
      let writtenEntry: Record<string, unknown> | null = null;
      const writer: AuditWriter = {
        async writeEntry(params) {
          writtenEntry = params as unknown as Record<string, unknown>;
        },
      };
      const mw = createAuditMiddleware(writer);
      const ctx = makeToolContext({
        toolResult: { success: true, data: { id: 'p1' } },
      });
      await mw.handler(ctx);

      expect(writtenEntry).toBeDefined();
      expect(writtenEntry!.action).toContain('SUCCESS');
      expect(writtenEntry!.toolName).toBe('get_patient');
    });

    it('records failure on tool error', async () => {
      let writtenEntry: Record<string, unknown> | null = null;
      const writer: AuditWriter = {
        async writeEntry(params) {
          writtenEntry = params as unknown as Record<string, unknown>;
        },
      };
      const mw = createAuditMiddleware(writer);
      const ctx = makeToolContext({
        toolResult: { success: false, data: null, error: 'timeout' },
      });
      await mw.handler(ctx);
      expect(writtenEntry!.action).toContain('FAILURE');
    });

    it('swallows audit write errors (non-fatal)', async () => {
      const writer: AuditWriter = {
        async writeEntry() { throw new Error('Redis down'); },
      };
      const mw = createAuditMiddleware(writer);
      const ctx = makeToolContext({
        toolResult: { success: true, data: {} },
      });
      const result = await mw.handler(ctx);
      expect(result.blocked).toBe(false);
    });

    it('has post phase and priority 10', () => {
      const mw = createAuditMiddleware({ writeEntry: async () => {} });
      expect(mw.phase).toBe('post');
      expect(mw.priority).toBe(10);
      expect(mw.name).toBe('audit');
    });
  });

  describe('createCostMiddleware', () => {
    it('records tool usage for cost tracking', async () => {
      let recorded = false;
      const tracker: CostTracker = {
        async recordToolUsage() { recorded = true; },
      };
      const mw = createCostMiddleware(tracker);
      const ctx = makeToolContext({
        toolResult: { success: true, data: {} },
      });
      await mw.handler(ctx);
      expect(recorded).toBe(true);
    });

    it('has post phase and priority 20', () => {
      const mw = createCostMiddleware({ recordToolUsage: async () => {} });
      expect(mw.phase).toBe('post');
      expect(mw.priority).toBe(20);
      expect(mw.name).toBe('cost');
    });
  });

  describe('buildStandardMiddleware', () => {
    it('returns 5 middleware in correct phase/priority order', () => {
      const stack = buildStandardMiddleware({
        rbac: {
          checker: { checkPermission: () => ({ allowed: true, missing: [] }) },
          permissions: {},
        },
        consent: {
          verifier: { verifyConsent: async () => ({ granted: true }) },
          consentMap: {},
        },
        deid: {
          deidentifier: { deidentify: async (i) => i },
          toolsRequiringDeId: new Set(),
        },
        audit: { writeEntry: async () => {} },
        cost: { recordToolUsage: async () => {} },
      });

      expect(stack).toHaveLength(5);

      const pre = stack.filter(m => m.phase === 'pre');
      expect(pre).toHaveLength(3);
      expect(pre[0].name).toBe('rbac');
      expect(pre[1].name).toBe('consent');
      expect(pre[2].name).toBe('deid');

      const post = stack.filter(m => m.phase === 'post');
      expect(post).toHaveLength(2);
      expect(post[0].name).toBe('audit');
      expect(post[1].name).toBe('cost');
    });
  });
});
