import { createChainedAuditEntry, type ChainedAuditData } from '@/lib/security/audit-chain';
import type { AccessReason, AuditAction } from '@prisma/client';

interface AuditEntryParams {
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  actorType: 'USER' | 'AGENT' | 'SYSTEM';
  agentId?: string;
  accessReason: AccessReason | string;
  metadata?: Record<string, unknown>;
  clinicId?: string;
  modelVersion?: string;
  promptHash?: string;
  consentBasis?: string;
  legalBasis?: string;
  phiAccessScore?: number;
}

// Map AccessReason enum to LGPD legal basis citations
const ACCESS_REASON_TO_LEGAL_BASIS: Record<string, string> = {
  DIRECT_PATIENT_CARE: 'LGPD Art. 7(VIII) — health protection (direct care)',
  CARE_COORDINATION: 'LGPD Art. 7(VIII) — health protection (coordination)',
  EMERGENCY_ACCESS: 'LGPD Art. 7(VII) — vital interest protection',
  ADMINISTRATIVE: 'LGPD Art. 7(IX) — legitimate interest (administration)',
  QUALITY_IMPROVEMENT: 'LGPD Art. 7(IX) — legitimate interest (quality)',
  BILLING: 'LGPD Art. 7(V) — contract execution',
  LEGAL_COMPLIANCE: 'LGPD Art. 7(II) — legal obligation compliance',
  RESEARCH_IRB_APPROVED: 'LGPD Art. 7(IV) — research with anonymization',
  PUBLIC_HEALTH: 'LGPD Art. 7(VIII) — public health protection',
};

export async function writeAuditEntry(params: AuditEntryParams): Promise<void> {
  const accessReasonStr = typeof params.accessReason === 'string'
    ? params.accessReason
    : (params.accessReason as string);

  // Auto-populate legalBasis from accessReason if not provided
  const derivedLegalBasis = params.legalBasis || ACCESS_REASON_TO_LEGAL_BASIS[accessReasonStr];

  const auditData: ChainedAuditData & {
    actorType?: string;
    agentId?: string;
    hashVersion?: number;
    modelVersion?: string;
    promptHash?: string;
    consentBasis?: string;
    legalBasis?: string;
    phiAccessScore?: number;
  } = {
    userId: params.userId,
    userEmail: params.actorType === 'AGENT' ? `agent:${params.agentId ?? 'unknown'}` : '',
    ipAddress: 'internal',
    action: params.action as AuditAction,
    resource: params.resourceType,
    resourceId: params.resourceId,
    success: true,
    accessReason: accessReasonStr as AccessReason,
    details: {
      ...params.metadata,
      ...(params.clinicId ? { clinicId: params.clinicId } : {}),
    },
    actorType: params.actorType,
    agentId: params.agentId,
    hashVersion: 2, // New entries use v2 hash
    modelVersion: params.modelVersion,
    promptHash: params.promptHash,
    consentBasis: params.consentBasis,
    legalBasis: derivedLegalBasis,
    phiAccessScore: params.phiAccessScore,
  };

  await createChainedAuditEntry(auditData as ChainedAuditData);
}
