/**
 * Audit Logging Utility
 *
 * Comprehensive audit logging for HIPAA compliance
 */
import { NextRequest } from 'next/server';
export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'PRINT' | 'DEIDENTIFY' | 'REIDENTIFY' | 'PRESCRIBE' | 'SIGN' | 'REVOKE' | 'NOTIFY';
export interface AuditLogData {
    action: AuditAction;
    resource: string;
    resourceId: string;
    details?: Record<string, any>;
    success?: boolean;
    errorMessage?: string;
}
/**
 * Create an audit log entry
 */
export declare function createAuditLog(data: AuditLogData, request?: NextRequest, userId?: string, userEmail?: string): Promise<void>;
/**
 * Audit a resource view
 */
export declare function auditView(resource: string, resourceId: string, request?: NextRequest, details?: Record<string, any>): Promise<void>;
/**
 * Audit a resource creation
 */
export declare function auditCreate(resource: string, resourceId: string, request?: NextRequest, details?: Record<string, any>): Promise<void>;
/**
 * Audit a resource update
 */
export declare function auditUpdate(resource: string, resourceId: string, request?: NextRequest, details?: Record<string, any>): Promise<void>;
/**
 * Audit a resource deletion
 */
export declare function auditDelete(resource: string, resourceId: string, request?: NextRequest, details?: Record<string, any>): Promise<void>;
/**
 * Audit a resource export/download
 */
export declare function auditExport(resource: string, resourceId: string, request?: NextRequest, details?: Record<string, any>): Promise<void>;
/**
 * Audit an access denial
 */
export declare function auditAccessDenied(resource: string, resourceId: string, reason: string, request?: NextRequest): Promise<void>;
/**
 * Audit a login attempt
 */
export declare function auditLogin(userId: string, userEmail: string, success: boolean, request?: NextRequest, errorMessage?: string): Promise<void>;
/**
 * Audit a logout
 */
export declare function auditLogout(userId: string, userEmail: string, request?: NextRequest): Promise<void>;
//# sourceMappingURL=audit.d.ts.map