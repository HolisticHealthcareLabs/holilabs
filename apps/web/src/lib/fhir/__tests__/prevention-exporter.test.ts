/**
 * FHIR Prevention Exporter Tests
 *
 * Tests for FHIR R4 prevention resource generation:
 * - CarePlan export
 * - Goal export
 * - ServiceRequest export
 * - Bundle generation
 */

import {
  toFHIRCarePlan,
  toFHIRGoal,
  toFHIRServiceRequest,
  toFHIRPreventionBundle,
  type FHIRCarePlan,
  type FHIRGoal,
  type FHIRServiceRequest,
} from '../prevention-exporter';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockPatient = {
  id: 'patient-123',
  firstName: 'John',
  lastName: 'Doe',
};

const mockProtocol = {
  id: 'protocol-1',
  ruleId: 'PROTOCOL-DM-001',
  name: 'Diabetes Screening Protocol',
  category: 'SCREENING' as const,
  version: '1.0',
  source: 'USPSTF',
  logic: {},
  minConfidence: 0.85,
  requireHumanReview: false,
  maxDataAgeHours: null,
  evidenceLevel: 'B',
  references: null,
  isActive: true,
  minAge: 35,
  maxAge: 70,
  gender: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'user-1',
  approvedBy: 'admin-1',
  approvedAt: new Date('2026-01-01'),
};

const mockOutcome = {
  id: 'outcome-1',
  patientId: 'patient-123',
  protocolId: 'protocol-1',
  interventionType: 'screening',
  interventionName: 'A1C Screening',
  cptCode: '83036',
  icdCode: 'E11.9',
  scheduledDate: new Date('2026-02-01'),
  completedDate: null,
  dueDate: new Date('2026-03-01'),
  status: 'SCHEDULED' as const,
  result: null,
  resultSummary: null,
  isAbnormal: false,
  followUpNeeded: false,
  followUpNotes: null,
  orderedBy: 'dr-smith',
  completedBy: null,
  reviewedBy: null,
  reviewedAt: null,
  patientDeclined: false,
  declineReason: null,
  declinedAt: null,
  remindersSent: 0,
  lastReminderAt: null,
  daysToCompletion: null,
  wasOverdue: false,
  createdAt: new Date('2026-01-20'),
  updatedAt: new Date('2026-01-20'),
  protocol: mockProtocol,
};

const mockCompletedOutcome = {
  ...mockOutcome,
  id: 'outcome-2',
  status: 'COMPLETED' as const,
  completedDate: new Date('2026-02-15'),
  completedBy: 'nurse-jane',
  result: { a1c: 6.8 },
  resultSummary: 'A1C within normal range',
  daysToCompletion: 14,
};

const mockDeclinedOutcome = {
  ...mockOutcome,
  id: 'outcome-3',
  status: 'DECLINED' as const,
  patientDeclined: true,
  declineReason: 'Patient prefers to wait',
  declinedAt: new Date('2026-01-25'),
};

