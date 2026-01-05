/**
 * Bulk Billing Export API
 *
 * POST /api/export/billing - Export SOAP notes for insurance billing
 *
 * Competitive Analysis:
 * - Abridge: ✅ CSV + PDF export with ICD-10/CPT codes
 * - Nuance DAX: ✅ Bulk export to EMR systems
 * - Suki: ✅ Billing code summary
 * - Doximity: ❌ No export (fax only)
 *
 * Impact: UNBLOCKS REVENUE - doctors can't bill insurance without this
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ExportRequest {
  format: 'csv' | 'pdf';
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  includeUnsigned?: boolean;
}

/**
 * POST /api/export/billing
 * Export SOAP notes for billing period
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body: ExportRequest = await request.json();
      const { format, startDate, endDate, includeUnsigned = false } = body;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }

      // Fetch SOAP notes for billing period
      const notes = await prisma.sOAPNote.findMany({
        where: {
          clinicianId: context.user.id,
          createdAt: {
            gte: start,
            lte: end,
          },
          ...(includeUnsigned ? {} : { signedAt: { not: null } }),
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              mrn: true,
              dateOfBirth: true,
            },
          },
          clinician: {
            select: {
              firstName: true,
              lastName: true,
              npi: true,
              specialty: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (notes.length === 0) {
        return NextResponse.json(
          { error: 'No notes found for the specified date range' },
          { status: 404 }
        );
      }

      // Generate export based on format
      if (format === 'csv') {
        const csv = generateCSV(notes);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="billing-export-${startDate}-to-${endDate}.csv"`,
          },
        });
      } else if (format === 'pdf') {
        // For PDF, return a structured JSON that can be rendered client-side
        // (PDF generation libraries are heavy - better to do client-side)
        return NextResponse.json({
          success: true,
          data: {
            notes: notes.map((note) => ({
              id: note.id,
              date: note.createdAt,
              patientName: `${note.patient.firstName} ${note.patient.lastName}`,
              mrn: note.patient.mrn,
              diagnoses: note.diagnoses,
              procedures: note.procedures,
              chiefComplaint: note.chiefComplaint,
              signed: !!note.signedAt,
            })),
            summary: generateBillingSummary(notes),
          },
        });
      }

      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    } catch (error: any) {
      console.error('Error exporting billing data:', error);
      return NextResponse.json(
        { error: 'Failed to export billing data', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    audit: { action: 'EXPORT', resource: 'SOAPNote' },
  }
);

/**
 * Generate CSV for billing export
 */
function generateCSV(notes: any[]): string {
  const headers = [
    'Date',
    'Patient Name',
    'MRN',
    'Patient DOB',
    'Chief Complaint',
    'ICD-10 Codes',
    'ICD-10 Descriptions',
    'CPT Codes',
    'CPT Descriptions',
    'Provider Name',
    'Provider NPI',
    'Signed',
    'Note ID',
  ];

  const rows = notes.map((note) => {
    const diagnoses = (note.diagnoses as any[]) || [];
    const procedures = (note.procedures as any[]) || [];

    const icd10Codes = diagnoses.map((d) => d.icd10Code).join('; ');
    const icd10Descriptions = diagnoses.map((d) => d.description).join('; ');
    const cptCodes = procedures.map((p) => p.cptCode).join('; ');
    const cptDescriptions = procedures.map((p) => p.description).join('; ');

    return [
      new Date(note.createdAt).toLocaleDateString('en-US'),
      `${note.patient.firstName} ${note.patient.lastName}`,
      note.patient.mrn,
      new Date(note.patient.dateOfBirth).toLocaleDateString('en-US'),
      escapeCsv(note.chiefComplaint || 'N/A'),
      escapeCsv(icd10Codes || 'N/A'),
      escapeCsv(icd10Descriptions || 'N/A'),
      escapeCsv(cptCodes || 'N/A'),
      escapeCsv(cptDescriptions || 'N/A'),
      `${note.clinician.firstName} ${note.clinician.lastName}`,
      note.clinician.npi || 'N/A',
      note.signedAt ? 'Yes' : 'No',
      note.id,
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Generate billing summary statistics
 */
function generateBillingSummary(notes: any[]): any {
  const totalNotes = notes.length;
  const signedNotes = notes.filter((n) => n.signedAt).length;

  // Aggregate ICD-10 codes
  const icd10Counts: Record<string, { code: string; description: string; count: number }> = {};
  notes.forEach((note) => {
    const diagnoses = (note.diagnoses as any[]) || [];
    diagnoses.forEach((d) => {
      const key = d.icd10Code;
      if (!icd10Counts[key]) {
        icd10Counts[key] = { code: d.icd10Code, description: d.description, count: 0 };
      }
      icd10Counts[key].count++;
    });
  });

  // Aggregate CPT codes
  const cptCounts: Record<string, { code: string; description: string; count: number }> = {};
  notes.forEach((note) => {
    const procedures = (note.procedures as any[]) || [];
    procedures.forEach((p) => {
      const key = p.cptCode;
      if (!cptCounts[key]) {
        cptCounts[key] = { code: p.cptCode, description: p.description, count: 0 };
      }
      cptCounts[key].count++;
    });
  });

  // Sort by frequency
  const topIcd10 = Object.values(icd10Counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topCpt = Object.values(cptCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalNotes,
    signedNotes,
    unsignedNotes: totalNotes - signedNotes,
    totalIcd10Codes: Object.keys(icd10Counts).length,
    totalCptCodes: Object.keys(cptCounts).length,
    topIcd10,
    topCpt,
    dateRange: {
      start: notes[0]?.createdAt,
      end: notes[notes.length - 1]?.createdAt,
    },
  };
}

/**
 * Escape CSV special characters
 */
function escapeCsv(value: string): string {
  if (!value) return '';
  return value.replace(/"/g, '""'); // Escape double quotes
}
