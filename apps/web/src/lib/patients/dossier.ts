import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import logger from '@/lib/logger';

export type DossierReason =
  | 'CO_PILOT_OPEN'
  | 'SCRIBE_FINALIZE'
  | 'DOCUMENT_UPLOAD'
  | 'MANUAL';

type DossierStructured = {
  patientId: string;
  generatedAt: string;
  version: number;
  demographics: {
    tokenId?: string;
    ageBand?: string | null;
    gender?: string | null;
    country?: string | null;
    region?: string | null;
  };
  vitals?: any;
  medications: Array<{ name: string; dose: string; frequency: string; route?: string | null }>;
  allergies: Array<{ allergen: string; reactions: string[]; severity: string }>;
  diagnoses: Array<{ code?: string | null; description: string; status?: string | null; onsetDate?: string | null }>;
  labs: Array<{ testName: string; value?: string | null; unit?: string | null; resultDate?: string | null }>;
  documents: Array<{ id: string; type: string; fileName: string; createdAt: string }>;
  recentScribeSessions: Array<{ id: string; status: string; createdAt: string }>;
};

function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function stableJson(obj: unknown): string {
  // Deterministic JSON so hashes are stable across runs (simple stable stringify).
  // This is not a full canonical JSON spec implementation, but good enough for our payload shapes.
  const seen = new WeakSet();
  const sortKeys = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    if (seen.has(v)) return v;
    seen.add(v);
    if (Array.isArray(v)) return v.map(sortKeys);
    const out: any = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  };
  return JSON.stringify(sortKeys(obj));
}

function buildSummaryText(structured: DossierStructured) {
  const d = structured.demographics;
  const lines: string[] = [];
  lines.push('PATIENT DOSSIER (de-identified summary)');
  if (d.tokenId) lines.push(`Token: ${d.tokenId}`);
  if (d.ageBand) lines.push(`Age band: ${d.ageBand}`);
  if (d.gender) lines.push(`Gender: ${d.gender}`);
  if (d.country) lines.push(`Country: ${d.country}`);
  if (d.region) lines.push(`Region: ${d.region}`);
  lines.push('');

  const vit = structured.vitals;
  if (vit) {
    lines.push('Latest vitals:');
    lines.push(
      `- BP ${vit.systolicBP ?? '—'}/${vit.diastolicBP ?? '—'} mmHg, HR ${vit.heartRate ?? '—'} bpm, Temp ${vit.temperature ?? '—'} °C, SpO₂ ${vit.oxygenSaturation ?? '—'}%, RR ${vit.respiratoryRate ?? '—'}`
    );
    lines.push('');
  }

  if (structured.medications.length) {
    lines.push('Active medications (top):');
    for (const m of structured.medications.slice(0, 12)) {
      lines.push(`- ${m.name} ${m.dose} • ${m.frequency}${m.route ? ` • ${m.route}` : ''}`);
    }
    lines.push('');
  }

  if (structured.allergies.length) {
    lines.push('Allergies (top):');
    for (const a of structured.allergies.slice(0, 12)) {
      const rx = a.reactions && a.reactions.length ? a.reactions.join(', ') : '';
      lines.push(`- ${a.allergen}${rx ? ` • ${rx}` : ''}${a.severity ? ` • ${a.severity}` : ''}`);
    }
    lines.push('');
  }

  if (structured.diagnoses.length) {
    lines.push('Diagnoses (top):');
    for (const dx of structured.diagnoses.slice(0, 12)) {
      const code = dx.code ? `${dx.code}: ` : '';
      lines.push(`- ${code}${dx.description}${dx.status ? ` • ${dx.status}` : ''}`);
    }
    lines.push('');
  }

  if (structured.labs.length) {
    lines.push('Recent labs (top):');
    for (const l of structured.labs.slice(0, 10)) {
      lines.push(`- ${l.testName}: ${l.value ?? '—'} ${l.unit ?? ''}`.trim());
    }
    lines.push('');
  }

  if (structured.documents.length) {
    lines.push('Documents (recent):');
    for (const doc of structured.documents.slice(0, 10)) {
      lines.push(`- ${doc.type} • ${doc.fileName} • ${new Date(doc.createdAt).toLocaleDateString()}`);
    }
    lines.push('');
  }

  lines.push('Notes: This dossier intentionally excludes direct identifiers (name, email, phone, address, MRN).');
  return lines.join('\n');
}

