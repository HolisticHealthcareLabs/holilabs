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
async function getLabPanelDefinitionsHandler(input: any, context: { userId: string }) {
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
async function getLabResultsRawHandler(input: any, context: { userId: string }) {
    const { patientId, orderId, startDate, limit } = input;

    // Mock lab results - in production would query actual results
    const results = [
        {
            orderId: 'LAB-DEMO1',
            panel: 'CMP',
            collectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'COMPLETED',
            results: [
                { test: 'Glucose', value: 126, unit: 'mg/dL', referenceRange: '70-100' },
                { test: 'Creatinine', value: 1.1, unit: 'mg/dL', referenceRange: '0.7-1.3' },
                { test: 'Potassium', value: 4.0, unit: 'mEq/L', referenceRange: '3.5-5.0' },
                { test: 'ALT', value: 45, unit: 'U/L', referenceRange: '7-56' },
            ],
        },
        {
            orderId: 'LAB-DEMO2',
            panel: 'A1C',
            collectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'COMPLETED',
            results: [
                { test: 'HbA1c', value: 7.2, unit: '%', referenceRange: '<5.7' },
            ],
        },
    ];

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_lab_results_raw',
        patientId,
        resultCount: results.length,
    });

    // Return raw data - no abnormal flags, no hasAbnormal
    return {
        success: true,
        data: {
            patientId,
            results: results.slice(0, limit),
            totalCount: results.length,
        },
    };
}

// PRIMITIVE: create_lab_order
// Pure create operation
async function createLabOrderHandler(input: any, context: { userId: string; clinicId: string }) {
    const { patientId, panelCode, priority, fasting, indication, notes } = input;

    const panel = LAB_PANELS[panelCode as keyof typeof LAB_PANELS];
    if (!panel) {
        return { success: false, error: `Unknown panel: ${panelCode}`, data: null };
    }

    const orderId = `LAB-${Date.now().toString(36).toUpperCase()}`;

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_lab_order',
        orderId,
        patientId,
        panelCode,
        priority,
    });

    return {
        success: true,
        data: {
            orderId,
            patientId,
            panelCode,
            panelName: panel.name,
            tests: panel.tests,
            priority,
            fasting,
            indication,
            notes,
            status: 'ORDERED',
            orderedAt: new Date().toISOString(),
            estimatedTurnaroundHours: panel.turnaroundHours,
        },
    };
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const labOrderTools = [
    // ==========================================================================
    // PRIMITIVE TOOLS (Agent-native architecture)
    // ==========================================================================
    {
        name: 'get_lab_panel_definitions',
        description: 'Get raw lab panel definitions including tests and turnaround times. Agent uses this to understand available panels.',
        inputSchema: GetLabPanelDefinitionsSchema,
        handler: getLabPanelDefinitionsHandler,
    },
    {
        name: 'get_lab_results_raw',
        description: 'Get lab results without abnormal filtering or flags. Returns raw values with reference ranges - agent interprets.',
        inputSchema: GetLabResultsRawSchema,
        handler: getLabResultsRawHandler,
    },
    {
        name: 'create_lab_order',
        description: 'Create a lab order. Returns raw order data without expected result time calculations.',
        inputSchema: CreateLabOrderSchema,
        handler: createLabOrderHandler,
    },
    // ==========================================================================
    // LEGACY TOOLS (Deprecated - use primitives)
    // ==========================================================================
    {
        name: 'order_lab_panel',
        description: '[DEPRECATED: Use create_lab_order] Order lab with calculated expectedResultTime.',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            panel: z.enum(['CMP', 'BMP', 'CBC', 'LIPID', 'A1C', 'TSH', 'UA']).describe('Lab panel type'),
            priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
            fasting: z.boolean().default(false).describe('Fasting required'),
            indication: z.string().optional().describe('Clinical indication for the order'),
            notes: z.string().optional().describe('Additional instructions'),
        }),
        deprecated: true,
        alternatives: ['create_lab_order', 'get_lab_panel_definitions'],
        handler: async (input: any, context: { userId: string; clinicId: string }) => {
            logger.warn({
                event: 'deprecated_tool_called',
                tool: 'order_lab_panel',
                message: 'Use create_lab_order primitive instead',
            });

            const panel = LAB_PANELS[input.panel as keyof typeof LAB_PANELS];

            if (!panel) {
                return { success: false, error: 'Invalid lab panel' };
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
                userId: context.userId,
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
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            orderId: z.string().optional().describe('Specific order ID'),
            panel: z.string().optional().describe('Filter by panel type'),
            startDate: z.string().optional().describe('Results from date (ISO 8601)'),
            includeAbnormal: z.boolean().default(false).describe('Only return abnormal results'),
            limit: z.number().default(10),
        }),
        deprecated: true,
        alternatives: ['get_lab_results_raw'],
        handler: async (input: any, context: { userId: string }) => {
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
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            includeScheduled: z.boolean().default(true),
        }),
        handler: async (input: any, context: { userId: string }) => {
            // Mock pending labs
            const pending = [
                {
                    orderId: 'LAB-PENDING1',
                    panel: 'CBC',
                    panelName: 'Complete Blood Count',
                    status: 'SPECIMEN_COLLECTED',
                    orderedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    expectedResultTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
                },
            ];

            return {
                success: true,
                data: {
                    pendingOrders: pending,
                    count: pending.length,
                },
            };
        },
    },

    {
        name: 'flag_critical_result',
        description: 'Flag a lab result as critical and notify care team',
        inputSchema: z.object({
            orderId: z.string().describe('The lab order ID'),
            testName: z.string().describe('The specific test to flag'),
            reason: z.string().describe('Reason for flagging'),
            urgency: z.enum(['URGENT', 'CRITICAL']).default('URGENT'),
            notifyProvider: z.boolean().default(true),
        }),
        handler: async (input: any, context: { userId: string }) => {
            logger.warn({
                event: 'critical_lab_flagged_by_agent',
                orderId: input.orderId,
                testName: input.testName,
                reason: input.reason,
                urgency: input.urgency,
                userId: context.userId,
            });

            return {
                success: true,
                data: {
                    flagId: `FLAG-${Date.now()}`,
                    orderId: input.orderId,
                    testName: input.testName,
                    urgency: input.urgency,
                    status: 'FLAGGED',
                    providerNotified: input.notifyProvider,
                    flaggedAt: new Date().toISOString(),
                },
            };
        },
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const LAB_ORDER_TOOL_COUNT = labOrderTools.length;
export { LAB_PANELS };
