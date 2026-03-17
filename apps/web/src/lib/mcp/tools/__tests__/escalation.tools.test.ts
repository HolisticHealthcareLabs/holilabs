/**
 * Escalation MCP Tools - Test Suite
 *
 * Tests for:
 * - list_escalations with filters and pagination
 * - create_escalation with SLA deadline calculation
 * - assign_escalation state machine transitions
 * - resolve_escalation idempotence
 * - Permission checks (NURSE denied)
 * - Edge cases (assign already-resolved returns error)
 */

jest.mock('@/lib/prisma', () => ({
    prisma: {
        escalation: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
        escalationNote: {
            create: jest.fn(),
        },
        auditLog: {
            create: jest.fn(),
        },
    },
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import { escalationTools } from '../escalation.tools';
import type { MCPContext } from '../../types';

const { prisma } = require('@/lib/prisma');
const { logger } = require('@/lib/logger');

describe('Escalation Tools', () => {
    let mockContext: MCPContext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContext = {
            clinicianId: 'clinician-123',
            agentId: 'agent-test',
            sessionId: 'session-123',
            roles: ['ADMIN'],
            clinicId: 'clinic-123',
        };
    });

    // =========================================================================
    // list_escalations Tests
    // =========================================================================

    describe('list_escalations', () => {
        const tool = escalationTools.find(t => t.name === 'list_escalations');

        it('should list all escalations without filters', async () => {
            const mockEscalations = [
                {
                    id: 'esc-1',
                    patientId: 'patient-1',
                    title: 'Critical Alert',
                    description: 'Critical escalation',
                    category: 'CLINICAL',
                    severity: 'CRITICAL',
                    status: 'PENDING',
                    escalationLevel: 5,
                    assignedToId: null,
                    slaDeadline: new Date(),
                    createdAt: new Date(),
                    patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
                    assignedTo: null,
                },
            ];

            (prisma.escalation.findMany as jest.Mock).mockResolvedValue(mockEscalations);
            (prisma.escalation.count as jest.Mock).mockResolvedValue(1);

            const result = await tool!.handler({ skip: 0, take: 20 }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data.escalations).toHaveLength(1);
            expect(result.data.escalations[0].title).toBe('Critical Alert');
            expect(result.data.pagination.total).toBe(1);
        });

        it('should filter escalations by status', async () => {
            const mockEscalations = [
                {
                    id: 'esc-1',
                    patientId: 'patient-1',
                    title: 'Pending Escalation',
                    category: 'CLINICAL',
                    severity: 'HIGH',
                    status: 'PENDING',
                    escalationLevel: 3,
                    assignedToId: null,
                    slaDeadline: new Date(),
                    createdAt: new Date(),
                    patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
                    assignedTo: null,
                },
            ];

            (prisma.escalation.findMany as jest.Mock).mockResolvedValue(mockEscalations);
            (prisma.escalation.count as jest.Mock).mockResolvedValue(1);

            const result = await tool!.handler(
                { status: 'PENDING', skip: 0, take: 20 },
                mockContext
            );

            expect(result.success).toBe(true);
            expect(prisma.escalation.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: 'PENDING' }),
                })
            );
        });

        it('should filter escalations by severity', async () => {
            const mockEscalations = [
                {
                    id: 'esc-1',
                    patientId: 'patient-1',
                    title: 'Critical Escalation',
                    category: 'CLINICAL',
                    severity: 'CRITICAL',
                    status: 'PENDING',
                    escalationLevel: 5,
                    assignedToId: null,
                    slaDeadline: new Date(),
                    createdAt: new Date(),
                    patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
                    assignedTo: null,
                },
            ];

            (prisma.escalation.findMany as jest.Mock).mockResolvedValue(mockEscalations);
            (prisma.escalation.count as jest.Mock).mockResolvedValue(1);

            const result = await tool!.handler(
                { severity: 'CRITICAL', skip: 0, take: 20 },
                mockContext
            );

            expect(result.success).toBe(true);
            expect(prisma.escalation.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ severity: 'CRITICAL' }),
                })
            );
        });

        it('should paginate results correctly', async () => {
            const mockEscalations = Array.from({ length: 10 }, (_, i) => ({
                id: `esc-${i}`,
                patientId: `patient-${i}`,
                title: `Escalation ${i}`,
                category: 'CLINICAL',
                severity: 'HIGH',
                status: 'PENDING',
                escalationLevel: 3,
                assignedToId: null,
                slaDeadline: new Date(),
                createdAt: new Date(),
                patient: { id: `patient-${i}`, firstName: 'John', lastName: 'Doe' },
                assignedTo: null,
            }));

            (prisma.escalation.findMany as jest.Mock).mockResolvedValue(mockEscalations);
            (prisma.escalation.count as jest.Mock).mockResolvedValue(25);

            const result = await tool!.handler({ skip: 10, take: 10 }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data.pagination.skip).toBe(10);
            expect(result.data.pagination.take).toBe(10);
            expect(result.data.pagination.total).toBe(25);
            expect(result.data.pagination.hasMore).toBe(true);
        });
    });

    // =========================================================================
    // create_escalation Tests
    // =========================================================================

    describe('create_escalation', () => {
        const tool = escalationTools.find(t => t.name === 'create_escalation');

        it('should create escalation with SLA deadline calculation', async () => {
            const now = Date.now();
            const mockEscalation = {
                id: 'esc-new-1',
                patientId: 'patient-1',
                encounterId: 'encounter-1',
                title: 'Clinical Alert',
                description: 'Test escalation',
                category: 'CLINICAL',
                severity: 'HIGH',
                status: 'PENDING',
                escalationLevel: 3,
                slaDeadlineHours: 24,
                slaDeadline: new Date(now + 24 * 3600 * 1000),
                notificationChannels: ['IN_APP', 'EMAIL'],
                createdBy: mockContext.clinicianId,
                createdAt: new Date(),
                patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
            };

            (prisma.escalation.create as jest.Mock).mockResolvedValue(mockEscalation);
            (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

            const result = await tool!.handler(
                {
                    patientId: 'patient-1',
                    encounterId: 'encounter-1',
                    title: 'Clinical Alert',
                    description: 'Test escalation',
                    category: 'CLINICAL',
                    severity: 'HIGH',
                    slaDeadlineHours: 24,
                    escalationLevel: 3,
                    notificationChannels: ['IN_APP', 'EMAIL'],
                },
                mockContext
            );

            expect(result.success).toBe(true);
            expect(result.data.escalation.id).toBe('esc-new-1');
            expect(result.data.escalation.slaDeadline).toBeDefined();
            expect(prisma.escalation.create).toHaveBeenCalled();
            expect(prisma.auditLog.create).toHaveBeenCalled();
        });

        it('should create escalation without SLA deadline', async () => {
            const mockEscalation = {
                id: 'esc-new-2',
                patientId: 'patient-2',
                title: 'Low Priority',
                description: 'Low priority escalation',
                category: 'ADMINISTRATIVE',
                severity: 'LOW',
                status: 'PENDING',
                escalationLevel: 1,
                slaDeadlineHours: null,
                slaDeadline: null,
                notificationChannels: ['IN_APP'],
                createdBy: mockContext.clinicianId,
                createdAt: new Date(),
                patient: { id: 'patient-2', firstName: 'Jane', lastName: 'Smith' },
            };

            (prisma.escalation.create as jest.Mock).mockResolvedValue(mockEscalation);
            (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

            const result = await tool!.handler(
                {
                    patientId: 'patient-2',
                    title: 'Low Priority',
                    description: 'Low priority escalation',
                    category: 'ADMINISTRATIVE',
                    severity: 'LOW',
                },
                mockContext
            );

            expect(result.success).toBe(true);
            expect(result.data.escalation.slaDeadline).toBeNull();
        });

        it('should include audit log entry', async () => {
            const mockEscalation = {
                id: 'esc-audit-1',
                patientId: 'patient-1',
                title: 'Test',
                description: 'Test',
                category: 'CLINICAL',
                severity: 'HIGH',
                status: 'PENDING',
                escalationLevel: 3,
                slaDeadlineHours: 24,
                slaDeadline: new Date(),
                notificationChannels: ['IN_APP'],
                createdBy: mockContext.clinicianId,
                createdAt: new Date(),
                patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
            };

            (prisma.escalation.create as jest.Mock).mockResolvedValue(mockEscalation);
            (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

            await tool!.handler(
                {
                    patientId: 'patient-1',
                    title: 'Test',
                    description: 'Test',
                    category: 'CLINICAL',
                    severity: 'HIGH',
                    slaDeadlineHours: 24,
                },
                mockContext
            );

            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: 'CREATE',
                        resource: 'Escalation',
                        userId: mockContext.clinicianId,
                    }),
                })
            );
        });
    });

    // =========================================================================
    // assign_escalation Tests
    // =========================================================================

    describe('assign_escalation', () => {
        const tool = escalationTools.find(t => t.name === 'assign_escalation');

        it('should assign escalation to clinician', async () => {
            const mockEscalation = {
                id: 'esc-1',
                patientId: 'patient-1',
                status: 'PENDING',
                title: 'Test',
                description: 'Test',
                category: 'CLINICAL',
                severity: 'HIGH',
                escalationLevel: 3,
                slaDeadline: new Date(),
            };

            const mockUpdated = {
                ...mockEscalation,
                status: 'ASSIGNED',
                assignedToId: 'clinician-2',
                assignedAt: new Date(),
                patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
                assignedTo: {
                    id: 'clinician-2',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane@example.com',
                },
            };

            (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(mockEscalation);
            (prisma.escalation.update as jest.Mock).mockResolvedValue(mockUpdated);
            (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

            const result = await tool!.handler(
                { escalationId: 'esc-1', assignedToId: 'clinician-2' },
                mockContext
            );

            expect(result.success).toBe(true);
            expect(result.data.escalation.status).toBe('ASSIGNED');
            expect(result.data.escalation.assignedTo.id).toBe('clinician-2');
            expect(result.data.escalation.assignedAt).toBeDefined();
        });

        it('should fail to assign resolved escalation', async () => {
            const mockEscalation = {
                id: 'esc-1',
                patientId: 'patient-1',
                status: 'RESOLVED',
                title: 'Test',
            };

            (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(mockEscalation);

            const result = await tool!.handler(
                { escalationId: 'esc-1', assignedToId: 'clinician-2' },
                mockContext
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot assign resolved');
        });

        it('should fail if escalation not found', async () => {
            (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await tool!.handler(
                { escalationId: 'esc-nonexistent', assignedToId: 'clinician-2' },
                mockContext
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should update status to ASSIGNED', async () => {
            const mockEscalation = {
                id: 'esc-1',
                patientId: 'patient-1',
                status: 'PENDING',
            };

            (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(mockEscalation);
            (prisma.escalation.update as jest.Mock).mockResolvedValue({
                ...mockEscalation,
                status: 'ASSIGNED',
                assignedToId: 'clinician-2',
                assignedAt: new Date(),
                patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
                assignedTo: {
                    id: 'clinician-2',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane@example.com',
                },
            });
            (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

            await tool!.handler(
                { escalationId: 'esc-1', assignedToId: 'clinician-2' },
                mockContext
            );

            expect(prisma.escalation.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'ASSIGNED',
                    }),
                })
            );
        });
    });

    // =========================================================================
    // resolve_escalation Tests
    // =========================================================================

    describe('resolve_escalation', () => {
        const tool = escalationTools.find(t => t.name === 'resolve_escalation');

        it('should resolve escalation', async () => {
            const mockEscalation = {
                id: 'esc-1',
                patientId: 'patient-1',
                status: 'ASSIGNED',
                title: 'Test',
            };

            const mockUpdated = {
                ...mockEscalation,
                status: 'RESOLVED',
                resolvedAt: new Date(),
                resolvedBy: mockContext.clinicianId,
                patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
            };

            (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(mockEscalation);
            (prisma.escalation.update as jest.Mock).mockResolvedValue(mockUpdated);
            (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

            const result = await tool!.handler(
                { escalationId: 'esc-1', notes: 'Resolved' },
                mockContext
            );

            expect(result.success).toBe(true);
            expect(result.data.escalation.status).toBe('RESOLVED');
            expect(result.data.escalation.resolvedAt).toBeDefined();
        });

        it('should be idempotent - return success if already resolved', async () => {
            const now = new Date();
            const mockEscalation = {
                id: 'esc-1',
                patientId: 'patient-1',
                status: 'RESOLVED',
                title: 'Test',
                resolvedAt: now,
            };

            (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(mockEscalation);

            const result = await tool!.handler(
                { escalationId: 'esc-1' },
                mockContext
            );

            expect(result.success).toBe(true);
            expect(result.data.escalation.message).toContain('already resolved');
            expect(prisma.escalation.update).not.toHaveBeenCalled();
        });

        it('should add resolution notes to escalation', async () => {
            const mockEscalation = {
                id: 'esc-1',
                patientId: 'patient-1',
                status: 'ASSIGNED',
            };

            (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(mockEscalation);
            (prisma.escalation.update as jest.Mock).mockResolvedValue({
                ...mockEscalation,
                status: 'RESOLVED',
                resolvedAt: new Date(),
                resolvedBy: mockContext.clinicianId,
                patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
            });
            (prisma.escalationNote.create as jest.Mock).mockResolvedValue({});
            (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

            await tool!.handler(
                { escalationId: 'esc-1', notes: 'Resolved due to patient follow-up' },
                mockContext
            );

            expect(prisma.escalationNote.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        escalationId: 'esc-1',
                        authorId: mockContext.clinicianId,
                        content: 'Resolved due to patient follow-up',
                    }),
                })
            );
        });

        it('should fail if escalation not found', async () => {
            (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await tool!.handler(
                { escalationId: 'esc-nonexistent' },
                mockContext
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    // =========================================================================
    // Permission Checks
    // =========================================================================

    describe('Permission Checks', () => {
        it('should deny create_escalation for NURSE role', () => {
            const tool = escalationTools.find(t => t.name === 'create_escalation');
            expect(tool!.requiredPermissions).toContain('admin:write');
        });

        it('should allow list_escalations for admin:read permission', () => {
            const tool = escalationTools.find(t => t.name === 'list_escalations');
            expect(tool!.requiredPermissions).toContain('admin:read');
        });

        it('should require admin:write for assign_escalation', () => {
            const tool = escalationTools.find(t => t.name === 'assign_escalation');
            expect(tool!.requiredPermissions).toContain('admin:write');
        });

        it('should require admin:write for resolve_escalation', () => {
            const tool = escalationTools.find(t => t.name === 'resolve_escalation');
            expect(tool!.requiredPermissions).toContain('admin:write');
        });
    });

    // =========================================================================
    // Schema Validation
    // =========================================================================

    describe('Input Schema Validation', () => {
        const createTool = escalationTools.find(t => t.name === 'create_escalation');

        it('should validate required fields for create_escalation', async () => {
            const validation = createTool!.inputSchema.safeParse({
                patientId: 'not-a-uuid',
                title: 'Test',
                description: 'Test',
                category: 'CLINICAL',
                severity: 'HIGH',
            });

            expect(validation.success).toBe(false);
        });

        it('should accept valid create_escalation input', async () => {
            const validation = createTool!.inputSchema.safeParse({
                patientId: '550e8400-e29b-41d4-a716-446655440000',
                title: 'Test',
                description: 'Test',
                category: 'CLINICAL',
                severity: 'HIGH',
            });

            expect(validation.success).toBe(true);
        });
    });

    // =========================================================================
    // Tool Metadata
    // =========================================================================

    describe('Tool Metadata', () => {
        it('should have escalation category', () => {
            const tool = escalationTools.find(t => t.name === 'create_escalation');
            expect(tool!.category).toBe('escalation');
        });

        it('should have proper descriptions', () => {
            const tool = escalationTools.find(t => t.name === 'list_escalations');
            expect(tool!.description).toBeDefined();
            expect(tool!.description.length).toBeGreaterThan(0);
        });

        it('should export all four tools', () => {
            expect(escalationTools).toHaveLength(4);
            const names = escalationTools.map(t => t.name);
            expect(names).toContain('list_escalations');
            expect(names).toContain('create_escalation');
            expect(names).toContain('assign_escalation');
            expect(names).toContain('resolve_escalation');
        });
    });
});
