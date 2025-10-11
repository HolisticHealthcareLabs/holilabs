/**
 * Audit Logging Utility
 *
 * Comprehensive audit logging for HIPAA compliance
 */

import { prisma } from './prisma';
import logger from './logger';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getPatientSession } from './auth/patient-session';
import crypto from 'crypto';

export type AuditAction =
  | 'VIEW'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ACCESS_DENIED'
  | 'PASSWORD_RESET'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED';

export interface AuditLogData {
  action: AuditAction;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Get current user information from request
 */
async function getCurrentUser(request?: NextRequest): Promise<{
  userId: string | null;
  userEmail: string | null;
  userType: 'CLINICIAN' | 'PATIENT' | 'ANONYMOUS';
}> {
  try {
    // Try clinician session
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      return {
        userId: clinicianSession.user.id,
        userEmail: clinicianSession.user.email,
        userType: 'CLINICIAN',
      };
    }

    // Try patient session
    const patientSession = await getPatientSession();

    if (patientSession) {
      return {
        userId: patientSession.patientId,
        userEmail: patientSession.email,
        userType: 'PATIENT',
      };
    }

    return {
      userId: null,
      userEmail: null,
      userType: 'ANONYMOUS',
    };
  } catch (error) {
    return {
      userId: null,
      userEmail: null,
      userType: 'ANONYMOUS',
    };
  }
}

/**
 * Get IP address from request
 */
function getIpAddress(request?: NextRequest): string {
  if (!request) {
    return 'unknown';
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Get user agent from request
 */
function getUserAgent(request?: NextRequest): string | null {
  if (!request) {
    return null;
  }

  return request.headers.get('user-agent');
}

/**
 * Create data hash for sensitive information
 */
function createDataHash(data: any): string {
  const dataString = JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  data: AuditLogData,
  request?: NextRequest,
  userId?: string,
  userEmail?: string
): Promise<void> {
  try {
    // Get user information
    let finalUserId: string | null = userId || null;
    let finalUserEmail: string | null = userEmail || null;

    if (!finalUserId && request) {
      const user = await getCurrentUser(request);
      finalUserId = user.userId;
      finalUserEmail = user.userEmail;
    }

    // Get request metadata
    const ipAddress = getIpAddress(request);
    const userAgent = getUserAgent(request);

    // Create data hash if sensitive data is involved
    let dataHash: string | undefined;
    if (data.details && (data.action === 'VIEW' || data.action === 'EXPORT')) {
      dataHash = createDataHash(data.details);
    }

    // Create audit log in database
    await prisma.auditLog.create({
      data: {
        userId: finalUserId,
        userEmail: finalUserEmail,
        ipAddress,
        userAgent,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details || {},
        dataHash,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
      },
    });

    // Also log to application logger for real-time monitoring
    logger.info({
      event: 'audit_log_created',
      userId: finalUserId,
      userEmail: finalUserEmail,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      success: data.success ?? true,
      ipAddress,
    });
  } catch (error) {
    // Never let audit logging failure break the application
    // But log the error for investigation
    logger.error({
      event: 'audit_log_creation_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      auditData: data,
    });
  }
}

/**
 * Audit a resource view
 */
export async function auditView(
  resource: string,
  resourceId: string,
  request?: NextRequest,
  details?: Record<string, any>
): Promise<void> {
  return createAuditLog(
    {
      action: 'VIEW',
      resource,
      resourceId,
      details,
    },
    request
  );
}

/**
 * Audit a resource creation
 */
export async function auditCreate(
  resource: string,
  resourceId: string,
  request?: NextRequest,
  details?: Record<string, any>
): Promise<void> {
  return createAuditLog(
    {
      action: 'CREATE',
      resource,
      resourceId,
      details,
    },
    request
  );
}

/**
 * Audit a resource update
 */
export async function auditUpdate(
  resource: string,
  resourceId: string,
  request?: NextRequest,
  details?: Record<string, any>
): Promise<void> {
  return createAuditLog(
    {
      action: 'UPDATE',
      resource,
      resourceId,
      details,
    },
    request
  );
}

/**
 * Audit a resource deletion
 */
export async function auditDelete(
  resource: string,
  resourceId: string,
  request?: NextRequest,
  details?: Record<string, any>
): Promise<void> {
  return createAuditLog(
    {
      action: 'DELETE',
      resource,
      resourceId,
      details,
    },
    request
  );
}

/**
 * Audit a resource export/download
 */
export async function auditExport(
  resource: string,
  resourceId: string,
  request?: NextRequest,
  details?: Record<string, any>
): Promise<void> {
  return createAuditLog(
    {
      action: 'EXPORT',
      resource,
      resourceId,
      details,
    },
    request
  );
}

/**
 * Audit an access denial
 */
export async function auditAccessDenied(
  resource: string,
  resourceId: string,
  reason: string,
  request?: NextRequest
): Promise<void> {
  return createAuditLog(
    {
      action: 'ACCESS_DENIED',
      resource,
      resourceId,
      details: { reason },
      success: false,
    },
    request
  );
}

/**
 * Audit a login attempt
 */
export async function auditLogin(
  userId: string,
  userEmail: string,
  success: boolean,
  request?: NextRequest,
  errorMessage?: string
): Promise<void> {
  return createAuditLog(
    {
      action: 'LOGIN',
      resource: 'User',
      resourceId: userId,
      success,
      errorMessage,
    },
    request,
    userId,
    userEmail
  );
}

/**
 * Audit a logout
 */
export async function auditLogout(
  userId: string,
  userEmail: string,
  request?: NextRequest
): Promise<void> {
  return createAuditLog(
    {
      action: 'LOGOUT',
      resource: 'User',
      resourceId: userId,
    },
    request,
    userId,
    userEmail
  );
}
