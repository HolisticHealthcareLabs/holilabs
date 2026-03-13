/**
 * Tests for POST /api/cds/hooks/encounter-start
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/cds/engines/cds-engine', () => ({
  cdsEngine: {
    evaluate: jest.fn(),
    formatAsCDSHooksResponse: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { cdsEngine } = require('@/lib/cds/engines/cds-engine');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
};

const mockCDSBody = {
  hookInstance: 'hook-instance-1',
  context: {
    patientId: 'patient-1',
    encounterId: 'encounter-1',
    userId: 'clinician-1',
  },
  prefetch: {},
};

describe('POST /api/cds/hooks/encounter-start', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns CDS cards for encounter start (200)', async () => {
    const mockResult = { alerts: [{ category: 'preventive-care', severity: 'info' }] };
    const mockResponse = { cards: [{ summary: 'Preventive care reminder' }] };
    (cdsEngine.evaluate as jest.Mock).mockResolvedValue(mockResult);
    (cdsEngine.formatAsCDSHooksResponse as jest.Mock).mockReturnValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/cds/hooks/encounter-start', {
      method: 'POST',
      body: JSON.stringify(mockCDSBody),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cards).toBeDefined();
    expect(data.cards).toHaveLength(1);
  });

  it('returns empty cards when no alerts', async () => {
    (cdsEngine.evaluate as jest.Mock).mockResolvedValue({ alerts: [] });
    (cdsEngine.formatAsCDSHooksResponse as jest.Mock).mockReturnValue({ cards: [] });

    const request = new NextRequest('http://localhost:3000/api/cds/hooks/encounter-start', {
      method: 'POST',
      body: JSON.stringify(mockCDSBody),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cards).toHaveLength(0);
  });

  it('returns 500 on engine error', async () => {
    (cdsEngine.evaluate as jest.Mock).mockRejectedValue(new Error('Engine failure'));

    const request = new NextRequest('http://localhost:3000/api/cds/hooks/encounter-start', {
      method: 'POST',
      body: JSON.stringify(mockCDSBody),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });
});