const mockReminder = {
  id: 'reminder-1',
  patientId: 'patient-123',
  screeningType: 'DIABETES_SCREENING' as const,
  title: 'Annual A1C Screening',
  description: 'Recommended for patients at risk of type 2 diabetes',
  recommendedBy: new Date('2026-01-01'),
  dueDate: new Date('2026-02-01'),
  priority: 'MEDIUM' as const,
  guidelineSource: 'USPSTF',
  evidenceLevel: 'Grade B',
  status: 'DUE' as const,
  completedAt: null,
  completedBy: null,
  resultNotes: null,
  recurringInterval: 12,
  nextDueDate: new Date('2027-02-01'),
  dismissedAt: null,
  dismissedBy: null,
  dismissalReason: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ============================================================================
// CAREPLAN TESTS
// ============================================================================

describe('toFHIRCarePlan', () => {
  it('should create a valid FHIR CarePlan resource', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockOutcome]);

    expect(carePlan.resourceType).toBe('CarePlan');
    expect(carePlan.status).toBe('active');
    expect(carePlan.intent).toBe('plan');
    expect(carePlan.subject.reference).toBe('Patient/patient-123');
    expect(carePlan.subject.display).toBe('John Doe');
  });

  it('should include category coding', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockOutcome]);

    expect(carePlan.category).toBeDefined();
    expect(carePlan.category?.[0].coding?.[0].system).toBe(
      'http://hl7.org/fhir/us/core/CodeSystem/careplan-category'
    );
    expect(carePlan.category?.[0].coding?.[0].code).toBe('assess-plan');
  });

  it('should convert outcomes to activities', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockOutcome, mockCompletedOutcome]);

    expect(carePlan.activity).toHaveLength(2);
    expect(carePlan.activity?.[0].detail?.status).toBe('scheduled');
    expect(carePlan.activity?.[1].detail?.status).toBe('completed');
  });

  it('should include CPT code in activity coding', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockOutcome]);

    const activity = carePlan.activity?.[0];
    expect(activity?.detail?.code?.coding?.[0].system).toBe(
      'http://www.ama-assn.org/go/cpt'
    );
    expect(activity?.detail?.code?.coding?.[0].code).toBe('83036');
  });

  it('should handle declined outcomes with status reason', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockDeclinedOutcome]);

    const activity = carePlan.activity?.[0];
    expect(activity?.detail?.status).toBe('stopped');
    expect(activity?.detail?.statusReason?.text).toBe('Patient prefers to wait');
  });

  it('should include author when provided', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockOutcome], {
      author: { id: 'dr-123', name: 'Dr. Smith' },
    });

    expect(carePlan.author?.reference).toBe('Practitioner/dr-123');
    expect(carePlan.author?.display).toBe('Dr. Smith');
  });

  it('should include custom title and description', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockOutcome], {
      title: 'Custom Prevention Plan',
      description: 'Custom description for the plan',
    });

    expect(carePlan.title).toBe('Custom Prevention Plan');
    expect(carePlan.description).toBe('Custom description for the plan');
  });

  it('should include identifier with system', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockOutcome]);

    expect(carePlan.identifier?.[0].system).toBe('urn:holilabs:prevention-plan');
    expect(carePlan.identifier?.[0].value).toContain('patient-123');
  });

  it('should include note with generation info', () => {
    const carePlan = toFHIRCarePlan(mockPatient, [mockOutcome]);

    expect(carePlan.note).toBeDefined();
    expect(carePlan.note?.[0].text).toContain('HoliLabs Prevention Hub');
    expect(carePlan.note?.[0].authorString).toBe('HoliLabs Prevention Hub');
  });
});

// ============================================================================
// GOAL TESTS
// ============================================================================

describe('toFHIRGoal', () => {
  it('should create a valid FHIR Goal resource', () => {
    const goal = toFHIRGoal(mockPatient, mockReminder);

    expect(goal.resourceType).toBe('Goal');
    expect(goal.lifecycleStatus).toBe('active');
    expect(goal.subject.reference).toBe('Patient/patient-123');
    expect(goal.description.text).toBe('Annual A1C Screening');
  });

  it('should include category coding', () => {
    const goal = toFHIRGoal(mockPatient, mockReminder);

    expect(goal.category?.[0].coding?.[0].system).toBe(
      'http://terminology.hl7.org/CodeSystem/goal-category'
    );
    expect(goal.category?.[0].coding?.[0].code).toBe('safety');
  });

  it('should include target with due date', () => {
    const goal = toFHIRGoal(mockPatient, mockReminder);

    expect(goal.target).toBeDefined();
    expect(goal.target?.[0].dueDate).toBe('2026-02-01');
    expect(goal.target?.[0].detailString).toContain('diabetes');
  });

  it('should include priority coding', () => {
    const goal = toFHIRGoal(mockPatient, mockReminder);

    expect(goal.priority?.coding?.[0].system).toBe(
      'http://terminology.hl7.org/CodeSystem/goal-priority'
    );
    expect(goal.priority?.coding?.[0].code).toBe('medium-priority');
  });

  it('should map completed status correctly', () => {
    const completedReminder = { ...mockReminder, status: 'COMPLETED' as const };
    const goal = toFHIRGoal(mockPatient, completedReminder);

    expect(goal.lifecycleStatus).toBe('completed');
  });

  it('should map declined status correctly', () => {
    const declinedReminder = { ...mockReminder, status: 'DECLINED' as const };
    const goal = toFHIRGoal(mockPatient, declinedReminder);

    expect(goal.lifecycleStatus).toBe('rejected');
  });

  it('should include guideline source in note', () => {
    const goal = toFHIRGoal(mockPatient, mockReminder);

    expect(goal.note?.[0].text).toContain('USPSTF');
    expect(goal.note?.[0].text).toContain('Grade B');
  });

  it('should include expressed by when provided', () => {
    const goal = toFHIRGoal(mockPatient, mockReminder, {
      expressedBy: { id: 'dr-123', name: 'Dr. Smith' },
    });

    expect(goal.expressedBy?.reference).toBe('Practitioner/dr-123');
    expect(goal.expressedBy?.display).toBe('Dr. Smith');
  });

  it('should include start date', () => {
    const goal = toFHIRGoal(mockPatient, mockReminder);

    expect(goal.startDate).toBe('2026-01-01');
  });
});

