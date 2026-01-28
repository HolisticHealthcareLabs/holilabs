/**
 * Single Governance Rule API
 * 
 * GET /api/governance/rules/[ruleId] - Get rule details
 * PUT /api/governance/rules/[ruleId] - Update rule
 * DELETE /api/governance/rules/[ruleId] - Delete rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import jsonLogic from 'json-logic-js';
import { FAST_LANE_RULES } from '@/lib/governance/governance.rules';

export const dynamic = 'force-dynamic';

const UpdateRuleSchema = z.object({
    name: z.string().min(3).max(200).optional(),
    severity: z.enum(['HARD_BLOCK', 'SOFT_NUDGE', 'INFO']).optional(),
    logic: z.object({}).passthrough().optional(),
    intervention: z.object({
        message: z.string().min(10),
        recommendation: z.string().min(10),
    }).optional(),
    isActive: z.boolean().optional(),
    priority: z.number().min(1).max(1000).optional(),
});

/**
 * GET /api/governance/rules/[ruleId]
 */
export const GET = createProtectedRoute(
    async (request: NextRequest, context: any) => {
        try {
            const { ruleId } = context.params;

            // Check static rules first
            const staticRule = FAST_LANE_RULES.find(r => r.ruleId === ruleId);
            if (staticRule) {
                return NextResponse.json({
                    success: true,
                    data: {
                        ...staticRule,
                        source: 'static',
                        isActive: true,
                        editable: false,
                    },
                });
            }

            // Check database
            const dbRule = await (prisma as any).governanceRule?.findUnique?.({
                where: { ruleId },
            });

            if (!dbRule) {
                return NextResponse.json(
                    { success: false, error: 'Rule not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: {
                    ...dbRule,
                    source: 'database',
                    editable: true,
                },
            });
        } catch (error: any) {
            return NextResponse.json(
                { success: false, error: 'Failed to get governance rule' },
                { status: 500 }
            );
        }
    },
    {
        roles: ['ADMIN', 'CLINICIAN'],
        audit: { action: 'READ', resource: 'GovernanceRule' },
    }
);

/**
 * PUT /api/governance/rules/[ruleId]
 */
export const PUT = createProtectedRoute(
    async (request: NextRequest, context: any) => {
        try {
            const { ruleId } = context.params;
            const body = await request.json();
            const validated = UpdateRuleSchema.parse(body);

            // Check if static rule (not editable)
            const isStatic = FAST_LANE_RULES.some(r => r.ruleId === ruleId);
            if (isStatic) {
                return NextResponse.json(
                    { success: false, error: 'Static rules cannot be modified. Create a database rule to override.' },
                    { status: 403 }
                );
            }

            // Validate JSON-Logic if provided
            if (validated.logic) {
                try {
                    jsonLogic.apply(validated.logic as any, { test: true });
                } catch {
                    return NextResponse.json(
                        { success: false, error: 'Invalid JSON-Logic syntax' },
                        { status: 400 }
                    );
                }
            }

            const updated = await (prisma as any).governanceRule?.update?.({
                where: { ruleId },
                data: {
                    ...validated,
                    updatedBy: context.user.id,
                },
            });

            if (!updated) {
                return NextResponse.json(
                    { success: false, error: 'Rule not found' },
                    { status: 404 }
                );
            }

            logger.info({
                event: 'governance_rule_updated',
                ruleId,
                changes: Object.keys(validated),
                updatedBy: context.user.id,
            });

            return NextResponse.json({
                success: true,
                message: 'Rule updated successfully',
                data: updated,
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    { success: false, error: 'Validation failed', details: error.errors },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { success: false, error: 'Failed to update rule' },
                { status: 500 }
            );
        }
    },
    {
        roles: ['ADMIN'],
        audit: { action: 'UPDATE', resource: 'GovernanceRule' },
    }
);

/**
 * DELETE /api/governance/rules/[ruleId]
 */
export const DELETE = createProtectedRoute(
    async (request: NextRequest, context: any) => {
        try {
            const { ruleId } = context.params;
            const { searchParams } = new URL(request.url);
            const hard = searchParams.get('hard') === 'true';

            // Check if static rule
            const isStatic = FAST_LANE_RULES.some(r => r.ruleId === ruleId);
            if (isStatic) {
                return NextResponse.json(
                    { success: false, error: 'Static rules cannot be deleted' },
                    { status: 403 }
                );
            }

            if (hard) {
                // Hard delete
                await (prisma as any).governanceRule?.delete?.({
                    where: { ruleId },
                });
            } else {
                // Soft delete - just deactivate
                await (prisma as any).governanceRule?.update?.({
                    where: { ruleId },
                    data: { isActive: false },
                });
            }

            logger.info({
                event: 'governance_rule_deleted',
                ruleId,
                hardDelete: hard,
                deletedBy: context.user.id,
            });

            return NextResponse.json({
                success: true,
                message: hard ? 'Rule permanently deleted' : 'Rule deactivated',
            });
        } catch (error: any) {
            return NextResponse.json(
                { success: false, error: 'Failed to delete rule' },
                { status: 500 }
            );
        }
    },
    {
        roles: ['ADMIN'],
        audit: { action: 'DELETE', resource: 'GovernanceRule' },
    }
);
