/**
 * MCP Settings Tools
 * 
 * Tools for AI agents to manage user/clinic settings:
 * - Get/Update user preferences
 * - Manage notification settings
 * - Configure clinical alerts
 * - Workflow customization
 * - Integration settings
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const settingsTools = [
    {
        name: 'get_user_preferences',
        description: 'Get user preferences and settings',
        inputSchema: z.object({
            category: z.enum(['ALL', 'NOTIFICATIONS', 'CLINICAL', 'DISPLAY', 'WORKFLOW']).default('ALL'),
        }),
        handler: async (input: any, context: { userId: string }) => {
            // Mock user preferences
            const preferences = {
                notifications: {
                    email: true,
                    sms: false,
                    push: true,
                    criticalAlerts: true,
                    labResults: true,
                    appointmentReminders: true,
                    governanceAlerts: true,
                },
                clinical: {
                    defaultDrugDatabase: 'RxNorm',
                    showDrugInteractions: true,
                    showBlackBoxWarnings: true,
                    preventionAlertsEnabled: true,
                    autoSuggestDiagnoses: true,
                    icd10Version: '2024',
                },
                display: {
                    theme: 'dark',
                    language: 'en',
                    dateFormat: 'MM/DD/YYYY',
                    timeFormat: '12h',
                    compactView: false,
                    sidebarCollapsed: false,
                },
                workflow: {
                    autoSaveNotes: true,
                    autoSaveIntervalSeconds: 30,
                    defaultNoteTemplate: 'SOAP',
                    showQuickActions: true,
                    enableVoiceCommands: true,
                },
            };

            if (input.category === 'ALL') {
                return { success: true, data: preferences };
            }

            const categoryMap: Record<string, keyof typeof preferences> = {
                NOTIFICATIONS: 'notifications',
                CLINICAL: 'clinical',
                DISPLAY: 'display',
                WORKFLOW: 'workflow',
            };

            return {
                success: true,
                data: { [categoryMap[input.category]]: preferences[categoryMap[input.category]] },
            };
        },
    },

    {
        name: 'update_user_preferences',
        description: 'Update user preferences and settings',
        inputSchema: z.object({
            category: z.enum(['NOTIFICATIONS', 'CLINICAL', 'DISPLAY', 'WORKFLOW']),
            settings: z.record(z.any()).describe('Key-value pairs of settings to update'),
        }),
        handler: async (input: any, context: { userId: string }) => {
            logger.info({
                event: 'user_preferences_updated_by_agent',
                userId: context.userId,
                category: input.category,
                settingsChanged: Object.keys(input.settings),
            });

            return {
                success: true,
                data: {
                    category: input.category,
                    updatedSettings: input.settings,
                    updatedAt: new Date().toISOString(),
                },
            };
        },
    },

    {
        name: 'configure_clinical_alerts',
        description: 'Configure clinical alert thresholds and rules',
        inputSchema: z.object({
            alertType: z.enum([
                'DRUG_INTERACTION',
                'ALLERGY',
                'LAB_CRITICAL',
                'VITAL_ABNORMAL',
                'CARE_GAP',
                'PREVENTION_DUE',
            ]),
            enabled: z.boolean().describe('Enable or disable this alert type'),
            threshold: z.string().optional().describe('Alert threshold value'),
            severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
            autoNotify: z.boolean().default(true),
        }),
        handler: async (input: any, context: { userId: string }) => {
            logger.info({
                event: 'clinical_alert_configured_by_agent',
                userId: context.userId,
                alertType: input.alertType,
                enabled: input.enabled,
                threshold: input.threshold,
            });

            return {
                success: true,
                data: {
                    alertType: input.alertType,
                    enabled: input.enabled,
                    threshold: input.threshold,
                    severity: input.severity,
                    autoNotify: input.autoNotify,
                    configuredAt: new Date().toISOString(),
                },
            };
        },
    },

    {
        name: 'get_workflow_templates',
        description: 'Get available workflow templates for clinical processes',
        inputSchema: z.object({
            workflowType: z.enum(['NOTE', 'PRESCRIPTION', 'REFERRAL', 'ORDER', 'DOCUMENTATION']).optional(),
        }),
        handler: async (input: any, context: { userId: string }) => {
            const templates = {
                NOTE: [
                    { id: 'soap', name: 'SOAP Note', isDefault: true },
                    { id: 'progress', name: 'Progress Note', isDefault: false },
                    { id: 'annual_physical', name: 'Annual Physical', isDefault: false },
                    { id: 'telehealth', name: 'Telehealth Visit', isDefault: false },
                ],
                PRESCRIPTION: [
                    { id: 'standard', name: 'Standard Prescription', isDefault: true },
                    { id: 'controlled', name: 'Controlled Substance', isDefault: false },
                ],
                REFERRAL: [
                    { id: 'specialist', name: 'Specialist Referral', isDefault: true },
                    { id: 'urgent', name: 'Urgent Referral', isDefault: false },
                ],
                ORDER: [
                    { id: 'lab', name: 'Lab Order', isDefault: true },
                    { id: 'imaging', name: 'Imaging Order', isDefault: false },
                    { id: 'dme', name: 'DME Order', isDefault: false },
                ],
                DOCUMENTATION: [
                    { id: 'patient_instructions', name: 'Patient Instructions', isDefault: true },
                    { id: 'prior_auth', name: 'Prior Authorization', isDefault: false },
                    { id: 'letter', name: 'Patient Letter', isDefault: false },
                ],
            };

            if (input.workflowType) {
                return {
                    success: true,
                    data: { [input.workflowType]: templates[input.workflowType as keyof typeof templates] },
                };
            }

            return { success: true, data: templates };
        },
    },

    {
        name: 'manage_integrations',
        description: 'View and manage third-party integrations',
        inputSchema: z.object({
            action: z.enum(['LIST', 'ENABLE', 'DISABLE', 'TEST']),
            integrationId: z.string().optional().describe('Integration ID for ENABLE/DISABLE/TEST'),
        }),
        handler: async (input: any, context: { userId: string }) => {
            const integrations = [
                {
                    id: 'rxnorm',
                    name: 'RxNorm Drug Database',
                    type: 'CLINICAL_DATA',
                    status: 'CONNECTED',
                    lastSync: new Date().toISOString(),
                },
                {
                    id: 'openfda',
                    name: 'openFDA Drug Safety',
                    type: 'CLINICAL_DATA',
                    status: 'CONNECTED',
                    lastSync: new Date().toISOString(),
                },
                {
                    id: 'cms_coverage',
                    name: 'CMS Coverage Database',
                    type: 'BILLING',
                    status: 'CONNECTED',
                    lastSync: new Date().toISOString(),
                },
                {
                    id: 'clinical_trials',
                    name: 'ClinicalTrials.gov',
                    type: 'RESEARCH',
                    status: 'CONNECTED',
                    lastSync: new Date().toISOString(),
                },
                {
                    id: 'ehr_fhir',
                    name: 'EHR FHIR Connector',
                    type: 'INTEROPERABILITY',
                    status: 'AVAILABLE',
                    lastSync: null,
                },
            ];

            if (input.action === 'LIST') {
                return { success: true, data: { integrations } };
            }

            if (input.action === 'TEST' && input.integrationId) {
                logger.info({
                    event: 'integration_tested_by_agent',
                    integrationId: input.integrationId,
                    userId: context.userId,
                });

                return {
                    success: true,
                    data: {
                        integrationId: input.integrationId,
                        testResult: 'SUCCESS',
                        latencyMs: 45,
                        testedAt: new Date().toISOString(),
                    },
                };
            }

            return {
                success: true,
                data: {
                    action: input.action,
                    integrationId: input.integrationId,
                    status: input.action === 'ENABLE' ? 'CONNECTED' : 'DISABLED',
                    updatedAt: new Date().toISOString(),
                },
            };
        },
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const SETTINGS_TOOL_COUNT = settingsTools.length;
