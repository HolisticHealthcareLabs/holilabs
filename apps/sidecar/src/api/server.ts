/**
 * Sidecar Local API Server
 *
 * Express-based local API for Sidecar ↔ Edge Node communication.
 * Runs on localhost only (not exposed to network).
 *
 * Endpoints:
 * - POST /sidecar/context    - Send current screen context
 * - POST /sidecar/evaluate   - Get traffic light for action
 * - POST /sidecar/decision   - Record human decision
 * - POST /sidecar/chat       - Break-glass corrective actions
 * - GET  /sidecar/status     - Health check + connection status
 *
 * @module sidecar/api/server
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import type {
  InputContext,
  TrafficLightResult,
  TrafficLightSignal,
  ChatMessage,
  RAGContext,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ContextRequest {
  patientIdHash?: string;
  encounterId?: string;
  source: 'accessibility' | 'ocr' | 'manual';
  rawText?: string;
  formFields?: Record<string, string>;
  screenshot?: string;
  medication?: {
    name: string;
    dose?: string;
    frequency?: string;
    route?: string;
  };
  procedure?: {
    code: string;
    description?: string;
  };
  diagnosis?: {
    icd10Code: string;
    description?: string;
  };
}

interface EvaluateRequest {
  patientId: string;
  encounterId?: string;
  action: 'order' | 'prescription' | 'procedure' | 'diagnosis' | 'billing';
  payload: Record<string, unknown>;
  inputContextSnapshot: Record<string, unknown>;
}

interface DecisionRequest {
  assuranceEventId: string;
  decision: Record<string, unknown>;
  override: boolean;
  reason?: string;
  signals?: TrafficLightSignal[];
}

interface ChatRequest {
  message: string;
  trafficLightResult?: TrafficLightResult;
  ragContext?: RAGContext;
}

interface StatusResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  edgeConnection: 'connected' | 'degraded' | 'offline';
  ruleVersion: {
    version: string;
    timestamp: Date;
    isStale: boolean;
    stalenessWarning?: string;
  };
  lastSync: Date | null;
  ehrDetected: {
    name: string;
    version: string;
  } | null;
  vdiEnvironment: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API SERVER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SidecarAPIServer {
  private app: express.Application;
  private server: ReturnType<express.Application['listen']> | null = null;
  private port: number;

  // External handlers (injected from main process)
  private contextHandler: ((ctx: ContextRequest) => Promise<void>) | null = null;
  private evaluateHandler: ((req: EvaluateRequest) => Promise<TrafficLightResult>) | null = null;
  private decisionHandler: ((req: DecisionRequest) => Promise<void>) | null = null;
  private chatHandler: ((req: ChatRequest) => Promise<ChatMessage>) | null = null;
  private statusHandler: (() => Promise<StatusResponse>) | null = null;

  constructor(port: number = 3002) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  onContext(handler: (ctx: ContextRequest) => Promise<void>): void {
    this.contextHandler = handler;
  }

  onEvaluate(handler: (req: EvaluateRequest) => Promise<TrafficLightResult>): void {
    this.evaluateHandler = handler;
  }

  onDecision(handler: (req: DecisionRequest) => Promise<void>): void {
    this.decisionHandler = handler;
  }

  onChat(handler: (req: ChatRequest) => Promise<ChatMessage>): void {
    this.chatHandler = handler;
  }

  onStatus(handler: () => Promise<StatusResponse>): void {
    this.statusHandler = handler;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVER LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '127.0.0.1', () => {
          console.info(`Sidecar API server running on http://127.0.0.1:${this.port}`);
          resolve();
        });

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`Port ${this.port} is already in use`);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.info('Sidecar API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════

  private setupMiddleware(): void {
    // Only allow localhost connections
    this.app.use(cors({
      origin: ['http://127.0.0.1', 'http://localhost'],
      credentials: true,
    }));

    this.app.use(express.json({ limit: '10mb' })); // Large for screenshots

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      console.debug(`[Sidecar API] ${req.method} ${req.path}`);
      next();
    });

    // Security: Reject non-localhost requests
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.socket.remoteAddress;
      if (clientIP !== '127.0.0.1' && clientIP !== '::1' && clientIP !== '::ffff:127.0.0.1') {
        console.warn(`Rejected request from non-localhost: ${clientIP}`);
        res.status(403).json({ error: 'Forbidden: localhost only' });
        return;
      }
      next();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  private setupRoutes(): void {
    // ─────────────────────────────────────────────────────────────────────────
    // POST /sidecar/context - Send current screen context
    // ─────────────────────────────────────────────────────────────────────────
    this.app.post('/sidecar/context', async (req: Request, res: Response) => {
      try {
        if (!this.contextHandler) {
          res.status(503).json({ error: 'Context handler not registered' });
          return;
        }

        const context: ContextRequest = req.body;

        // Validate required fields
        if (!context.source) {
          res.status(400).json({ error: 'Missing required field: source' });
          return;
        }

        await this.contextHandler(context);

        res.status(200).json({
          success: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Context submission failed:', error);
        res.status(500).json({
          error: 'Failed to process context',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // POST /sidecar/evaluate - Get traffic light for action
    // ─────────────────────────────────────────────────────────────────────────
    this.app.post('/sidecar/evaluate', async (req: Request, res: Response) => {
      try {
        if (!this.evaluateHandler) {
          res.status(503).json({ error: 'Evaluate handler not registered' });
          return;
        }

        const evaluateRequest: EvaluateRequest = req.body;

        // Validate required fields
        if (!evaluateRequest.patientId || !evaluateRequest.action || !evaluateRequest.payload) {
          res.status(400).json({
            error: 'Missing required fields: patientId, action, payload',
          });
          return;
        }

        const startTime = Date.now();
        const result = await this.evaluateHandler(evaluateRequest);
        const latencyMs = Date.now() - startTime;

        res.status(200).json({
          ...result,
          meta: {
            latencyMs,
            timestamp: new Date().toISOString(),
            evaluatedLocally: true,
          },
        });
      } catch (error) {
        console.error('Evaluation failed:', error);
        res.status(500).json({
          error: 'Failed to evaluate',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // POST /sidecar/decision - Record human decision
    // ─────────────────────────────────────────────────────────────────────────
    this.app.post('/sidecar/decision', async (req: Request, res: Response) => {
      try {
        if (!this.decisionHandler) {
          res.status(503).json({ error: 'Decision handler not registered' });
          return;
        }

        const decisionRequest: DecisionRequest = req.body;

        // Validate required fields
        if (!decisionRequest.assuranceEventId || decisionRequest.decision === undefined) {
          res.status(400).json({
            error: 'Missing required fields: assuranceEventId, decision',
          });
          return;
        }

        // Validate override requires reason (LGPD Article 20)
        if (decisionRequest.override && (!decisionRequest.reason || decisionRequest.reason.length < 10)) {
          res.status(400).json({
            error: 'Override requires justification (min 10 characters)',
          });
          return;
        }

        await this.decisionHandler(decisionRequest);

        res.status(200).json({
          success: true,
          recorded: true,
          timestamp: new Date().toISOString(),
          message: decisionRequest.override
            ? 'Override recorded with justification'
            : 'Decision recorded',
        });
      } catch (error) {
        console.error('Decision recording failed:', error);
        res.status(500).json({
          error: 'Failed to record decision',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // POST /sidecar/chat - Break-glass corrective actions
    // ─────────────────────────────────────────────────────────────────────────
    this.app.post('/sidecar/chat', async (req: Request, res: Response) => {
      try {
        if (!this.chatHandler) {
          res.status(503).json({ error: 'Chat handler not registered' });
          return;
        }

        const chatRequest: ChatRequest = req.body;

        // Validate required fields
        if (!chatRequest.message || chatRequest.message.trim().length === 0) {
          res.status(400).json({ error: 'Missing required field: message' });
          return;
        }

        const startTime = Date.now();
        const response = await this.chatHandler(chatRequest);
        const latencyMs = Date.now() - startTime;

        res.status(200).json({
          ...response,
          meta: {
            latencyMs,
            timestamp: new Date().toISOString(),
            ragOnly: true, // Always RAG-only for legal safety
          },
        });
      } catch (error) {
        console.error('Chat failed:', error);
        res.status(500).json({
          error: 'Failed to process chat',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // GET /sidecar/status - Health check + connection status
    // ─────────────────────────────────────────────────────────────────────────
    this.app.get('/sidecar/status', async (_req: Request, res: Response) => {
      try {
        if (!this.statusHandler) {
          // Return basic status if handler not registered
          res.status(200).json({
            status: 'healthy',
            edgeConnection: 'unknown',
            ruleVersion: null,
            lastSync: null,
            ehrDetected: null,
            vdiEnvironment: null,
          });
          return;
        }

        const status = await this.statusHandler();

        res.status(200).json({
          ...status,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Status check failed:', error);
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Health check (simple ping)
    // ─────────────────────────────────────────────────────────────────────────
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', service: 'sidecar-api' });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 404 handler
    // ─────────────────────────────────────────────────────────────────────────
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Error handler
    // ─────────────────────────────────────────────────────────────────────────
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ContextRequest,
  EvaluateRequest,
  DecisionRequest,
  ChatRequest,
  StatusResponse,
};
