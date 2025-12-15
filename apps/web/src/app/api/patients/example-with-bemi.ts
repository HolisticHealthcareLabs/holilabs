/**
 * Example API Route with Bemi Audit Integration
 *
 * This file demonstrates three patterns for integrating Bemi audit logging:
 * 1. Automatic context with withBemiAudit HOC (recommended)
 * 2. Manual context setting with setBemiContextFromRequest
 * 3. Custom context with additional metadata
 *
 * DO NOT USE THIS FILE IN PRODUCTION - it's a reference implementation only.
 * Copy patterns to your actual API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import {
  withBemiAudit,
  setBemiContext,
  setBemiContextFromRequest,
} from '@/lib/audit/bemi-context';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

// ============================================================================
// PATTERN 1: Automatic Context with HOC (Recommended)
// ============================================================================

/**
 * Create a new patient with automatic Bemi audit context
 *
 * Bemi automatically captures:
 * - userId, userEmail, userRole (from NextAuth session)
 * - endpoint, method, ipAddress, userAgent (from request)
 * - requestId (generated UUID)
 * - Complete before/after state of database changes
 *
 * Application audit log (audit.ts) captures:
 * - Access reason (LGPD/HIPAA compliance)
 * - User action justification
 */
export const POST = withBemiAudit(async (request: NextRequest | Request) => {
  try {
    const data = await request.json();

    // Validate input
    if (!data.firstName || !data.lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Create patient (Bemi context automatically set by withBemiAudit)
    const patient = await prisma.patient.create({
      data: {
        mrn: `MRN-${Date.now()}`, // Generate unique MRN
        tokenId: `PT-${Date.now()}`, // Generate unique token ID
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
      },
    });

    // Application-level audit log (for LGPD access reason tracking)
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'Patient',
        resourceId: patient.id,
        details: {
          patientName: `${patient.firstName} ${patient.lastName}`,
        },
        accessReason: 'TREATMENT', // LGPD compliance
        accessPurpose: 'Creating new patient record for initial consultation',
      },
      request instanceof Request ? undefined : request
    );

    return NextResponse.json({ success: true, patient }, { status: 201 });
  } catch (error) {
    console.error('Failed to create patient:', error);
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
});

/**
 * Update patient with automatic Bemi audit context
 */
export const PUT = withBemiAudit(async (request: NextRequest | Request) => {
  try {
    const { id, ...data } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Update patient (Bemi captures before/after state automatically)
    const patient = await prisma.patient.update({
      where: { id },
      data,
    });

    // Application-level audit log
    await createAuditLog(
      {
        action: 'UPDATE',
        resource: 'Patient',
        resourceId: patient.id,
        details: {
          updatedFields: Object.keys(data),
        },
        accessReason: 'TREATMENT',
        accessPurpose: 'Updating patient contact information',
      },
      request instanceof Request ? undefined : request
    );

    return NextResponse.json({ success: true, patient });
  } catch (error) {
    console.error('Failed to update patient:', error);
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
});

// ============================================================================
// PATTERN 2: Manual Context Setting
// ============================================================================

/**
 * Example without HOC - manually setting Bemi context
 *
 * Use this pattern when you need more control over context setting
 * or when using the HOC is not practical.
 */
export async function GET_MANUAL_CONTEXT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Manually set Bemi context
    setBemiContextFromRequest(request, session, {
      accessReason: 'TREATMENT',
      requestId: crypto.randomUUID(),
    });

    // Query patients (Bemi captures read operations with context)
    const patients = await prisma.patient.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    // Application-level audit log
    await createAuditLog(
      {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'LIST',
        details: {
          count: patients.length,
        },
        accessReason: 'TREATMENT',
        accessPurpose: 'Viewing patient list for daily rounds',
      },
      request instanceof Request ? undefined : request
    );

    return NextResponse.json({ success: true, patients });
  } catch (error) {
    console.error('Failed to fetch patients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATTERN 3: Custom Context with Additional Metadata
// ============================================================================

/**
 * Example with custom Bemi context metadata
 *
 * Use this pattern when you need to attach additional context
 * beyond the standard userId, endpoint, ipAddress.
 */
export async function DELETE_WITH_CUSTOM_CONTEXT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    // Set custom Bemi context with additional metadata
    setBemiContext({
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      userRole: (session?.user as any)?.role || null,
      endpoint: `/api/patients?id=${patientId}`,
      method: 'DELETE',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      requestId: crypto.randomUUID(),
      accessReason: 'LEGAL_COMPLIANCE', // Custom field
      // Add any additional context your audit trail needs
    });

    // Soft delete patient (Bemi captures the update)
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        deletedAt: new Date(),
        // deletedBy: session?.user?.id || 'UNKNOWN', // Field may not be in current schema
      },
    });

    // Application-level audit log
    await createAuditLog(
      {
        action: 'DELETE',
        resource: 'Patient',
        resourceId: patientId,
        details: {
          softDelete: true,
          deletedBy: session?.user?.id,
        },
        accessReason: 'LEGAL_COMPLIANCE',
        accessPurpose: 'Patient requested data deletion under LGPD Article 18',
      },
      request instanceof Request ? undefined : request
    );

    return NextResponse.json({ success: true, patient });
  } catch (error) {
    console.error('Failed to delete patient:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATTERN 4: Server Actions (App Router)
// ============================================================================

/**
 * Example server action with Bemi context
 *
 * For use in Server Components or form actions
 */
'use server';

export async function updatePatientServerAction(
  patientId: string,
  formData: FormData
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Set Bemi context for server action
  setBemiContext({
    userId: session.user.id,
    userEmail: session.user.email || null,
    userRole: (session.user as any).role || null,
    endpoint: `/patients/${patientId}/edit`,
    method: 'ACTION',
    accessReason: 'TREATMENT',
  });

  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    },
  });

  // Application-level audit log
  await createAuditLog({
    action: 'UPDATE',
    resource: 'Patient',
    resourceId: patientId,
    accessReason: 'TREATMENT',
    accessPurpose: 'Updating patient demographics from edit form',
  });

  return { success: true, patient };
}

