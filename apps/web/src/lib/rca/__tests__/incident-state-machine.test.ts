import {
  validateTransition,
  transitionIncident,
  InvalidTransitionError,
  ResolveGateError,
  VALID_TRANSITIONS,
} from '../incident-state-machine';
import { IncidentStatus } from '@prisma/client';

let mockTx: {
  safetyIncident: {
    findUniqueOrThrow: jest.Mock;
    update: jest.Mock;
  };
  safetyCorrectiveAction: {
    findMany: jest.Mock;
  };
};

let mockPrisma: any;

beforeEach(() => {
  jest.clearAllMocks();
  mockTx = {
    safetyIncident: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    safetyCorrectiveAction: {
      findMany: jest.fn(),
    },
  };
  mockPrisma = {
    $transaction: jest.fn((cb: any) => cb(mockTx)),
  };
});

describe('validateTransition', () => {
  it('REPORTED -> TRIAGED is valid', () => {
    expect(validateTransition(IncidentStatus.REPORTED, IncidentStatus.TRIAGED)).toBe(true);
  });

  it('TRIAGED -> UNDER_INVESTIGATION is valid', () => {
    expect(
      validateTransition(IncidentStatus.TRIAGED, IncidentStatus.UNDER_INVESTIGATION),
    ).toBe(true);
  });

  it('UNDER_INVESTIGATION -> ACTIONS_PENDING is valid', () => {
    expect(
      validateTransition(IncidentStatus.UNDER_INVESTIGATION, IncidentStatus.ACTIONS_PENDING),
    ).toBe(true);
  });

  it('ACTIONS_PENDING -> RESOLVED is valid', () => {
    expect(
      validateTransition(IncidentStatus.ACTIONS_PENDING, IncidentStatus.RESOLVED),
    ).toBe(true);
  });

  it('RESOLVED -> CLOSED is valid', () => {
    expect(validateTransition(IncidentStatus.RESOLVED, IncidentStatus.CLOSED)).toBe(true);
  });

  it('rejects skipping states (REPORTED -> RESOLVED)', () => {
    expect(
      validateTransition(IncidentStatus.REPORTED, IncidentStatus.RESOLVED),
    ).toBe(false);
  });

  it('rejects backward transitions (CLOSED -> REPORTED)', () => {
    expect(
      validateTransition(IncidentStatus.CLOSED, IncidentStatus.REPORTED),
    ).toBe(false);
  });

  it('CLOSED is a terminal state with no valid transitions', () => {
    const allStatuses = Object.values(IncidentStatus);
    for (const target of allStatuses) {
      expect(validateTransition(IncidentStatus.CLOSED, target)).toBe(false);
    }
    expect(VALID_TRANSITIONS[IncidentStatus.CLOSED]).toEqual([]);
  });
});

