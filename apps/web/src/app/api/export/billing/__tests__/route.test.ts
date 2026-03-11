/**
 * Tests for POST /api/export/billing
 *
 * - POST exports billing data (CSV format)
 * - Rejects missing/invalid date range
 * - Returns proper format (PDF JSON structure)
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sOAPNote: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: opts?.userMessage ?? 'Internal server error' },
      { status: 500 }
    );
  }),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockNote = {
  id: 'note-1',
  createdAt: new Date('2024-01-15'),
  signedAt: new Date('2024-01-15'),
  chiefComplaint: 'Headache',
  diagnoses: [{ icd10Code: 'G43.9', description: 'Migraine' }],
  procedures: [{ cptCode: '99213', description: 'Office visit' }],
  patient: {
    firstName: 'Maria',
    lastName: 'Silva',
    mrn: 'MRN-001',
    dateOfBirth: new Date('1990-01-15'),
  },
  clinician: {
    firstName: 'Dr',
    lastName: 'Test',
    npi: '1234567890',
    specialty: 'GP',
  },
};

describe('POST /api/export/billing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports billing data as CSV with valid date range', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([mockNote]);

    const request = new NextRequest('http://localhost:3000/api/export/billing', {
      method: 'POST',
      body: JSON.stringify({
        format: 'csv',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('billing-export');
    const text = await response.text();
    expect(text).toContain('Date');
    expect(text).toContain('Maria Silva');
    expect(text).toContain('MRN-001');
  });

  it('rejects invalid date format', async () => {
    const request = new NextRequest('http://localhost:3000/api/export/billing', {
      method: 'POST',
      body: JSON.stringify({
        format: 'csv',
        startDate: 'invalid',
        endDate: '2024-01-31',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid date format');
  });

  it('returns 404 when no notes found for date range', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/export/billing', {
      method: 'POST',
      body: JSON.stringify({
        format: 'csv',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No notes found for the specified date range');
  });

  it('returns proper PDF JSON format with summary', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([mockNote]);

    const request = new NextRequest('http://localhost:3000/api/export/billing', {
      method: 'POST',
      body: JSON.stringify({
        format: 'pdf',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.notes).toHaveLength(1);
    expect(data.data.notes[0].patientName).toBe('Maria Silva');
    expect(data.data.summary).toBeDefined();
    expect(data.data.summary.totalNotes).toBe(1);
  });
});
