/**
 * Agent Context
 *
 * React context for agent state management across the application.
 * Provides centralized access to tools, invocation, and action history.
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import type {
  MCPToolSchema,
  MCPResult,
  AgentAction,
} from '@/hooks/useAgent';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Agent connection status
 */
export type AgentConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Context value type
 */
interface AgentContextValue {
  // Tools
  tools: MCPToolSchema[];
  categories: string[];
  isLoadingTools: boolean;
  toolsError: Error | null;
  searchTools: (query: string) => MCPToolSchema[];
  filterByCategory: (category: string) => MCPToolSchema[];
  refetchTools: () => Promise<void>;

  // Invocation
  invoke: (
    toolName: string,
    params: Record<string, unknown>
  ) => Promise<MCPResult>;
  isInvoking: boolean;
  invokeError: Error | null;
  lastResult: MCPResult | null;

  // History
  recentActions: AgentAction[];
  clearHistory: () => void;

  // Connection status
  connectionStatus: AgentConnectionStatus;

  // Orchestration
  orchestrate: (
    tools: Array<{ tool: string; arguments?: Record<string, unknown>; id?: string }>,
    options?: { mode?: 'parallel' | 'sequential'; timeout?: number }
  ) => Promise<OrchestrationResult>;
  isOrchestrating: boolean;
}

interface OrchestrationResult {
  mode: 'parallel' | 'sequential';
  totalTools: number;
  success: boolean;
  results: Array<{
    id: string;
    tool: string;
    success: boolean;
    status: number;
    data: unknown;
    duration: number;
    error?: string;
  }>;
  metrics: {
    totalDuration: number;
    toolDurationSum: number;
    parallelSpeedup: string;
    successCount: number;
    failureCount: number;
  };
}

interface ToolDiscoveryResponse {
  success: boolean;
  count: number;
  categories: string[];
  tools: MCPToolSchema[];
}