describe('transitionIncident', () => {
  const INCIDENT_ID = 'inc-001';
  const USER_ID = 'user-001';

  it('transitions REPORTED -> TRIAGED and sets triagedAt/triagedById', async () => {
    const existingIncident = { id: INCIDENT_ID, status: IncidentStatus.REPORTED };
    const updatedIncident = { id: INCIDENT_ID, status: IncidentStatus.TRIAGED };

    mockTx.safetyIncident.findUniqueOrThrow.mockResolvedValue(existingIncident);
    mockTx.safetyIncident.update.mockResolvedValue(updatedIncident);

    const result = await transitionIncident(
      mockPrisma,
      INCIDENT_ID,
      IncidentStatus.TRIAGED,
      USER_ID,
    );

    expect(result).toEqual(updatedIncident);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.safetyIncident.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
    });

    const updateCall = mockTx.safetyIncident.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe(IncidentStatus.TRIAGED);
    expect(updateCall.data.triagedAt).toBeInstanceOf(Date);
    expect(updateCall.data.triagedById).toBe(USER_ID);
  });

  it('sets triageNotes when notes are provided for TRIAGED transition', async () => {
    const existingIncident = { id: INCIDENT_ID, status: IncidentStatus.REPORTED };
    const updatedIncident = { id: INCIDENT_ID, status: IncidentStatus.TRIAGED };
    const triageNotes = 'Low-severity near-miss, assign to QA team';

    mockTx.safetyIncident.findUniqueOrThrow.mockResolvedValue(existingIncident);
    mockTx.safetyIncident.update.mockResolvedValue(updatedIncident);

    await transitionIncident(
      mockPrisma,
      INCIDENT_ID,
      IncidentStatus.TRIAGED,
      USER_ID,
      triageNotes,
    );

    const updateCall = mockTx.safetyIncident.update.mock.calls[0][0];
    expect(updateCall.data.triageNotes).toBe(triageNotes);
  });

  it('does not set triageNotes when notes are omitted for TRIAGED transition', async () => {
    const existingIncident = { id: INCIDENT_ID, status: IncidentStatus.REPORTED };

    mockTx.safetyIncident.findUniqueOrThrow.mockResolvedValue(existingIncident);
    mockTx.safetyIncident.update.mockResolvedValue({});

    await transitionIncident(
      mockPrisma,
      INCIDENT_ID,
      IncidentStatus.TRIAGED,
      USER_ID,
    );

    const updateCall = mockTx.safetyIncident.update.mock.calls[0][0];
    expect(updateCall.data.triageNotes).toBeUndefined();
  });

  it('throws InvalidTransitionError on invalid transition', async () => {
    const existingIncident = { id: INCIDENT_ID, status: IncidentStatus.REPORTED };
    mockTx.safetyIncident.findUniqueOrThrow.mockResolvedValue(existingIncident);

    await expect(
      transitionIncident(
        mockPrisma,
        INCIDENT_ID,
        IncidentStatus.RESOLVED,
        USER_ID,
      ),
    ).rejects.toThrow(InvalidTransitionError);

    expect(mockTx.safetyIncident.update).not.toHaveBeenCalled();
  });

  it('throws ResolveGateError when resolving with unverified corrective actions', async () => {
    const existingIncident = { id: INCIDENT_ID, status: IncidentStatus.ACTIONS_PENDING };
    const pendingActions = [{ id: 'action-001' }, { id: 'action-002' }];

    mockTx.safetyIncident.findUniqueOrThrow.mockResolvedValue(existingIncident);
    mockTx.safetyCorrectiveAction.findMany.mockResolvedValue(pendingActions);

    await expect(
      transitionIncident(
        mockPrisma,
        INCIDENT_ID,
        IncidentStatus.RESOLVED,
        USER_ID,
      ),
    ).rejects.toThrow(ResolveGateError);

    try {
      await transitionIncident(
        mockPrisma,
        INCIDENT_ID,
        IncidentStatus.RESOLVED,
        USER_ID,
      );
    } catch (err) {
      expect((err as ResolveGateError).pendingActionIds).toEqual([
        'action-001',
        'action-002',
      ]);
    }

    expect(mockTx.safetyIncident.update).not.toHaveBeenCalled();
  });

  it('allows RESOLVED when all corrective actions are VERIFIED', async () => {
    const existingIncident = { id: INCIDENT_ID, status: IncidentStatus.ACTIONS_PENDING };
    const resolvedIncident = { id: INCIDENT_ID, status: IncidentStatus.RESOLVED };

    mockTx.safetyIncident.findUniqueOrThrow.mockResolvedValue(existingIncident);
    mockTx.safetyCorrectiveAction.findMany.mockResolvedValue([]);
    mockTx.safetyIncident.update.mockResolvedValue(resolvedIncident);

    const result = await transitionIncident(
      mockPrisma,
      INCIDENT_ID,
      IncidentStatus.RESOLVED,
      USER_ID,
    );

    expect(result).toEqual(resolvedIncident);
    expect(mockTx.safetyCorrectiveAction.findMany).toHaveBeenCalledWith({
      where: {
        incidentId: INCIDENT_ID,
        status: { not: 'VERIFIED' },
      },
      select: { id: true },
    });
  });

  it('throws when incident does not exist', async () => {
    mockTx.safetyIncident.findUniqueOrThrow.mockRejectedValue(
      new Error('Record not found'),
    );

    await expect(
      transitionIncident(
        mockPrisma,
        'non-existent-id',
        IncidentStatus.TRIAGED,
        USER_ID,
      ),
    ).rejects.toThrow('Record not found');
  });
});