// ============================================================================
// SERVICEREQUEST TESTS
// ============================================================================

describe('toFHIRServiceRequest', () => {
  it('should create a valid FHIR ServiceRequest resource', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockOutcome);

    expect(serviceRequest.resourceType).toBe('ServiceRequest');
    expect(serviceRequest.status).toBe('active');
    expect(serviceRequest.intent).toBe('order');
    expect(serviceRequest.subject.reference).toBe('Patient/patient-123');
  });

  it('should include code with CPT and ICD codes', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockOutcome);

    expect(serviceRequest.code?.coding).toHaveLength(2);

    const cptCoding = serviceRequest.code?.coding?.find(
      (c) => c.system === 'http://www.ama-assn.org/go/cpt'
    );
    expect(cptCoding?.code).toBe('83036');

    const icdCoding = serviceRequest.code?.coding?.find(
      (c) => c.system === 'http://hl7.org/fhir/sid/icd-10'
    );
    expect(icdCoding?.code).toBe('E11.9');
  });

  it('should include category with SNOMED code', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockOutcome);

    expect(serviceRequest.category?.[0].coding?.[0].system).toBe(
      'http://snomed.info/sct'
    );
    expect(serviceRequest.category?.[0].text).toBe('screening');
  });

  it('should map completed status correctly', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockCompletedOutcome);

    expect(serviceRequest.status).toBe('completed');
  });

  it('should map declined status to revoked', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockDeclinedOutcome);

    expect(serviceRequest.status).toBe('revoked');
  });

  it('should include requester when orderedBy is present', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockOutcome);

    expect(serviceRequest.requester?.reference).toBe('Practitioner/dr-smith');
  });

  it('should include reason code with protocol info', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockOutcome);

    expect(serviceRequest.reasonCode?.[0].coding?.[0].system).toBe(
      'urn:holilabs:protocol'
    );
    expect(serviceRequest.reasonCode?.[0].coding?.[0].code).toBe('PROTOCOL-DM-001');
    expect(serviceRequest.reasonCode?.[0].text).toContain('Diabetes Screening Protocol');
  });

  it('should set priority to urgent when followUpNeeded is true', () => {
    const urgentOutcome = { ...mockOutcome, followUpNeeded: true };
    const serviceRequest = toFHIRServiceRequest(mockPatient, urgentOutcome);

    expect(serviceRequest.priority).toBe('urgent');
  });

  it('should set routine priority by default', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockOutcome);

    expect(serviceRequest.priority).toBe('routine');
  });

  it('should include occurrence date time', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockOutcome);

    expect(serviceRequest.occurrenceDateTime).toBe('2026-02-01T00:00:00.000Z');
  });

  it('should include authored on date', () => {
    const serviceRequest = toFHIRServiceRequest(mockPatient, mockOutcome);

    expect(serviceRequest.authoredOn).toBe('2026-01-20T00:00:00.000Z');
  });
});

// ============================================================================
// BUNDLE TESTS
// ============================================================================

