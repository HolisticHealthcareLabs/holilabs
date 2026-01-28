/**
 * Edge Node API Router
 *
 * Exposes endpoints for:
 * - Traffic Light evaluation (local, <10ms)
 * - Assurance event capture
 * - Human decision recording
 * - Sync status and health
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '../lib/prisma.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { evaluateTrafficLight } from '../traffic-light/engine.js';
import { queueAssuranceEvent, queueHumanFeedback } from '../sync/queue.js';

// Import prisma from main module
let prisma: PrismaClient;

export function createApiRouter(prismaClient: PrismaClient): Router {
  prisma = prismaClient;
  const router = Router();

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAFFIC LIGHT EVALUATION (LOCAL - <10ms)
  // ═══════════════════════════════════════════════════════════════════════════

  const TrafficLightRequestSchema = z.object({
    patientHash: z.string(),
    action: z.enum(['order', 'prescription', 'procedure', 'diagnosis', 'billing']),
    payload: z.record(z.unknown()),
    inputContextSnapshot: z.record(z.unknown()).optional(),
  });

  router.post('/traffic-light/evaluate', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const parsed = TrafficLightRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parsed.error.issues,
        });
      }

      const { patientHash, action, payload, inputContextSnapshot } = parsed.data;

      // Get active rules from local cache
      const rules = await prisma.ruleCache.findMany({
        where: { isActive: true },
      });

      // Evaluate traffic light locally
      const result = await evaluateTrafficLight({
        patientHash,
        action,
        payload,
        rules,
      });

      const evaluationMs = Date.now() - startTime;

      // Log the evaluation
      await prisma.trafficLightLog.create({
        data: {
          patientHash,
          action,
          resultColor: result.color,
          signalCount: result.signals.length,
          signals: JSON.stringify(result.signals),
          ruleVersion: rules[0]?.version || 'unknown',
          evaluationMs,
        },
      });

      logger.info('Traffic light evaluation', {
        patientHash: patientHash.substring(0, 8) + '...',
        action,
        color: result.color,
        signalCount: result.signals.length,
        evaluationMs,
      });

      res.json({
        ...result,
        evaluationMs,
      });
    } catch (error) {
      logger.error('Traffic light evaluation failed', { error });
      res.status(500).json({ error: 'Evaluation failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSURANCE EVENT CAPTURE
  // ═══════════════════════════════════════════════════════════════════════════

  const AssuranceEventSchema = z.object({
    patientHash: z.string(),
    encounterId: z.string().optional(),
    eventType: z.enum(['diagnosis', 'treatment', 'order', 'alert', 'billing']),
    inputContextSnapshot: z.record(z.unknown()),
    aiRecommendation: z.record(z.unknown()),
    aiConfidence: z.number().optional(),
    aiProvider: z.string().optional(),
    aiLatencyMs: z.number().optional(),
    ruleVersionId: z.string().optional(),
    clinicId: z.string(),
  });

  router.post('/assurance/capture', async (req: Request, res: Response) => {
    try {
      const parsed = AssuranceEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parsed.error.issues,
        });
      }

      // Store locally and queue for cloud sync
      const event = await prisma.localAssuranceEvent.create({
        data: {
          patientHash: parsed.data.patientHash,
          encounterId: parsed.data.encounterId,
          eventType: parsed.data.eventType,
          inputContextSnapshot: JSON.stringify(parsed.data.inputContextSnapshot),
          aiRecommendation: JSON.stringify(parsed.data.aiRecommendation),
          aiConfidence: parsed.data.aiConfidence,
          aiProvider: parsed.data.aiProvider,
          aiLatencyMs: parsed.data.aiLatencyMs,
          ruleVersionId: parsed.data.ruleVersionId,
          clinicId: parsed.data.clinicId,
          syncStatus: 'pending',
        },
      });

      // Queue for cloud sync
      await queueAssuranceEvent(prisma, event);

      logger.info('Assurance event captured', {
        eventId: event.id,
        eventType: event.eventType,
        clinicId: event.clinicId,
      });

      res.status(201).json({
        id: event.id,
        queued: true,
      });
    } catch (error) {
      logger.error('Assurance event capture failed', { error });
      res.status(500).json({ error: 'Capture failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HUMAN DECISION RECORDING
  // ═══════════════════════════════════════════════════════════════════════════

  const HumanDecisionSchema = z.object({
    assuranceEventId: z.string(),
    decision: z.record(z.unknown()),
    override: z.boolean(),
    reason: z.string().optional(),
  });

  router.post('/assurance/decision', async (req: Request, res: Response) => {
    try {
      const parsed = HumanDecisionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parsed.error.issues,
        });
      }

      const { assuranceEventId, decision, override, reason } = parsed.data;

      // Update the assurance event with human decision
      await prisma.localAssuranceEvent.update({
        where: { id: assuranceEventId },
        data: {
          humanDecision: JSON.stringify(decision),
          humanOverride: override,
          overrideReason: reason,
        },
      });

      // If this was an override, capture feedback for RLHF
      if (override) {
        const feedback = await prisma.localHumanFeedback.create({
          data: {
            assuranceEventId,
            feedbackType: 'correction',
            feedbackValue: JSON.stringify({ decision, reason }),
            feedbackSource: 'physician', // Could be parameterized
            syncStatus: 'pending',
          },
        });

        await queueHumanFeedback(prisma, feedback);

        logger.info('Human override captured', {
          assuranceEventId,
          feedbackId: feedback.id,
          reason: reason?.substring(0, 50),
        });
      }

      res.json({ recorded: true });
    } catch (error) {
      logger.error('Human decision recording failed', { error });
      res.status(500).json({ error: 'Recording failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HUMAN FEEDBACK (THUMBS UP/DOWN)
  // ═══════════════════════════════════════════════════════════════════════════

  const FeedbackSchema = z.object({
    assuranceEventId: z.string(),
    feedbackType: z.enum(['thumbs_up', 'thumbs_down', 'correction', 'comment']),
    feedbackValue: z.record(z.unknown()),
    feedbackSource: z.enum(['physician', 'nurse', 'pharmacist', 'admin', 'billing']),
  });

  router.post('/feedback', async (req: Request, res: Response) => {
    try {
      const parsed = FeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parsed.error.issues,
        });
      }

      const feedback = await prisma.localHumanFeedback.create({
        data: {
          assuranceEventId: parsed.data.assuranceEventId,
          feedbackType: parsed.data.feedbackType,
          feedbackValue: JSON.stringify(parsed.data.feedbackValue),
          feedbackSource: parsed.data.feedbackSource,
          syncStatus: 'pending',
        },
      });

      await queueHumanFeedback(prisma, feedback);

      logger.info('Feedback captured', {
        feedbackId: feedback.id,
        type: feedback.feedbackType,
        source: feedback.feedbackSource,
      });

      res.status(201).json({
        id: feedback.id,
        queued: true,
      });
    } catch (error) {
      logger.error('Feedback capture failed', { error });
      res.status(500).json({ error: 'Capture failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  router.get('/sync/status', async (req: Request, res: Response) => {
    try {
      const syncState = await prisma.syncState.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      const pendingEvents = await prisma.localAssuranceEvent.count({
        where: { syncStatus: 'pending' },
      });

      const pendingFeedback = await prisma.localHumanFeedback.count({
        where: { syncStatus: 'pending' },
      });

      const queuedItems = await prisma.queueItem.count({
        where: { status: 'pending' },
      });

      const ruleVersion = await prisma.ruleVersion.findFirst({
        where: { isActive: true },
        orderBy: { timestamp: 'desc' },
      });

      // Check staleness
      const now = new Date();
      const lastSync = syncState?.lastSyncTime || new Date(0);
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      res.json({
        connectionStatus: syncState?.connectionStatus || 'unknown',
        lastSync: lastSync.toISOString(),
        hoursSinceSync: Math.round(hoursSinceSync),
        isStale: hoursSinceSync > 48,
        isCritical: hoursSinceSync > 168, // 7 days
        queue: {
          pendingEvents,
          pendingFeedback,
          queuedItems,
        },
        rules: {
          version: ruleVersion?.version || 'none',
          timestamp: ruleVersion?.timestamp?.toISOString() || null,
        },
      });
    } catch (error) {
      logger.error('Sync status check failed', { error });
      res.status(500).json({ error: 'Status check failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RULES MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  router.get('/rules', async (req: Request, res: Response) => {
    try {
      const rules = await prisma.ruleCache.findMany({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });

      const version = await prisma.ruleVersion.findFirst({
        where: { isActive: true },
        orderBy: { timestamp: 'desc' },
      });

      res.json({
        version: version?.version || 'none',
        timestamp: version?.timestamp?.toISOString() || null,
        ruleCount: rules.length,
        rules: rules.map(r => ({
          ruleId: r.ruleId,
          category: r.category,
          ruleType: r.ruleType,
          name: r.name,
          priority: r.priority,
        })),
      });
    } catch (error) {
      logger.error('Rules fetch failed', { error });
      res.status(500).json({ error: 'Rules fetch failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATIENT CACHE
  // ═══════════════════════════════════════════════════════════════════════════

  router.get('/patient/:patientHash', async (req: Request, res: Response) => {
    try {
      const { patientHash } = req.params;

      const patient = await prisma.patientCache.findUnique({
        where: { patientHash },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found in cache' });
      }

      // Check if cache is expired
      if (patient.expiresAt < new Date()) {
        return res.status(410).json({ error: 'Patient cache expired' });
      }

      res.json({
        patientHash: patient.patientHash,
        medications: JSON.parse(patient.medications),
        allergies: JSON.parse(patient.allergies),
        diagnoses: JSON.parse(patient.diagnoses),
        planInfo: patient.planInfo ? JSON.parse(patient.planInfo) : null,
        lastUpdated: patient.lastUpdated.toISOString(),
        expiresAt: patient.expiresAt.toISOString(),
      });
    } catch (error) {
      logger.error('Patient cache fetch failed', { error });
      res.status(500).json({ error: 'Fetch failed' });
    }
  });

  return router;
}

// Export for backwards compatibility
export const apiRouter: ReturnType<typeof Router> = Router();
