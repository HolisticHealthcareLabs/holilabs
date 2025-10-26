/**
 * Patient Bulk Export API
 *
 * GET /api/patients/export - Export patients to CSV/Excel
 *
 * Query params:
 * - format: 'csv' | 'excel' (default: 'csv')
 * - isActive: boolean (filter active/inactive patients)
 * - isPalliativeCare: boolean (filter palliative care patients)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { format } from 'date-fns';
import { sanitizeCSVField } from '@/lib/security/validation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Convert data to CSV format with CSV injection prevention
 */
function toCSV(data: any[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // Sanitize for CSV injection
      const sanitized = sanitizeCSVField(String(value ?? ''));
      // Escape quotes and wrap in quotes if contains comma
      const escaped = sanitized.replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * GET /api/patients/export
 * Export patients to CSV or Excel
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const formatParam = searchParams.get('format') || 'csv';
      const isActive = searchParams.get('isActive');
      const isPalliativeCare = searchParams.get('isPalliativeCare');

      // Build filter
      const where: any = {
        assignedClinicianId: context.user.id, // Tenant isolation
      };

      if (isActive !== null) {
        where.isActive = isActive === 'true';
      }

      if (isPalliativeCare !== null) {
        where.isPalliativeCare = isPalliativeCare === 'true';
      }

      // Fetch patients
      const patients = await prisma.patient.findMany({
        where,
        include: {
          assignedClinician: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          medications: {
            where: { isActive: true },
            select: {
              name: true,
              dose: true,
              frequency: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform data for export
      const exportData = patients.map((patient) => ({
        'Token ID': patient.tokenId,
        'MRN': patient.mrn || '',
        'First Name': patient.firstName,
        'Last Name': patient.lastName,
        'Date of Birth': patient.dateOfBirth
          ? format(new Date(patient.dateOfBirth), 'yyyy-MM-dd')
          : '',
        'Age': patient.age || '',
        'Gender': patient.gender || '',
        'Email': patient.email || '',
        'Phone': patient.phone || '',
        'Address': patient.address || '',
        'Emergency Contact': patient.emergencyContact || '',
        'Emergency Phone': patient.emergencyPhone || '',
        'Palliative Care': patient.isPalliativeCare ? 'Yes' : 'No',
        'Active': patient.isActive ? 'Yes' : 'No',
        'Assigned Clinician': patient.assignedClinician
          ? `${patient.assignedClinician.firstName} ${patient.assignedClinician.lastName}`
          : '',
        'Active Medications': patient.medications.length,
        'Created Date': format(new Date(patient.createdAt), 'yyyy-MM-dd HH:mm'),
      }));

      // Audit log
      await createAuditLog(
        {
          action: 'EXPORT',
          resource: 'Patient',
          resourceId: 'bulk',
          details: {
            format: formatParam,
            count: exportData.length,
            filters: {
              isActive,
              isPalliativeCare,
            },
          },
        },
        request,
        context.user.id,
        context.user.email
      );

      if (formatParam === 'csv') {
        const csv = toCSV(exportData);
        const filename = `patients-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }

      // For Excel format, return JSON (client will handle Excel generation)
      if (formatParam === 'excel') {
        return NextResponse.json({
          success: true,
          data: exportData,
          filename: `patients-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`,
        });
      }

      return NextResponse.json(
        { error: 'Invalid format. Use "csv" or "excel"' },
        { status: 400 }
      );
    } catch (error: any) {
      console.error('Error exporting patients:', error);
      return NextResponse.json(
        {
          error: 'Failed to export patients',
          ...(process.env.NODE_ENV === 'development' && { details: error.message }),
        },
        { status: 500 }
      );
    }
  }
);
