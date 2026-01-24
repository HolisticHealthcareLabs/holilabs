/**
 * FHIR R4 Prevention Exporter
 *
 * Exports Prevention Hub data as FHIR R4 resources:
 * - CarePlan (prevention plans with activities)
 * - Goal (health goals)
 * - ServiceRequest (screening/lab orders)
 * - DiagnosticReport (screening results)
 *
 * Implements Protocol Omega's FHIR export requirements for
 * interoperability with EHR systems.
 */

import type { Patient, PreventionOutcome, ClinicalProtocol, PreventiveCareReminder } from '@prisma/client';

// ============================================================================
// FHIR CAREPLAN RESOURCE
// ============================================================================

export interface FHIRCarePlan {
  resourceType: 'CarePlan';
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'option';
  category?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  title?: string;
  description?: string;
  subject: {
    reference: string;
    display?: string;
  };
  period?: {
    start?: string;
    end?: string;
  };
  created?: string;
  author?: {
    reference?: string;
    display?: string;
  };
  goal?: Array<{
    reference: string;
  }>;
  activity?: Array<{
    outcomeCodeableConcept?: Array<{
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    }>;
    outcomeReference?: Array<{
      reference: string;
    }>;
    detail?: {
      kind?: 'Appointment' | 'ServiceRequest' | 'Task';
      code?: {
        coding?: Array<{
          system: string;
          code: string;
          display?: string;
        }>;
        text?: string;
      };
      status: 'not-started' | 'scheduled' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled' | 'stopped' | 'unknown' | 'entered-in-error';
      statusReason?: {
        text?: string;
      };
      doNotPerform?: boolean;
      scheduledTiming?: {
        repeat?: {
          frequency?: number;
          period?: number;
          periodUnit?: 'mo' | 'a'; // months or years
        };
      };
      scheduledPeriod?: {
        start?: string;
        end?: string;
      };
      scheduledString?: string;
      location?: {
        reference?: string;
        display?: string;
      };
      performer?: Array<{
        reference?: string;
        display?: string;
      }>;
      description?: string;
    };
  }>;
  note?: Array<{
    text: string;
    time?: string;
    authorString?: string;
  }>;
}

// ============================================================================
// FHIR GOAL RESOURCE
// ============================================================================

export interface FHIRGoal {
  resourceType: 'Goal';
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  lifecycleStatus: 'proposed' | 'planned' | 'accepted' | 'active' | 'on-hold' | 'completed' | 'cancelled' | 'entered-in-error' | 'rejected';
  achievementStatus?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  category?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  priority?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  description: {
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  startDate?: string;
  target?: Array<{
    measure?: {
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    };
    detailQuantity?: {
      value: number;
      unit?: string;
      system?: string;
      code?: string;
    };
    detailRange?: {
      low?: {
        value: number;
        unit?: string;
      };
      high?: {
        value: number;
        unit?: string;
      };
    };
    detailString?: string;
    dueDate?: string;
  }>;
  expressedBy?: {
    reference?: string;
    display?: string;
  };
  note?: Array<{
    text: string;
    time?: string;
  }>;
}

// ============================================================================
// FHIR SERVICEREQUEST RESOURCE
// ============================================================================

export interface FHIRServiceRequest {
  resourceType: 'ServiceRequest';
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  code?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  occurrenceDateTime?: string;
  occurrencePeriod?: {
    start?: string;
    end?: string;
  };
  authoredOn?: string;
  requester?: {
    reference?: string;
    display?: string;
  };
  reasonCode?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  reasonReference?: Array<{
    reference: string;
  }>;
  note?: Array<{
    text: string;
    time?: string;
  }>;
}

// ============================================================================
// FHIR BUNDLE
// ============================================================================

export interface FHIRPreventionBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  total?: number;
  entry: Array<{
    fullUrl?: string;
    resource: FHIRCarePlan | FHIRGoal | FHIRServiceRequest;
  }>;
}

// ============================================================================
// TYPE DEFINITIONS FOR INPUT
// ============================================================================

type PreventionOutcomeWithProtocol = PreventionOutcome & {
  protocol?: ClinicalProtocol | null;
};

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert Prevention Hub data to FHIR CarePlan
 */
