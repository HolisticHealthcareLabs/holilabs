/**
 * Tests for /api/clinical/drugs
 *
 * - GET looks up drug by name
 * - GET returns 400 when name is missing
 * - POST checks drug interactions
 * - POST returns 400 when fewer than 2 drugs provided
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/clinical', () => ({
  rxnormService: {
    normalizeToRxCUI: jest.fn(),
    getDrugClass: jest.fn(),
    getInteractions: jest.fn(),
  },
  openFDAService: {
    getDrugLabel: jest.fn(),
    hasBlackBoxWarning: jest.fn(),
  },
}));

const { GET, POST } = require('../route');
const { rxnormService, openFDAService } = require('@/lib/clinical');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/clinical/drugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns drug info when name provided', async () => {
    (rxnormService.normalizeToRxCUI as jest.Mock).mockResolvedValue({
      rxcui: '1191',
      name: 'Aspirin',
      tty: 'IN',
    });
    (rxnormService.getDrugClass as jest.Mock).mockResolvedValue([
      { classId: 'N02BA01', className: 'NSAID', classType: 'ATC' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/clinical/drugs?name=aspirin');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.query).toBe('aspirin');
    expect(data.data.rxnorm.rxcui).toBe('1191');
  });

  it('returns 400 when drug name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/drugs');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Drug name is required');
  });

  it('returns null rxnorm when drug is not found', async () => {
    (rxnormService.normalizeToRxCUI as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/clinical/drugs?name=fakeDrug');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.rxnorm).toBeNull();
  });
});

describe('POST /api/clinical/drugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns 400 when fewer than 2 drugs provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/drugs', {
      method: 'POST',
      body: JSON.stringify({ drugs: ['Aspirin'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('At least 2 drugs');
  });
});
