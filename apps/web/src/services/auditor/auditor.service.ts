/**
 * Revenue Gap Auditor Service
 *
 * Background service that cross-references clinical notes against billing codes
 * to find missed revenue (Glosa prevention through detection).
 *
 * This is the "Adversarial Auditor" - it runs on Cloud (Web), not Edge.
 * It is a retrospective check, not real-time blocking.
 *
 * Key Functions:
 * - scanRecentNotes(patientId): Pull last 24h of clinical text
 * - detectProcedures(text): Identify procedures mentioned
 * - findUnbilledProcedures(): Cross-reference against claims
 * - calculateRevenueGap(): Estimate lost value
 *
 * @module services/auditor/auditor
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  type DetectedProcedure,
  type NoteScanResult,
  type RevenueGap,
  type RevenueGapSummary,
  type AuditorConfig,
  type ProcedurePattern,
  DEFAULT_AUDITOR_CONFIG,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns for detecting procedures in clinical text.
 * These are common Brazilian procedures that are often documented but not billed.
 */
const PROCEDURE_PATTERNS: ProcedurePattern[] = [
  // Imaging
  {
    tissCode: '40301010',
    cptCode: '70450',
    patterns: [
      /tomografia\s+(de\s+)?cr[aâ]nio/i,
      /tc\s+(de\s+)?cabe[cç]a/i,
      /ct\s+head/i,
      /ct\s+scan.*head/i,
      /head\s+ct/i,
    ],
    description: 'CT scan of head',
    descriptionPortuguese: 'Tomografia de crânio',
    category: 'IMAGING',
    avgValueCents: 35000,
    relatedIcd10: ['G43', 'R51', 'S06', 'I60', 'I61', 'I62'],
  },
  {
    tissCode: '40401014',
    cptCode: '70551',
    patterns: [
      /resson[aâ]ncia.*enc[eé]falo/i,
      /rm\s+(de\s+)?cabe[cç]a/i,
      /mri.*brain/i,
      /brain\s+mri/i,
      /ressonância magnética/i,
    ],
    description: 'MRI of brain',
    descriptionPortuguese: 'Ressonância magnética de encéfalo',
    category: 'IMAGING',
    avgValueCents: 120000,
    relatedIcd10: ['G35', 'G40', 'C71', 'G43'],
  },
  {
    tissCode: '40301036',
    cptCode: '71250',
    patterns: [
      /tomografia\s+(de\s+)?t[oó]rax/i,
      /tc\s+(de\s+)?t[oó]rax/i,
      /chest\s+ct/i,
      /ct\s+chest/i,
    ],
    description: 'CT scan of chest',
    descriptionPortuguese: 'Tomografia de tórax',
    category: 'IMAGING',
    avgValueCents: 45000,
    relatedIcd10: ['J18', 'J44', 'C34'],
  },
  {
    tissCode: '40808041',
    cptCode: '76700',
    patterns: [
      /ultrassom\s+(de\s+)?abdome/i,
      /usg\s+abdom/i,
      /abdominal\s+ultrasound/i,
      /us\s+abdome/i,
    ],
    description: 'Abdominal ultrasound',
    descriptionPortuguese: 'Ultrassom de abdome',
    category: 'IMAGING',
    avgValueCents: 15000,
    relatedIcd10: ['K80', 'K81', 'K85'],
  },
  // Laboratory
  {
    tissCode: '40301397',
    cptCode: '85025',
    patterns: [
      /hemograma\s+completo/i,
      /cbc/i,
      /complete\s+blood\s+count/i,
      /hemograma/i,
    ],
    description: 'Complete blood count',
    descriptionPortuguese: 'Hemograma completo',
    category: 'LABORATORY',
    avgValueCents: 2500,
  },
  {
    tissCode: '40302040',
    cptCode: '83036',
    patterns: [
      /hemoglobina\s+glicada/i,
      /hba1c/i,
      /a1c/i,
      /glycated\s+hemoglobin/i,
    ],
    description: 'Glycated hemoglobin (HbA1c)',
    descriptionPortuguese: 'Hemoglobina glicada',
    category: 'LABORATORY',
    avgValueCents: 4500,
    relatedIcd10: ['E10', 'E11', 'E13', 'E14'],
  },
  {
    tissCode: '40301630',
    cptCode: '80048',
    patterns: [
      /perfil\s+lip[ií]dico/i,
      /lipid\s+panel/i,
      /colesterol\s+total/i,
      /triglicer[ií]deos/i,
    ],
    description: 'Lipid panel',
    descriptionPortuguese: 'Perfil lipídico',
    category: 'LABORATORY',
    avgValueCents: 3500,
    relatedIcd10: ['E78'],
  },
  {
    tissCode: '40301508',
    cptCode: '84443',
    patterns: [
      /tsh/i,
      /tireoide/i,
      /thyroid\s+function/i,
      /função\s+tireoidiana/i,
    ],
    description: 'Thyroid function test (TSH)',
    descriptionPortuguese: 'TSH - função tireoidiana',
    category: 'LABORATORY',
    avgValueCents: 3000,
    relatedIcd10: ['E00', 'E01', 'E02', 'E03', 'E05'],
  },
  // Procedures
  {
    tissCode: '20101015',
    cptCode: '99213',
    patterns: [
      /consulta\s+(m[eé]dica\s+)?de\s+retorno/i,
      /follow[- ]?up\s+visit/i,
      /retorno/i,
    ],
    description: 'Follow-up consultation',
    descriptionPortuguese: 'Consulta de retorno',
    category: 'CONSULTATION',
    avgValueCents: 15000,
  },
  {
    tissCode: '20101023',
    cptCode: '99215',
    patterns: [
      /consulta\s+especializada/i,
      /avalia[çc][ãa]o\s+especialista/i,
      /specialist\s+consultation/i,
    ],
    description: 'Specialist consultation',
    descriptionPortuguese: 'Consulta especializada',
    category: 'CONSULTATION',
    avgValueCents: 25000,
  },
  {
    tissCode: '40201031',
    cptCode: '93000',
    patterns: [
      /eletrocardiograma/i,
      /ecg/i,
      /ekg/i,
      /electrocardiogram/i,
    ],
    description: 'Electrocardiogram (ECG)',
    descriptionPortuguese: 'Eletrocardiograma',
    category: 'PROCEDURE',
    avgValueCents: 5000,
    relatedIcd10: ['I25', 'I20', 'I48', 'I49'],
  },
  {
    tissCode: '40201074',
    cptCode: '93306',
    patterns: [
      /ecocardiograma/i,
      /eco\s+(card[ií]aco|do\s+cora[çc][ãa]o)/i,
      /echocardiogram/i,
      /cardiac\s+echo/i,
    ],
    description: 'Echocardiogram',
    descriptionPortuguese: 'Ecocardiograma',
    category: 'IMAGING',
    avgValueCents: 35000,
    relatedIcd10: ['I50', 'I42', 'I34', 'I35'],
  },
  // Therapy
  {
    tissCode: '50000470',
    cptCode: '97110',
    patterns: [
      /fisioterapia/i,
      /physical\s+therapy/i,
      /sess[ãa]o\s+(de\s+)?fisio/i,
      /pt\s+session/i,
    ],
    description: 'Physical therapy session',
    descriptionPortuguese: 'Sessão de fisioterapia',
    category: 'THERAPY',
    avgValueCents: 8000,
  },
  {
    tissCode: '30904024',
    cptCode: '96150',
    patterns: [
      /psicoterapia/i,
      /terapia\s+psicol[oó]gica/i,
      /psychotherapy/i,
      /sess[ãa]o.*psic[oó]logo/i,
    ],
    description: 'Psychotherapy session',
    descriptionPortuguese: 'Sessão de psicoterapia',
    category: 'THERAPY',
    avgValueCents: 12000,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE GAP ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Engine for calculating revenue gaps from unbilled procedures
 */
export class RevenueGapEngine {
  private config: AuditorConfig;

  constructor(config: Partial<AuditorConfig> = {}) {
    this.config = { ...DEFAULT_AUDITOR_CONFIG, ...config };
  }

  /**
   * Calculate potential revenue gap for a patient
   */
  async calculateForPatient(patientId: string): Promise<RevenueGap[]> {
    // 1. Scan recent notes
    const scanResults = await this.scanRecentNotes(patientId);

    // 2. Get recent claims for comparison
    const recentClaims = await this.getRecentClaims(patientId);

    // 3. Find unbilled procedures
    const gaps: RevenueGap[] = [];

    for (const result of scanResults) {
      for (const procedure of result.detectedProcedures) {
        // Check if procedure was billed
        const wasBilled = this.checkIfBilled(procedure, recentClaims);

        if (!wasBilled && procedure.confidence >= this.config.minConfidence) {
          gaps.push({
            id: `gap-${result.noteId}-${procedure.tissCode || procedure.description}`,
            patientId,
            procedure,
            sourceNoteId: result.noteId,
            documentedAt: result.noteDate,
            status: 'OPEN',
          });
        }
      }
    }

    logger.info({
      event: 'revenue_gap_calculated',
      patientId,
      notesScanned: scanResults.length,
      gapsFound: gaps.length,
      totalPotentialValue: gaps.reduce((sum, g) => sum + g.procedure.estimatedValue, 0),
    });

    return gaps;
  }

  /**
   * Calculate summary for all patients in a clinic
   */
  async calculateSummary(clinicId?: string): Promise<RevenueGapSummary> {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - this.config.lookbackHours * 60 * 60 * 1000);

    // Get all patients with recent notes
    const patients = await prisma.patient.findMany({
      where: {
        ...(clinicId && {
          clinicalNotes: {
            some: {
              createdAt: { gte: periodStart },
            },
          },
        }),
      },
      select: { id: true },
      take: 100, // Limit for performance
    });

    let totalGaps = 0;
    let totalValue = 0;
    const byStatus = { open: 0, reviewed: 0, billed: 0, dismissed: 0 };
    const byCategory: Record<string, { count: number; value: number }> = {};
    const procedureCounts: Record<string, { description: string; count: number; totalValue: number }> = {};

    for (const patient of patients) {
      const gaps = await this.calculateForPatient(patient.id);

      for (const gap of gaps) {
        totalGaps++;
        totalValue += gap.procedure.estimatedValue;
        byStatus[gap.status.toLowerCase() as keyof typeof byStatus]++;

        // By category
        const cat = gap.procedure.category;
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, value: 0 };
        }
        byCategory[cat].count++;
        byCategory[cat].value += gap.procedure.estimatedValue;

        // By procedure
        const key = gap.procedure.tissCode || gap.procedure.description;
        if (!procedureCounts[key]) {
          procedureCounts[key] = {
            description: gap.procedure.description,
            count: 0,
            totalValue: 0,
          };
        }
        procedureCounts[key].count++;
        procedureCounts[key].totalValue += gap.procedure.estimatedValue;
      }
    }

    // Sort top procedures by value
    const topProcedures = Object.values(procedureCounts)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return {
      totalGaps,
      totalPotentialValue: totalValue,
      byStatus,
      byCategory,
      topProcedures,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Scan recent notes for a patient
   */
  private async scanRecentNotes(patientId: string): Promise<NoteScanResult[]> {
    const lookbackDate = new Date(Date.now() - this.config.lookbackHours * 60 * 60 * 1000);

    // Get clinical notes
    const clinicalNotes = await prisma.clinicalNote.findMany({
      where: {
        patientId,
        createdAt: { gte: lookbackDate },
      },
      select: {
        id: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        diagnosis: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get SOAP notes from scribe sessions
    const soapNotes = await prisma.sOAPNote.findMany({
      where: {
        patientId,
        createdAt: { gte: lookbackDate },
      },
      select: {
        id: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const results: NoteScanResult[] = [];

    // Scan clinical notes
    for (const note of clinicalNotes) {
      const startTime = Date.now();
      const procedures = this.detectProceduresInNote({
        subjective: note.subjective || '',
        objective: note.objective || '',
        assessment: note.assessment || '',
        plan: note.plan || '',
        diagnosis: note.diagnosis || [],
      });

      results.push({
        noteId: note.id,
        patientId,
        noteDate: note.createdAt,
        detectedProcedures: procedures.filter((p) => p.estimatedValue >= this.config.minValueCents),
        scanTimeMs: Date.now() - startTime,
      });
    }

    // Scan SOAP notes
    for (const note of soapNotes) {
      const startTime = Date.now();
      const procedures = this.detectProceduresInNote({
        subjective: note.subjective || '',
        objective: note.objective || '',
        assessment: note.assessment || '',
        plan: note.plan || '',
        diagnosis: [],
      });

      results.push({
        noteId: note.id,
        patientId,
        noteDate: note.createdAt,
        detectedProcedures: procedures.filter((p) => p.estimatedValue >= this.config.minValueCents),
        scanTimeMs: Date.now() - startTime,
      });
    }

    return results;
  }

  /**
   * Detect procedures in a note's text fields
   */
  private detectProceduresInNote(note: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    diagnosis: string[];
  }): DetectedProcedure[] {
    const detected: DetectedProcedure[] = [];
    const seenCodes = new Set<string>();

    // Search each section
    const sections: Array<{ text: string; location: DetectedProcedure['sourceLocation'] }> = [
      { text: note.subjective, location: 'subjective' },
      { text: note.objective, location: 'objective' },
      { text: note.assessment, location: 'assessment' },
      { text: note.plan, location: 'plan' },
    ];

    for (const section of sections) {
      if (!section.text) continue;

      for (const pattern of PROCEDURE_PATTERNS) {
        for (const regex of pattern.patterns) {
          const match = section.text.match(regex);
          if (match && !seenCodes.has(pattern.tissCode)) {
            seenCodes.add(pattern.tissCode);

            // Extract surrounding context (up to 50 chars before/after)
            const matchIndex = match.index || 0;
            const contextStart = Math.max(0, matchIndex - 50);
            const contextEnd = Math.min(section.text.length, matchIndex + match[0].length + 50);
            const sourceText = section.text.substring(contextStart, contextEnd).trim();

            detected.push({
              tissCode: pattern.tissCode,
              cptCode: pattern.cptCode,
              description: pattern.description,
              descriptionPortuguese: pattern.descriptionPortuguese,
              confidence: 0.85, // Base confidence from pattern match
              sourceText: `...${sourceText}...`,
              sourceLocation: section.location,
              estimatedValue: pattern.avgValueCents,
              category: pattern.category,
            });
          }
        }
      }
    }

    // Check diagnoses for related procedures
    for (const diagnosis of note.diagnosis) {
      for (const pattern of PROCEDURE_PATTERNS) {
        if (pattern.relatedIcd10?.some((icd) => diagnosis.toUpperCase().startsWith(icd))) {
          // Diagnosis suggests this procedure might be relevant
          if (!seenCodes.has(pattern.tissCode)) {
            // Lower confidence for diagnosis-based detection
            detected.push({
              tissCode: pattern.tissCode,
              cptCode: pattern.cptCode,
              icd10Code: diagnosis,
              description: pattern.description,
              descriptionPortuguese: pattern.descriptionPortuguese,
              confidence: 0.5,
              sourceText: `Diagnosis: ${diagnosis}`,
              sourceLocation: 'diagnosis',
              estimatedValue: pattern.avgValueCents,
              category: pattern.category,
            });
            seenCodes.add(pattern.tissCode);
          }
        }
      }
    }

    return detected;
  }

  /**
   * Get recent claims for a patient
   */
  private async getRecentClaims(patientId: string) {
    const lookbackDate = new Date(Date.now() - this.config.lookbackHours * 60 * 60 * 1000);

    return prisma.insuranceClaim.findMany({
      where: {
        patientId,
        submittedAt: { gte: lookbackDate },
      },
      select: {
        id: true,
        procedureCodes: true,
        diagnosisCodes: true,
        serviceDate: true,
      },
    });
  }

  /**
   * Check if a procedure was already billed
   */
  private checkIfBilled(
    procedure: DetectedProcedure,
    claims: Array<{
      procedureCodes: unknown;
      diagnosisCodes: unknown;
      serviceDate: Date;
    }>
  ): boolean {
    for (const claim of claims) {
      const procedures = claim.procedureCodes as Array<{ code: string }> | null;
      if (!procedures) continue;

      for (const billedProc of procedures) {
        // Match by TISS code
        if (procedure.tissCode && billedProc.code === procedure.tissCode) {
          return true;
        }
        // Match by CPT code
        if (procedure.cptCode && billedProc.code === procedure.cptCode) {
          return true;
        }
      }
    }

    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDITOR SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main Auditor Service - Singleton
 */
export class AuditorService {
  private static instance: AuditorService;
  private engine: RevenueGapEngine;

  private constructor() {
    this.engine = new RevenueGapEngine();
  }

  static getInstance(): AuditorService {
    if (!AuditorService.instance) {
      AuditorService.instance = new AuditorService();
    }
    return AuditorService.instance;
  }

  /**
   * Scan recent notes for a specific patient
   */
  async scanRecentNotes(
    patientId: string,
    config?: Partial<AuditorConfig>
  ): Promise<NoteScanResult[]> {
    const engine = config ? new RevenueGapEngine(config) : this.engine;
    const scanResults: NoteScanResult[] = [];

    const lookbackDate = new Date(Date.now() - (config?.lookbackHours || 24) * 60 * 60 * 1000);

    // Get clinical notes
    const clinicalNotes = await prisma.clinicalNote.findMany({
      where: {
        patientId,
        createdAt: { gte: lookbackDate },
      },
      select: {
        id: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        diagnosis: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const note of clinicalNotes) {
      const startTime = Date.now();
      const textToScan = [
        note.subjective,
        note.objective,
        note.assessment,
        note.plan,
        ...(note.diagnosis || []),
      ]
        .filter(Boolean)
        .join('\n');

      const detectedProcedures = this.detectProceduresInText(textToScan);

      scanResults.push({
        noteId: note.id,
        patientId,
        noteDate: note.createdAt,
        detectedProcedures,
        scanTimeMs: Date.now() - startTime,
      });
    }

    logger.info({
      event: 'notes_scanned',
      patientId,
      notesCount: scanResults.length,
      proceduresDetected: scanResults.reduce((sum, r) => sum + r.detectedProcedures.length, 0),
    });

    return scanResults;
  }

  /**
   * Find revenue gaps for a patient
   */
  async findRevenueGaps(patientId: string, config?: Partial<AuditorConfig>): Promise<RevenueGap[]> {
    const engine = config ? new RevenueGapEngine(config) : this.engine;
    return engine.calculateForPatient(patientId);
  }

  /**
   * Get revenue gap summary for a clinic
   */
  async getSummary(clinicId?: string, config?: Partial<AuditorConfig>): Promise<RevenueGapSummary> {
    const engine = config ? new RevenueGapEngine(config) : this.engine;
    return engine.calculateSummary(clinicId);
  }

  /**
   * Detect procedures in free text
   */
  private detectProceduresInText(text: string): DetectedProcedure[] {
    const detected: DetectedProcedure[] = [];
    const seenCodes = new Set<string>();

    for (const pattern of PROCEDURE_PATTERNS) {
      for (const regex of pattern.patterns) {
        const match = text.match(regex);
        if (match && !seenCodes.has(pattern.tissCode)) {
          seenCodes.add(pattern.tissCode);

          const matchIndex = match.index || 0;
          const contextStart = Math.max(0, matchIndex - 50);
          const contextEnd = Math.min(text.length, matchIndex + match[0].length + 50);
          const sourceText = text.substring(contextStart, contextEnd).trim();

          detected.push({
            tissCode: pattern.tissCode,
            cptCode: pattern.cptCode,
            description: pattern.description,
            descriptionPortuguese: pattern.descriptionPortuguese,
            confidence: 0.85,
            sourceText: `...${sourceText}...`,
            sourceLocation: 'plan', // Default location
            estimatedValue: pattern.avgValueCents,
            category: pattern.category,
          });
        }
      }
    }

    return detected;
  }
}

// Singleton export
export const auditorService = AuditorService.getInstance();
