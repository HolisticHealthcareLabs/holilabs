/**
 * Sidecar Types
 *
 * Shared type definitions for the Sidecar desktop overlay.
 *
 * @module sidecar/types
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EHR FINGERPRINTING
// ═══════════════════════════════════════════════════════════════════════════════

export type EHRName = 'tasy' | 'mv-soul' | 'philips-tasy' | 'wareline' | 'unknown';

export interface EHRFingerprint {
  ehrName: EHRName;
  version: string;
  windowTitle: string;
  processName: string;
  accessibilityMappingFile: string;
  detectedAt: Date;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AccessibilityMapping {
  ehrName: EHRName;
  version: string;
  fields: {
    patientName?: AccessibilitySelector;
    patientId?: AccessibilitySelector;
    medicationField?: AccessibilitySelector;
    diagnosisField?: AccessibilitySelector;
    procedureField?: AccessibilitySelector;
    allergyField?: AccessibilitySelector;
    [key: string]: AccessibilitySelector | undefined;
  };
}

export interface AccessibilitySelector {
  automationId?: string;
  className?: string;
  name?: string;
  controlType?: string;
  path?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VDI DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type VDIEnvironment = 'citrix' | 'mstsc' | 'vmware' | 'none';

export interface VDIDetectionResult {
  isVDI: boolean;
  environment: VDIEnvironment;
  windowClass: string | null;
  processName: string | null;
  recommendation: 'accessibility' | 'vision';
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export type InputSource = 'accessibility' | 'vision' | 'manual';

export interface InputContext {
  source: InputSource;
  capturedAt: Date;
  latencyMs: number;

  // Text content
  text?: string;
  formFields?: Record<string, string>;

  // Structured data (if parsed)
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

  // Raw data for RLHF
  rawAccessibilityTree?: AccessibilityNode[];
  rawOCRText?: string;
  screenshot?: string; // Base64 encoded

  // EHR context
  ehrFingerprint?: EHRFingerprint;
}

export interface AccessibilityNode {
  automationId?: string;
  name?: string;
  className?: string;
  controlType?: string;
  value?: string;
  children?: AccessibilityNode[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAFFIC LIGHT (from web app)
// ═══════════════════════════════════════════════════════════════════════════════

export type TrafficLightColor = 'RED' | 'YELLOW' | 'GREEN';

export interface TrafficLightSignal {
  ruleId: string;
  ruleName: string;
  category: 'CLINICAL' | 'ADMINISTRATIVE' | 'BILLING';
  color: TrafficLightColor;
  message: string;
  messagePortuguese: string;
  regulatoryReference?: string;
  evidence: string[];
  suggestedCorrection?: string;
  estimatedGlosaRisk?: {
    probability: number;
    estimatedAmount: number;
    denialCode?: string;
  };
}

export interface TrafficLightResult {
  color: TrafficLightColor;
  signals: TrafficLightSignal[];
  canOverride: boolean;
  overrideRequires?: 'justification' | 'supervisor' | 'blocked';
  totalGlosaRisk?: {
    probability: number;
    totalAmountAtRisk: number;
    highestRiskCode?: string;
  };
  needsChatAssistance: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BREAK-GLASS CHAT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

export interface Citation {
  source: string;
  page?: number;
  text: string;
  confidence: number;
}

export interface RAGContext {
  insurerId?: string;
  tissCode?: string;
  procedureCode?: string;
  relevantDocuments: RAGDocument[];
}

export interface RAGDocument {
  id: string;
  title: string;
  source: 'ans' | 'tiss' | 'anvisa' | 'internal';
  content: string;
  embeddings?: number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDECAR STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SidecarState {
  // Connection
  edgeNodeUrl: string;
  isConnected: boolean;
  lastHeartbeat: Date | null;

  // EHR
  currentEHR: EHRFingerprint | null;
  isVDI: boolean;

  // Traffic Light
  currentResult: TrafficLightResult | null;
  isEvaluating: boolean;

  // Chat
  chatExpanded: boolean;
  chatMessages: ChatMessage[];

  // Settings
  language: 'en' | 'pt';
  autoEvaluate: boolean;
  minimized: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IPC CHANNELS
// ═══════════════════════════════════════════════════════════════════════════════

export const IPC_CHANNELS = {
  // Main → Renderer
  TRAFFIC_LIGHT_RESULT: 'traffic-light:result',
  CONNECTION_STATUS: 'connection:status',
  EHR_DETECTED: 'ehr:detected',
  INPUT_CAPTURED: 'input:captured',

  // Renderer → Main
  EVALUATE_CONTEXT: 'evaluate:context',
  SUBMIT_OVERRIDE: 'submit:override',
  SEND_CHAT: 'chat:send',
  GET_STATUS: 'get:status',
  TOGGLE_MINIMIZE: 'toggle:minimize',
  SET_IGNORE_MOUSE_EVENTS: 'window:set-ignore-mouse-events',

  // Ghost Overlay
  GHOST_SHOW: 'ghost:show',
  GHOST_HIDE: 'ghost:hide',
  GHOST_UPDATE: 'ghost:update',

  // Bidirectional
  ERROR: 'error',
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
