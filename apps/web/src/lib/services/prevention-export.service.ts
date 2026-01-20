/**
 * Prevention Export Service
 *
 * Generates CSV and PDF exports of patient prevention data.
 * Includes risk scores, screenings, and prevention plans.
 *
 * Phase 5: Hub Actions & Clinical Workflows
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Types for export data
interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string | null;
  mrn: string | null;
}

interface RiskScore {
  id: string;
  patientId: string;
  riskType: string;
  score: number;
  category: string;
  calculatedAt: Date;
}

interface Screening {
  id: string;
  patientId: string;
  screeningType: string;
  scheduledDate: Date;
  completedDate: Date | null;
  dueDate: Date | null;
  result: string | null;
  notes: string | null;
}

interface PreventionPlan {
  id: string;
  patientId: string;
  planName: string;
  planType: string;
  status: string;
  goals: Array<{
    goal: string;
    status: string;
    targetDate?: string | null;
    completedDate?: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportData {
  patient: PatientData;
  riskScores: RiskScore[];
  screenings: Screening[];
  plans: PreventionPlan[];
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeRiskScores?: boolean;
  includeScreenings?: boolean;
  includePlans?: boolean;
}

/**
 * Escape CSV values that contain special characters
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a date for display
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date): number {
  return Math.floor(
    (Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

/**
 * Fetch all prevention data for a patient
 */
