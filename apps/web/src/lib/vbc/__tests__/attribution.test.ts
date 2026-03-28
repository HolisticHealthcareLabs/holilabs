jest.mock('@/lib/prisma', () => ({
  prisma: {
    patientAttribution: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    clinicalEncounter: {
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

import {
  createAttribution,
  listAttributions,
  getAttributionSummary,
} from '../attribution.service';

describe('attribution.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAttribution', () => {
    it('creates an attribution record', async () => {
      const mockAttr = { id: 'attr-1', patientId: 'p-1', providerId: 'prov-1' };
      (prisma.patientAttribution.create as jest.Mock).mockResolvedValue(mockAttr);

      const result = await createAttribution(prisma, {
        patientId: 'p-1',
        providerId: 'prov-1',
        organizationId: 'org-1',
        method: 'PRIMARY_CARE',
        effectiveFrom: new Date('2026-01-01'),
      });

      expect(result).toEqual(mockAttr);
      expect(prisma.patientAttribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'p-1',
          providerId: 'prov-1',
          method: 'PRIMARY_CARE',
          isActive: true,
        }),
      });
    });
  });

  describe('listAttributions', () => {
    it('lists active attributions for an org', async () => {
      const mockList = [{ id: 'attr-1' }, { id: 'attr-2' }];
      (prisma.patientAttribution.findMany as jest.Mock).mockResolvedValue(mockList);

      const result = await listAttributions(prisma, 'org-1');
      expect(result).toEqual(mockList);
      expect(prisma.patientAttribution.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isActive: true },
        orderBy: { effectiveFrom: 'desc' },
      });
    });

    it('filters by providerId when given', async () => {
      (prisma.patientAttribution.findMany as jest.Mock).mockResolvedValue([]);

      await listAttributions(prisma, 'org-1', 'prov-1');
      expect(prisma.patientAttribution.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isActive: true, providerId: 'prov-1' },
        orderBy: { effectiveFrom: 'desc' },
      });
    });
  });

  describe('getAttributionSummary', () => {
    it('produces summary grouped by method and risk tier', async () => {
      (prisma.patientAttribution.findMany as jest.Mock).mockResolvedValue([
        { method: 'PRIMARY_CARE', riskTier: 'LOW', isActive: true },
        { method: 'PRIMARY_CARE', riskTier: 'HIGH', isActive: true },
        { method: 'SPECIALIST_EPISODE', riskTier: 'LOW', isActive: false },
        { method: 'CONTRACTUAL', riskTier: null, isActive: true },
      ]);

      const result = await getAttributionSummary(prisma, 'org-1');

      expect(result.totalAttributed).toBe(4);
      expect(result.activeCount).toBe(3);
      expect(result.byMethod).toEqual({
        PRIMARY_CARE: 2,
        SPECIALIST_EPISODE: 1,
        CONTRACTUAL: 1,
      });
      expect(result.byRiskTier).toEqual({
        LOW: 2,
        HIGH: 1,
        UNCLASSIFIED: 1,
      });
    });

    it('returns zeros for empty org', async () => {
      (prisma.patientAttribution.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getAttributionSummary(prisma, 'org-empty');
      expect(result.totalAttributed).toBe(0);
      expect(result.activeCount).toBe(0);
    });
  });
});