interface AgentGatewayResponse {
  tool: string;
  success: boolean;
  status: number;
  data: unknown;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AgentContext = createContext<AgentContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface AgentProviderProps {
  children: ReactNode;
  /** Maximum actions to keep in history */
  maxHistorySize?: number;
  /** Auto-fetch tools on mount */
  autoFetchTools?: boolean;
  /** Cache duration for tools in milliseconds */
  toolsCacheDuration?: number;
}

/**
 * Provider component for agent context
 *
 * @example
 * ```tsx
 * // In your app layout or root
 * <AgentProvider>
 *   <App />
 * </AgentProvider>
 *
 * // In child components
 * const { invoke, tools } = useAgent();
 * ```
 */
export function AgentProvider({
  children,
  maxHistorySize = 50,
  autoFetchTools = true,
  toolsCacheDuration = 5 * 60 * 1000, // 5 minutes
}: AgentProviderProps) {
  // -------------------------------------------------------------------------
  // Tools State
  // -------------------------------------------------------------------------
  const [tools, setTools] = useState<MCPToolSchema[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState<Error | null>(null);
  const [toolsCacheTimestamp, setToolsCacheTimestamp] = useState<number>(0);

  // -------------------------------------------------------------------------
  // Invocation State
  // -------------------------------------------------------------------------
  const [isInvoking, setIsInvoking] = useState(false);
  const [invokeError, setInvokeError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<MCPResult | null>(null);

  // -------------------------------------------------------------------------
  // Orchestration State
  // -------------------------------------------------------------------------
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  // -------------------------------------------------------------------------
  // History State
  // -------------------------------------------------------------------------
  const [recentActions, setRecentActions] = useState<AgentAction[]>([]);

  // -------------------------------------------------------------------------
  // Connection Status
  // -------------------------------------------------------------------------
  const [connectionStatus, setConnectionStatus] = useState<AgentConnectionStatus>('disconnected');

  // -------------------------------------------------------------------------
  // Fetch Tools
  // -------------------------------------------------------------------------
  const fetchTools = useCallback(async () => {
    // Check cache validity
    const now = Date.now();
    if (tools.length > 0 && now - toolsCacheTimestamp < toolsCacheDuration) {
      return;
    }

    setIsLoadingTools(true);
    setToolsError(null);
    setConnectionStatus('connecting');

    try {
      const response = await fetch('/api/agent/tools');

      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }

      const data: ToolDiscoveryResponse = await response.json();

      if (!data.success) {
        throw new Error('Tool discovery failed');
      }

      setTools(data.tools);
      setCategories(data.categories);
      setToolsCacheTimestamp(Date.now());
      setConnectionStatus('connected');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setToolsError(error);
      setConnectionStatus('error');
    } finally {
      setIsLoadingTools(false);
    }
  }, [tools.length, toolsCacheTimestamp, toolsCacheDuration]);

  // Auto-fetch tools on mount
  useEffect(() => {
    if (autoFetchTools) {
      fetchTools();
    }
  }, [autoFetchTools, fetchTools]);

  // -------------------------------------------------------------------------
  // Search Tools
  // -------------------------------------------------------------------------
  const searchTools = useCallback(
    (query: string): MCPToolSchema[] => {
      if (!query.trim()) return tools;

      const lowerQuery = query.toLowerCase();
      return tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(lowerQuery) ||
          tool.description.toLowerCase().includes(lowerQuery)
      );
    },
    [tools]
  );

  // -------------------------------------------------------------------------
  // Filter by Category
  // -------------------------------------------------------------------------
  const filterByCategory = useCallback(
    (category: string): MCPToolSchema[] => {
      return tools.filter((tool) => tool.category === category);
    },
    [tools]
  );

  // -------------------------------------------------------------------------
  // Add Action to History
  // -------------------------------------------------------------------------
  const addToHistory = useCallback(
    (action: AgentAction) => {
      setRecentActions((prev) => {
        const updated = [action, ...prev];
        return updated.slice(0, maxHistorySize);
      });
    },
    [maxHistorySize]
  );

  // -------------------------------------------------------------------------
  // Invoke Tool
  // -------------------------------------------------------------------------
  const invoke = useCallback(
    async (
      toolName: string,
      params: Record<string, unknown>
    ): Promise<MCPResult> => {
      setIsInvoking(true);
      setInvokeError(null);

      const startTime = Date.now();
      const actionId = `action-${startTime}-${Math.random().toString(36).slice(2, 9)}`;

      // Add pending action to history
      const pendingAction: AgentAction = {
        id: actionId,
        toolName,
        params,
        result: null,
        timestamp: startTime,
        duration: 0,
        status: 'pending',
      };
      addToHistory(pendingAction);

      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: toolName,
            arguments: params,
          }),
        });

        const data: AgentGatewayResponse = await response.json();
        const duration = Date.now() - startTime;

        const result: MCPResult = {
          success: data.success,
          data: data.data,
          error: !data.success
            ? String((data.data as Record<string, unknown>)?.error || 'Unknown error')
            : undefined,
          meta: {
            executionTimeMs: duration,
          },
        };

        setLastResult(result);

        // Update action in history
        setRecentActions((prev) =>
          prev.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  result,
                  duration,
                  status: result.success ? 'success' : 'error',
                }
              : action
          )
        );

        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMessage =
          err instanceof Error ? err.message : 'Network error';

        const result: MCPResult = {
          success: false,
          data: null,
          error: errorMessage,
          meta: {
            executionTimeMs: duration,
          },
        };

        setInvokeError(err instanceof Error ? err : new Error(errorMessage));
        setLastResult(result);

        // Update action in history
        setRecentActions((prev) =>
          prev.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  result,
                  duration,
                  status: 'error',
                }
              : action
          )
        );

        return result;
      } finally {
        setIsInvoking(false);
      }
    },
    [addToHistory]
  );

  // -------------------------------------------------------------------------
  // Orchestrate Multiple Tools
  // -------------------------------------------------------------------------
  const orchestrate = useCallback(
    async (
      toolCalls: Array<{ tool: string; arguments?: Record<string, unknown>; id?: string }>,
      options: { mode?: 'parallel' | 'sequential'; timeout?: number } = {}
    ): Promise<OrchestrationResult> => {
      setIsOrchestrating(true);

      try {
        const response = await fetch('/api/agent/orchestrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tools: toolCalls,
            mode: options.mode || 'parallel',
            timeout: options.timeout,
          }),
        });

        if (!response.ok) {
          throw new Error(`Orchestration failed: ${response.statusText}`);
        }

        const data: OrchestrationResult = await response.json();

        // Add each tool result to history
        for (const result of data.results) {
          const action: AgentAction = {
            id: result.id,
            toolName: result.tool,
            params: toolCalls.find((t) => t.tool === result.tool)?.arguments || {},
            result: {
              success: result.success,
              data: result.data,
              error: result.error,
              meta: { executionTimeMs: result.duration },
            },
            timestamp: Date.now(),
            duration: result.duration,
            status: result.success ? 'success' : 'error',
          };
          addToHistory(action);
        }

        return data;
      } catch (err) {
        // Return a failure result
        const failureResult: OrchestrationResult = {
          mode: options.mode || 'parallel',
          totalTools: toolCalls.length,
          success: false,
          results: [],
          metrics: {
            totalDuration: 0,
            toolDurationSum: 0,
            parallelSpeedup: '0',
            successCount: 0,
            failureCount: toolCalls.length,
          },
        };

        return failureResult;
      } finally {
        setIsOrchestrating(false);
      }
    },
    [addToHistory]
  );

  // -------------------------------------------------------------------------
  // Clear History
  // -------------------------------------------------------------------------
  const clearHistory = useCallback(() => {
    setRecentActions([]);
  }, []);

  // -------------------------------------------------------------------------
  // Context Value
  // -------------------------------------------------------------------------
  const contextValue = useMemo<AgentContextValue>(
    () => ({
      // Tools
      tools,
      categories,
      isLoadingTools,
      toolsError,
      searchTools,
      filterByCategory,
      refetchTools: fetchTools,

      // Invocation
      invoke,
      isInvoking,
      invokeError,
      lastResult,

      // History
      recentActions,
      clearHistory,

      // Connection status
      connectionStatus,

      // Orchestration
      orchestrate,
      isOrchestrating,
    }),
    [
      tools,
      categories,
      isLoadingTools,
      toolsError,
      searchTools,
      filterByCategory,
      fetchTools,
      invoke,
      isInvoking,
      invokeError,
      lastResult,
      recentActions,
      clearHistory,
      connectionStatus,
      orchestrate,
      isOrchestrating,
    ]
  );

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the agent context
 *
 * Must be used within an AgentProvider
 *
 * @returns Agent context value
 * @throws Error if used outside of AgentProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { invoke, tools, recentActions } = useAgent();
 *
 *   const handleAction = async () => {
 *     const result = await invoke('get-patient', { id: 'patient-123' });
 *     // Handle result...
 *   };
 *
 *   return (
 *     <div>
 *       <p>Available tools: {tools.length}</p>
 *       <p>Recent actions: {recentActions.length}</p>
 *       <button onClick={handleAction}>Get Patient</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext);

  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }

  return context;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { AgentContext };
export type { AgentContextValue, AgentProviderProps };