export function toFHIRCarePlan(
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName'>,
  outcomes: PreventionOutcomeWithProtocol[],
  options?: {
    title?: string;
    description?: string;
    author?: { id: string; name: string };
  }
): FHIRCarePlan {
  const now = new Date().toISOString();

  return {
    resourceType: 'CarePlan',
    id: `prevention-plan-${patient.id}`,
    identifier: [
      {
        system: 'urn:holilabs:prevention-plan',
        value: `${patient.id}-${Date.now()}`,
      },
    ],
    status: 'active',
    intent: 'plan',
    category: [
      {
        coding: [
          {
            system: 'http://hl7.org/fhir/us/core/CodeSystem/careplan-category',
            code: 'assess-plan',
            display: 'Assessment and Plan',
          },
        ],
        text: 'Prevention Care Plan',
      },
    ],
    title: options?.title || `Prevention Care Plan for ${patient.firstName} ${patient.lastName}`,
    description: options?.description || 'Automated prevention and screening care plan generated by HoliLabs Prevention Hub',
    subject: {
      reference: `Patient/${patient.id}`,
      display: `${patient.firstName} ${patient.lastName}`,
    },
    period: {
      start: now,
    },
    created: now,
    author: options?.author
      ? {
          reference: `Practitioner/${options.author.id}`,
          display: options.author.name,
        }
      : undefined,
    activity: outcomes.map((outcome) => ({
      detail: {
        kind: 'ServiceRequest',
        code: {
          coding: outcome.cptCode
            ? [
                {
                  system: 'http://www.ama-assn.org/go/cpt',
                  code: outcome.cptCode,
                  display: outcome.interventionName,
                },
              ]
            : undefined,
          text: outcome.interventionName,
        },
        status: mapOutcomeStatusToCarePlanActivity(outcome.status),
        statusReason: outcome.patientDeclined
          ? { text: outcome.declineReason || 'Patient declined' }
          : undefined,
        scheduledPeriod: {
          start: outcome.scheduledDate.toISOString(),
          end: outcome.dueDate?.toISOString(),
        },
        description: outcome.protocol?.name || outcome.interventionName,
      },
    })),
    note: [
      {
        text: `Generated by HoliLabs Prevention Hub on ${new Date().toLocaleDateString()}`,
        time: now,
        authorString: 'HoliLabs Prevention Hub',
      },
    ],
  };
}

/**
 * Convert PreventiveCareReminder to FHIR Goal
 */
export function toFHIRGoal(
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName'>,
  reminder: PreventiveCareReminder,
  options?: {
    expressedBy?: { id: string; name: string };
  }
): FHIRGoal {
  return {
    resourceType: 'Goal',
    id: `goal-${reminder.id}`,
    identifier: [
      {
        system: 'urn:holilabs:prevention-goal',
        value: reminder.id,
      },
    ],
    lifecycleStatus: mapReminderStatusToGoalStatus(reminder.status),
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/goal-category',
            code: 'safety',
            display: 'Safety',
          },
        ],
        text: 'Preventive Care Goal',
      },
    ],
    priority: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/goal-priority',
          code: mapPriorityToFHIR(reminder.priority),
          display: reminder.priority,
        },
      ],
    },
    description: {
      text: reminder.title,
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: `${patient.firstName} ${patient.lastName}`,
    },
    startDate: reminder.recommendedBy.toISOString().split('T')[0],
    target: [
      {
        detailString: reminder.description || 'Complete screening/prevention activity',
        dueDate: reminder.dueDate.toISOString().split('T')[0],
      },
    ],
    expressedBy: options?.expressedBy
      ? {
          reference: `Practitioner/${options.expressedBy.id}`,
          display: options.expressedBy.name,
        }
      : undefined,
    note: reminder.guidelineSource
      ? [
          {
            text: `Based on ${reminder.guidelineSource} guidelines${
              reminder.evidenceLevel ? ` (${reminder.evidenceLevel})` : ''
            }`,
          },
        ]
      : undefined,
  };
}

/**
 * Convert PreventionOutcome to FHIR ServiceRequest
 */
export function toFHIRServiceRequest(
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName'>,
  outcome: PreventionOutcomeWithProtocol
): FHIRServiceRequest {
  return {
    resourceType: 'ServiceRequest',
    id: `service-request-${outcome.id}`,
    identifier: [
      {
        system: 'urn:holilabs:prevention-order',
        value: outcome.id,
      },
    ],
    status: mapOutcomeStatusToServiceRequest(outcome.status),
    intent: 'order',
    category: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: getScreeningCategoryCode(outcome.interventionType),
            display: outcome.interventionType,
          },
        ],
        text: outcome.interventionType,
      },
    ],
    priority: outcome.followUpNeeded ? 'urgent' : 'routine',
    code: {
      coding: [
        ...(outcome.cptCode
          ? [
              {
                system: 'http://www.ama-assn.org/go/cpt',
                code: outcome.cptCode,
                display: outcome.interventionName,
              },
            ]
          : []),
        ...(outcome.icdCode
          ? [
              {
                system: 'http://hl7.org/fhir/sid/icd-10',
                code: outcome.icdCode,
              },
            ]
          : []),
      ],
      text: outcome.interventionName,
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: `${patient.firstName} ${patient.lastName}`,
    },
    occurrenceDateTime: outcome.scheduledDate.toISOString(),
    authoredOn: outcome.createdAt.toISOString(),
    requester: outcome.orderedBy
      ? {
          reference: `Practitioner/${outcome.orderedBy}`,
        }
      : undefined,
    reasonCode: outcome.protocol
      ? [
          {
            coding: [
              {
                system: 'urn:holilabs:protocol',
                code: outcome.protocol.ruleId,
                display: outcome.protocol.name,
              },
            ],
            text: `Protocol: ${outcome.protocol.name}`,
          },
        ]
      : undefined,
    note: outcome.followUpNotes
      ? [
          {
            text: outcome.followUpNotes,
          },
        ]
      : undefined,
  };
}

