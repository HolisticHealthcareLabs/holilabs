/**
 * Holi Labs Edge Node
 *
 * LOCAL-FIRST ARCHITECTURE:
 * This server runs on hospital LAN and provides:
 * - Traffic Light evaluation with <10ms latency
 * - Offline queue for assurance events
 * - Rule sync from cloud (firewall-safe HTTPS long polling)
 * - Patient cache for offline operation
 *
 * The edge node NEVER requires internet for blocking decisions.
 * It syncs with the cloud asynchronously when connection is stable.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from './lib/prisma.js';
import { logger } from './utils/logger.js';
import { createApiRouter } from './api/index.js';
import { startSyncServices } from './sync/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// BREAK-GLASS CHAT HELPER (RAG-ONLY MODE)
// ═══════════════════════════════════════════════════════════════════════════

interface ChatSignal {
  ruleId: string;
  ruleName: string;
  color: string;
  message: string;
  messagePortuguese: string;
  suggestedCorrection?: string;
  estimatedGlosaRisk?: {
    probability: number;
    estimatedAmount: number;
    denialCode?: string;
  };
}

interface ChatResponse {
  message: string;
  citations: Array<{
    source: string;
    text: string;
  }>;
}

/**
 * Generate a chat response based on signals and context.
 *
 * LEGAL SAFETY: RAG-ONLY MODE
 * This function ONLY provides guidance based on loaded rules and known regulations.
 * It does NOT hallucinate TISS codes or medical recommendations.
 */
function generateChatResponse(
  userMessage: string,
  signals?: ChatSignal[],
  context?: Record<string, unknown>
): ChatResponse {
  const citations: Array<{ source: string; text: string }> = [];

  // If no signals, provide general guidance
  if (!signals || signals.length === 0) {
    return {
      message: 'No active alerts to address. How can I help you with billing or clinical compliance?',
      citations: [],
    };
  }

  // Build response based on signal types
  const responseLines: string[] = [];

  // Group signals by color
  const redSignals = signals.filter(s => s.color === 'RED');
  const yellowSignals = signals.filter(s => s.color === 'YELLOW');

  if (redSignals.length > 0) {
    responseLines.push('**Critical Issues Requiring Attention:**\n');
    for (const signal of redSignals) {
      responseLines.push(`- **${signal.ruleName}**: ${signal.message}`);
      if (signal.suggestedCorrection) {
        responseLines.push(`  - *Suggested Action*: ${signal.suggestedCorrection}`);
      }
      if (signal.estimatedGlosaRisk) {
        responseLines.push(`  - *Glosa Risk*: R$${signal.estimatedGlosaRisk.estimatedAmount.toFixed(2)} (${Math.round(signal.estimatedGlosaRisk.probability * 100)}% probability)`);
        if (signal.estimatedGlosaRisk.denialCode) {
          citations.push({
            source: 'ANS Denial Codes',
            text: `Code ${signal.estimatedGlosaRisk.denialCode}: Common denial reason for this type of issue`,
          });
        }
      }
    }
    responseLines.push('');
  }

  if (yellowSignals.length > 0) {
    responseLines.push('**Warnings to Review:**\n');
    for (const signal of yellowSignals) {
      responseLines.push(`- **${signal.ruleName}**: ${signal.message}`);
      if (signal.suggestedCorrection) {
        responseLines.push(`  - *Suggested Action*: ${signal.suggestedCorrection}`);
      }
    }
    responseLines.push('');
  }

  // Add context-specific guidance based on user question
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('glosa') || lowerMessage.includes('denial') || lowerMessage.includes('negativa')) {
    responseLines.push('**Glosa Prevention Guidance:**');
    responseLines.push('1. Ensure all TISS codes match the patient\'s health plan coverage');
    responseLines.push('2. Verify prior authorization is documented for OPME and high-cost procedures');
    responseLines.push('3. Confirm CID-10 diagnosis code supports the requested procedure');
    citations.push({
      source: 'ANS RN 465/2021',
      text: 'Prior authorization requirements for special materials and high-cost procedures',
    });
  }

  if (lowerMessage.includes('override') || lowerMessage.includes('justificativa') || lowerMessage.includes('justify')) {
    responseLines.push('**Override Justification Guidelines:**');
    responseLines.push('- Document the clinical rationale for proceeding despite the alert');
    responseLines.push('- Reference patient-specific factors that make this exception appropriate');
    responseLines.push('- For billing overrides, attach supporting documentation');
    citations.push({
      source: 'LGPD Article 20',
      text: 'Automated decision transparency requires documented justification for overrides',
    });
  }

  if (lowerMessage.includes('tiss') || lowerMessage.includes('codigo') || lowerMessage.includes('code')) {
    responseLines.push('**TISS Code Guidance:**');
    responseLines.push('- I cannot recommend specific TISS codes without verification');
    responseLines.push('- Please consult your billing department for code validation');
    responseLines.push('- Verify the code in the ANS TUSS table: https://www.gov.br/ans/pt-br/assuntos/prestadores/tuss-702-terminologia-unificada-da-saude-suplementar');
    citations.push({
      source: 'ANS TUSS Table',
      text: 'Official terminology for health services billing',
    });
  }

  // Default helpful closing
  if (responseLines.length === 0) {
    responseLines.push('I can help you understand the current alerts and how to resolve them.');
    responseLines.push('Please ask about specific signals or what action you\'d like to take.');
  }

  return {
    message: responseLines.join('\n'),
    citations,
  };
}