export async function generatePatientDossier(params: {
  patientId: string;
  clinicianId: string;
  reason: DossierReason;
}): Promise<{ dossierId: string; status: 'READY' | 'FAILED'; dataHash?: string }> {
  const { patientId, clinicianId, reason } = params;
  const prismaAny = prisma as any;

  // Only allow generating dossiers for assigned clinician.
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, assignedClinicianId: clinicianId },
    select: {
      id: true,
      tokenId: true,
      ageBand: true,
      gender: true,
      country: true,
      region: true,
      vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 1 },
      medications: { where: { isActive: true }, select: { name: true, dose: true, frequency: true, route: true }, take: 25 },
      allergies: { where: { isActive: true }, select: { allergen: true, reactions: true, severity: true }, take: 25 },
      diagnoses: { select: { icd10Code: true, description: true, status: true, onsetDate: true }, orderBy: { createdAt: 'desc' }, take: 25 },
      labResults: { select: { testName: true, value: true, unit: true, resultDate: true }, orderBy: { resultDate: 'desc' }, take: 25 },
      documents: { select: { id: true, documentType: true, fileName: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 25 },
      scribeSessions: { select: { id: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!patient) {
    throw new Error('Patient not found or access denied');
  }

  const structured: DossierStructured = {
    patientId,
    generatedAt: new Date().toISOString(),
    version: 1,
    demographics: {
      tokenId: patient.tokenId,
      ageBand: patient.ageBand,
      gender: patient.gender,
      country: patient.country,
      region: patient.region,
    },
    vitals: patient.vitalSigns?.[0] || null,
    medications: (patient.medications || []).map((m: { name: string; dose: string; frequency: string; route: string | null }) => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      route: m.route,
    })),
    allergies: (patient.allergies || []).map((a: { allergen: string; reactions: string[]; severity: any }) => ({
      allergen: a.allergen,
      reactions: Array.isArray(a.reactions) ? a.reactions : [],
      severity: String(a.severity),
    })),
    diagnoses: (patient.diagnoses || []).map((dx: { icd10Code: string | null; description: string; status: any; onsetDate: Date | null }) => ({
      code: dx.icd10Code,
      description: dx.description,
      status: dx.status,
      onsetDate: dx.onsetDate ? new Date(dx.onsetDate).toISOString() : null,
    })),
    labs: (patient.labResults || []).map((l: { testName: string; value: string | null; unit: string | null; resultDate: Date }) => ({
      testName: l.testName,
      value: l.value,
      unit: l.unit,
      resultDate: l.resultDate ? new Date(l.resultDate).toISOString() : null,
    })),
    documents: (patient.documents || []).map((d: { id: string; documentType: any; fileName: string; createdAt: Date }) => ({
      id: d.id,
      type: String(d.documentType),
      fileName: d.fileName,
      createdAt: new Date(d.createdAt).toISOString(),
    })),
    recentScribeSessions: (patient.scribeSessions || []).map((s: { id: string; status: any; createdAt: Date }) => ({
      id: s.id,
      status: String(s.status),
      createdAt: new Date(s.createdAt).toISOString(),
    })),
  };

  const rawSummary = buildSummaryText(structured);
  // Hard gate: if de-id is required and fails, this throws.
  const safeSummary = await deidentifyTranscriptOrThrow(rawSummary);

  const payload = {
    version: 1,
    patientId,
    structured,
    deidentifiedSummary: safeSummary,
  };

  const canonical = stableJson(payload);
  const dataHash = sha256Hex(canonical);

  const dossier = await prismaAny.patientDossier.upsert({
    where: { patientId },
    create: {
      patientId,
      status: 'READY',
      version: 1,
      deidentifiedSummary: safeSummary,
      structured: structured as any,
      dataHash,
      lastComputedAt: new Date(),
      lastSourceEventAt: new Date(),
    },
    update: {
      status: 'READY',
      deidentifiedSummary: safeSummary,
      structured: structured as any,
      dataHash,
      lastComputedAt: new Date(),
      lastSourceEventAt: new Date(),
      lastError: null,
    },
    select: { id: true },
  });

  // Compliance/audit: dossier generation event (no direct identifiers).
  try {
    await prisma.auditLog.create({
      data: {
        userId: clinicianId,
        userEmail: 'system', // caller route should have more precise email; keep minimal in worker path
        ipAddress: 'server',
        action: 'UPDATE',
        resource: 'PatientDossier',
        resourceId: dossier.id,
        success: true,
        dataHash,
        details: {
          patientId,
          reason,
          version: 1,
          counts: {
            medications: structured.medications.length,
            allergies: structured.allergies.length,
            diagnoses: structured.diagnoses.length,
            labs: structured.labs.length,
            documents: structured.documents.length,
            scribeSessions: structured.recentScribeSessions.length,
          },
        },
        accessReason: 'DIRECT_PATIENT_CARE',
        accessPurpose: 'PATIENT_DOSSIER_GENERATION',
      } as any,
    });
  } catch (e: any) {
    logger.error({ event: 'patient_dossier_audit_failed', patientId, clinicianId, error: e?.message });
    // Fail-safe: dossier can still exist; audit failure is logged elsewhere.
  }

  return { dossierId: dossier.id, status: 'READY', dataHash };
}

export async function markPatientDossierFailed(patientId: string, error: string) {
  const prismaAny = prisma as any;
  await prismaAny.patientDossier.upsert({
    where: { patientId },
    create: {
      patientId,
      status: 'FAILED',
      version: 1,
      deidentifiedSummary: '',
      structured: null,
      dataHash: sha256Hex(`${patientId}:${Date.now()}`),
      lastComputedAt: null,
      lastSourceEventAt: new Date(),
      lastError: error,
    },
    update: {
      status: 'FAILED',
      lastError: error,
      lastSourceEventAt: new Date(),
    },
  });
}


