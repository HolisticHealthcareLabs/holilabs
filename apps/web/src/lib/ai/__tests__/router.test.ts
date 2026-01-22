/**
 * Router Tests
 *
 * Tests for AI routing logic: task routing, complexity analysis, fallbacks
 * All data is synthetic - NO PHI
 */

// Mock dependencies - logger uses manual mock from src/lib/__mocks__/logger.ts
jest.mock('@/lib/logger');
jest.mock('../chat', () => ({
  chat: jest.fn(),
}));

// Get mocked modules after jest.mock declarations
const { chat } = require('../chat');
const logger = require('@/lib/logger').default;

import {
  routeAIRequest,
  routeByTask,
  getProviderForTask,
  AIRouter,
  type ClinicalTask,
  type RouterConfig,
} from '../router';
import {
  testMessages,
  allClinicalTasks,
  safetyCriticalTasks,
  commodityTasks,
} from '../test-fixtures/test-data';
import { mockChatSuccessResponse, mockChatErrorResponse } from '../test-fixtures/mock-responses';
import { verifyNoPromptInLogs } from '../test-fixtures/test-helpers';

describe('router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chat as jest.Mock).mockResolvedValue(mockChatSuccessResponse);
  });

  describe('getProviderForTask', () => {
    it.each(safetyCriticalTasks)(
      'should route %s to claude (safety-critical)',
      (task) => {
        expect(getProviderForTask(task)).toBe('claude');
      }
    );

    it.each(commodityTasks)(
      'should route %s to gemini (cost-efficient)',
      (task) => {
        expect(getProviderForTask(task)).toBe('gemini');
      }
    );

    it('should return gemini for unknown task', () => {
      // @ts-expect-error Testing invalid task
      expect(getProviderForTask('unknown-task')).toBe('gemini');
    });

    it('should cover all defined clinical tasks', () => {
      allClinicalTasks.forEach((task) => {
        const provider = getProviderForTask(task);
        expect(['claude', 'gemini']).toContain(provider);
      });
    });
  });

  describe('complexity analysis', () => {
    it('should detect simple messages', async () => {
      await routeAIRequest({ messages: testMessages.simple });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          complexity: 'simple',
        })
      );
    });

    it('should detect moderate messages by length', async () => {
      await routeAIRequest({ messages: testMessages.moderate });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          complexity: 'moderate',
        })
      );
    });

    it('should detect complex messages by length (>1000 chars)', async () => {
      await routeAIRequest({ messages: testMessages.complex });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          complexity: 'complex',
        })
      );
    });

    it('should detect complex messages by conversation length (>5 messages)', async () => {
      await routeAIRequest({ messages: testMessages.multiTurn });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          complexity: 'complex',
        })
      );
    });

    it('should detect critical messages by keywords (emergency)', async () => {
      await routeAIRequest({ messages: testMessages.critical });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          complexity: 'critical',
        })
      );
    });

    it('should detect critical messages by Spanish keywords (emergencia)', async () => {
      await routeAIRequest({ messages: testMessages.criticalSpanish });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          complexity: 'critical',
        })
      );
    });

    it('should detect complex messages by keywords (differential, diagnosis)', async () => {
      await routeAIRequest({ messages: testMessages.complexKeywords });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          complexity: 'complex',
        })
      );
    });
  });

  describe('routeAIRequest', () => {
    it('should use explicit provider override', async () => {
      await routeAIRequest({
        messages: testMessages.simple,
        provider: 'openai',
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          selectedProvider: 'openai',
          routingReason: 'explicit_override',
        })
      );

      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
        })
      );
    });

    it('should use task-based routing when task is specified', async () => {
      await routeAIRequest({
        messages: testMessages.simple,
        task: 'drug-interaction',
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          selectedProvider: 'claude',
          routingReason: 'task_drug-interaction',
        })
      );
    });

    it('should use complexity-based routing when no task/provider specified', async () => {
      await routeAIRequest({
        messages: testMessages.critical,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          selectedProvider: 'claude',
          complexity: 'critical',
        })
      );
    });

    it('should prefer cheapest provider when configured', async () => {
      await routeAIRequest(
        { messages: testMessages.simple },
        { preferCheapest: true, primaryProvider: 'gemini' }
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          routingReason: 'cost_optimization',
        })
      );
    });

    it('should not override critical complexity even with preferCheapest', async () => {
      await routeAIRequest(
        { messages: testMessages.critical },
        { preferCheapest: true, primaryProvider: 'gemini' }
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedProvider: 'claude',
          complexity: 'critical',
        })
      );
    });

    it('should trigger fallback on provider failure', async () => {
      (chat as jest.Mock)
        .mockResolvedValueOnce(mockChatErrorResponse)
        .mockResolvedValueOnce(mockChatSuccessResponse);

      const result = await routeAIRequest(
        { messages: testMessages.simple },
        { fallbackProviders: ['together', 'claude'] }
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_fallback_triggered',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_fallback_attempt',
        })
      );

      expect(result.success).toBe(true);
    });

    it('should skip failed provider in fallback chain', async () => {
      (chat as jest.Mock)
        .mockResolvedValueOnce(mockChatErrorResponse)
        .mockResolvedValueOnce(mockChatSuccessResponse);

      await routeAIRequest(
        { messages: testMessages.simple, provider: 'gemini' },
        { fallbackProviders: ['gemini', 'together', 'claude'] }
      );

      // First fallback should be 'together', not 'gemini' (which is the failed provider)
      expect(chat).toHaveBeenCalledTimes(2);
    });

    it('should return last error when all fallbacks fail', async () => {
      (chat as jest.Mock).mockResolvedValue(mockChatErrorResponse);

      const result = await routeAIRequest(
        { messages: testMessages.simple },
        { fallbackProviders: ['together', 'claude'] }
      );

      expect(result.success).toBe(false);
    });

    it('should log completion with cost estimate', async () => {
      await routeAIRequest({ messages: testMessages.simple });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request_completed',
          estimatedCostCents: expect.any(Number),
        })
      );
    });

    it('should include token usage in completion log when available', async () => {
      await routeAIRequest({ messages: testMessages.simple });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request_completed',
          totalTokens: mockChatSuccessResponse.usage.totalTokens,
        })
      );
    });

    it('should return provider and complexity in response', async () => {
      const result = await routeAIRequest({ messages: testMessages.simple });

      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('complexity');
    });
  });

  describe('routeByTask', () => {
    it('should call routeAIRequest with task parameter', async () => {
      await routeByTask('translation', testMessages.simple);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_router_request',
          task: 'translation',
        })
      );
    });

    it('should pass through options', async () => {
      await routeByTask('general', testMessages.simple, {
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          maxTokens: 1000,
        })
      );
    });
  });

  describe('AIRouter helpers', () => {
    it('general() should route to general task', async () => {
      await AIRouter.general(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'gemini' })
      );
    });

    it('differential() should route to diagnosis-support task', async () => {
      await AIRouter.differential(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'claude' })
      );
    });

    it('drugInteractions() should route to drug-interaction task', async () => {
      await AIRouter.drugInteractions(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'claude' })
      );
    });

    it('prescriptionReview() should route to prescription-review task', async () => {
      await AIRouter.prescriptionReview(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'claude' })
      );
    });

    it('labInterpretation() should route to lab-interpretation task', async () => {
      await AIRouter.labInterpretation(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'claude' })
      );
    });

    it('clinicalNotes() should route to clinical-notes task', async () => {
      await AIRouter.clinicalNotes(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'gemini' })
      );
    });

    it('patientEducation() should route to patient-education task', async () => {
      await AIRouter.patientEducation(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'gemini' })
      );
    });

    it('translation() should route to translation task', async () => {
      await AIRouter.translation(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'gemini' })
      );
    });

    it('billingCodes() should route to billing-codes task', async () => {
      await AIRouter.billingCodes(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'gemini' })
      );
    });

    it('scheduling() should route to scheduling task', async () => {
      await AIRouter.scheduling(testMessages.simple);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'gemini' })
      );
    });

    it('auto() should use complexity-based routing', async () => {
      await AIRouter.auto(testMessages.critical);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          complexity: 'critical',
        })
      );
    });

    it('byTask() should be the routeByTask function', async () => {
      await AIRouter.byTask('translation', testMessages.simple);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          task: 'translation',
        })
      );
    });
  });

  describe('logging (no PHI)', () => {
    it('should not log message content', async () => {
      await routeAIRequest({ messages: testMessages.simple });

      // Use shared helper for standard PHI verification
      verifyNoPromptInLogs(logger, testMessages.simple[0].content);
    });

    it('should log event names and metadata only', async () => {
      await routeAIRequest({ messages: testMessages.simple });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.any(String),
          messageCount: expect.any(Number),
        })
      );
    });
  });
});
