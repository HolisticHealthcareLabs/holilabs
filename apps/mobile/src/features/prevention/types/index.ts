/**
 * Prevention Plan Template Types
 * Based on Phase 7 Mobile API Reference
 */

export type PreventionPlanType =
  | 'DIABETES'
  | 'CARDIOVASCULAR'
  | 'CANCER_SCREENING'
  | 'OBESITY'
  | 'HYPERTENSION'
  | 'GENERAL_WELLNESS'
  | 'CUSTOM';

export type SharePermission = 'VIEW' | 'EDIT' | 'ADMIN';

export type PreventionPlanStatus = 'ACTIVE' | 'COMPLETED' | 'DEACTIVATED' | 'DRAFT';

export type PreventiveCareStatus = 'DUE' | 'SCHEDULED' | 'COMPLETED' | 'DISMISSED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

// Goal Structure
export interface PreventionGoal {
  goal: string;
  category: string;
  timeframe: string;
  priority: Priority;
}

// Recommendation Structure
export interface PreventionRecommendation {
  title: string;
  description: string;
  category: string;
  priority: Priority;
}

// Prevention Plan Template
export interface PreventionTemplate {
  id: string;
  templateName: string;
  planType: PreventionPlanType;
  description: string;
  guidelineSource: string;
  evidenceLevel: string;
  targetPopulation: string;
  goals: PreventionGoal[];
  recommendations: PreventionRecommendation[];
  isActive: boolean;
  useCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Template Version
export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  versionLabel: string;
  changeLog: string;
  changedFields: string[];
  templateData?: PreventionTemplate;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

// Comment & Collaboration
export interface TemplateComment {
  id: string;
  templateId: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string;
  };
  content: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}

// Template Share
export interface TemplateShare {
  id: string;
  templateId: string;
  sharedWith: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string;
  };
  sharedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  permission: SharePermission;
  message?: string;
  createdAt: string;
  expiresAt?: string;
}

// Prevention Plan (Patient-specific)
export interface PreventionPlan {
  id: string;
  patientId: string;
  planName: string;
  planType: PreventionPlanType;
  goals: PreventionGoal[];
  recommendations: PreventionRecommendation[];
  status: PreventionPlanStatus;
  activatedAt: string;
  createdAt: string;
}

// Reminder
export interface PreventionReminder {
  id: string;
  title: string;
  description: string;
  screeningType: string;
  dueDate: string;
  priority: Priority;
  status: PreventiveCareStatus;
  goalIndex: number;
  goalInfo: {
    goal: string;
    timeframe: string;
    status: string;
  };
  createdAt: string;
}

// API Response Types
export interface TemplatesResponse {
  templates: PreventionTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface VersionsResponse {
  versions: TemplateVersion[];
  count: number;
  templateName: string;
}

export interface CommentsResponse {
  comments: TemplateComment[];
  count: number;
  hasMore: boolean;
}

export interface SharesResponse {
  shares: TemplateShare[];
  count: number;
  isOwner: boolean;
}

export interface RemindersResponse {
  planId: string;
  planName: string;
  patientId: string;
  reminders: PreventionReminder[];
  summary: {
    total: number;
    due: number;
    completed: number;
    overdue: number;
  };
}

// Filter & Search Types
export interface TemplateFilters {
  searchQuery: string;
  planType: PreventionPlanType | 'ALL';
  isActive: boolean | null;
  sortBy: 'name' | 'useCount' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

// Bulk Operations
export interface BulkOperationResult {
  success: boolean;
  count: number;
  failed?: number;
  templateIds?: string[];
}

// WebSocket Event
export interface PreventionEvent {
  id: string;
  event: 'TEMPLATE_UPDATED' | 'TEMPLATE_CREATED' | 'TEMPLATE_DELETED' |
         'TEMPLATE_SHARED' | 'COMMENT_ADDED' | 'VERSION_CREATED' |
         'REMINDER_CREATED' | 'BULK_OPERATION_COMPLETED';
  title: string;
  message: string;
  priority: NotificationPriority;
  data: any;
  timestamp: string;
}