/**
 * Detect the action type from sidecar context
 */
function detectActionFromContext(context?: {
  medication?: unknown;
  procedure?: unknown;
  diagnosis?: unknown;
  text?: string;
}): 'order' | 'prescription' | 'procedure' | 'diagnosis' | 'billing' {
  if (!context) return 'prescription';

  // Check for specific field types
  if (context.medication) return 'prescription';
  if (context.procedure) return 'procedure';
  if (context.diagnosis) return 'diagnosis';

  // Check text content for hints
  const text = (context.text || '').toLowerCase();
  if (text.includes('medicamento') || text.includes('medication') || text.includes('mg') || text.includes('ml')) {
    return 'prescription';
  }
  if (text.includes('procedimento') || text.includes('cirurgia') || text.includes('surgery')) {
    return 'procedure';
  }
  if (text.includes('cid') || text.includes('diagnóstico') || text.includes('diagnosis')) {
    return 'diagnosis';
  }
  if (text.includes('tiss') || text.includes('fatura') || text.includes('billing')) {
    return 'billing';
  }

  return 'prescription'; // Default
}

/**
 * Build a standardized payload from sidecar context
 */
function buildPayloadFromContext(context?: {
  source?: string;
  text?: string;
  formFields?: Record<string, string>;
  medication?: {
    name?: string;
    dose?: string;
    route?: string;
    frequency?: string;
  };
  procedure?: {
    code?: string;
    name?: string;
    tissCode?: string;
  };
  diagnosis?: {
    code?: string;
    name?: string;
    icd10?: string;
  };
}): Record<string, unknown> {
  if (!context) return {};

  const payload: Record<string, unknown> = {
    source: context.source || 'sidecar',
    rawText: context.text,
  };

  // Include form fields
  if (context.formFields) {
    Object.assign(payload, context.formFields);
  }

  // Include medication details
  if (context.medication) {
    payload.medication = context.medication.name;
    payload.dose = context.medication.dose;
    payload.route = context.medication.route;
    payload.frequency = context.medication.frequency;
  }

  // Include procedure details
  if (context.procedure) {
    payload.procedureCode = context.procedure.code || context.procedure.tissCode;
    payload.procedureName = context.procedure.name;
    payload.tissCode = context.procedure.tissCode;
  }

  // Include diagnosis details
  if (context.diagnosis) {
    payload.diagnosisCode = context.diagnosis.code || context.diagnosis.icd10;
    payload.diagnosisName = context.diagnosis.name;
    payload.icd10 = context.diagnosis.icd10;
  }

  return payload;
}

// Initialize Prisma
const prisma = new PrismaClient();

// Configuration
const PORT = process.env.EDGE_PORT || 3001;
const CLOUD_URL = process.env.CLOUD_URL || 'https://api.holilabs.com';
const CLINIC_ID = process.env.CLINIC_ID;