/**
 * Create a complete FHIR Bundle with all prevention resources
 */
export function toFHIRPreventionBundle(
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName'>,
  outcomes: PreventionOutcomeWithProtocol[],
  reminders?: PreventiveCareReminder[],
  options?: {
    includeCarePlan?: boolean;
    includeGoals?: boolean;
    includeServiceRequests?: boolean;
    author?: { id: string; name: string };
  }
): FHIRPreventionBundle {
  const {
    includeCarePlan = true,
    includeGoals = true,
    includeServiceRequests = true,
    author,
  } = options || {};

  const entries: FHIRPreventionBundle['entry'] = [];

  // Add CarePlan
  if (includeCarePlan && outcomes.length > 0) {
    entries.push({
      fullUrl: `urn:uuid:careplan-${patient.id}`,
      resource: toFHIRCarePlan(patient, outcomes, { author }),
    });
  }

  // Add Goals from reminders
  if (includeGoals && reminders) {
    for (const reminder of reminders) {
      entries.push({
        fullUrl: `urn:uuid:goal-${reminder.id}`,
        resource: toFHIRGoal(patient, reminder, { expressedBy: author }),
      });
    }
  }

  // Add ServiceRequests from outcomes
  if (includeServiceRequests) {
    for (const outcome of outcomes) {
      entries.push({
        fullUrl: `urn:uuid:service-request-${outcome.id}`,
        resource: toFHIRServiceRequest(patient, outcome),
      });
    }
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapOutcomeStatusToCarePlanActivity(
  status: string
): FHIRCarePlan['activity'][number]['detail']['status'] {
  const statusMap: Record<string, FHIRCarePlan['activity'][number]['detail']['status']> = {
    SCHEDULED: 'scheduled',
    DUE: 'scheduled',
    OVERDUE: 'scheduled',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DECLINED: 'stopped',
    NOT_INDICATED: 'not-started',
  };
  return statusMap[status] || 'unknown';
}

function mapOutcomeStatusToServiceRequest(status: string): FHIRServiceRequest['status'] {
  const statusMap: Record<string, FHIRServiceRequest['status']> = {
    SCHEDULED: 'active',
    DUE: 'active',
    OVERDUE: 'active',
    IN_PROGRESS: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'revoked',
    DECLINED: 'revoked',
    NOT_INDICATED: 'revoked',
  };
  return statusMap[status] || 'unknown';
}

function mapReminderStatusToGoalStatus(status: string): FHIRGoal['lifecycleStatus'] {
  const statusMap: Record<string, FHIRGoal['lifecycleStatus']> = {
    DUE: 'active',
    OVERDUE: 'active',
    SCHEDULED: 'planned',
    COMPLETED: 'completed',
    NOT_INDICATED: 'cancelled',
    DECLINED: 'rejected',
    DISMISSED: 'cancelled',
  };
  return statusMap[status] || 'proposed';
}

function mapPriorityToFHIR(priority: string): string {
  const priorityMap: Record<string, string> = {
    HIGH: 'high-priority',
    MEDIUM: 'medium-priority',
    LOW: 'low-priority',
  };
  return priorityMap[priority] || 'medium-priority';
}

function getScreeningCategoryCode(interventionType: string): string {
  const categoryMap: Record<string, string> = {
    screening: '268565007', // Medical screening
    immunization: '127785005', // Administration of vaccine
    referral: '3457005', // Patient referral
    lab_order: '15220000', // Laboratory test
    imaging: '363679005', // Imaging
  };
  return categoryMap[interventionType.toLowerCase()] || '268565007';
}

// ============================================================================
// EXPORTS
// ============================================================================

export const PreventionExporter = {
  toFHIRCarePlan,
  toFHIRGoal,
  toFHIRServiceRequest,
  toFHIRPreventionBundle,
};

export default PreventionExporter;
