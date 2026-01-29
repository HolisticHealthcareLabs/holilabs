/**
 * MCP Lab Order Tools
 *
 * REFACTORED: Decomposed into pure primitives per agent-native architecture audit.
 * Business logic (abnormal detection, hasAbnormal flags) removed from primitives.
 *
 * Primitives:
 * - get_lab_panel_definitions: Returns raw panel definitions
 * - get_lab_results_raw: Returns results without abnormal filtering
 * - create_lab_order: Pure create operation
 *
 * Tools for AI agents to manage lab orders:
 * - Order labs
 * - Get lab results
 * - Track pending orders
 * - Flag abnormal results
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    CreateLabResultSchema,
    UpdateLabResultSchema,
    type CreateLabResultInput,
    type UpdateLabResultInput,
} from '../schemas/tool-schemas';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// LAB PANELS (Common lab order bundles)
// =============================================================================

const LAB_PANELS = {
    CMP: {
        name: 'Comprehensive Metabolic Panel',
        tests: ['Glucose', 'BUN', 'Creatinine', 'Sodium', 'Potassium', 'Chloride', 'CO2', 'Calcium', 'Protein', 'Albumin', 'Bilirubin', 'ALT', 'AST', 'ALP'],
        turnaroundHours: 4,
    },
    BMP: {
        name: 'Basic Metabolic Panel',
        tests: ['Glucose', 'BUN', 'Creatinine', 'Sodium', 'Potassium', 'Chloride', 'CO2', 'Calcium'],
        turnaroundHours: 4,
    },
    CBC: {
        name: 'Complete Blood Count',
        tests: ['WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'Platelets', 'MCV', 'MCH', 'MCHC', 'RDW'],
        turnaroundHours: 2,
    },
    LIPID: {
        name: 'Lipid Panel',
        tests: ['Total Cholesterol', 'LDL', 'HDL', 'Triglycerides', 'VLDL'],
        turnaroundHours: 4,
    },
    A1C: {
        name: 'Hemoglobin A1c',
        tests: ['HbA1c'],
        turnaroundHours: 4,
    },
    TSH: {
        name: 'Thyroid Stimulating Hormone',
        tests: ['TSH'],
        turnaroundHours: 6,
    },
    UA: {
        name: 'Urinalysis',
        tests: ['pH', 'Specific Gravity', 'Protein', 'Glucose', 'Ketones', 'Blood', 'Leukocyte Esterase', 'Nitrites'],
        turnaroundHours: 2,
    },
};

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

const GetLabPanelDefinitionsSchema = z.object({
    panelCode: z.string().optional().describe('Specific panel code to get (e.g., "CMP", "CBC")'),
});

const GetLabResultsRawSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    orderId: z.string().optional().describe('Specific order ID'),
    startDate: z.string().optional().describe('Results from date (ISO 8601)'),
    limit: z.number().default(20),
});

const CreateLabOrderSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    panelCode: z.string().describe('Lab panel code (CMP, BMP, CBC, etc.)'),
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
    fasting: z.boolean().default(false),
    indication: z.string().optional(),
    notes: z.string().optional(),
});

// =============================================================================
// PRIMITIVE HANDLERS
// =============================================================================

// PRIMITIVE: get_lab_panel_definitions
// Returns raw panel definitions - no recommendations
async function getLabPanelDefinitionsHandler(input: any, context: MCPContext): Promise<MCPResult> {
    const { panelCode } = input;

    let panels: any;
    if (panelCode) {
        const panel = LAB_PANELS[panelCode as keyof typeof LAB_PANELS];
        if (!panel) {
            return { success: false, error: `Unknown panel: ${panelCode}`, data: null };
        }
        panels = { [panelCode]: panel };
    } else {
        panels = LAB_PANELS;
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_lab_panel_definitions',
        panelCode,
    });

    return {
        success: true,
        data: {
            panels: Object.entries(panels).map(([code, panel]: [string, any]) => ({
                code,
                name: panel.name,
                tests: panel.tests,
                turnaroundHours: panel.turnaroundHours,
            })),
        },
    };
}

// PRIMITIVE: get_lab_results_raw
// Returns all results without abnormal filtering or flags
async function getLabResultsRawHandler(input: any, context: MCPContext): Promise<MCPResult> {
    const { patientId, orderId, startDate, limit } = input;

    try {
        // Verify patient access
        const patient = await prisma.patient.findFirst({
            where: { id: patientId, assignedClinicianId: context.clinicianId },
            select: { id: true },
        });

        if (!patient) {
            return { success: false, error: 'Patient not found or access denied', data: null };
        }

        // Build query filters
        const whereClause: any = { patientId };

        if (startDate) {
            whereClause.resultDate = { gte: new Date(startDate) };
        }

        // Query lab results from database
        const labResults: any[] = await prisma.labResult.findMany({
            where: whereClause,
            orderBy: { resultDate: 'desc' },
            take: limit,
        });

        // Transform results to expected format
        const results = labResults.map((result) => ({
            id: result.id,
            testName: result.testName,
            testCode: result.testCode,
            category: result.category,
            value: result.value,
            unit: result.unit,
            referenceRange: result.referenceRange,
            status: result.status,
            interpretation: result.interpretation,
            isAbnormal: result.isAbnormal,
            isCritical: result.isCritical,
            collectedDate: result.collectedDate?.toISOString(),
            resultDate: result.resultDate.toISOString(),
            orderingDoctor: result.orderingDoctor,
            performingLab: result.performingLab,
            notes: result.notes,
        }));

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_lab_results_raw',
            patientId,
            resultCount: results.length,
            agentId: context.agentId,
        });

        // Return raw data - no abnormal flags, no hasAbnormal
        return {
            success: true,
            data: {
                patientId,
                results,
                totalCount: results.length,
            },
        };
    } catch (error: any) {
        logger.error({
            event: 'mcp_tool_error',
            tool: 'get_lab_results_raw',
            error: error.message,
            agentId: context.agentId,
        });
        return { success: false, error: error.message, data: null };
    }
}

// PRIMITIVE: create_lab_order
// Pure create operation - creates LabResult records with PRELIMINARY status to track the order
async function createLabOrderHandler(input: any, context: MCPContext): Promise<MCPResult> {
    const { patientId, panelCode, priority, fasting, indication, notes } = input;

    const panel = LAB_PANELS[panelCode as keyof typeof LAB_PANELS];
    if (!panel) {
        return { success: false, error: `Unknown panel: ${panelCode}`, data: null };
    }

    try {
        // Verify patient access
        const patient = await prisma.patient.findFirst({
            where: { id: patientId, assignedClinicianId: context.clinicianId },
            select: { id: true },
        });

        if (!patient) {
            return { success: false, error: 'Patient not found or access denied', data: null };
        }

        const orderId = `LAB-${Date.now().toString(36).toUpperCase()}`;
        const orderedAt = new Date();

        // Create a LabResult record for each test in the panel with PRELIMINARY status
        // This tracks the order in the database
        const createdResults: any[] = [];
        for (const testName of panel.tests) {
            const labResult = await prisma.labResult.create({
                data: {
                    patientId,
                    testName,
                    testCode: `${panelCode}-${testName.toUpperCase().replace(/\s+/g, '_')}`,
                    category: panelCode,
                    status: 'PRELIMINARY',
                    orderedDate: orderedAt,
                    resultDate: orderedAt, // Will be updated when results come in
                    notes: [
                        `Order ID: ${orderId}`,
                        `Priority: ${priority}`,
                        fasting ? 'Fasting required' : null,
                        indication ? `Indication: ${indication}` : null,
                        notes || null,
                    ].filter(Boolean).join('\n'),
                },
            });
            createdResults.push(labResult);
        }

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'create_lab_order',
            orderId,
            patientId,
            panelCode,
            priority,
            testsCreated: createdResults.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                orderId,
                patientId,
                panelCode,
                panelName: panel.name,
                tests: panel.tests,
                labResultIds: createdResults.map((r) => r.id),
                priority,
                fasting,
                indication,
                notes,
                status: 'ORDERED',
                orderedAt: orderedAt.toISOString(),
                estimatedTurnaroundHours: panel.turnaroundHours,
            },
        };
    } catch (error: any) {
        logger.error({
            event: 'mcp_tool_error',
            tool: 'create_lab_order',
            error: error.message,
            agentId: context.agentId,
        });
        return { success: false, error: error.message, data: null };
    }
}

// =============================================================================
// PRIMITIVE: create_lab_result
// Create a lab result record for a patient
// =============================================================================

async function createLabResultHandler(
    input: CreateLabResultInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify patient access
        const patient = await prisma.patient.findFirst({
            where: { id: input.patientId, assignedClinicianId: context.clinicianId },
            select: { id: true },
        });

        if (!patient) {
            return { success: false, error: 'Patient not found or access denied', data: null };
        }

        // Create lab result in database
        const labResult: any = await prisma.labResult.create({
            data: {
                patientId: input.patientId,
                testName: input.testName,
                testCode: input.testCode,
                category: input.category,
                value: input.value,
                unit: input.unit,
                referenceRange: input.referenceRange,
                status: input.status,
                interpretation: input.interpretation,
                isAbnormal: input.isAbnormal,
                isCritical: input.isCritical,
                collectedDate: input.collectedDate ? new Date(input.collectedDate) : undefined,
                resultDate: new Date(),
                orderingDoctor: input.orderingDoctor,
                performingLab: input.performingLab,
                notes: input.notes,
            },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'create_lab_result',
            labResultId: labResult.id,
            patientId: input.patientId,
            testName: input.testName,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                labResultId: labResult.id,
                patientId: labResult.patientId,
                testName: labResult.testName,
                testCode: labResult.testCode,
                category: labResult.category,
                value: labResult.value,
                unit: labResult.unit,
                referenceRange: labResult.referenceRange,
                status: labResult.status,
                interpretation: labResult.interpretation,
                isAbnormal: labResult.isAbnormal,
                isCritical: labResult.isCritical,
                collectedDate: labResult.collectedDate?.toISOString(),
                resultDate: labResult.resultDate.toISOString(),
                createdAt: labResult.createdAt.toISOString(),
            },
        };
    } catch (error: any) {
        logger.error({
            event: 'mcp_tool_error',
            tool: 'create_lab_result',
            error: error.message,
            agentId: context.agentId,
        });
        return { success: false, error: error.message, data: null };
    }
}

// =============================================================================
// PRIMITIVE: update_lab_result
// Update an existing lab result record
// =============================================================================

async function updateLabResultHandler(
    input: UpdateLabResultInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Find lab result and verify access
        const existingResult: any = await prisma.labResult.findFirst({
            where: { id: input.labResultId },
            include: { patient: { select: { id: true, assignedClinicianId: true } } },
        });

        if (!existingResult) {
            return { success: false, error: 'Lab result not found', data: null };
        }

        if (existingResult.patient?.assignedClinicianId !== context.clinicianId) {
            return { success: false, error: 'Access denied', data: null };
        }

        // Build update data with only provided fields
        const updateData: Record<string, any> = {};
        if (input.value !== undefined) updateData.value = input.value;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.interpretation !== undefined) updateData.interpretation = input.interpretation;
        if (input.isAbnormal !== undefined) updateData.isAbnormal = input.isAbnormal;
        if (input.isCritical !== undefined) updateData.isCritical = input.isCritical;
        if (input.referenceRange !== undefined) updateData.referenceRange = input.referenceRange;
        if (input.notes !== undefined) updateData.notes = input.notes;

        // Check if any updates were provided
        if (Object.keys(updateData).length === 0) {
            return {
                success: false,
                error: 'No update fields provided',
                data: null,
            };
        }

        const labResult: any = await prisma.labResult.update({
            where: { id: input.labResultId },
            data: updateData,
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'update_lab_result',
            labResultId: input.labResultId,
            testName: existingResult.testName,
            updatedFields: Object.keys(updateData),
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                labResultId: labResult.id,
                patientId: labResult.patientId,
                testName: labResult.testName,
                testCode: labResult.testCode,
                value: labResult.value,
                unit: labResult.unit,
                referenceRange: labResult.referenceRange,
                status: labResult.status,
                interpretation: labResult.interpretation,
                isAbnormal: labResult.isAbnormal,
                isCritical: labResult.isCritical,
                updatedAt: labResult.updatedAt.toISOString(),
            },
        };
    } catch (error: any) {
        logger.error({
            event: 'mcp_tool_error',
            tool: 'update_lab_result',
            error: error.message,
            agentId: context.agentId,
        });
        return { success: false, error: error.message, data: null };
    }
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const labOrderTools: MCPTool[] = [
    // ==========================================================================
    // PRIMITIVE TOOLS (Agent-native architecture)
    // ==========================================================================
    {
        name: 'get_lab_panel_definitions',
        description: 'Get raw lab panel definitions including tests and turnaround times. Agent uses this to understand available panels.',
        category: 'lab',
        inputSchema: GetLabPanelDefinitionsSchema,
        requiredPermissions: ['patient:read'],
        handler: getLabPanelDefinitionsHandler,
    },
    {
        name: 'get_lab_results_raw',
        description: 'Get lab results without abnormal filtering or flags. Returns raw values with reference ranges - agent interprets.',
        category: 'lab',
        inputSchema: GetLabResultsRawSchema,
        requiredPermissions: ['patient:read'],
        handler: getLabResultsRawHandler,
    },
    {
        name: 'create_lab_order',
        description: 'Create a lab order. Returns raw order data without expected result time calculations.',
        category: 'lab',
        inputSchema: CreateLabOrderSchema,
        requiredPermissions: ['patient:read', 'medication:write'],
        handler: createLabOrderHandler,
    },
    {
        name: 'create_lab_result',
        description: 'Create a lab result record for a patient. Pure create operation with database persistence.',
        category: 'lab',
        inputSchema: CreateLabResultSchema,
        requiredPermissions: ['patient:read', 'medication:write'],
        handler: createLabResultHandler,
    },
    {
        name: 'update_lab_result',
        description: 'Update an existing lab result record. Can update value, status, interpretation, abnormal/critical flags, reference range, and notes.',
        category: 'lab',
        inputSchema: UpdateLabResultSchema,
        requiredPermissions: ['medication:write'],
        handler: updateLabResultHandler,
    },
    // ==========================================================================
    // LEGACY TOOLS (Deprecated - use primitives)
    // ==========================================================================
    {
        name: 'order_lab_panel',
        description: '[DEPRECATED: Use create_lab_order] Order lab with calculated expectedResultTime.',
        category: 'lab',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            panel: z.enum(['CMP', 'BMP', 'CBC', 'LIPID', 'A1C', 'TSH', 'UA']).describe('Lab panel type'),
            priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
            fasting: z.boolean().default(false).describe('Fasting required'),
            indication: z.string().optional().describe('Clinical indication for the order'),
            notes: z.string().optional().describe('Additional instructions'),
        }),
        requiredPermissions: ['patient:read', 'medication:write'],
        deprecated: true,
        alternatives: ['create_lab_order', 'get_lab_panel_definitions'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            logger.warn({
                event: 'deprecated_tool_called',
                tool: 'order_lab_panel',
                message: 'Use create_lab_order primitive instead',
            });

            const panel = LAB_PANELS[input.panel as keyof typeof LAB_PANELS];

            if (!panel) {
                return { success: false, error: 'Invalid lab panel', data: null };
            }

            const orderId = `LAB-${Date.now().toString(36).toUpperCase()}`;
            const expectedResultTime = new Date(
                Date.now() + panel.turnaroundHours * 60 * 60 * 1000
            );

            logger.info({
                event: 'lab_ordered_by_agent',
                orderId,
                patientId: input.patientId,
                panel: input.panel,
                priority: input.priority,
                agentId: context.agentId,
            });

            return {
                success: true,
                data: {
                    orderId,
                    panel: input.panel,
                    panelName: panel.name,
                    tests: panel.tests,
                    priority: input.priority,
                    fasting: input.fasting,
                    status: 'ORDERED',
                    orderedAt: new Date().toISOString(),
                    expectedResultTime: expectedResultTime.toISOString(),
                    indication: input.indication,
                },
            };
        },
    },

    {
        name: 'get_lab_results',
        description: '[DEPRECATED: Use get_lab_results_raw] Get results with abnormal filtering and hasAbnormal flag.',
        category: 'lab',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            orderId: z.string().optional().describe('Specific order ID'),
            panel: z.string().optional().describe('Filter by panel type'),
            startDate: z.string().optional().describe('Results from date (ISO 8601)'),
            includeAbnormal: z.boolean().default(false).describe('Only return abnormal results'),
            limit: z.number().default(10),
        }),
        requiredPermissions: ['patient:read'],
        deprecated: true,
        alternatives: ['get_lab_results_raw'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            logger.warn({
                event: 'deprecated_tool_called',
                tool: 'get_lab_results',
                message: 'Use get_lab_results_raw primitive instead',
            });

            // Mock lab results for demo
            const results = [
                {
                    orderId: 'LAB-DEMO1',
                    panel: 'CMP',
                    collectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'COMPLETED',
                    results: [
                        { test: 'Glucose', value: 126, unit: 'mg/dL', range: '70-100', abnormal: true, flag: 'HIGH' },
                        { test: 'Creatinine', value: 1.1, unit: 'mg/dL', range: '0.7-1.3', abnormal: false },
                        { test: 'Potassium', value: 4.0, unit: 'mEq/L', range: '3.5-5.0', abnormal: false },
                        { test: 'ALT', value: 45, unit: 'U/L', range: '7-56', abnormal: false },
                    ],
                },
                {
                    orderId: 'LAB-DEMO2',
                    panel: 'A1C',
                    collectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'COMPLETED',
                    results: [
                        { test: 'HbA1c', value: 7.2, unit: '%', range: '<5.7', abnormal: true, flag: 'HIGH' },
                    ],
                },
            ];

            let filteredResults = results;
            if (input.includeAbnormal) {
                filteredResults = results.filter(r =>
                    r.results.some(t => t.abnormal)
                );
            }

            return {
                success: true,
                data: {
                    results: filteredResults.slice(0, input.limit),
                    count: filteredResults.length,
                    hasAbnormal: filteredResults.some(r => r.results.some(t => t.abnormal)),
                },
            };
        },
    },

    {
        name: 'get_pending_labs',
        description: 'Get pending lab orders for a patient',
        category: 'lab',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            includeScheduled: z.boolean().default(true),
        }),
        requiredPermissions: ['patient:read'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                // Verify patient access
                const patient = await prisma.patient.findFirst({
                    where: { id: input.patientId, assignedClinicianId: context.clinicianId },
                    select: { id: true },
                });

                if (!patient) {
                    return { success: false, error: 'Patient not found or access denied', data: null };
                }

                // Query lab results with PRELIMINARY status (pending results)
                const pendingResults: any[] = await prisma.labResult.findMany({
                    where: {
                        patientId: input.patientId,
                        status: 'PRELIMINARY',
                    },
                    orderBy: { orderedDate: 'desc' },
                });

                // Group by category (panel) and order date to reconstruct order structure
                const orderGroups = new Map<string, any[]>();
                for (const result of pendingResults) {
                    // Use category + orderedDate as key to group tests from the same order
                    const orderedDateKey = result.orderedDate?.toISOString().slice(0, 16) || 'unknown';
                    const key = `${result.category || 'MISC'}-${orderedDateKey}`;
                    if (!orderGroups.has(key)) {
                        orderGroups.set(key, []);
                    }
                    orderGroups.get(key)!.push(result);
                }

                // Transform grouped results into pending orders format
                const pendingOrders = Array.from(orderGroups.entries()).map(([key, results]) => {
                    const [panelCode] = key.split('-');
                    const panel = LAB_PANELS[panelCode as keyof typeof LAB_PANELS];
                    const firstResult = results[0];

                    // Extract order ID from notes if available
                    const orderIdMatch = firstResult.notes?.match(/Order ID: (LAB-[A-Z0-9]+)/);
                    const orderId = orderIdMatch ? orderIdMatch[1] : `LAB-${firstResult.id.slice(0, 8).toUpperCase()}`;

                    return {
                        orderId,
                        panel: panelCode,
                        panelName: panel?.name || panelCode,
                        status: 'PENDING',
                        tests: results.map((r: any) => r.testName),
                        labResultIds: results.map((r: any) => r.id),
                        orderedAt: firstResult.orderedDate?.toISOString(),
                        expectedResultTime: panel?.turnaroundHours
                            ? new Date(
                                  (firstResult.orderedDate?.getTime() || Date.now()) +
                                      panel.turnaroundHours * 60 * 60 * 1000
                              ).toISOString()
                            : null,
                    };
                });

                logger.info({
                    event: 'mcp_tool_executed',
                    tool: 'get_pending_labs',
                    patientId: input.patientId,
                    pendingCount: pendingOrders.length,
                    agentId: context.agentId,
                });

                return {
                    success: true,
                    data: {
                        pendingOrders,
                        count: pendingOrders.length,
                    },
                };
            } catch (error: any) {
                logger.error({
                    event: 'mcp_tool_error',
                    tool: 'get_pending_labs',
                    error: error.message,
                    agentId: context.agentId,
                });
                return { success: false, error: error.message, data: null };
            }
        },
    },

    {
        name: 'flag_critical_result',
        description: 'Flag a lab result as critical and notify care team',
        category: 'lab',
        inputSchema: z.object({
            labResultId: z.string().describe('The lab result ID to flag'),
            testName: z.string().optional().describe('The specific test name (for logging)'),
            reason: z.string().describe('Reason for flagging'),
            urgency: z.enum(['URGENT', 'CRITICAL']).default('URGENT'),
            notifyProvider: z.boolean().default(true),
        }),
        requiredPermissions: ['medication:write'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                // Find lab result and verify access
                const existingResult: any = await prisma.labResult.findFirst({
                    where: { id: input.labResultId },
                    include: { patient: { select: { id: true, assignedClinicianId: true } } },
                });

                if (!existingResult) {
                    return { success: false, error: 'Lab result not found', data: null };
                }

                if (existingResult.patient?.assignedClinicianId !== context.clinicianId) {
                    return { success: false, error: 'Access denied', data: null };
                }

                // Update the lab result to mark as critical
                const updatedResult: any = await prisma.labResult.update({
                    where: { id: input.labResultId },
                    data: {
                        isCritical: true,
                        isAbnormal: true, // Critical results are always abnormal
                        interpretation: input.urgency,
                        notes: existingResult.notes
                            ? `${existingResult.notes}\n\n[CRITICAL FLAG - ${new Date().toISOString()}]\nReason: ${input.reason}\nUrgency: ${input.urgency}`
                            : `[CRITICAL FLAG - ${new Date().toISOString()}]\nReason: ${input.reason}\nUrgency: ${input.urgency}`,
                    },
                });

                logger.warn({
                    event: 'critical_lab_flagged_by_agent',
                    labResultId: input.labResultId,
                    testName: updatedResult.testName,
                    reason: input.reason,
                    urgency: input.urgency,
                    agentId: context.agentId,
                });

                return {
                    success: true,
                    data: {
                        flagId: `FLAG-${Date.now()}`,
                        labResultId: input.labResultId,
                        testName: updatedResult.testName,
                        testCode: updatedResult.testCode,
                        value: updatedResult.value,
                        unit: updatedResult.unit,
                        referenceRange: updatedResult.referenceRange,
                        urgency: input.urgency,
                        reason: input.reason,
                        status: 'FLAGGED',
                        isCritical: true,
                        providerNotified: input.notifyProvider,
                        flaggedAt: new Date().toISOString(),
                    },
                };
            } catch (error: any) {
                logger.error({
                    event: 'mcp_tool_error',
                    tool: 'flag_critical_result',
                    error: error.message,
                    agentId: context.agentId,
                });
                return { success: false, error: error.message, data: null };
            }
        },
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const LAB_ORDER_TOOL_COUNT = labOrderTools.length;
export { LAB_PANELS };
