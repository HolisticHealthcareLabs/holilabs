/**
 * Tests for POST /api/clinical/decision-support
 *
 * - POST returns clinical alerts for patient
 * - POST rejects missing patientId
 * - Handles internal fetch failures gracefully
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/security/require-secret', () => ({
  requireSecret: jest.fn(() => 'test-secret'),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    patient: {
      findUnique: jest.fn(),
    },
    allergy: { count: jest.fn() },
    preventiveCareReminder: { count: jest.fn() },
  },
}));

const { auth } = require('@/lib/auth/auth');
const { prisma } = require('@/lib/prisma');
const { POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockPatient = {
  id: 'patient-1',
  firstName: 'John',
  lastName: 'Doe',
  mrn: 'MRN001',
  dateOfBirth: new Date('1980-01-01'),
  medications: [
    { id: 'med-1', name: 'Metformin', startDate: new Date(), isActive: true },
  ],
};

describe('POST /api/clinical/decision-support', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'clinician-1' } });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('drug-interactions')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              interactions: [
                {
                  drug1: 'Metformin',
                  drug2: 'Aspirin',
                  severity: 'minor',
                  effect: 'Minor interaction',
                  recommendation: 'Monitor',
                },
              ],
            }),
        } as Response);
      }
      if (url.includes('allergy-check')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ alerts: [] }) } as Response);
      }
      if (url.includes('lab-alerts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ alerts: [] }) } as Response);
      }
      if (url.includes('vital-alerts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ alerts: [] }) } as Response);
      }
      if (url.includes('preventive-care')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ reminders: [] }) } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POST returns clinical alerts for patient', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/decision-support', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alerts).toBeDefined();
    expect(Array.isArray(data.alerts)).toBe(true);
    expect(data.summary).toBeDefined();
    expect(data.patient).toBeDefined();
    expect(data.patient.id).toBe('patient-1');
    expect(data.alerts.some((a: any) => a.category === 'drug_interaction')).toBe(true);
  });

  it('POST rejects missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/decision-support', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Patient ID is required');
  });

  it('handles internal fetch failures gracefully', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const request = new NextRequest('http://localhost:3000/api/clinical/decision-support', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alerts).toBeDefined();
    expect(Array.isArray(data.alerts)).toBe(true);
    expect(data.summary.total).toBe(0);
  });
});
