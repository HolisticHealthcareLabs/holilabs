/**
 * Granular Data Access Grant API
 * Allows patients to grant access to specific resource types (LABS, IMAGING, etc.)
 *
 * POST /api/data-access/granular - Create granular access grant
 * GET  /api/data-access/granular?patientId={id} - List granular grants
 * DELETE /api/data-access/granular?grantId={id} - Revoke specific grant
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

// Define available resource types
const RESOURCE_TYPES = {
  LAB_RESULT: {
    id: 'LAB_RESULT',
    name: 'Laboratory Results',
    description: 'Blood tests, urinalysis, and other lab work',
    icon: '🧪',
  },
  IMAGING_STUDY: {
    id: 'IMAGING_STUDY',
    name: 'Imaging Studies',
    description: 'X-rays, CT scans, MRIs, ultrasounds',
    icon: '🩻',
  },
  CLINICAL_NOTE: {
    id: 'CLINICAL_NOTE',
    name: 'Clinical Notes',
    description: 'Doctor notes, consultation records',
    icon: '📋',
  },
  MEDICATIONS: {
    id: 'MEDICATIONS',
    name: 'Medications',
    description: 'Prescription history and current medications',
    icon: '💊',
  },
  VITAL_SIGNS: {
    id: 'VITAL_SIGNS',
    name: 'Vital Signs',
    description: 'Blood pressure, heart rate, temperature',
    icon: '❤️',
  },
  ALL: {
    id: 'ALL',
    name: 'All Medical Records',
    description: 'Complete access to all medical data',
    icon: '📚',
  },
};

/**
 * POST - Create granular access grant
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: { user?: { id: string } }) => {
    try {
      const body = await request.json();
      const {
        patientId,
        grantedToId,
        grantedToType, // USER, PATIENT, EXTERNAL
        grantedToEmail,
        grantedToName,
        resourceTypes, // Array of resource type IDs
        canView,
        canDownload,
        canShare,
        purpose,
        expiresAt,
      } = body;

      // Validation
      if (!patientId || !resourceTypes || resourceTypes.length === 0) {
        return NextResponse.json(
          { error: 'patientId and resourceTypes are required' },
          { status: 400 }
        );
      }

      if (!grantedToId && !grantedToEmail) {
        return NextResponse.json(
          { error: 'Either grantedToId or grantedToEmail must be provided' },
          { status: 400 }
        );
      }

      // Verify patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      // Create access grant for each resource type
      const grants = await Promise.all(
        resourceTypes.map(async (resourceType: string) => {
          // Check if RESOURCE_TYPES includes this type
          if (!RESOURCE_TYPES[resourceType as keyof typeof RESOURCE_TYPES]) {
            throw new Error(`Invalid resource type: ${resourceType}`);
          }

          return prisma.dataAccessGrant.create({
            data: {
              patientId,
              grantedToType: grantedToType || 'USER',
              grantedToId,
              grantedToEmail,
              grantedToName,
              resourceType,
              resourceId: null, // Null means all resources of this type
              canView: canView !== undefined ? canView : true,
              canDownload: canDownload !== undefined ? canDownload : false,
              canShare: canShare !== undefined ? canShare : false,
              purpose: purpose || `Access to ${resourceType}`,
              grantedAt: new Date(),
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
          });
        })
      );

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user?.id!,
          userEmail: 'clinician',
          action: 'CREATE_GRANULAR_ACCESS_GRANT',
          resource: 'DataAccessGrant',
          resourceId: grants[0].id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          details: {
            grantedTo: grantedToId || grantedToEmail,
            grantedToType: grantedToType || 'USER',
            resourceTypes,
            permissions: { canView, canDownload, canShare },
            grantCount: grants.length,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        grants: grants.map((g) => ({
          id: g.id,
          resourceType: g.resourceType,
          grantedAt: g.grantedAt,
          expiresAt: g.expiresAt,
        })),
      });
    } catch (error) {
      logger.error('Error creating granular access grant:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to create access grant' },
        { status: 500 }
      );
    }
  },
  { roles: [...ROLES], audit: { action: 'CREATE', resource: 'GranularDataAccess' } }
);

/**
 * GET - List granular access grants
 */
export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');

      if (!patientId) {
        return NextResponse.json({ error: 'patientId required' }, { status: 400 });
      }

      const grants = await prisma.dataAccessGrant.findMany({
        where: {
          patientId,
          resourceType: { not: 'ALL' }, // Only granular grants
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { grantedAt: 'desc' },
        select: {
          id: true,
          grantedToType: true,
          grantedToId: true,
          grantedToEmail: true,
          grantedToName: true,
          resourceType: true,
          canView: true,
          canDownload: true,
          canShare: true,
          purpose: true,
          grantedAt: true,
          expiresAt: true,
        },
      });

      // Group by grantee
      const groupedGrants = grants.reduce(
        (acc, grant) => {
          const key = grant.grantedToId || grant.grantedToEmail || 'unknown';
          if (!acc[key]) {
            acc[key] = {
              grantee: {
                id: grant.grantedToId,
                email: grant.grantedToEmail,
                name: grant.grantedToName,
                type: grant.grantedToType,
              },
              grants: [],
            };
          }
          acc[key].grants.push({
            id: grant.id,
            resourceType: grant.resourceType,
            resourceInfo: RESOURCE_TYPES[grant.resourceType as keyof typeof RESOURCE_TYPES],
            permissions: {
              canView: grant.canView,
              canDownload: grant.canDownload,
              canShare: grant.canShare,
            },
            purpose: grant.purpose,
            grantedAt: grant.grantedAt,
            expiresAt: grant.expiresAt,
          });
          return acc;
        },
        {} as Record<string, any>
      );

      return NextResponse.json({
        success: true,
        grants: Object.values(groupedGrants),
      });
    } catch (error) {
      logger.error('Error fetching granular access grants:', error);
      return NextResponse.json(
        { error: 'Failed to fetch access grants' },
        { status: 500 }
      );
    }
  },
  { roles: [...ROLES], audit: { action: 'READ', resource: 'GranularDataAccess' } }
);

/**
 * DELETE - Revoke specific grant
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: { user?: { id: string } }) => {
    try {
      const { searchParams } = new URL(request.url);
      const grantId = searchParams.get('grantId');

      if (!grantId) {
        return NextResponse.json({ error: 'grantId required' }, { status: 400 });
      }

      const grant = await prisma.dataAccessGrant.findUnique({
        where: { id: grantId },
        select: { id: true, patientId: true, resourceType: true },
      });

      if (!grant) {
        return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
      }

      // Mark as revoked
      await prisma.dataAccessGrant.update({
        where: { id: grantId },
        data: {
          revokedAt: new Date(),
          revokedReason: 'Revoked by clinician via granular access management',
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user?.id!,
          userEmail: 'clinician',
          action: 'REVOKE_GRANULAR_ACCESS_GRANT',
          resource: 'DataAccessGrant',
          resourceId: grantId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          details: {
            resourceType: grant.resourceType,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Access grant revoked',
      });
    } catch (error) {
      logger.error('Error revoking granular access grant:', error);
      return NextResponse.json(
        { error: 'Failed to revoke access grant' },
        { status: 500 }
      );
    }
  },
  { roles: [...ROLES], audit: { action: 'REVOKE', resource: 'GranularDataAccess' } }
);
