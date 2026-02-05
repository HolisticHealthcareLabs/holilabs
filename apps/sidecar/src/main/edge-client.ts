/**
 * Edge Node Client
 *
 * Communicates with the local Edge Node for Traffic Light evaluation.
 * All communication happens over localhost - no internet required.
 *
 * @module sidecar/main/edge-client
 */

import type { InputContext, TrafficLightResult, ChatMessage } from '../types';
import { DeterministicValidator } from './ontology/DeterministicValidator';
import { ProbabilisticValidator, ClinicalContext } from './llm/probabilistic-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ConnectionStatus {
  connected: boolean;
  lastPing: Date | null;
  latencyMs: number | null;
  ruleVersion: string | null;
}

interface OverrideArgs {
  signals: Array<{ ruleId: string; color: string }>;
  justification: string;
  supervisorId?: string;
  assuranceEventId?: string;
}

interface RulesResponse {
  version: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class EdgeNodeClient {
  private baseUrl: string;
  private status: ConnectionStatus;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private patientId: string | null = null;
  private sessionId: string;
  private lastSyncTime: Date | null = null;
  private validator = new DeterministicValidator();
  private probabilisticValidator = new ProbabilisticValidator();

  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.sessionId = this.generateSessionId();
    this.status = {
      connected: false,
      lastPing: null,
      latencyMs: null,
      ruleVersion: null,
    };
  }

  /**
   * Connect to edge node and start heartbeat
   */
  connect(): void {
    this.startHeartbeat();
    this.probabilisticValidator.initialize(); // Initialize LLM (non-blocking)
    console.info('Edge client connecting to:', this.baseUrl);
  }

