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
