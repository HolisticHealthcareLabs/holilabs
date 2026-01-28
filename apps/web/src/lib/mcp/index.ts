/**
 * MCP Module - Unified exports for the MCP tool layer
 * 
 * This module provides agent-accessible clinical tools with:
 * - Tenant isolation (clinician-scoped access)
 * - Input validation (Zod schemas)
 * - Permission checking (role-based)
 * - Audit logging (all actions recorded)
 */

// Core types
export type {
    MCPContext,
    MCPResult,
    MCPTool,
    MCPToolRequest,
    MCPToolResponse,
    MCPRegistry,
    PermissionCheckResult,
    MCPToolExample,
} from './types';

// Server
export { mcpServer, createMCPContext, runTool } from './server';

// Registry
export {
    registry,
    getAllRegisteredTools,
    getToolByName,
    getToolsByCategory,
    searchTools,
    getToolSchemas,
    executeTool,
    // Enhanced discovery
    getToolWithExamples,
    getToolDependents,
    getToolDependencies,
    // Workflow exports
    getWorkflows,
    getWorkflowByIdFromRegistry,
    getWorkflowsByCategoryFromRegistry,
    searchWorkflowsFromRegistry,
    getWorkflowSchemasFromRegistry,
    executeWorkflowFromRegistry,
} from './registry';

// Workflow types and functions
export type {
    WorkflowTemplate,
    WorkflowStep,
    WorkflowResult,
    WorkflowStepResult,
} from './workflows';

export {
    getWorkflowTemplates,
    getWorkflowById,
    getWorkflowsByCategory,
    searchWorkflows,
    getWorkflowSchemas,
    executeWorkflow,
    WORKFLOW_TEMPLATES,
} from './workflows';

// Individual tool modules
export { patientTools } from './tools/patient.tools';
export { patientCrudTools } from './tools/patient-crud.tools';
export { governanceTools } from './tools/governance.tools';
export { clinicalNoteTools } from './tools/clinical-note.tools';
export { medicationTools } from './tools/medication.tools';
export { diagnosisTools } from './tools/diagnosis.tools';
export { allergyTools } from './tools/allergy.tools';
export { featureFlagTools } from './tools/feature-flag.tools';
export { messagingTools } from './tools/messaging.tools';
export { appointmentTools } from './tools/appointment.tools';
export { labOrderTools } from './tools/lab-order.tools';
export { referralTools } from './tools/referral.tools';
export { documentTools } from './tools/document.tools';
export { billingTools } from './tools/billing.tools';
export { settingsTools } from './tools/settings.tools';
export { prescriptionTools } from './tools/prescription.tools';

// Schemas (for external validation)
export * from './schemas/tool-schemas';

