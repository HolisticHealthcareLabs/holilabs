/**
 * Agent React Hooks
 *
 * React hooks for integrating with the MCP agent layer.
 * Provides tool discovery, invocation, and state management.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Schema representation for an MCP tool (client-side)
 */
export interface MCPToolSchema {
  name: string;
  description: string;
  category: string;
  requiredPermissions?: string[];
  deprecated?: boolean;
}

/**
 * Result from an MCP tool invocation
 */
export interface MCPResult {
  success: boolean;
  data: unknown;
  error?: string;
  meta?: {
    executionTimeMs?: number;
    cached?: boolean;
    warnings?: string[];
  };
}

/**
 * Response from the agent gateway
 */
export interface AgentGatewayResponse {
  tool: string;
  success: boolean;
  status: number;
  data: unknown;
}

/**
 * Recorded agent action for history tracking
 */
export interface AgentAction {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  result: MCPResult | null;
  timestamp: number;
  duration: number;
  status: 'pending' | 'success' | 'error';
}

/**
 * Tool discovery API response
 */
interface ToolDiscoveryResponse {
  success: boolean;
  count: number;
  categories: string[];
  tools: MCPToolSchema[];
  meta?: {
    version: string;
    protocol: string;
    timestamp: string;
  };
}

// =============================================================================
// useAgentTools - Fetch and cache available agent tools
// =============================================================================

interface UseAgentToolsOptions {
  /** Auto-fetch tools on mount */
  autoFetch?: boolean;
  /** Cache duration in milliseconds (default: 5 minutes) */
  cacheDuration?: number;
}

interface UseAgentToolsReturn {
  tools: MCPToolSchema[];
  categories: string[];
  isLoading: boolean;
  error: Error | null;
  searchTools: (query: string) => MCPToolSchema[];
  filterByCategory: (category: string) => MCPToolSchema[];
  refetch: () => Promise<void>;
}

// Simple in-memory cache for tools
let toolsCache: {
  tools: MCPToolSchema[];
  categories: string[];
  timestamp: number;
} | null = null;

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch and cache available agent tools
 *
 * @param category - Optional category to filter tools
 * @param options - Configuration options
 * @returns Tools, loading state, error, and utility functions
 *
 * @example
 * ```tsx
 * const { tools, isLoading, searchTools } = useAgentTools('patient');
 *
 * // Search for specific tools
 * const results = searchTools('medication');
 * ```
 */
