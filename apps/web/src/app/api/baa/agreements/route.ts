/**
 * BAA/DPA Agreement Management API
 *
 * GET  /api/baa/agreements — list vendor agreements (paginated)
 * POST /api/baa/agreements — register a new vendor BAA/DPA
 *
 * Tracks Business Associate Agreements (HIPAA) and Data Processing
 * Agreements (LGPD Art. 39) with third-party vendors using the
 * DataSharingAgreement model.
 *
 * @compliance HIPAA §164.502(e), LGPD Art. 39
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const orgId = context.user?.organizationId;

    const where: Record<string, unknown> = {};

    // CYRUS CVI-002: Scope to user's organization
    if (orgId) {
      where.OR = [
        { requestingOrgId: orgId },
        { receivingOrgId: orgId },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [agreements, total] = await Promise.all([
      prisma.dataSharingAgreement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.dataSharingAgreement.count({ where }),
    ]);

    return NextResponse.json({
      agreements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + agreements.length < total,
      },
    });
  },
  { roles: ['ADMIN', 'LICENSE_OWNER'], skipCsrf: true }
);

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const {
      title,
      description,
      receivingOrgId,
      scopes,
      legalBasis,
      lgpdArticle,
      effectiveFrom,
      effectiveUntil,
      autoRenew,
    } = body;

    if (!title || !receivingOrgId || !legalBasis || !effectiveFrom) {
      return NextResponse.json(
        { error: 'title, receivingOrgId, legalBasis, and effectiveFrom are required' },
        { status: 400 }
      );
    }

    // Validate scopes against enum
    const validScopes = [
      'DEMOGRAPHICS', 'DIAGNOSES', 'MEDICATIONS', 'LAB_RESULTS',
      'IMAGING', 'CARE_PLANS', 'ENCOUNTERS', 'VITAL_SIGNS',
      'ALLERGIES', 'PRESCRIPTIONS',
    ];
    const requestedScopes = Array.isArray(scopes) ? scopes : [];
    const invalidScopes = requestedScopes.filter((s: string) => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(', ')}. Valid: ${validScopes.join(', ')}` },
        { status: 400 }
      );
    }

    const orgId = context.user?.organizationId;

    const agreement = await prisma.dataSharingAgreement.create({
      data: {
        title,
        description: description || null,
        requestingOrgId: orgId || 'self',
        receivingOrgId,
        scopes: requestedScopes,
        legalBasis,
        lgpdArticle: lgpdArticle || null,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        autoRenew: autoRenew ?? false,
        requestedBy: context.user!.id,
        status: 'DRAFT',
      },
    });

    await createAuditLog({
      action: 'CREATE',
      resource: 'DataSharingAgreement',
      resourceId: agreement.id,
      details: {
        title,
        receivingOrgId,
        legalBasis,
        scopes: requestedScopes,
      },
      success: true,
    });

    logger.info({
      event: 'baa_agreement_created',
      agreementId: agreement.id,
      title,
      receivingOrgId,
    });

    return NextResponse.json({ agreement }, { status: 201 });
  },
  { roles: ['ADMIN', 'LICENSE_OWNER'] }
);