export async function fetchPatientPreventionData(
  patientId: string
): Promise<ExportData | null> {
  const start = performance.now();

  try {
    // Fetch all data in parallel for performance
    const [patient, riskScores, screenings, plans] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          mrn: true,
        },
      }),
      prisma.riskScore.findMany({
        where: { patientId },
        orderBy: { calculatedAt: 'desc' },
      }),
      prisma.screeningOutcome.findMany({
        where: { patientId },
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.preventionPlan.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const elapsed = performance.now() - start;

    if (!patient) {
      logger.warn({
        event: 'export_patient_not_found',
        patientId,
        latencyMs: elapsed.toFixed(2),
      });
      return null;
    }

    logger.info({
      event: 'export_data_fetched',
      patientId,
      riskScoreCount: riskScores.length,
      screeningCount: screenings.length,
      planCount: plans.length,
      latencyMs: elapsed.toFixed(2),
    });

    return {
      patient: patient as PatientData,
      riskScores: riskScores as RiskScore[],
      screenings: screenings as Screening[],
      plans: plans as PreventionPlan[],
    };
  } catch (error) {
    logger.error({
      event: 'export_data_fetch_error',
      patientId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate CSV content from prevention data
 */
export function generateCSV(data: ExportData, options?: ExportOptions): string {
  const lines: string[] = [];
  const includeRiskScores = options?.includeRiskScores !== false;
  const includeScreenings = options?.includeScreenings !== false;
  const includePlans = options?.includePlans !== false;

  // Header section
  lines.push(
    `Prevention Report for ${data.patient.firstName} ${data.patient.lastName} (MRN: ${data.patient.mrn || 'N/A'})`
  );
  lines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Date of Birth: ${formatDate(data.patient.dateOfBirth)}`);
  lines.push(`Age: ${calculateAge(data.patient.dateOfBirth)} years`);
  lines.push('');
  lines.push('Category,Item,Status,Date,Notes');

  // Risk scores
  if (includeRiskScores) {
    for (const risk of data.riskScores) {
      lines.push(
        [
          'Risk Score',
          escapeCSV(risk.riskType),
          escapeCSV(`${risk.score}% (${risk.category})`),
          formatDate(risk.calculatedAt),
          '',
        ].join(',')
      );
    }
  }

  // Screenings
  if (includeScreenings) {
    for (const screening of data.screenings) {
      const status = screening.completedDate ? 'Completed' : 'Pending';
      const date = screening.completedDate || screening.scheduledDate;
      lines.push(
        [
          'Screening',
          escapeCSV(screening.screeningType),
          status,
          formatDate(date),
          escapeCSV(screening.notes || ''),
        ].join(',')
      );
    }
  }

  // Prevention plans
  if (includePlans) {
    for (const plan of data.plans) {
      lines.push(
        [
          'Prevention Plan',
          escapeCSV(plan.planName),
          plan.status,
          formatDate(plan.createdAt),
          escapeCSV(`${plan.goals?.length || 0} goals`),
        ].join(',')
      );

      // Add each goal as a sub-row
      if (plan.goals) {
        for (const goal of plan.goals) {
          lines.push(
            [
              '  Goal',
              escapeCSV(goal.goal),
              goal.status,
              goal.completedDate || goal.targetDate || '',
              '',
            ].join(',')
          );
        }
      }
    }
  }

  // HIPAA footer
  lines.push('');
  lines.push(
    '"This document contains Protected Health Information (PHI) and is subject to HIPAA regulations. Unauthorized disclosure is prohibited."'
  );

  return lines.join('\n');
}

/**
 * Generate PDF content structure (returns structured data for PDF rendering)
 */
export function generatePDFContent(data: ExportData, options?: ExportOptions) {
  const includeRiskScores = options?.includeRiskScores !== false;
  const includeScreenings = options?.includeScreenings !== false;
  const includePlans = options?.includePlans !== false;

  const header = {
    title: 'Prevention Health Report',
    patient: `${data.patient.firstName} ${data.patient.lastName}`,
    mrn: data.patient.mrn || 'N/A',
    dateOfBirth: formatDate(data.patient.dateOfBirth),
    age: calculateAge(data.patient.dateOfBirth),
    gender: data.patient.gender || 'Not specified',
    generatedAt: new Date().toISOString(),
  };

  const riskScores = includeRiskScores
    ? data.riskScores.map((risk) => ({
        type: risk.riskType.replace(/_/g, ' '),
        score: `${risk.score}%`,
        level: risk.category,
        date: formatDate(risk.calculatedAt),
      }))
    : [];

  const screenings = includeScreenings
    ? data.screenings.map((s) => ({
        name: s.screeningType
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        status: s.completedDate ? 'Completed' : 'Scheduled',
        date: formatDate(s.completedDate || s.scheduledDate),
        result: s.result || 'N/A',
        notes: s.notes || '',
      }))
    : [];

  const plans = includePlans
    ? data.plans.map((plan) => ({
        name: plan.planName,
        type: plan.planType,
        status: plan.status,
        createdAt: formatDate(plan.createdAt),
        goals: plan.goals?.map((g) => ({
          goal: g.goal,
          status: g.status,
          targetDate: g.targetDate || null,
          completedDate: g.completedDate || null,
        })) || [],
      }))
    : [];

  const footer = {
    disclaimer:
      'This document contains Protected Health Information (PHI) and is subject to HIPAA regulations. Unauthorized disclosure is prohibited.',
    generatedBy: 'HoliLabs Prevention Hub',
    timestamp: new Date().toISOString(),
  };

  return {
    header,
    riskScores,
    screenings,
    plans,
    footer,
  };
}

/**
 * Generate a simple HTML representation for PDF conversion
 * This can be used with a PDF library like puppeteer or @react-pdf/renderer
 */
export function generatePDFHTML(data: ExportData, options?: ExportOptions): string {
  const content = generatePDFContent(data, options);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${content.header.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .patient-info { background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background: #edf2f7; font-weight: bold; }
    .status-completed { color: #38a169; }
    .status-pending { color: #d69e2e; }
    .status-high { color: #e53e3e; }
    .status-moderate { color: #d69e2e; }
    .status-low { color: #38a169; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
    .goal-row { background: #f7fafc; }
    .goal-row td:first-child { padding-left: 30px; }
  </style>
</head>
<body>
  <h1>${content.header.title}</h1>

  <div class="patient-info">
    <strong>Patient:</strong> ${content.header.patient}<br>
    <strong>MRN:</strong> ${content.header.mrn}<br>
    <strong>Date of Birth:</strong> ${content.header.dateOfBirth} (Age: ${content.header.age})<br>
    <strong>Gender:</strong> ${content.header.gender}<br>
    <strong>Report Generated:</strong> ${new Date(content.header.generatedAt).toLocaleString()}
  </div>

  ${
    content.riskScores.length > 0
      ? `
  <h2>Risk Scores</h2>
  <table>
    <thead>
      <tr><th>Risk Type</th><th>Score</th><th>Level</th><th>Calculated</th></tr>
    </thead>
    <tbody>
      ${content.riskScores
        .map(
          (r) => `
        <tr>
          <td>${r.type}</td>
          <td>${r.score}</td>
          <td class="status-${r.level.toLowerCase()}">${r.level}</td>
          <td>${r.date}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  `
      : ''
  }

  ${
    content.screenings.length > 0
      ? `
  <h2>Screenings</h2>
  <table>
    <thead>
      <tr><th>Screening</th><th>Status</th><th>Date</th><th>Result</th></tr>
    </thead>
    <tbody>
      ${content.screenings
        .map(
          (s) => `
        <tr>
          <td>${s.name}</td>
          <td class="status-${s.status.toLowerCase()}">${s.status}</td>
          <td>${s.date}</td>
          <td>${s.result}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  `
      : ''
  }

  ${
    content.plans.length > 0
      ? `
  <h2>Prevention Plans</h2>
  <table>
    <thead>
      <tr><th>Plan</th><th>Type</th><th>Status</th><th>Created</th></tr>
    </thead>
    <tbody>
      ${content.plans
        .map(
          (p) => `
        <tr>
          <td>${p.name}</td>
          <td>${p.type}</td>
          <td>${p.status}</td>
          <td>${p.createdAt}</td>
        </tr>
        ${p.goals
          .map(
            (g) => `
          <tr class="goal-row">
            <td>↳ ${g.goal}</td>
            <td></td>
            <td class="status-${g.status.toLowerCase().replace('_', '-')}">${g.status}</td>
            <td>${g.completedDate || g.targetDate || ''}</td>
          </tr>
        `
          )
          .join('')}
      `
        )
        .join('')}
    </tbody>
  </table>
  `
      : ''
  }

  <div class="footer">
    <p><strong>HIPAA Notice:</strong> ${content.footer.disclaimer}</p>
    <p>Generated by ${content.footer.generatedBy} on ${new Date(content.footer.timestamp).toLocaleString()}</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Main export function - generates export in requested format
 */
export async function exportPreventionReport(
  patientId: string,
  options: ExportOptions
): Promise<{ content: string; contentType: string; filename: string } | null> {
  const start = performance.now();

  try {
    const data = await fetchPatientPreventionData(patientId);

    if (!data) {
      return null;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const patientName = `${data.patient.lastName}_${data.patient.firstName}`.replace(
      /[^a-zA-Z0-9_]/g,
      ''
    );

    let content: string;
    let contentType: string;
    let extension: string;

    if (options.format === 'csv') {
      content = generateCSV(data, options);
      contentType = 'text/csv';
      extension = 'csv';
    } else {
      // PDF format - return HTML that can be converted to PDF
      content = generatePDFHTML(data, options);
      contentType = 'text/html'; // For now, return HTML; can be converted server-side
      extension = 'html';
    }

    const elapsed = performance.now() - start;

    logger.info({
      event: 'export_generated',
      patientId,
      format: options.format,
      latencyMs: elapsed.toFixed(2),
    });

    return {
      content,
      contentType,
      filename: `prevention_report_${patientName}_${timestamp}.${extension}`,
    };
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'export_generation_error',
      patientId,
      format: options.format,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: elapsed.toFixed(2),
    });

    throw error;
  }
}