export function useAgentTools(
  category?: string,
  options: UseAgentToolsOptions = {}
): UseAgentToolsReturn {
  const { autoFetch = true, cacheDuration = DEFAULT_CACHE_DURATION } = options;

  const [tools, setTools] = useState<MCPToolSchema[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTools = useCallback(async () => {
    // Check cache first
    if (toolsCache && Date.now() - toolsCache.timestamp < cacheDuration) {
      setTools(toolsCache.tools);
      setCategories(toolsCache.categories);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (category) {
        queryParams.set('category', category);
      }

      const url = `/api/agent/tools${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }

      const data: ToolDiscoveryResponse = await response.json();

      if (!data.success) {
        throw new Error('Tool discovery failed');
      }

      // Update cache (only for full fetches without category filter)
      if (!category) {
        toolsCache = {
          tools: data.tools,
          categories: data.categories,
          timestamp: Date.now(),
        };
      }

      setTools(data.tools);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [category, cacheDuration]);

  useEffect(() => {
    if (autoFetch) {
      fetchTools();
    }
  }, [autoFetch, fetchTools]);

  /**
   * Search tools by name or description
   */
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

  /**
   * Filter tools by category
   */
  const filterByCategory = useCallback(
    (cat: string): MCPToolSchema[] => {
      return tools.filter((tool) => tool.category === cat);
    },
    [tools]
  );

  return {
    tools,
    categories,
    isLoading,
    error,
    searchTools,
    filterByCategory,
    refetch: fetchTools,
  };
}

// =============================================================================
// useAgentInvoke - Execute agent tools
// =============================================================================

interface UseAgentInvokeReturn {
  invoke: (
    toolName: string,
    params: Record<string, unknown>
  ) => Promise<MCPResult>;
  isLoading: boolean;
  error: Error | null;
  lastResult: MCPResult | null;
  reset: () => void;
}

/**
 * Hook to execute agent tools
 *
 * @returns Invoke function, loading state, error, and last result
 *
 * @example
 * ```tsx
 * const { invoke, isLoading, lastResult } = useAgentInvoke();
 *
 * const handleClick = async () => {
 *   const result = await invoke('get-patient', { id: 'patient-123' });
 *   if (result.success) {
 *     console.log('Patient:', result.data);
 *   }
 * };
 * ```
 */
export function useAgentInvoke(): UseAgentInvokeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<MCPResult | null>(null);

  const invoke = useCallback(
    async (
      toolName: string,
      params: Record<string, unknown>
    ): Promise<MCPResult> => {
      setIsLoading(true);
      setError(null);

      const startTime = Date.now();

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

        // Safely extract error message from response data
        const getErrorMessage = (): string | undefined => {
          if (data.success) return undefined;
          if (data.data && typeof data.data === 'object' && 'error' in data.data) {
            return String((data.data as { error: unknown }).error);
          }
          return 'Unknown error';
        };

        const result: MCPResult = {
          success: data.success,
          data: data.data,
          error: getErrorMessage(),
          meta: {
            executionTimeMs: Date.now() - startTime,
          },
        };

        setLastResult(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Network error';
        const result: MCPResult = {
          success: false,
          data: null,
          error: errorMessage,
          meta: {
            executionTimeMs: Date.now() - startTime,
          },
        };

        setError(err instanceof Error ? err : new Error(errorMessage));
        setLastResult(result);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    invoke,
    isLoading,
    error,
    lastResult,
    reset,
  };
}

// =============================================================================
// useAgentOrchestrate - Execute multiple tools in parallel
// =============================================================================

interface ToolCall {
  tool: string;
  arguments?: Record<string, unknown>;
  id?: string;
}

interface ToolResult {
  id: string;
  tool: string;
  success: boolean;
  status: number;
  data: unknown;
  duration: number;
  error?: string;
}

interface OrchestrationResult {
  mode: 'parallel' | 'sequential';
  totalTools: number;
  success: boolean;
  results: ToolResult[];
  metrics: {
    totalDuration: number;
    toolDurationSum: number;
    parallelSpeedup: string;
    successCount: number;
    failureCount: number;
  };
}

interface UseAgentOrchestrateReturn {
  orchestrate: (
    tools: ToolCall[],
    options?: { mode?: 'parallel' | 'sequential'; timeout?: number }
  ) => Promise<OrchestrationResult>;
  isLoading: boolean;
  error: Error | null;
  lastResult: OrchestrationResult | null;
}

/**
 * Hook to execute multiple agent tools in parallel or sequentially
 *
 * @returns Orchestrate function, loading state, error, and last result
 *
 * @example
 * ```tsx
 * const { orchestrate, isLoading } = useAgentOrchestrate();
 *
 * const handleBatchFetch = async (patientId: string) => {
 *   const result = await orchestrate([
 *     { tool: 'get-patient', arguments: { id: patientId } },
 *     { tool: 'get-patient-medications', arguments: { id: patientId } },
 *     { tool: 'get-patient-allergies', arguments: { id: patientId } },
 *   ]);
 *
 *   if (result.success) {
 *     console.log('All tools succeeded');
 *   }
 * };
 * ```
 */
export function useAgentOrchestrate(): UseAgentOrchestrateReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<OrchestrationResult | null>(
    null
  );

  const orchestrate = useCallback(
    async (
      tools: ToolCall[],
      options: { mode?: 'parallel' | 'sequential'; timeout?: number } = {}
    ): Promise<OrchestrationResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/agent/orchestrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tools,
            mode: options.mode || 'parallel',
            timeout: options.timeout,
          }),
        });

        if (!response.ok) {
          throw new Error(`Orchestration failed: ${response.statusText}`);
        }

        const data: OrchestrationResult = await response.json();
        setLastResult(data);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Orchestration error';
        setError(err instanceof Error ? err : new Error(errorMessage));

        // Return a failure result
        const failureResult: OrchestrationResult = {
          mode: options.mode || 'parallel',
          totalTools: tools.length,
          success: false,
          results: [],
          metrics: {
            totalDuration: 0,
            toolDurationSum: 0,
            parallelSpeedup: '0',
            successCount: 0,
            failureCount: tools.length,
          },
        };

        setLastResult(failureResult);
        return failureResult;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    orchestrate,
    isLoading,
    error,
    lastResult,
  };
}

// =============================================================================
// useAgentHistory - Track agent action history
// =============================================================================

interface UseAgentHistoryOptions {
  /** Maximum number of actions to keep in history */
  maxHistory?: number;
}

interface UseAgentHistoryReturn {
  actions: AgentAction[];
  addAction: (action: Omit<AgentAction, 'id' | 'timestamp'>) => string;
  updateAction: (id: string, updates: Partial<AgentAction>) => void;
  clearHistory: () => void;
  getAction: (id: string) => AgentAction | undefined;
}

/**
 * Hook to track agent action history
 *
 * @param options - Configuration options
 * @returns Actions array and utility functions
 */
export function useAgentHistory(
  options: UseAgentHistoryOptions = {}
): UseAgentHistoryReturn {
  const { maxHistory = 50 } = options;
  const [actions, setActions] = useState<AgentAction[]>([]);

  const addAction = useCallback(
    (action: Omit<AgentAction, 'id' | 'timestamp'>): string => {
      const id = `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newAction: AgentAction = {
        ...action,
        id,
        timestamp: Date.now(),
      };

      setActions((prev) => {
        const updated = [newAction, ...prev];
        return updated.slice(0, maxHistory);
      });

      return id;
    },
    [maxHistory]
  );

  const updateAction = useCallback(
    (id: string, updates: Partial<AgentAction>) => {
      setActions((prev) =>
        prev.map((action) =>
          action.id === id ? { ...action, ...updates } : action
        )
      );
    },
    []
  );

  const clearHistory = useCallback(() => {
    setActions([]);
  }, []);

  const getAction = useCallback(
    (id: string): AgentAction | undefined => {
      return actions.find((action) => action.id === id);
    },
    [actions]
  );

  return {
    actions,
    addAction,
    updateAction,
    clearHistory,
    getAction,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Clear the tools cache (useful for testing or forced refresh)
 */
export function clearToolsCache(): void {
  toolsCache = null;
}

/**
 * Get the current cache status
 */
export function getToolsCacheStatus(): {
  isCached: boolean;
  age: number | null;
  toolCount: number;
} {
  if (!toolsCache) {
    return { isCached: false, age: null, toolCount: 0 };
  }

  return {
    isCached: true,
    age: Date.now() - toolsCache.timestamp,
    toolCount: toolsCache.tools.length,
  };
}