async function main() {
  logger.info('Starting Holi Labs Edge Node...');

  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('Database connection established (SQLite)');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  }

  // Initialize Express app
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Check database
      await prisma.$queryRaw`SELECT 1`;

      // Get sync state
      const syncState = await prisma.syncState.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      const ruleVersion = await prisma.ruleVersion.findFirst({
        where: { isActive: true },
        orderBy: { timestamp: 'desc' },
      });

      // Check staleness
      const now = new Date();
      const lastSync = syncState?.lastSyncTime || new Date(0);
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
      const isStale = hoursSinceSync > 48;
      const isCritical = hoursSinceSync > 168; // 7 days

      res.json({
        status: 'healthy',
        version: '1.0.0',
        database: 'connected',
        sync: {
          connectionStatus: syncState?.connectionStatus || 'unknown',
          lastSync: lastSync.toISOString(),
          hoursSinceSync: Math.round(hoursSinceSync),
          isStale,
          isCritical,
        },
        rules: {
          version: ruleVersion?.version || 'none',
          timestamp: ruleVersion?.timestamp?.toISOString() || null,
        },
        clinic: {
          id: CLINIC_ID || 'not_configured',
        },
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // API routes
  app.use('/api', createApiRouter(prisma));

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDECAR-SPECIFIC ROUTES
  // These endpoints are called by the Desktop Sidecar overlay
  // ═══════════════════════════════════════════════════════════════════════════

  // Sidecar status endpoint
  app.get('/sidecar/status', async (req, res) => {
    try {
      const syncState = await prisma.syncState.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      const ruleVersion = await prisma.ruleVersion.findFirst({
        where: { isActive: true },
        orderBy: { timestamp: 'desc' },
      });

      const pendingQueueItems = await prisma.queueItem.count({
        where: { status: 'pending' },
      });

      const now = new Date();
      const lastSync = syncState?.lastSyncTime || new Date(0);
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      res.json({
        status: 'healthy',
        edgeVersion: '1.0.0',
        connectionStatus: syncState?.connectionStatus || 'unknown',
        lastSync: lastSync.toISOString(),
        ruleVersion: ruleVersion?.version || 'none',
        ruleTimestamp: ruleVersion?.timestamp?.toISOString() || null,
        isStale: hoursSinceSync > 48,
        isCritical: hoursSinceSync > 168,
        pendingQueueItems,
      });
    } catch (error) {
      logger.error('Sidecar status check failed', { error });
      res.status(500).json({ error: 'Status check failed' });
    }
  });

  // Sidecar rules endpoint
  app.get('/sidecar/rules', async (req, res) => {
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
      logger.error('Sidecar rules fetch failed', { error });
      res.status(500).json({ error: 'Rules fetch failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDECAR TRAFFIC LIGHT EVALUATION
  // Called by Desktop Sidecar overlay for real-time evaluation
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/sidecar/evaluate', async (req, res) => {
    const startTime = Date.now();

    try {
      // Handle both API formats:
      // 1. Standard: { patientHash, action, payload, inputContextSnapshot }
      // 2. Sidecar client: { patientId, context, inputContextSnapshot, sessionId }
      const {
        patientHash,
        patientId,
        action,
        payload,
        context,
        inputContextSnapshot,
      } = req.body;

      // Normalize to standard format
      const normalizedPatientHash = patientHash || patientId || 'unknown';
      const normalizedAction = action || detectActionFromContext(context);
      const normalizedPayload = payload || buildPayloadFromContext(context);

      // Import the traffic light engine
      const { evaluateTrafficLight } = await import('./traffic-light/engine.js');

      // Get active rules from local cache
      const rules = await prisma.ruleCache.findMany({
        where: { isActive: true },
      });

      // Evaluate traffic light locally (<10ms)
      const result = await evaluateTrafficLight({
        patientHash: normalizedPatientHash,
        action: normalizedAction,
        payload: normalizedPayload,
        rules,
      });

      const evaluationMs = Date.now() - startTime;

      // Log the evaluation
      try {
        await prisma.trafficLightLog.create({
          data: {
            patientHash: normalizedPatientHash,
            action: normalizedAction,
            resultColor: result.color,
            signalCount: result.signals.length,
            signals: JSON.stringify(result.signals),
            ruleVersion: rules[0]?.version || 'unknown',
            evaluationMs,
          },
        });
      } catch (logError) {
        // Non-fatal - don't fail evaluation if logging fails
        logger.warn('Failed to log traffic light evaluation', { error: logError });
      }

      logger.info('Traffic light evaluation', {
        patientHash: normalizedPatientHash.substring(0, 8) + '...',
        action: normalizedAction,
        color: result.color,
        signalCount: result.signals.length,
        evaluationMs,
      });

      res.json({
        ...result,
        evaluationMs,
      });
    } catch (error) {
      logger.error('Sidecar evaluation failed', { error });
      res.status(500).json({ error: 'Evaluation failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDECAR HUMAN DECISION RECORDING
  // Records physician overrides with justification (for RLHF training)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/sidecar/decision', async (req, res) => {
    try {
      // Handle both API formats:
      // 1. Standard: { assuranceEventId, decision, override, reason, patientHash, action, signals }
      // 2. Sidecar client: { patientId, signals, overrideDecision: { proceed, justification, supervisorApproval }, sessionId }
      const {
        assuranceEventId,
        decision,
        override,
        reason,
        patientHash,
        patientId,
        action,
        signals,
        overrideDecision,
        sessionId,
      } = req.body;

      // Normalize to standard format
      const normalizedPatientHash = patientHash || patientId || 'unknown';
      const normalizedOverride = override ?? overrideDecision?.proceed ?? false;
      const normalizedReason = reason || overrideDecision?.justification;
      const normalizedDecision = decision || {
        proceed: normalizedOverride,
        justification: normalizedReason,
        supervisorApproval: overrideDecision?.supervisorApproval,
        signals: signals?.map((s: { ruleId: string; color: string }) => s.ruleId),
      };

      // If we have an existing assurance event, update it
      if (assuranceEventId) {
        await prisma.localAssuranceEvent.update({
          where: { id: assuranceEventId },
          data: {
            humanDecision: JSON.stringify(normalizedDecision),
            humanOverride: normalizedOverride,
            overrideReason: normalizedReason,
          },
        });

        // If this was an override, capture feedback for RLHF
        if (normalizedOverride) {
          const { queueHumanFeedback } = await import('./sync/queue.js');
          const feedback = await prisma.localHumanFeedback.create({
            data: {
              assuranceEventId,
              feedbackType: 'correction',
              feedbackValue: JSON.stringify({ decision: normalizedDecision, reason: normalizedReason, signals }),
              feedbackSource: 'physician',
              syncStatus: 'pending',
            },
          });

          await queueHumanFeedback(prisma, feedback);

          logger.info('Human override captured', {
            assuranceEventId,
            feedbackId: feedback.id,
            reason: normalizedReason?.substring(0, 50),
          });
        }

        res.json({ recorded: true, success: true, eventId: assuranceEventId });
      } else {
        // Create a new decision record without a prior assurance event
        // This happens when sidecar captures override without prior AI evaluation
        const { queueAssuranceEvent } = await import('./sync/queue.js');

        const event = await prisma.localAssuranceEvent.create({
          data: {
            patientHash: normalizedPatientHash,
            eventType: action || 'alert',
            inputContextSnapshot: JSON.stringify({ signals, fromSidecar: true, sessionId }),
            aiRecommendation: JSON.stringify({ signals }),
            humanDecision: JSON.stringify(normalizedDecision),
            humanOverride: normalizedOverride,
            overrideReason: normalizedReason,
            clinicId: process.env.CLINIC_ID || 'demo-clinic',
            syncStatus: 'pending',
          },
        });

        await queueAssuranceEvent(prisma, event);

        logger.info('Sidecar decision recorded', {
          eventId: event.id,
          override: normalizedOverride,
          reason: normalizedReason?.substring(0, 50),
        });

        res.json({ recorded: true, success: true, eventId: event.id });
      }
    } catch (error) {
      logger.error('Sidecar decision recording failed', { error });
      res.status(500).json({ error: 'Recording failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDECAR BREAK-GLASS CHAT
  // RAG-only chat for corrective actions assistance
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/sidecar/chat', async (req, res) => {
    try {
      const { message, context, signals, sessionId } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // For now, return a helpful response based on the signals
      // In production, this would connect to a RAG system with ANS/TISS documentation
      const response = generateChatResponse(message, signals, context);

      logger.info('Sidecar chat message', {
        sessionId,
        messageLength: message.length,
        signalCount: signals?.length || 0,
      });

      res.json({
        response,
        citations: response.citations,
        sessionId: sessionId || `chat-${Date.now()}`,
      });
    } catch (error) {
      logger.error('Sidecar chat failed', { error });
      res.status(500).json({ error: 'Chat failed' });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start HTTP server
  app.listen(PORT, () => {
    logger.info(`Edge node listening on port ${PORT}`);
    logger.info(`Cloud URL: ${CLOUD_URL}`);
    logger.info(`Clinic ID: ${CLINIC_ID || 'not configured'}`);
  });

  // Start sync services (rule updates, queue processing)
  await startSyncServices(prisma, CLOUD_URL);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down edge node...');
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Fatal error', { error });
  process.exit(1);
});

export { prisma };