// ============================================================================
// VERIFICATION: Querying Bemi Audit Trail
// ============================================================================

/**
 * Example of querying Bemi audit trail
 *
 * IMPORTANT: This requires access to Bemi tables (either via Bemi Cloud
 * or direct PostgreSQL access to _bemi_* tables)
 */
export async function GET_AUDIT_TRAIL_EXAMPLE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Query Bemi changes (if using direct PostgreSQL access)
    // Note: Replace with Bemi Cloud API in production
    const changes = await prisma.$queryRaw<
      Array<{
        id: string;
        timestamp: Date;
        operation: 'INSERT' | 'UPDATE' | 'DELETE';
        table_name: string;
        before_data: any;
        after_data: any;
        context: any;
      }>
    >`
      SELECT
        id,
        timestamp,
        operation,
        table_name,
        before_data,
        after_data,
        context
      FROM _bemi_changes
      WHERE table_name = 'Patient'
        AND (
          before_data->>'id' = ${patientId}
          OR after_data->>'id' = ${patientId}
        )
      ORDER BY timestamp DESC
      LIMIT 100;
    `;

    return NextResponse.json({ success: true, changes });
  } catch (error) {
    console.error('Failed to fetch audit trail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    );
  }
}

/**
 * Example: Health check for Bemi integration
 */
export async function GET_HEALTH_CHECK() {
  const { checkBemiHealth } = await import('@/lib/audit/bemi-context');

  const health = await checkBemiHealth();

  return NextResponse.json(health);
}

// ============================================================================
// INTEGRATION NOTES
// ============================================================================

/**
 * Dual Audit Logging Strategy:
 *
 * 1. Bemi Audit Trail (PostgreSQL WAL)
 *    - Captures ALL database changes automatically
 *    - Stores complete before/after state
 *    - Tamper-proof (cannot be deleted by application)
 *    - Requires PostgreSQL logical replication
 *
 * 2. Application Audit Logs (audit.ts + AuditLog table)
 *    - Captures user actions and access reasons
 *    - LGPD/HIPAA compliance (access purpose)
 *    - Real-time security alerts
 *    - Consent management audit trail
 *
 * Why Both?
 * - Bemi: SOC 2 evidence, complete change history
 * - Application logs: LGPD/HIPAA access justification
 *
 * Example Scenario:
 * A physician updates a patient's diagnosis.
 *
 * Bemi captures:
 * - Before: { diagnosis: 'Type 1 Diabetes' }
 * - After:  { diagnosis: 'Type 2 Diabetes' }
 * - Context: { userId: 'dr_123', endpoint: '/api/patients/123' }
 *
 * Application log captures:
 * - Action: UPDATE
 * - Resource: Patient
 * - AccessReason: TREATMENT
 * - AccessPurpose: 'Updating diagnosis based on latest HbA1c results'
 *
 * Together, these provide complete audit trail for SOC 2 and LGPD compliance.
 */
