import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { checkImportRateLimit } from '@/lib/api/import-rate-limit';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import { z } from 'zod';
import crypto from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let split = cpf.split('');
  let v1 = 0, v2 = 0;
  for (let i = 0, p = 10; i < 9; i++, p--) v1 += parseInt(split[i]) * p;
  v1 = ((v1 * 10) % 11) % 10;
  if (v1 !== parseInt(split[9])) return false;
  for (let i = 0, p = 11; i < 10; i++, p--) v2 += parseInt(split[i]) * p;
  v2 = ((v2 * 10) % 11) % 10;
  if (v2 !== parseInt(split[10])) return false;
  return true;
}

const RowSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().refine((val) => {
    if (!val) return false;
    if (val.match(/^\d{4}-\d{2}-\d{2}$/)) return !isNaN(Date.parse(val));
    if (val.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = val.split('/');
      return !isNaN(Date.parse(`${y}-${m}-${d}`));
    }
    return false;
  }, 'Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY'),
  cpf: z.string().optional().refine((val) => !val || validateCPF(val), 'Invalid CPF format'),
  externalMrn: z.string().optional(),
  gender: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  medications: z.string().optional(),
}).refine(data => data.cpf || data.externalMrn, { message: "Either CPF or externalMrn is required", path: ["cpf"] });

function parseDate(val: string): Date {
  if (val.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [d, m, y] = val.split('/');
    return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
  }
  return new Date(val + 'T00:00:00.000Z');
}

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const organizationId = context.user?.organizationId || context.user?.id || 'default';
    const rateLimit = await checkImportRateLimit(organizationId);
    
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. 1 import per 5 minutes.' }, { status: 429 });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
      }

      const text = await file.text();
      const parseResult = Papa.parse(text, { header: true, skipEmptyLines: true });

      let imported = 0;
      let skipped = 0;
      const errors: Array<{ row: number; field: string; message: string }> = [];
      const warnings: Array<{ row: number; message: string }> = [];

      const rows = parseResult.data as any[];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        
        const validation = RowSchema.safeParse(row);
        if (!validation.success) {
          validation.error.errors.forEach(err => {
            errors.push({ row: rowNum, field: err.path.join('.'), message: err.message });
          });
          continue;
        }

        const data = validation.data;

        let duplicate = null;
        if (data.cpf) {
          duplicate = await prisma.patient.findFirst({ where: { cpf: data.cpf } });
        }
        if (!duplicate && data.externalMrn) {
          duplicate = await prisma.patient.findFirst({ where: { externalMrn: data.externalMrn } });
        }

        if (duplicate) {
          warnings.push({ row: rowNum, message: "CPF duplicado — paciente já existe" });
          skipped++;
          continue;
        }

        const mrn = `MRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const tokenId = `PT-${crypto.randomBytes(4).toString('hex')}`;
        
        try {
          const newPatient = await prisma.patient.create({
            data: {
              firstName: data.firstName,
              lastName: data.lastName,
              dateOfBirth: parseDate(data.dateOfBirth),
              gender: data.gender || null,
              cpf: data.cpf || null,
              externalMrn: data.externalMrn || null,
              mrn,
              tokenId,
              email: data.email || null,
              phone: data.phone || null,
              address: data.address || null,
              city: data.city || null,
              state: data.state || null,
              postalCode: data.postalCode || null,
            }
          });

          if (data.medications) {
            const meds = data.medications.split(';').map(m => m.trim()).filter(m => m);
            for (const med of meds) {
              await prisma.medication.create({
                data: {
                  name: med,
                  dose: '',
                  frequency: '',
                  patientId: newPatient.id
                }
              });
            }
          }

          await prisma.auditLog.create({
            data: {
              action: 'CREATE',
              resource: 'Patient',
              resourceId: newPatient.id,
              userId: context.user?.id,
              userEmail: context.user?.email,
              ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
              userAgent: request.headers.get('user-agent') || 'unknown',
              accessReason: 'ADMINISTRATIVE',
              details: { event: 'patient_imported', tokenId: newPatient.tokenId, action: 'patient_imported' }
            }
          });

          imported++;
        } catch (dbError: any) {
          errors.push({ row: rowNum, field: 'database', message: dbError.message || 'Database error' });
        }
      }

      return NextResponse.json({
        imported,
        skipped,
        errors,
        warnings
      });

    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['ADMIN'] }
);
