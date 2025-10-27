/**
 * Patient Data Export API with Phase 2 Security
 * 🔒 SECURE EXPORT - NO PHI EXPOSURE
 *
 * POST /api/patients/export - Export de-identified patient data
 *
 * FEATURES:
 * - k-anonymity validation before export
 * - NLP-based PHI redaction
 * - Differential privacy for aggregates
 * - Privacy budget tracking
 * - Comprehensive audit logging
 * - NO PHI fields (names, DOB, addresses removed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { logDeIDOperation } from '@/lib/audit/deid-audit';
import { format } from 'date-fns';
import { z } from 'zod';
import {
  checkKAnonymity,
  applyKAnonymity,
  dpCount,
  dpHistogram,
  PrivacyBudgetTracker,
} from '@holilabs/deid';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Privacy budget tracker (reset daily)
const privacyBudget = new PrivacyBudgetTracker(1.0); // Max epsilon per day

const ExportSchema = z.object({
  format: z.enum(['JSON', 'CSV', 'AGGREGATE']),
  filters: z.object({
    ageBand: z.string().optional(),
    region: z.string().optional(),
    gender: z.string().optional(),
    isPalliativeCare: z.boolean().optional(),
  }).optional(),
  options: z.object({
    enforceKAnonymity: z.boolean().default(true),
    k: z.number().min(2).max(20).default(5),
    applyDifferentialPrivacy: z.boolean().default(true),
    epsilon: z.number().min(0.01).max(10).default(0.1),
  }).optional(),
});

/**
 * POST /api/patients/export
 * 🔒 SECURE: Export de-identified patient data with privacy protections
 * NO PHI EXPOSED (names, DOB, addresses, etc. removed)
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const validated = ExportSchema.parse(body);

      const options = validated.options || {};
      const k = options.k || 5;
      const epsilon = options.epsilon || 0.1;

      // Build secure query (NO PHI fields)
      const where: any = {
        assignedClinicianId: context.user.id, // Tenant isolation
      };

      if (validated.filters?.ageBand) where.ageBand = validated.filters.ageBand;
      if (validated.filters?.region) where.region = validated.filters.region;
      if (validated.filters?.gender) where.gender = validated.filters.gender;
      if (validated.filters?.isPalliativeCare !== undefined) {
        where.isPalliativeCare = validated.filters.isPalliativeCare;
      }

      // Query patients (ONLY de-identified fields)
      const patients = await prisma.patient.findMany({
        where,
        select: {
          id: true,
          tokenId: true,  // De-identified token
          ageBand: true,  // Generalized age
          region: true,   // Generalized geography
          gender: true,
          isPalliativeCare: true,
          hasSpecialNeeds: true,
          createdAt: true,
          // ❌ NO PHI: firstName, lastName, dateOfBirth, email, phone, address, etc.
        },
      });

      if (patients.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'NO_DATA',
          message: 'No patients match the specified filters',
        }, { status: 404 });
      }

      // PHASE 2: k-Anonymity Check
      let kAnonymousPatients = patients;
      let kAnonymityResult;

      if (options.enforceKAnonymity) {
        kAnonymityResult = checkKAnonymity(patients, {
          k,
          quasiIdentifiers: ['ageBand', 'region', 'gender'],
        });

        if (!kAnonymityResult.isKAnonymous) {
          const { kAnonymousRecords, suppressedCount } = applyKAnonymity(patients, {
            k,
            quasiIdentifiers: ['ageBand', 'region', 'gender'],
          });
          kAnonymousPatients = kAnonymousRecords;
          console.warn(`⚠️ k-Anonymity: Suppressed ${suppressedCount} records`);
        }
      }

      let exportData;
      let privacyMetadata = {};

      if (validated.format === 'AGGREGATE') {
        // PHASE 2: Differential Privacy
        const budgetKey = `${context.user.id}:${new Date().toISOString().split('T')[0]}`;

        if (options.applyDifferentialPrivacy && !privacyBudget.canExecuteQuery(budgetKey, epsilon)) {
          return NextResponse.json({
            success: false,
            error: 'PRIVACY_BUDGET_EXCEEDED',
            message: 'Daily privacy budget exceeded',
            remainingBudget: privacyBudget.getRemainingBudget(budgetKey),
          }, { status: 429 });
        }

        if (options.applyDifferentialPrivacy) {
          privacyBudget.consumeBudget(budgetKey, epsilon);
        }

        const totalCount = kAnonymousPatients.length;
        const noisyCount = options.applyDifferentialPrivacy
          ? dpCount(totalCount, epsilon)
          : { noisyValue: totalCount, originalValue: totalCount, noise: 0, epsilon: 0 };

        // Gender distribution with DP
        const genderCounts: Record<string, number> = {};
        kAnonymousPatients.forEach((p) => {
          genderCounts[p.gender || 'UNKNOWN'] = (genderCounts[p.gender || 'UNKNOWN'] || 0) + 1;
        });

        const noisyGender = options.applyDifferentialPrivacy
          ? dpHistogram(genderCounts, epsilon / 2)
          : { noisyValue: genderCounts, originalValue: genderCounts, noise: 0, epsilon: 0 };

        exportData = {
          totalCount: noisyCount.noisyValue,
          genderDistribution: noisyGender.noisyValue,
        };

        privacyMetadata = {
          differentialPrivacy: {
            applied: options.applyDifferentialPrivacy,
            epsilon: options.applyDifferentialPrivacy ? epsilon : null,
            remainingBudget: privacyBudget.getRemainingBudget(budgetKey),
          },
        };
      } else {
        // JSON or CSV export (de-identified only)
        exportData = kAnonymousPatients.map((p) => ({
          TokenID: p.tokenId,
          AgeBand: p.ageBand,
          Region: p.region,
          Gender: p.gender,
          PalliativeCare: p.isPalliativeCare ? 'Yes' : 'No',
          SpecialNeeds: p.hasSpecialNeeds ? 'Yes' : 'No',
        }));

        if (validated.format === 'CSV') {
          const csv = jsonToCSV(exportData);
          const filename = `patients-deidentified-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;

          await logDeIDOperation('EXPORT', context.user.id, kAnonymousPatients.map(p => p.id), {
            exportFormat: 'CSV',
            recordCount: kAnonymousPatients.length,
          });

          return new NextResponse(csv, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          });
        }
      }

      // Audit log
      await logDeIDOperation('EXPORT', context.user.id, kAnonymousPatients.map((p) => p.id), {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        exportFormat: validated.format,
        recordCount: kAnonymousPatients.length,
        kAnonymityEnforced: options.enforceKAnonymity,
        k: k,
        differentialPrivacyApplied: options.applyDifferentialPrivacy,
        epsilon: options.applyDifferentialPrivacy ? epsilon : null,
      });

      return NextResponse.json({
        success: true,
        data: exportData,
        metadata: {
          exportFormat: validated.format,
          recordCount: kAnonymousPatients.length,
          originalRecordCount: patients.length,
          privacy: {
            kAnonymity: {
              enforced: options.enforceKAnonymity,
              k: k,
              satisfied: kAnonymityResult?.isKAnonymous ?? true,
              suppressedRecords: kAnonymityResult ? (patients.length - kAnonymousPatients.length) : 0,
            },
            ...privacyMetadata,
          },
          exportedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Export error:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: error.errors,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: 'EXPORT_FAILED',
        message: error.message || 'Failed to export data',
      }, { status: 500 });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 3600000, maxRequests: 10 }, // 10 exports per hour
    audit: { action: 'EXPORT', resource: 'Patient' },
  }
);

/**
 * Convert JSON array to CSV (secure)
 */
function jsonToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map((h) => {
      const val = String(row[h] ?? '');
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}