describe('toFHIRPreventionBundle', () => {
  it('should create a valid FHIR Bundle', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder]);

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('collection');
    expect(bundle.timestamp).toBeDefined();
  });

  it('should include CarePlan by default', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder]);

    const carePlanEntry = bundle.entry.find(
      (e) => e.resource.resourceType === 'CarePlan'
    );
    expect(carePlanEntry).toBeDefined();
  });

  it('should include Goals from reminders', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder]);

    const goalEntries = bundle.entry.filter((e) => e.resource.resourceType === 'Goal');
    expect(goalEntries).toHaveLength(1);
  });

  it('should include ServiceRequests from outcomes', () => {
    const bundle = toFHIRPreventionBundle(
      mockPatient,
      [mockOutcome, mockCompletedOutcome],
      [mockReminder]
    );

    const serviceRequestEntries = bundle.entry.filter(
      (e) => e.resource.resourceType === 'ServiceRequest'
    );
    expect(serviceRequestEntries).toHaveLength(2);
  });

  it('should respect includeCarePlan option', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder], {
      includeCarePlan: false,
    });

    const carePlanEntry = bundle.entry.find(
      (e) => e.resource.resourceType === 'CarePlan'
    );
    expect(carePlanEntry).toBeUndefined();
  });

  it('should respect includeGoals option', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder], {
      includeGoals: false,
    });

    const goalEntries = bundle.entry.filter((e) => e.resource.resourceType === 'Goal');
    expect(goalEntries).toHaveLength(0);
  });

  it('should respect includeServiceRequests option', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder], {
      includeServiceRequests: false,
    });

    const serviceRequestEntries = bundle.entry.filter(
      (e) => e.resource.resourceType === 'ServiceRequest'
    );
    expect(serviceRequestEntries).toHaveLength(0);
  });

  it('should include total count', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder]);

    expect(bundle.total).toBe(3); // 1 CarePlan + 1 Goal + 1 ServiceRequest
  });

  it('should include fullUrl for each entry', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder]);

    bundle.entry.forEach((entry) => {
      expect(entry.fullUrl).toBeDefined();
      expect(entry.fullUrl).toMatch(/^urn:uuid:/);
    });
  });

  it('should handle empty outcomes', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [], [mockReminder]);

    const carePlanEntry = bundle.entry.find(
      (e) => e.resource.resourceType === 'CarePlan'
    );
    expect(carePlanEntry).toBeUndefined(); // No CarePlan without outcomes
  });

  it('should handle empty reminders', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], []);

    const goalEntries = bundle.entry.filter((e) => e.resource.resourceType === 'Goal');
    expect(goalEntries).toHaveLength(0);
  });

  it('should pass author to CarePlan', () => {
    const bundle = toFHIRPreventionBundle(mockPatient, [mockOutcome], [mockReminder], {
      author: { id: 'dr-123', name: 'Dr. Smith' },
    });

    const carePlanEntry = bundle.entry.find(
      (e) => e.resource.resourceType === 'CarePlan'
    );
    const carePlan = carePlanEntry?.resource as FHIRCarePlan;
    expect(carePlan.author?.display).toBe('Dr. Smith');
  });
});

// ============================================================================
// STATUS MAPPING TESTS
// ============================================================================

describe('Status Mapping', () => {
  const outcomeStatuses = [
    { status: 'SCHEDULED', carePlan: 'scheduled', serviceRequest: 'active' },
    { status: 'DUE', carePlan: 'scheduled', serviceRequest: 'active' },
    { status: 'OVERDUE', carePlan: 'scheduled', serviceRequest: 'active' },
    { status: 'IN_PROGRESS', carePlan: 'in-progress', serviceRequest: 'active' },
    { status: 'COMPLETED', carePlan: 'completed', serviceRequest: 'completed' },
    { status: 'CANCELLED', carePlan: 'cancelled', serviceRequest: 'revoked' },
    { status: 'DECLINED', carePlan: 'stopped', serviceRequest: 'revoked' },
    { status: 'NOT_INDICATED', carePlan: 'not-started', serviceRequest: 'revoked' },
  ];

  outcomeStatuses.forEach(({ status, carePlan, serviceRequest }) => {
    it(`should map outcome status ${status} correctly`, () => {
      const outcome = { ...mockOutcome, status: status as any };

      const carePlanResult = toFHIRCarePlan(mockPatient, [outcome]);
      expect(carePlanResult.activity?.[0].detail?.status).toBe(carePlan);

      const serviceRequestResult = toFHIRServiceRequest(mockPatient, outcome);
      expect(serviceRequestResult.status).toBe(serviceRequest);
    });
  });

  const reminderStatuses = [
    { status: 'DUE', goal: 'active' },
    { status: 'OVERDUE', goal: 'active' },
    { status: 'SCHEDULED', goal: 'planned' },
    { status: 'COMPLETED', goal: 'completed' },
    { status: 'NOT_INDICATED', goal: 'cancelled' },
    { status: 'DECLINED', goal: 'rejected' },
    { status: 'DISMISSED', goal: 'cancelled' },
  ];

  reminderStatuses.forEach(({ status, goal }) => {
    it(`should map reminder status ${status} to goal status ${goal}`, () => {
      const reminder = { ...mockReminder, status: status as any };
      const goalResult = toFHIRGoal(mockPatient, reminder);
      expect(goalResult.lifecycleStatus).toBe(goal);
    });
  });
});
