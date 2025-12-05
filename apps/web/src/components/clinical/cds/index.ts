/**
 * CDS Components Export Barrel
 *
 * Centralized export for all Clinical Decision Support UI components
 */

export { AlertCard } from './AlertCard';
export { AlertMonitor } from './AlertMonitor';
export { AlertHistory } from './AlertHistory';
export { AnalyticsDashboard } from './AnalyticsDashboard';
export { RuleManager } from './RuleManager';
export { CDSCommandCenter } from './CDSCommandCenter';

// Re-export types
export type { CDSAlert, CDSRule, CDSHookType, EvidenceStrength } from '@/lib/cds/types';
