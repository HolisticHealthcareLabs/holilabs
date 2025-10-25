"use strict";
/**
 * Audit Logging Utility
 *
 * Comprehensive audit logging for HIPAA compliance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
exports.auditView = auditView;
exports.auditCreate = auditCreate;
exports.auditUpdate = auditUpdate;
exports.auditDelete = auditDelete;
exports.auditExport = auditExport;
exports.auditAccessDenied = auditAccessDenied;
exports.auditLogin = auditLogin;
exports.auditLogout = auditLogout;
const prisma_1 = require("./prisma");
const logger_1 = __importDefault(require("./logger"));
const next_auth_1 = require("next-auth");
const auth_1 = require("./auth");
const patient_session_1 = require("./auth/patient-session");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Get current user information from request
 */
async function getCurrentUser(request) {
    try {
        // Try clinician session
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            return {
                userId: clinicianSession.user.id,
                userEmail: clinicianSession.user.email,
                userType: 'CLINICIAN',
            };
        }
        // Try patient session
        const patientSession = await (0, patient_session_1.getPatientSession)();
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
    }
    catch (error) {
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
function getIpAddress(request) {
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
function getUserAgent(request) {
    if (!request) {
        return null;
    }
    return request.headers.get('user-agent');
}
/**
 * Create data hash for sensitive information
 */
function createDataHash(data) {
    const dataString = JSON.stringify(data);
    return crypto_1.default.createHash('sha256').update(dataString).digest('hex');
}
/**
 * Create an audit log entry
 */
async function createAuditLog(data, request, userId, userEmail) {
    try {
        // Get user information
        let finalUserId = userId || null;
        let finalUserEmail = userEmail || null;
        if (!finalUserId && request) {
            const user = await getCurrentUser(request);
            finalUserId = user.userId;
            finalUserEmail = user.userEmail;
        }
        // Get request metadata
        const ipAddress = getIpAddress(request);
        const userAgent = getUserAgent(request);
        // Create data hash if sensitive data is involved
        let dataHash;
        // TODO: Changed 'VIEW' to 'READ' to match Prisma enum
        if (data.details && (data.action === 'READ' || data.action === 'EXPORT')) {
            dataHash = createDataHash(data.details);
        }
        // Create audit log in database
        await prisma_1.prisma.auditLog.create({
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
        logger_1.default.info({
            event: 'audit_log_created',
            userId: finalUserId,
            userEmail: finalUserEmail,
            action: data.action,
            resource: data.resource,
            resourceId: data.resourceId,
            success: data.success ?? true,
            ipAddress,
        });
    }
    catch (error) {
        // Never let audit logging failure break the application
        // But log the error for investigation
        logger_1.default.error({
            event: 'audit_log_creation_failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            auditData: data,
        });
    }
}
/**
 * Audit a resource view
 */
async function auditView(resource, resourceId, request, details) {
    return createAuditLog({
        action: 'READ', // TODO: Changed from 'VIEW' to 'READ' to match Prisma enum
        resource,
        resourceId,
        details,
    }, request);
}
/**
 * Audit a resource creation
 */
async function auditCreate(resource, resourceId, request, details) {
    return createAuditLog({
        action: 'CREATE',
        resource,
        resourceId,
        details,
    }, request);
}
/**
 * Audit a resource update
 */
async function auditUpdate(resource, resourceId, request, details) {
    return createAuditLog({
        action: 'UPDATE',
        resource,
        resourceId,
        details,
    }, request);
}
/**
 * Audit a resource deletion
 */
async function auditDelete(resource, resourceId, request, details) {
    return createAuditLog({
        action: 'DELETE',
        resource,
        resourceId,
        details,
    }, request);
}
/**
 * Audit a resource export/download
 */
async function auditExport(resource, resourceId, request, details) {
    return createAuditLog({
        action: 'EXPORT',
        resource,
        resourceId,
        details,
    }, request);
}
/**
 * Audit an access denial
 */
async function auditAccessDenied(resource, resourceId, reason, request) {
    // TODO: Changed from 'ACCESS_DENIED' to 'READ' with success: false
    // ACCESS_DENIED is not in Prisma enum, using READ to track access attempt
    return createAuditLog({
        action: 'READ',
        resource,
        resourceId,
        details: { reason, accessDenied: true },
        success: false,
    }, request);
}
/**
 * Audit a login attempt
 */
async function auditLogin(userId, userEmail, success, request, errorMessage) {
    return createAuditLog({
        action: 'LOGIN',
        resource: 'User',
        resourceId: userId,
        success,
        errorMessage,
    }, request, userId, userEmail);
}
/**
 * Audit a logout
 */
async function auditLogout(userId, userEmail, request) {
    return createAuditLog({
        action: 'LOGOUT',
        resource: 'User',
        resourceId: userId,
    }, request, userId, userEmail);
}
//# sourceMappingURL=audit.js.map