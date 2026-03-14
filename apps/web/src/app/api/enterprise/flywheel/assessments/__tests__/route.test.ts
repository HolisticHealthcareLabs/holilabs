import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/enterprise/auth', () => ({
  validateEnterpriseKey: jest.fn(),
}));

jest.mock('@/services/data-flywheel.service', () => ({
  dataFlywheelService: {
    getAssessmentHistory: jest.fn(),
    getAllAssessments: jest.fn(),
  },
}));

const { GET } = require('../route');
const { validateEnterpriseKey } = require('@/lib/enterprise/auth');
const { dataFlywheelService } = require('@/services/data-flywheel.service');

const makeUnauthorizedResponse = () =>
  new (require('next/server').NextResponse)(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

const mockAssessments = [
  { id: 'a1', createdAt: '2025-01-02T00:00:00Z', patientId: 'anon-p1' },
  { id: 'a2', createdAt: '2025-01-01T00:00:00Z', patientId: 'anon-p2' },
];

describe('GET /api/enterprise/flywheel/assessments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (dataFlywheelService.getAllAssessments as jest.Mock).mockReturnValue(mockAssessments);
    (dataFlywheelService.getAssessmentHistory as jest.Mock).mockReturnValue([mockAssessments[0]]);
  });

  it('returns paginated assessments for authorized key', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/flywheel/assessments?page=1&limit=50', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.__format).toBe('enterprise_flywheel_assessments_v1');
    expect(data.assessments).toHaveLength(2);
    expect(data.pagination.page).toBe(1);
  });

  it('filters by patient when patient param is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/flywheel/assessments?patient=anon-p1', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(dataFlywheelService.getAssessmentHistory).toHaveBeenCalledWith('anon-p1');
    expect(data.assessments).toHaveLength(1);
  });

  it('returns 401 when API key is invalid', async () => {
    (validateEnterpriseKey as jest.Mock).mockReturnValue({
      authorized: false,
      response: makeUnauthorizedResponse(),
    });
    const req = new NextRequest('http://localhost:3000/api/enterprise/flywheel/assessments');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('sorts assessments newest first', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/flywheel/assessments', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(data.assessments[0].createdAt >= data.assessments[1].createdAt).toBe(true);
  });
});
