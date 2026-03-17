import { auditBuffer } from '@/lib/api/audit-buffer';

interface AuditEntryParams {
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  actorType: 'USER' | 'AGENT' | 'SYSTEM';
  agentId?: string;
  accessReason: string;
  metadata?: Record<string, unknown>;
  clinicId?: string;
}

export function writeAuditEntry(params: AuditEntryParams): void {
  auditBuffer.enqueue({
    action: params.action,
    resource: params.resourceType,
    resourceId: params.resourceId,
    userId: params.userId,
    userEmail: params.actorType === 'AGENT' ? `agent:${params.agentId ?? 'unknown'}` : '',
    ipAddress: 'internal',
    success: true,
    actorType: params.actorType,
    agentId: params.agentId,
    accessReason: params.accessReason,
    details: {
      ...params.metadata,
      ...(params.clinicId ? { clinicId: params.clinicId } : {}),
    },
  });
}
