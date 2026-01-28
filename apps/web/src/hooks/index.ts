/**
 * Hooks Index
 *
 * Central export point for all React hooks in the application.
 */

// =============================================================================
// AGENT HOOKS
// =============================================================================
export {
  useAgentTools,
  useAgentInvoke,
  useAgentOrchestrate,
  useAgentHistory,
  clearToolsCache,
  getToolsCacheStatus,
} from './useAgent';

export type {
  MCPToolSchema,
  MCPResult,
  AgentAction,
  AgentGatewayResponse,
} from './useAgent';

// =============================================================================
// CLINICAL HOOKS
// =============================================================================
export { usePatientContext } from './usePatientContext';
export { usePatientFilters } from './usePatientFilters';
export { useJobStatus } from './useJobStatus';

// =============================================================================
// REAL-TIME HOOKS
// =============================================================================
export { useRealtimePreventionUpdates } from './useRealtimePreventionUpdates';
export { useGovernanceRealtime } from './useGovernanceRealtime';
export { useTaskRealtime } from './useTaskRealtime';

// =============================================================================
// UI HOOKS
// =============================================================================
export { useToast, toast } from './use-toast';
export { useAudioRecorder } from './use-audio-recorder';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useVoiceCommands } from './useVoiceCommands';
export { useNotifications } from './useNotifications';
export { useDebounce } from './useDebounce';

// =============================================================================
// AUTH & SECURITY HOOKS
// =============================================================================
export { useCSRFToken, useCSRFFetch, withCSRFToken } from './useCSRF';
export { useCsrfToken } from './useCsrfToken';
export { useSessionTimeout } from './useSessionTimeout';
export { useSafetyInterceptor } from './useSafetyInterceptor';

// =============================================================================
// FEATURE FLAG HOOKS
// =============================================================================
export {
  useFeatureFlag,
  useFeatureFlagPayload,
  useFeatureFlags,
} from './useFeatureFlag';

// =============================================================================
// UTILITY HOOKS
// =============================================================================
export { useAnalytics } from './useAnalytics';
export { useDeviceSync } from './useDeviceSync';
export { useLanguage } from './useLanguage';
export { useToolUsageTracker } from './useToolUsageTracker';
