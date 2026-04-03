export {};

jest.mock('@/lib/prisma', () => ({
    prisma: {
        imagingStudy: {
            findFirst: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('@/lib/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }
}));

const { prisma } = require('@/lib/prisma');
const { imagingTools } = require('../imaging.tools');

const updateTool = imagingTools.find((t: any) => t.name === 'update_imaging_order');

const mockContext = {
    clinicianId: 'clinician-1',
    agentId: 'test-agent',
    sessionId: 'session-1',
    roles: ['CLINICIAN'],
};

const mockStudy = {
    id: 'study-1',
    patientId: 'patient-1',
    modality: 'X-Ray',
    bodyPart: 'Chest',
    description: 'Chest X-Ray PA',
    indication: 'Cough',
    status: 'SCHEDULED',
    patient: {
        id: 'patient-1',
        assignedClinicianId: 'clinician-1',
    },
};

const mockUpdatedStudy = {
    ...mockStudy,
    status: 'COMPLETED',
    findings: 'No acute findings',
    updatedAt: new Date('2026-03-17T10:00:00Z'),
};

describe('update_imaging_order', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('is registered in imagingTools', () => {
        expect(updateTool).toBeDefined();
        expect(updateTool.name).toBe('update_imaging_order');
        expect(updateTool.category).toBe('lab');
    });

    it('updates with valid data', async () => {
        (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);
        (prisma.imagingStudy.update as jest.Mock).mockResolvedValue(mockUpdatedStudy);

        const result = await updateTool.handler(
            { studyId: 'study-1', status: 'COMPLETED', findings: 'No acute findings' },
            mockContext
        );

        expect(result.success).toBe(true);
        expect(result.data.studyId).toBe('study-1');
        expect(result.data.status).toBe('COMPLETED');
        expect(result.data.findings).toBe('No acute findings');

        expect(prisma.imagingStudy.findFirst).toHaveBeenCalledWith({
            where: { id: 'study-1' },
            include: { patient: { select: { id: true, assignedClinicianId: true } } },
        });

        expect(prisma.imagingStudy.update).toHaveBeenCalledWith({
            where: { id: 'study-1' },
            data: { status: 'COMPLETED', findings: 'No acute findings' },
        });
    });

    it('returns error for non-existent study', async () => {
        (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await updateTool.handler(
            { studyId: 'nonexistent', status: 'COMPLETED' },
            mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Imaging study not found');
        expect(prisma.imagingStudy.update).not.toHaveBeenCalled();
    });

    it('denies access when study belongs to another clinician', async () => {
        const otherClinicianStudy = {
            ...mockStudy,
            patient: { id: 'patient-1', assignedClinicianId: 'clinician-other' },
        };
        (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(otherClinicianStudy);

        const result = await updateTool.handler(
            { studyId: 'study-1', status: 'COMPLETED' },
            mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
        expect(prisma.imagingStudy.update).not.toHaveBeenCalled();
    });

    it('returns error when no update fields provided', async () => {
        (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);

        const result = await updateTool.handler(
            { studyId: 'study-1' },
            mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('No update fields provided');
        expect(prisma.imagingStudy.update).not.toHaveBeenCalled();
    });

    it('converts scheduledDate string to Date object', async () => {
        (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);
        (prisma.imagingStudy.update as jest.Mock).mockResolvedValue({
            ...mockUpdatedStudy,
            scheduledDate: new Date('2026-04-01T09:00:00Z'),
        });

        const result = await updateTool.handler(
            { studyId: 'study-1', scheduledDate: '2026-04-01T09:00:00Z' },
            mockContext
        );

        expect(result.success).toBe(true);
        expect(prisma.imagingStudy.update).toHaveBeenCalledWith({
            where: { id: 'study-1' },
            data: { scheduledDate: new Date('2026-04-01T09:00:00Z') },
        });
    });

    it('handles database errors gracefully', async () => {
        (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);
        (prisma.imagingStudy.update as jest.Mock).mockRejectedValue(
            new Error('Database unavailable')
        );

        const result = await updateTool.handler(
            { studyId: 'study-1', status: 'COMPLETED' },
            mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database unavailable');
    });
});
