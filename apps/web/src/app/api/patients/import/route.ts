/**
 * Patient Bulk Import API
 *
 * POST /api/patients/import - Import patients from CSV
 *
 * CSV Format:
 * firstName,lastName,dateOfBirth,gender,email,phone,address,mrn,emergencyContact,emergencyPhone
 *
 * Example:
 * John,Doe,1990-01-15,MALE,john@example.com,+1234567890,"123 Main St",MRN001,Jane Doe,+0987654321
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';
import { createAuditLog } from '@/lib/audit';
import { generateMRN, generateTokenId } from '@/lib/fhir/patient-mapper';
import {
  sanitizeString,
  sanitizeCSVField,
  validateFileSize,
  isValidEmail,
  isValidPhone,
  isValidDate,
} from '@/lib/security/validation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface CSVRow {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  mrn?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  isPalliativeCare?: string;
}

/**
 * Parse CSV string to array of objects
 * Handles quoted fields with embedded commas and prevents CSV injection
 */
function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have header row and at least one data row');
  }

  // Parse CSV line with RFC 4180 compliance (handles quoted fields)
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        values.push(sanitizeCSVField(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    values.push(sanitizeCSVField(current.trim()));
    return values;
  };

  const headers = parseLine(lines[0]);
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Skip empty lines
    if (!lines[i].trim()) continue;

    const values = parseLine(lines[i]);
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Validate and sanitize CSV row
 */
function validateRow(row: CSVRow, rowIndex: number): string[] {
  const errors: string[] = [];

  // Required fields
  if (!row.firstName || !row.firstName.trim()) {
    errors.push(`Row ${rowIndex}: firstName is required`);
  } else if (row.firstName.length > 100) {
    errors.push(`Row ${rowIndex}: firstName too long (max 100 characters)`);
  }

  if (!row.lastName || !row.lastName.trim()) {
    errors.push(`Row ${rowIndex}: lastName is required`);
  } else if (row.lastName.length > 100) {
    errors.push(`Row ${rowIndex}: lastName too long (max 100 characters)`);
  }

  // Validate gender if provided
  if (row.gender && !['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'].includes(row.gender.toUpperCase())) {
    errors.push(`Row ${rowIndex}: gender must be MALE, FEMALE, OTHER, or UNKNOWN`);
  }

  // Validate date format if provided
  if (row.dateOfBirth && !isValidDate(row.dateOfBirth)) {
    errors.push(`Row ${rowIndex}: invalid dateOfBirth format (use YYYY-MM-DD)`);
  }

  // Validate email if provided
  if (row.email && !isValidEmail(row.email)) {
    errors.push(`Row ${rowIndex}: invalid email format`);
  }

  // Validate phone if provided
  if (row.phone && row.phone.trim() && !isValidPhone(row.phone)) {
    errors.push(`Row ${rowIndex}: invalid phone format (use +1234567890)`);
  }

  // Validate emergency phone if provided
  if (row.emergencyPhone && row.emergencyPhone.trim() && !isValidPhone(row.emergencyPhone)) {
    errors.push(`Row ${rowIndex}: invalid emergencyPhone format (use +1234567890)`);
  }

  // Validate MRN length if provided
  if (row.mrn && row.mrn.length > 50) {
    errors.push(`Row ${rowIndex}: MRN too long (max 50 characters)`);
  }

  // Validate address length if provided
  if (row.address && row.address.length > 500) {
    errors.push(`Row ${rowIndex}: address too long (max 500 characters)`);
  }

  return errors;
}

/**
 * POST /api/patients/import
 * Bulk import patients from CSV
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      try {
        validateFileSize(file.size, 10);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      // Validate file type
      if (file.type && !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only CSV files are allowed.' },
          { status: 400 }
        );
      }

      // Read file content
      const csvText = await file.text();

      // Validate content size
      if (csvText.length > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File content too large (max 10MB)' },
          { status: 400 }
        );
      }

      const rows = parseCSV(csvText);

      // Limit number of rows (prevent DoS)
      if (rows.length > 1000) {
        return NextResponse.json(
          { error: 'Too many rows. Maximum 1000 patients per import.' },
          { status: 400 }
        );
      }

      // Validate all rows
      const validationErrors: string[] = [];
      rows.forEach((row, index) => {
        const errors = validateRow(row, index + 2); // +2 for header and 0-indexing
        validationErrors.push(...errors);
      });

      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationErrors,
          },
          { status: 400 }
        );
      }

      // Import patients
      const imported: any[] = [];
      const failed: any[] = [];

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        try {
          // Check if patient already exists (by MRN or email)
          let existingPatient = null;
          if (row.mrn) {
            existingPatient = await prisma.patient.findFirst({
              where: {
                mrn: row.mrn,
                assignedClinicianId: context.user.id,
              },
            });
          }

          if (existingPatient) {
            failed.push({
              row: index + 2,
              data: row,
              reason: 'Patient with this MRN already exists',
            });
            continue;
          }

          // Skip patients without dateOfBirth (required field)
          if (!row.dateOfBirth) {
            failed.push({
              row: index + 2,
              data: row,
              reason: 'dateOfBirth is required',
            });
            continue;
          }

          // Sanitize all inputs before database insertion
          const sanitizedData = {
            firstName: sanitizeString(row.firstName, 100),
            lastName: sanitizeString(row.lastName, 100),
            dateOfBirth: new Date(row.dateOfBirth),
            gender: row.gender?.toUpperCase() || 'UNKNOWN',
            email: row.email ? sanitizeString(row.email, 255) : null,
            phone: row.phone ? sanitizeString(row.phone, 20) : null,
            address: row.address ? sanitizeString(row.address, 500) : null,
            mrn: row.mrn ? sanitizeString(row.mrn, 50) : null,
            emergencyContact: row.emergencyContact ? sanitizeString(row.emergencyContact, 100) : null,
            emergencyPhone: row.emergencyPhone ? sanitizeString(row.emergencyPhone, 20) : null,
            isPalliativeCare: row.isPalliativeCare?.toLowerCase() === 'true',
          };

          // Generate required identifiers
          const tokenId = generateTokenId();
          const mrn = sanitizedData.mrn || generateMRN();

          // Create patient
          const patient = await prisma.patient.create({
            data: {
              ...sanitizedData,
              mrn,
              tokenId,
              assignedClinicianId: context.user.id,
              isActive: true,
            },
          });

          // Update with dataHash after creation
          await prisma.patient.update({
            where: { id: patient.id },
            data: {
              dataHash: generatePatientDataHash({
                id: patient.id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                dateOfBirth: row.dateOfBirth,
                mrn: patient.mrn,
              }),
              lastHashUpdate: new Date(),
            },
          });

          imported.push({
            row: index + 2,
            patientId: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
          });

          // Audit log
          await createAuditLog(
            {
              action: 'CREATE',
              resource: 'Patient',
              resourceId: patient.id,
              details: {
                method: 'bulk_import',
                source: 'csv',
              },
            },
            request,
            context.user.id,
            context.user.email
          );
        } catch (error: any) {
          failed.push({
            row: index + 2,
            data: row,
            reason: error.message,
          });
        }
      }

      // Audit log for import operation
      await createAuditLog(
        {
          action: 'CREATE',
          resource: 'Patient',
          resourceId: 'bulk',
          details: {
            operation: 'bulk_import',
            total: rows.length,
            imported: imported.length,
            failed: failed.length,
          },
        },
        request,
        context.user.id,
        context.user.email
      );

      return NextResponse.json({
        success: true,
        summary: {
          total: rows.length,
          imported: imported.length,
          failed: failed.length,
        },
        imported,
        failed,
      });
    } catch (error: any) {
      console.error('Error importing patients:', error);
      return NextResponse.json(
        {
          error: 'Failed to import patients',
          ...(process.env.NODE_ENV === 'development' && { details: error.message }),
        },
        { status: 500 }
      );
    }
  }
);
