/**
 * WebSocket Event Type Definitions
 *
 * Defines all real-time events for the Prevention Hub
 */

// Event payloads
export interface PreventionPlanEvent {
  id: string;
  planName: string;
  patientId: string;
  patientName?: string;
  planType: string;
  status: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface PreventionTemplateEvent {
  id: string;
  templateName: string;
  planType: string;
  isActive: boolean;
  useCount: number;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface PreventionGoalEvent {
  id: string;
  planId: string;
  planName?: string;
  goal: string;
  status: 'pending' | 'in_progress' | 'completed';
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface PreventionCommentEvent {
  id: string;
  templateId: string;
  templateName?: string;
  userId: string;
  userName?: string;
  content: string;
  mentions: string[];
  timestamp: Date;
}

// Real-time Prevention Detection Events (Enhanced Prevention Hub)
export interface PreventionConditionDetectedEvent {
  patientId: string;
  encounterId: string;
  conditions: Array<{
    id: string;
    name: string;
    category: string;
    confidence: number;
    icd10Codes?: string[];
  }>;
  recommendationsCount: number;
  timestamp: Date;
}

export interface PreventionRecommendationEvent {
  id: string;
  patientId: string;
  encounterId: string;
  type: 'screening' | 'intervention' | 'lifestyle' | 'medication' | 'monitoring';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  guidelineSource: string;
  uspstfGrade?: string;
  timestamp: Date;
}

export interface PreventionFindingsProcessedEvent {
  patientId: string;
  encounterId: string;
  conditions: Array<{
    id: string;
    name: string;
    category: string;
    confidence: number;
  }>;
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    priority: string;
  }>;
  processingTimeMs: number;
  timestamp: Date;
}

export interface PreventionEncounterLinkedEvent {
  linkId: string;
  patientId: string;
  encounterId: string;
  preventionPlanId: string;
  detectedConditionsCount: number;
  timestamp: Date;
}

// Clinical data event payloads (Agent-Native UI Integration)
export interface ClinicalPatientEvent {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientName?: string;
  mrn?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface ClinicalNoteEvent {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  noteType?: string;
  encounterId?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface ClinicalMedicationEvent {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  medicationName: string;
  dose?: string;
  frequency?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface ClinicalAllergyEvent {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  allergen: string;
  severity?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface ClinicalDiagnosisEvent {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  icd10Code?: string;
  description?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface ClinicalLabResultEvent {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  patientId: string;
  patientName?: string;
  testName: string;
  value?: string;
  unit?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface TrafficLightEvent {
  evaluationId: string;
  patientId: string;
  action: string;
  color: 'RED' | 'YELLOW' | 'GREEN';
  signalCount: number;
  overridden?: boolean;
  userId: string;
  timestamp: Date;
}

export interface ClinicalPrimitiveEvent {
  primitiveId: string;
  primitiveName: string;
  patientId?: string;
  result: 'success' | 'failure';
  latencyMs: number;
  userId: string;
  timestamp: Date;
}

export interface ClinicalAppointmentEvent {
  id: string;
  action: 'created' | 'updated' | 'cancelled' | 'completed';
  patientId: string;
  patientName?: string;
  clinicianId: string;
  clinicianName?: string;
  appointmentType?: string;
  startTime?: Date;
  userId: string;
  userName?: string;
  timestamp: Date;
}

// Governance event payloads (Safety-critical real-time)
export interface GovernanceLogEvent {
  id: string;
  sessionId: string;
  eventType: 'BLOCKED' | 'FLAGGED' | 'PASSED' | 'OVERRIDE' | 'SHADOW_BLOCK';
  ruleId?: string;
  ruleName?: string;
  severity: 'INFO' | 'SOFT_NUDGE' | 'HARD_BLOCK';
  description?: string;
  provider?: string;
  clinicId?: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
}

export interface GovernanceOverrideEvent {
  sessionId: string;
  ruleId?: string;
  reason: string;
  userId?: string;
  userName?: string;
  clinicId?: string;
  timestamp: Date;
}

// Task event payloads
export interface TaskEvent {
  id: string;
  action: 'created' | 'updated' | 'completed' | 'dismissed' | 'deleted';
  title: string;
  category: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
  assignedTo: string;
  assigneeName?: string;
  dueDate?: Date;
  relatedType?: string;
  relatedId?: string;
  clinicId?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

// Event types
export enum SocketEvent {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Real-time Prevention Detection events (Enhanced Prevention Hub)
  CONDITION_DETECTED = 'prevention:condition_detected',
  RECOMMENDATION_CREATED = 'prevention:recommendation_created',
  ALERT_TRIGGERED = 'prevention:alert_triggered',
  FINDINGS_PROCESSED = 'prevention:findings_processed',
  ENCOUNTER_LINKED = 'prevention:encounter_linked',

  // Prevention Plan events
  PLAN_CREATED = 'prevention:plan:created',
  PLAN_UPDATED = 'prevention:plan:updated',
  PLAN_DELETED = 'prevention:plan:deleted',
  PLAN_STATUS_CHANGED = 'prevention:plan:status_changed',

  // Prevention Template events
  TEMPLATE_CREATED = 'prevention:template:created',
  TEMPLATE_UPDATED = 'prevention:template:updated',
  TEMPLATE_DELETED = 'prevention:template:deleted',
  TEMPLATE_USED = 'prevention:template:used',
  TEMPLATE_ACTIVATED = 'prevention:template:activated',
  TEMPLATE_DEACTIVATED = 'prevention:template:deactivated',

  // Goal events
  GOAL_ADDED = 'prevention:goal:added',
  GOAL_UPDATED = 'prevention:goal:updated',
  GOAL_COMPLETED = 'prevention:goal:completed',

  // Comment events (Phase 7 Feature 4)
  COMMENT_ADDED = 'prevention:comment:added',
  COMMENT_UPDATED = 'prevention:comment:updated',
  COMMENT_DELETED = 'prevention:comment:deleted',

  // Collaboration events (Phase 7 Feature 4)
  USER_JOINED_TEMPLATE = 'prevention:collaboration:user_joined',
  USER_LEFT_TEMPLATE = 'prevention:collaboration:user_left',
  TEMPLATE_SHARED = 'prevention:collaboration:template_shared',

  // Reminder events (Phase 7 Feature 5)
  REMINDER_CREATED = 'prevention:reminder:created',
  REMINDER_COMPLETED = 'prevention:reminder:completed',

  // Bulk operations (Phase 7 Feature 2)
  BULK_OPERATION_STARTED = 'prevention:bulk:started',
  BULK_OPERATION_COMPLETED = 'prevention:bulk:completed',
  BULK_OPERATION_FAILED = 'prevention:bulk:failed',

  // Clinical data events (Agent-Native UI Integration)
  PATIENT_CREATED = 'clinical:patient:created',
  PATIENT_UPDATED = 'clinical:patient:updated',
  PATIENT_DELETED = 'clinical:patient:deleted',

  CLINICAL_NOTE_CREATED = 'clinical:note:created',
  CLINICAL_NOTE_UPDATED = 'clinical:note:updated',
  CLINICAL_NOTE_DELETED = 'clinical:note:deleted',

  MEDICATION_CREATED = 'clinical:medication:created',
  MEDICATION_UPDATED = 'clinical:medication:updated',
  MEDICATION_DELETED = 'clinical:medication:deleted',

  ALLERGY_CREATED = 'clinical:allergy:created',
  ALLERGY_UPDATED = 'clinical:allergy:updated',
  ALLERGY_DELETED = 'clinical:allergy:deleted',

  DIAGNOSIS_CREATED = 'clinical:diagnosis:created',
  DIAGNOSIS_UPDATED = 'clinical:diagnosis:updated',
  DIAGNOSIS_DELETED = 'clinical:diagnosis:deleted',

  LAB_RESULT_CREATED = 'clinical:lab:created',
  LAB_RESULT_UPDATED = 'clinical:lab:updated',
  LAB_RESULT_DELETED = 'clinical:lab:deleted',

  // Appointment events
  APPOINTMENT_CREATED = 'clinical:appointment:created',
  APPOINTMENT_UPDATED = 'clinical:appointment:updated',
  APPOINTMENT_CANCELLED = 'clinical:appointment:cancelled',
  APPOINTMENT_COMPLETED = 'clinical:appointment:completed',

  // Traffic Light events
  TRAFFIC_LIGHT_EVALUATED = 'clinical:traffic_light:evaluated',
  TRAFFIC_LIGHT_OVERRIDE = 'clinical:traffic_light:override',

  // Clinical primitive events
  PRIMITIVE_EXECUTED = 'clinical:primitive:executed',

  // Governance events (Safety-critical real-time)
  GOVERNANCE_LOG_CREATED = 'governance:log:created',
  GOVERNANCE_OVERRIDE = 'governance:override',
  GOVERNANCE_BLOCKED = 'governance:blocked',

  // Task events (Provider task management)
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_COMPLETED = 'task:completed',
  TASK_DISMISSED = 'task:dismissed',
  TASK_DELETED = 'task:deleted',
}

// Room types for targeted notifications
export enum SocketRoom {
  // Global rooms
  ALL_USERS = 'all_users',

  // User-specific rooms
  USER = 'user:', // user:userId

  // Resource-specific rooms
  PLAN = 'plan:', // plan:planId
  TEMPLATE = 'template:', // template:templateId

  // Clinical rooms (Agent-Native UI Integration)
  PATIENT = 'patient:', // patient:patientId - subscribers to patient updates
  CLINIC = 'clinic:', // clinic:clinicId - all users in a clinic
  ENCOUNTER = 'encounter:', // encounter:encounterId - active encounter participants

  // Team rooms (future)
  TEAM = 'team:', // team:teamId
}

// Notification priority levels
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Base notification payload
export interface SocketNotification {
  id: string;
  event: SocketEvent;
  title: string;
  message: string;
  priority: NotificationPriority;
  data: PreventionPlanEvent | PreventionTemplateEvent | PreventionGoalEvent | PreventionCommentEvent | any;
  timestamp: Date;
  userId?: string;
  userName?: string;
}

// Helper to create room name
export function createRoomName(type: SocketRoom, id: string): string {
  return `${type}${id}`;
}

// Helper to parse room name
export function parseRoomName(roomName: string): { type: string; id: string } | null {
  const match = roomName.match(/^(user:|plan:|template:|team:)(.+)$/);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}
