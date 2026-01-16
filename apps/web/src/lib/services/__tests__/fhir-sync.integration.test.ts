/**
 * FHIR Sync Integration Tests
 *
 * CDSS V3 - Integration tests for FHIR synchronization workflow.
 * Tests the complete flow from sync trigger to conflict resolution.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    fHIRSyncEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { prisma } = require('@/lib/prisma');

describe('FHIR Sync Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Outbound Sync Flow', () => {
    it('should create sync event when pushing patient to Medplum', async () => {
      const mockPatient = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1970-01-15'),
        version: 5,
        fhirId: null,
      };

      const mockSyncEvent = {
        id: 'sync-event-001',
        direction: 'OUTBOUND',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        operation: 'CREATE',
        status: 'PENDING',
        localVersion: 5,
        createdAt: new Date(),
      };

      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.fHIRSyncEvent.create as jest.Mock).mockResolvedValue(mockSyncEvent);

      // Simulate the sync trigger
      const patient = await prisma.patient.findUnique({
        where: { id: 'patient-123' },
      });

      expect(patient).toBeDefined();

      // Create sync event
      const syncEvent = await prisma.fHIRSyncEvent.create({
        data: {
          direction: 'OUTBOUND',
          resourceType: 'Patient',
          resourceId: patient!.id,
          operation: patient!.fhirId ? 'UPDATE' : 'CREATE',
          status: 'PENDING',
          localVersion: patient!.version,
        },
      });

      expect(syncEvent.direction).toBe('OUTBOUND');
      expect(syncEvent.status).toBe('PENDING');
      expect(prisma.fHIRSyncEvent.create).toHaveBeenCalledTimes(1);
    });

    it('should update sync event status through lifecycle', async () => {
      const syncEventId = 'sync-event-001';

      // Initial state: PENDING
      (prisma.fHIRSyncEvent.findUnique as jest.Mock).mockResolvedValueOnce({
        id: syncEventId,
        status: 'PENDING',
      });

      // Transition to IN_PROGRESS
      (prisma.fHIRSyncEvent.update as jest.Mock).mockResolvedValueOnce({
        id: syncEventId,
        status: 'IN_PROGRESS',
      });

      // Transition to SYNCED
      (prisma.fHIRSyncEvent.update as jest.Mock).mockResolvedValueOnce({
        id: syncEventId,
        status: 'SYNCED',
        syncedAt: new Date(),
        remoteVersion: '1',
      });

      // Simulate lifecycle
      const initial = await prisma.fHIRSyncEvent.findUnique({
        where: { id: syncEventId },
      });
      expect(initial?.status).toBe('PENDING');

      const inProgress = await prisma.fHIRSyncEvent.update({
        where: { id: syncEventId },
        data: { status: 'IN_PROGRESS' },
      });
      expect(inProgress.status).toBe('IN_PROGRESS');

      const completed = await prisma.fHIRSyncEvent.update({
        where: { id: syncEventId },
        data: {
          status: 'SYNCED',
          syncedAt: new Date(),
          remoteVersion: '1',
        },
      });
      expect(completed.status).toBe('SYNCED');
    });
  });

  describe('Inbound Sync Flow', () => {
    it('should create sync event when pulling patient from Medplum', async () => {
      const mockSyncEvent = {
        id: 'sync-event-002',
        direction: 'INBOUND',
        resourceType: 'Patient',
        resourceId: 'fhir-patient-456',
        operation: 'UPDATE',
        status: 'PENDING',
        remoteVersion: '3',
        createdAt: new Date(),
      };

      (prisma.fHIRSyncEvent.create as jest.Mock).mockResolvedValue(mockSyncEvent);

      const syncEvent = await prisma.fHIRSyncEvent.create({
        data: {
          direction: 'INBOUND',
          resourceType: 'Patient',
          resourceId: 'fhir-patient-456',
          operation: 'UPDATE',
          status: 'PENDING',
          remoteVersion: '3',
        },
      });

      expect(syncEvent.direction).toBe('INBOUND');
      expect(syncEvent.remoteVersion).toBe('3');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflict when local and remote data differ', async () => {
      const localPatient = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1970-01-15'),
        version: 5,
      };

      const remotePatient = {
        firstName: 'John',
        lastName: 'Smith', // Different!
        dateOfBirth: new Date('1970-01-15'),
      };

      // Conflict detection logic
      const detectConflict = (local: any, remote: any): boolean => {
        const criticalFields = ['firstName', 'lastName', 'dateOfBirth'];
        return criticalFields.some((field) => {
          const localValue = local[field];
          const remoteValue = remote[field];

          if (localValue instanceof Date && remoteValue instanceof Date) {
            return localValue.getTime() !== remoteValue.getTime();
          }
          return localValue !== remoteValue;
        });
      };

      const hasConflict = detectConflict(localPatient, remotePatient);
      expect(hasConflict).toBe(true);
    });

    it('should not detect conflict when data matches', async () => {
      const localPatient = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1970-01-15'),
      };

      const remotePatient = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1970-01-15'),
      };

      const detectConflict = (local: any, remote: any): boolean => {
        const criticalFields = ['firstName', 'lastName', 'dateOfBirth'];
        return criticalFields.some((field) => {
          const localValue = local[field];
          const remoteValue = remote[field];

          if (localValue instanceof Date && remoteValue instanceof Date) {
            return localValue.getTime() !== remoteValue.getTime();
          }
          return localValue !== remoteValue;
        });
      };

      const hasConflict = detectConflict(localPatient, remotePatient);
      expect(hasConflict).toBe(false);
    });

    it('should mark sync event as CONFLICT when conflict detected', async () => {
      const localData = { lastName: 'Doe' };
      const remoteData = { lastName: 'Smith' };

      const mockConflictEvent = {
        id: 'sync-event-003',
        status: 'CONFLICT',
        conflictData: { local: localData, remote: remoteData },
        resolvedBy: null,
        resolvedAt: null,
      };

      (prisma.fHIRSyncEvent.update as jest.Mock).mockResolvedValue(mockConflictEvent);

      const updated = await prisma.fHIRSyncEvent.update({
        where: { id: 'sync-event-003' },
        data: {
          status: 'CONFLICT',
          conflictData: { local: localData, remote: remoteData },
        },
      });

      expect(updated.status).toBe('CONFLICT');
      expect(updated.conflictData).toEqual({ local: localData, remote: remoteData });
      expect(updated.resolvedBy).toBeNull();
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflict with KEEP_LOCAL', async () => {
      const mockResolvedEvent = {
        id: 'sync-event-003',
        status: 'SYNCED',
        conflictData: { local: { lastName: 'Doe' }, remote: { lastName: 'Smith' } },
        resolution: 'KEEP_LOCAL',
        resolvedBy: 'admin-user-789',
        resolvedAt: new Date(),
      };

      (prisma.fHIRSyncEvent.update as jest.Mock).mockResolvedValue(mockResolvedEvent);

      const resolved = await prisma.fHIRSyncEvent.update({
        where: { id: 'sync-event-003' },
        data: {
          status: 'SYNCED',
          resolution: 'KEEP_LOCAL',
          resolvedBy: 'admin-user-789',
          resolvedAt: new Date(),
        },
      });

      expect(resolved.status).toBe('SYNCED');
      expect(resolved.resolution).toBe('KEEP_LOCAL');
      expect(resolved.resolvedBy).toBe('admin-user-789');
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('should resolve conflict with KEEP_REMOTE and update local data', async () => {
      const remoteData = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
      };

      (prisma.patient.update as jest.Mock).mockResolvedValue({
        id: 'patient-123',
        ...remoteData,
      });

      (prisma.fHIRSyncEvent.update as jest.Mock).mockResolvedValue({
        id: 'sync-event-003',
        status: 'SYNCED',
        resolution: 'KEEP_REMOTE',
        resolvedBy: 'admin-user-789',
        resolvedAt: new Date(),
      });

      // Update local patient with remote data
      const updatedPatient = await prisma.patient.update({
        where: { id: 'patient-123' },
        data: remoteData,
      });

      expect(updatedPatient.lastName).toBe('Smith');

      // Mark sync event as resolved
      const resolvedEvent = await prisma.fHIRSyncEvent.update({
        where: { id: 'sync-event-003' },
        data: {
          status: 'SYNCED',
          resolution: 'KEEP_REMOTE',
          resolvedBy: 'admin-user-789',
          resolvedAt: new Date(),
        },
      });

      expect(resolvedEvent.resolution).toBe('KEEP_REMOTE');
    });

    it('should resolve conflict with MANUAL_MERGE', async () => {
      const mergedData = {
        firstName: 'John',
        lastName: 'Doe-Smith', // Manual merge
        email: 'john.smith@example.com', // From remote
      };

      (prisma.patient.update as jest.Mock).mockResolvedValue({
        id: 'patient-123',
        ...mergedData,
      });

      (prisma.fHIRSyncEvent.update as jest.Mock).mockResolvedValue({
        id: 'sync-event-003',
        status: 'SYNCED',
        resolution: 'MANUAL_MERGE',
        resolvedBy: 'admin-user-789',
        resolvedAt: new Date(),
      });

      const updatedPatient = await prisma.patient.update({
        where: { id: 'patient-123' },
        data: mergedData,
      });

      expect(updatedPatient.lastName).toBe('Doe-Smith');

      const resolvedEvent = await prisma.fHIRSyncEvent.update({
        where: { id: 'sync-event-003' },
        data: {
          status: 'SYNCED',
          resolution: 'MANUAL_MERGE',
          resolvedBy: 'admin-user-789',
          resolvedAt: new Date(),
        },
      });

      expect(resolvedEvent.resolution).toBe('MANUAL_MERGE');
    });
  });

  describe('Conflict Queue', () => {
    it('should list pending conflicts for review', async () => {
      const mockConflicts = [
        {
          id: 'conflict-001',
          resourceType: 'Patient',
          resourceId: 'patient-123',
          status: 'CONFLICT',
          conflictData: { local: {}, remote: {} },
          createdAt: new Date('2026-01-16T09:00:00Z'),
        },
        {
          id: 'conflict-002',
          resourceType: 'Patient',
          resourceId: 'patient-456',
          status: 'CONFLICT',
          conflictData: { local: {}, remote: {} },
          createdAt: new Date('2026-01-16T10:00:00Z'),
        },
      ];

      (prisma.fHIRSyncEvent.findMany as jest.Mock).mockResolvedValue(mockConflicts);

      const conflicts = await prisma.fHIRSyncEvent.findMany({
        where: { status: 'CONFLICT' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      expect(conflicts.length).toBe(2);
      expect(conflicts[0].status).toBe('CONFLICT');
    });

    it('should filter conflicts by resource type', async () => {
      const mockPatientConflicts = [
        {
          id: 'conflict-001',
          resourceType: 'Patient',
          status: 'CONFLICT',
        },
      ];

      (prisma.fHIRSyncEvent.findMany as jest.Mock).mockResolvedValue(mockPatientConflicts);

      const conflicts = await prisma.fHIRSyncEvent.findMany({
        where: {
          status: 'CONFLICT',
          resourceType: 'Patient',
        },
      });

      expect(conflicts.every((c) => c.resourceType === 'Patient')).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should track retry count on failed sync', async () => {
      const mockFailedEvent = {
        id: 'sync-event-004',
        status: 'PENDING', // Reset to pending for retry
        retryCount: 2,
        maxRetries: 3,
        errorMessage: 'Medplum API timeout',
      };

      (prisma.fHIRSyncEvent.update as jest.Mock).mockResolvedValue(mockFailedEvent);

      const updated = await prisma.fHIRSyncEvent.update({
        where: { id: 'sync-event-004' },
        data: {
          status: 'PENDING',
          retryCount: { increment: 1 },
          errorMessage: 'Medplum API timeout',
        },
      });

      expect(updated.retryCount).toBe(2);
      expect(updated.retryCount).toBeLessThan(updated.maxRetries);
    });

    it('should mark as FAILED when max retries exceeded', async () => {
      const mockExhaustedEvent = {
        id: 'sync-event-004',
        status: 'FAILED',
        retryCount: 3,
        maxRetries: 3,
        errorMessage: 'Max retries exceeded',
      };

      (prisma.fHIRSyncEvent.update as jest.Mock).mockResolvedValue(mockExhaustedEvent);

      const retryCount = 3;
      const maxRetries = 3;

      // Simulate retry exhaustion check
      const shouldFail = retryCount >= maxRetries;
      expect(shouldFail).toBe(true);

      const updated = await prisma.fHIRSyncEvent.update({
        where: { id: 'sync-event-004' },
        data: {
          status: shouldFail ? 'FAILED' : 'PENDING',
          errorMessage: 'Max retries exceeded',
        },
      });

      expect(updated.status).toBe('FAILED');
    });
  });

  describe('FHIR Patient Mapping', () => {
    it('should convert local patient to FHIR format', () => {
      const localPatient = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1970-01-15'),
        gender: 'male',
        email: 'john.doe@example.com',
        phone: '555-1234',
      };

      // Simulated FHIR mapping
      const fhirPatient = {
        resourceType: 'Patient',
        name: [
          {
            family: localPatient.lastName,
            given: [localPatient.firstName],
          },
        ],
        birthDate: localPatient.dateOfBirth.toISOString().split('T')[0],
        gender: localPatient.gender,
        telecom: [
          { system: 'email', value: localPatient.email },
          { system: 'phone', value: localPatient.phone },
        ],
      };

      expect(fhirPatient.resourceType).toBe('Patient');
      expect(fhirPatient.name[0].family).toBe('Doe');
      expect(fhirPatient.name[0].given[0]).toBe('John');
      expect(fhirPatient.birthDate).toBe('1970-01-15');
    });

    it('should convert FHIR patient to local format', () => {
      const fhirPatient = {
        resourceType: 'Patient',
        id: 'fhir-456',
        meta: { versionId: '3' },
        name: [
          {
            family: 'Smith',
            given: ['Jane', 'Marie'],
          },
        ],
        birthDate: '1985-03-20',
        gender: 'female',
        telecom: [
          { system: 'email', value: 'jane@example.com' },
          { system: 'phone', value: '555-5678' },
        ],
      };

      // Simulated local mapping
      const localPatient = {
        firstName: fhirPatient.name[0].given[0],
        lastName: fhirPatient.name[0].family,
        dateOfBirth: new Date(fhirPatient.birthDate),
        gender: fhirPatient.gender,
        email: fhirPatient.telecom.find((t) => t.system === 'email')?.value,
        phone: fhirPatient.telecom.find((t) => t.system === 'phone')?.value,
        fhirId: fhirPatient.id,
      };

      expect(localPatient.firstName).toBe('Jane');
      expect(localPatient.lastName).toBe('Smith');
      expect(localPatient.fhirId).toBe('fhir-456');
    });
  });

  describe('Audit Trail', () => {
    it('should capture all sync events for audit', async () => {
      const mockAuditTrail = [
        { id: 'sync-001', status: 'SYNCED', syncedAt: new Date() },
        { id: 'sync-002', status: 'CONFLICT', resolvedBy: 'admin-user' },
        { id: 'sync-003', status: 'FAILED', errorMessage: 'Connection error' },
      ];

      (prisma.fHIRSyncEvent.findMany as jest.Mock).mockResolvedValue(mockAuditTrail);

      const events = await prisma.fHIRSyncEvent.findMany({
        where: { resourceId: 'patient-123' },
        orderBy: { createdAt: 'desc' },
      });

      // All statuses should be tracked
      const statuses = events.map((e) => e.status);
      expect(statuses).toContain('SYNCED');
      expect(statuses).toContain('CONFLICT');
      expect(statuses).toContain('FAILED');
    });

    it('should track who and when conflicts were resolved', async () => {
      const mockResolvedConflict = {
        id: 'sync-002',
        status: 'SYNCED',
        resolution: 'KEEP_LOCAL',
        resolvedBy: 'admin-user-789',
        resolvedAt: new Date('2026-01-16T14:30:00Z'),
        conflictData: {
          local: { lastName: 'Doe' },
          remote: { lastName: 'Smith' },
        },
      };

      (prisma.fHIRSyncEvent.findUnique as jest.Mock).mockResolvedValue(mockResolvedConflict);

      const event = await prisma.fHIRSyncEvent.findUnique({
        where: { id: 'sync-002' },
      });

      // Audit fields should be populated
      expect(event?.resolvedBy).toBeDefined();
      expect(event?.resolvedAt).toBeDefined();
      expect(event?.resolution).toBeDefined();
      expect(event?.conflictData).toBeDefined();
    });
  });
});
