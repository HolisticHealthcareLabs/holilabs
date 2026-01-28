/**
 * Governance Rules API - Database-backed rule management
 * 
 * GET /api/governance/rules - List all rules
 * POST /api/governance/rules - Create new rule
 * 
 * Enables runtime rule updates without code deployment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import jsonLogic from 'json-logic-js';
import { FAST_LANE_RULES } from '@/lib/governance/governance.rules';

export const dynamic = 'force-dynamic';

// Validation schema for new rules
const CreateRuleSchema = z.object({
    ruleId: z.string().min(1).max(50),
    name: z.string().min(3).max(200),
    severity: z.enum(['HARD_BLOCK', 'SOFT_NUDGE', 'INFO']),
    logic: z.object({}).passthrough(), // JSON-Logic object
    intervention: z.object({
        message: z.string().min(10),
        recommendation: z.string().min(10),
    }),
    source: z.object({
        authority: z.string(),
        year: z.number().min(1990).max(2030),
        url: z.string().url().optional(),
    }).optional(),
    clinicId: z.string().optional(), // For clinic-specific rules
    isActive: z.boolean().default(true),
    priority: z.number().min(1).max(1000).default(100),
});

/**
 * GET /api/governance/rules
 * List all governance rules (static + database)
 */
export const GET = createProtectedRoute(
    async (request: NextRequest) => {
        try {
            const { searchParams } = new URL(request.url);
            const severity = searchParams.get('severity');
            const activeOnly = searchParams.get('active') !== 'false';
            const includeStatic = searchParams.get('includeStatic') !== 'false';

            // Get database rules
            const where: any = {};
            if (severity) where.severity = severity;
            if (activeOnly) where.isActive = true;

            const dbRules = await (prisma as any).governanceRule?.findMany?.({
                where,
                orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
            }) || [];

            // Combine with static rules
            let allRules = dbRules.map((r: any) => ({
                ...r,
                source: 'database',
            }));

            if (includeStatic) {
                const staticRules = FAST_LANE_RULES
                    .filter(r => !severity || r.severity === severity)
                    .map(r => ({
                        ruleId: r.ruleId,
                        name: r.name,
                        severity: r.severity,
                        logic: r.logic,
                        intervention: r.intervention,
                        source: 'static',
                        isActive: true,
                        priority: 50, // Static rules have mid-priority by default
                    }));

                allRules = [...allRules, ...staticRules];
            }

            // Sort by priority
            allRules.sort((a: any, b: any) => a.priority - b.priority);

            return NextResponse.json({
                success: true,
                data: {
                    rules: allRules,
                    meta: {
                        totalRules: allRules.length,
                        dbRules: dbRules.length,
                        staticRules: allRules.filter((r: any) => r.source === 'static').length,
                        bySeverity: {
                            HARD_BLOCK: allRules.filter((r: any) => r.severity === 'HARD_BLOCK').length,
                            SOFT_NUDGE: allRules.filter((r: any) => r.severity === 'SOFT_NUDGE').length,
                            INFO: allRules.filter((r: any) => r.severity === 'INFO').length,
                        },
                    },
                },
            });
        } catch (error: any) {
            logger.error({
                event: 'governance_rules_list_failed',
                error: error.message,
            });
            return NextResponse.json(
                { success: false, error: 'Failed to list governance rules' },
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
 * POST /api/governance/rules
 * Create a new governance rule (stored in database)
 */
export const POST = createProtectedRoute(
    async (request: NextRequest, context: any) => {
        try {
            const body = await request.json();
            const validated = CreateRuleSchema.parse(body);

            // Validate JSON-Logic syntax by attempting to apply it
            try {
                jsonLogic.apply(validated.logic as any, {
                    patient_conditions: ['Test'],
                    proposed_medication_class: 'Test',
                    current_medications: [],
                });
            } catch (logicError) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Invalid JSON-Logic syntax',
                        details: logicError instanceof Error ? logicError.message : 'Unknown error',
                    },
                    { status: 400 }
                );
            }

            // Check for duplicate ruleId
            const existing = await (prisma as any).governanceRule?.findUnique?.({
                where: { ruleId: validated.ruleId },
            });

            if (existing) {
                return NextResponse.json(
                    { success: false, error: `Rule with ID '${validated.ruleId}' already exists` },
                    { status: 409 }
                );
            }

            // Create rule in database
            const rule = await (prisma as any).governanceRule?.create?.({
                data: {
                    ruleId: validated.ruleId,
                    name: validated.name,
                    severity: validated.severity,
                    logic: validated.logic,
                    intervention: validated.intervention,
                    source: validated.source || { authority: 'Custom', year: new Date().getFullYear() },
                    isActive: validated.isActive,
                    priority: validated.priority,
                    clinicId: validated.clinicId,
                    createdBy: context.user.id,
                },
            });

            logger.info({
                event: 'governance_rule_created',
                ruleId: validated.ruleId,
                severity: validated.severity,
                createdBy: context.user.id,
            });

            return NextResponse.json({
                success: true,
                message: 'Governance rule created successfully',
                data: rule,
            }, { status: 201 });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Validation failed',
                        details: error.errors,
                    },
                    { status: 400 }
                );
            }

            logger.error({
                event: 'governance_rule_create_failed',
                error: error.message,
            });
            return NextResponse.json(
                { success: false, error: 'Failed to create governance rule' },
                { status: 500 }
            );
        }
    },
    {
        roles: ['ADMIN'],
        audit: { action: 'CREATE', resource: 'GovernanceRule' },
    }
);