  /**
   * Disconnect from edge node
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.status.connected = false;
  }

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'degraded' | 'offline' {
    if (!this.status.connected) return 'offline';
    if (this.status.latencyMs && this.status.latencyMs > 500) return 'degraded';
    return 'connected';
  }

  /**
   * Get raw connection status details
   */
  getStatusDetails(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Get last successful sync time
   */
  getLastSync(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Set current patient context
   */
  setPatient(patientId: string): void {
    this.patientId = patientId;
  }

  /**
   * Evaluate input context through Traffic Light
   */
  async evaluate(context: InputContext): Promise<TrafficLightResult> {

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. DETERMINISTIC PROTOCOL (Local Ontology Check)
    // ═══════════════════════════════════════════════════════════════════════════

    // Check Prescription Context
    if (context.medication) {
      const rxCheck = this.validator.validatePrescription(
        context.medication.name,
        context.text || '' // use full text as context for diagnosis
      );

      if (!rxCheck.isValid && rxCheck.issues) {
        console.warn('[Deterministic] Violation detected:', rxCheck.issues[0]);
        return {
          color: 'RED',
          signals: [{
            ruleId: 'ONTOLOGY-RX-001',
            ruleName: 'Protocolo de Prescrição (RxNorm)',
            category: 'CLINICAL',
            color: 'RED',
            message: rxCheck.issues[0],
            messagePortuguese: `Violação de Protocolo: ${rxCheck.issues[0]}`,
            evidence: ['Validado via RxNorm e SNOMED CT'],
            regulatoryReference: 'Protocolo Clínico Determinístico'
          }],
          canOverride: true,
          overrideRequires: 'justification',
          needsChatAssistance: true,
          totalGlosaRisk: { probability: 1, totalAmountAtRisk: 0, highestRiskCode: 'RX-FAIL' }
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. PROBABILISTIC PROTOCOL (Local LLM via Ollama)
    // ═══════════════════════════════════════════════════════════════════════════

    if (context.medication) {
      const clinicalContext: ClinicalContext = {
        medication: context.medication,
        diagnosis: context.diagnosis?.description,
      };

      const llmResult = await this.probabilisticValidator.assess(clinicalContext);

      if (llmResult && llmResult.riskLevel !== 'low') {
        const signal = this.probabilisticValidator.toTrafficLightSignal(llmResult);
        console.info('[Probabilistic] LLM flagged risk:', llmResult.riskLevel, llmResult.reasoning);

        return {
          color: llmResult.riskLevel === 'high' ? 'RED' : 'YELLOW',
          signals: [{
            ruleId: 'LLM-PROB-001',
            ruleName: 'Validação Probabilística (Llama 3.1)',
            category: 'PROBABILISTIC',
            color: signal.color.toUpperCase() as 'RED' | 'YELLOW' | 'GREEN',
            message: llmResult.reasoning,
            messagePortuguese: llmResult.reasoning,
            evidence: llmResult.citations,
            regulatoryReference: 'Análise LLM Local'
          }],
          canOverride: true,
          overrideRequires: llmResult.riskLevel === 'high' ? 'supervisor' : 'justification',
          needsChatAssistance: llmResult.riskLevel === 'high',
          totalGlosaRisk: { probability: (100 - llmResult.confidence) / 100, totalAmountAtRisk: 0, highestRiskCode: 'LLM-FLAG' }
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. CLOUD FALLBACK (Deep Edge / Cloud LLM for complex cases)
    // ═══════════════════════════════════════════════════════════════════════════

    const response = await this.post('/sidecar/evaluate', {
      patientId: this.patientId || 'unknown',
      context: {
        source: context.source,
        text: context.text,
        formFields: context.formFields,
        medication: context.medication,
        procedure: context.procedure,
        diagnosis: context.diagnosis,
      },
      inputContextSnapshot: {
        rawText: context.text,
        formFields: context.formFields,
        ehrFingerprint: context.ehrFingerprint,
        capturedAt: context.capturedAt.toISOString(),
        latencyMs: context.latencyMs,
      },
      sessionId: this.sessionId,
    });

    return response.data as TrafficLightResult;
  }

  /**
   * Submit override decision
   */
  async submitOverride(args: OverrideArgs): Promise<{ success: boolean; eventId: string }> {
    const response = await this.post('/sidecar/decision', {
      patientId: this.patientId || 'unknown',
      signals: args.signals,
      assuranceEventId: args.assuranceEventId,
      overrideDecision: {
        proceed: true,
        justification: args.justification,
        supervisorApproval: args.supervisorId
          ? { supervisorId: args.supervisorId, approvedAt: new Date().toISOString() }
          : undefined,
      },
      sessionId: this.sessionId,
    });

    return response.data as { success: boolean; eventId: string };
  }

  /**
   * Send chat message for Break-Glass assistance
   */
  async sendChatMessage(message: string): Promise<ChatMessage> {
    const response = await this.post('/sidecar/chat', {
      message,
      patientId: this.patientId,
      sessionId: this.sessionId,
    });

    return response.data as ChatMessage;
  }

  /**
   * Get current Traffic Light rules
   */
  async getRules(): Promise<RulesResponse | null> {
    try {
      const response = await this.get('/sidecar/rules');
      return response.data as RulesResponse;
    } catch (e) {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async get(path: string): Promise<{ data: unknown }> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': this.sessionId,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async post(path: string, body: unknown): Promise<{ data: unknown }> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': this.sessionId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Track successful sync
    this.lastSyncTime = new Date();

    return response.json();
  }

  private startHeartbeat(): void {
    // Initial ping
    this.ping();

    // Ping every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.ping();
    }, 30000);
  }

  private async ping(): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/sidecar/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();

        this.status = {
          connected: true,
          lastPing: new Date(),
          latencyMs: Date.now() - startTime,
          ruleVersion: data.ruleVersion || null,
        };
      } else {
        this.handleDisconnect();
      }
    } catch {
      this.handleDisconnect();
    }
  }

  private handleDisconnect(): void {
    const wasConnected = this.status.connected;

    this.status.connected = false;
    this.status.latencyMs = null;

    if (wasConnected) {
      console.warn('Edge node connection lost');
    }
  }

  private generateSessionId(): string {
    return `sidecar-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
