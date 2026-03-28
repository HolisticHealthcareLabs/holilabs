jest.mock('@/lib/prisma', () => ({
  prisma: {
    safetyIncident: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    qualityMeasure: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    qualityMeasureResult: {
      findFirst: jest.fn(),
    },
    careTeam: {
      create: jest.fn(),
    },
    careTeamMembership: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    careTeamTask: {
      create: jest.fn(),
    },
    careConference: {
      create: jest.fn(),
    },
    sharedCarePlan: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { prisma } = require('@/lib/prisma');

import { safetyIncidentTools } from '../safety-incident.tools';
import { vbcTools } from '../vbc.tools';
import { careCoordinationTools } from '../care-coordination.tools';

const mockContext = {
  clinicianId: 'user-1',
  agentId: 'agent-1',
  sessionId: 'session-1',
  roles: ['ADMIN', 'PHYSICIAN'],
};

describe('Safety Incident MCP Tools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('report_safety_incident creates an incident', async () => {
    const tool = safetyIncidentTools.find((t) => t.name === 'report_safety_incident')!;
    (prisma.safetyIncident.create as jest.Mock).mockResolvedValue({
      id: 'inc-1',
      status: 'REPORTED',
    });

    const result = await tool.handler({
      eventType: 'NEAR_MISS',
      severity: 'LOW',
      title: 'Test near miss',
      description: 'Test near miss event for unit testing',
      isAnonymous: false,
    }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.incidentId).toBe('inc-1');
  });

  it('list_safety_incidents returns paginated results', async () => {
    const tool = safetyIncidentTools.find((t) => t.name === 'list_safety_incidents')!;
    (prisma.safetyIncident.findMany as jest.Mock).mockResolvedValue([
      { id: 'inc-1', severity: 'HIGH', status: 'REPORTED' },
    ]);
    (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(1);

    const result = await tool.handler({ skip: 0, take: 20 }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.total).toBe(1);
    expect(result.data.incidents).toHaveLength(1);
  });

  it('get_incident_rca returns RCA data', async () => {
    const tool = safetyIncidentTools.find((t) => t.name === 'get_incident_rca')!;
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue({
      id: 'inc-1',
      status: 'ACTIONS_PENDING',
      fishboneFindings: { findings: [] },
      fiveWhysChain: { chain: [] },
      rootCauses: ['Root cause 1'],
      correctiveActions: [{ id: 'ca-1' }],
      rcaCompletedAt: new Date(),
    });

    const result = await tool.handler({ incidentId: 'inc-1' }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.rootCauses).toEqual(['Root cause 1']);
  });

  it('get_incident_rca returns failure for missing incident', async () => {
    const tool = safetyIncidentTools.find((t) => t.name === 'get_incident_rca')!;
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await tool.handler({ incidentId: 'missing' }, mockContext);
    expect(result.success).toBe(false);
  });
});

describe('VBC MCP Tools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('get_quality_measures lists measures', async () => {
    const tool = vbcTools.find((t) => t.name === 'get_quality_measures')!;
    (prisma.qualityMeasure.findMany as jest.Mock).mockResolvedValue([
      { code: 'HBA1C', name: 'HbA1c Control', category: 'OUTCOME' },
    ]);

    const result = await tool.handler({ jurisdiction: 'BR', isActive: true }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.count).toBe(1);
  });

  it('evaluate_quality_measure returns latest result', async () => {
    const tool = vbcTools.find((t) => t.name === 'evaluate_quality_measure')!;
    (prisma.qualityMeasure.findUnique as jest.Mock).mockResolvedValue({
      id: 'qm-1',
      code: 'HBA1C',
      name: 'HbA1c Control',
      targetRate: 0.80,
    });
    (prisma.qualityMeasureResult.findFirst as jest.Mock).mockResolvedValue({
      rate: 0.82,
      numerator: 82,
      denominator: 100,
      meetsTarget: true,
      gapPatientIds: [],
      calculatedAt: new Date(),
    });

    const result = await tool.handler({
      measureCode: 'HBA1C',
      organizationId: 'org-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
    }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.latestResult.rate).toBe(0.82);
    expect(result.data.latestResult.meetsTarget).toBe(true);
  });

  it('get_measure_gaps returns gap patients', async () => {
    const tool = vbcTools.find((t) => t.name === 'get_measure_gaps')!;
    (prisma.qualityMeasure.findUnique as jest.Mock).mockResolvedValue({
      id: 'qm-1', code: 'HBA1C', name: 'HbA1c', targetRate: 0.80,
    });
    (prisma.qualityMeasureResult.findFirst as jest.Mock).mockResolvedValue({
      gapPatientIds: ['p-1', 'p-2'],
      rate: 0.65,
    });

    const result = await tool.handler({
      measureCode: 'HBA1C',
      organizationId: 'org-1',
    }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.gapCount).toBe(2);
  });
});

describe('Care Coordination MCP Tools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create_care_team creates a team', async () => {
    const tool = careCoordinationTools.find((t) => t.name === 'create_care_team')!;
    (prisma.careTeam.create as jest.Mock).mockResolvedValue({ id: 'team-1' });

    const result = await tool.handler({
      patientId: 'p-1',
      owningOrgId: 'org-1',
    }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.careTeamId).toBe('team-1');
  });

  it('add_care_team_member detects duplicates', async () => {
    const tool = careCoordinationTools.find((t) => t.name === 'add_care_team_member')!;
    (prisma.careTeamMembership.findFirst as jest.Mock).mockResolvedValue({
      id: 'member-existing',
    });

    const result = await tool.handler({
      careTeamId: 'team-1',
      userId: 'user-2',
      role: 'SPECIALIST',
      organizationId: 'org-1',
    }, mockContext);

    expect(result.success).toBe(true);
    expect(result.meta?.warnings?.[0]).toContain('already');
  });

  it('assign_care_team_task creates task', async () => {
    const tool = careCoordinationTools.find((t) => t.name === 'assign_care_team_task')!;
    (prisma.careTeamTask.create as jest.Mock).mockResolvedValue({ id: 'task-1' });

    const result = await tool.handler({
      careTeamId: 'team-1',
      title: 'Review lab results',
      priority: 'HIGH',
      slaHours: 24,
    }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.taskId).toBe('task-1');
  });

  it('detect_plan_conflicts finds contradictory targets', async () => {
    const tool = careCoordinationTools.find((t) => t.name === 'detect_plan_conflicts')!;
    (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      goals: [
        { title: 'Cardio HbA1c Goal', measureCode: 'HBA1C', targetValue: 7.0 },
        { title: 'Endo HbA1c Goal', measureCode: 'HBA1C', targetValue: 6.5 },
      ],
    });

    const result = await tool.handler({ sharedPlanId: 'plan-1' }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.conflictCount).toBe(1);
    expect(result.data.conflicts[0].type).toBe('CONTRADICTORY_TARGETS');
  });

  it('detect_plan_conflicts returns no conflicts when goals differ', async () => {
    const tool = careCoordinationTools.find((t) => t.name === 'detect_plan_conflicts')!;
    (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      goals: [
        { title: 'Goal A', measureCode: 'HBA1C', targetValue: 7.0 },
        { title: 'Goal B', measureCode: 'BP_SYSTOLIC', targetValue: 130 },
      ],
    });

    const result = await tool.handler({ sharedPlanId: 'plan-1' }, mockContext);
    expect(result.success).toBe(true);
    expect(result.data.conflictCount).toBe(0);
  });
});
