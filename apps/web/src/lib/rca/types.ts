export type SafetyEventType = 'ADVERSE_EVENT' | 'NEAR_MISS' | 'SENTINEL';
export type EventSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface SafetyEvent {
  eventId: string;
  patientId: string;
  eventType: SafetyEventType;
  severity: EventSeverity;
  dateOccurred: Date;
  description: string;
  involvedStaff: string[];
  involvedSystems: string[];
  location?: string;
  reportedBy: string;
}

export type FishboneBone =
  | 'COMMUNICATION'
  | 'EQUIPMENT'
  | 'ENVIRONMENT'
  | 'POLICIES_PROCEDURES'
  | 'PEOPLE_STAFF'
  | 'PATIENT_FACTORS'
  | 'REGULATORY'
  | 'INFRASTRUCTURE';

export interface FishboneFinding {
  bone: FishboneBone;
  finding: string;
  evidence: string;
  contributionLevel: 'PRIMARY' | 'CONTRIBUTING' | 'MINOR';
}

export interface RCAFishbone {
  eventId: string;
  findings: FishboneFinding[];
  createdAt: Date;
}

export interface FiveWhyStep {
  level: number;
  why: string;
  evidence: string;
  isSystemic: boolean;
}

export interface FiveWhysChain {
  eventId: string;
  steps: FiveWhyStep[];
  rootCause: string;
}

export type ActionStrength =
  | 'ARCHITECTURAL'
  | 'PROCESS'
  | 'ADMINISTRATIVE'
  | 'TRAINING';

export interface CorrectiveAction {
  id: string;
  description: string;
  strength: ActionStrength;
  responsible: string;
  deadline: Date;
  status: 'PROPOSED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED';
  measurableOutcome: string;
}

export interface RCAResult {
  eventId: string;
  fishbone: RCAFishbone;
  fiveWhys: FiveWhysChain;
  correctiveActions: CorrectiveAction[];
  rootCauses: string[];
  completedAt: Date;
  reviewedBy?: string;
}
