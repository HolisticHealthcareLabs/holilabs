/**
 * Tests for POST/GET/PUT /api/clinical/preventive-care
 *
 * - POST generates preventive care recommendations for eligible patient
 * - POST returns 400 when required fields are missing
 * - GET fetches existing reminders for a patient
 * - PUT creates reminders in bulk
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventiveCareReminder: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const { verifyPatientAccess } = require('@/lib/api/middleware');
const { prisma } = require('@/lib/prisma');
const { POST, GET, PUT } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/clinical/preventive-care', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('generates preventive care reminders for eligible female patient age 55', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/preventive-care', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', patientAge: 55, patientGender: 'F' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reminders).toBeInstanceOf(Array);
    expect(data.reminders.length).toBeGreaterThan(0);
    expect(data.reminders[0]).toHaveProperty('screeningType');
    expect(data.reminders[0]).toHaveProperty('guidelineSource');
  });

  it('returns 400 when patientId, age, or gender is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/preventive-care', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', patientAge: 55 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('skips guidelines for wrong gender eligibility', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/preventive-care', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', patientAge: 55, patientGender: 'M' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const mammogram = data.reminders.find((r: any) => r.screeningType === 'MAMMOGRAM');
    expect(mammogram).toBeUndefined();
  });

  it('skips guidelines already in existing reminders', async () => {
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([
      { screeningType: 'BLOOD_PRESSURE', status: 'DUE' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/clinical/preventive-care', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', patientAge: 45, patientGender: 'M' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const bp = data.reminders.find((r: any) => r.screeningType === 'BLOOD_PRESSURE');
    expect(bp).toBeUndefined();
  });
});

describe('GET /api/clinical/preventive-care', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([
      { id: 'r-1', screeningType: 'MAMMOGRAM', status: 'DUE', dueDate: new Date(Date.now() - 1000) },
    ]);
    (prisma.preventiveCareReminder.update as jest.Mock).mockResolvedValue({});
  });

  it('fetches reminders for patient and returns summary', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/preventive-care?patientId=patient-1'
    );

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reminders).toBeInstanceOf(Array);
    expect(data.summary).toHaveProperty('due');
    expect(data.summary).toHaveProperty('overdue');
  });

  it('returns 400 when patientId query param is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/preventive-care');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Patient ID is required');
  });
});

describe('PUT /api/clinical/preventive-care', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.preventiveCareReminder.createMany as jest.Mock).mockResolvedValue({ count: 2 });
  });

  it('creates reminders in bulk and returns created count', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/preventive-care', {
      method: 'PUT',
      body: JSON.stringify({
        patientId: 'patient-1',
        reminders: [
          { screeningType: 'MAMMOGRAM', status: 'DUE', dueDate: new Date().toISOString() },
          { screeningType: 'COLONOSCOPY', status: 'DUE', dueDate: new Date().toISOString() },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PUT(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.created).toBe(2);
  });

  it('returns 400 when reminders array is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/preventive-care', {
      method: 'PUT',
      body: JSON.stringify({ patientId: 'patient-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PUT(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });
});
