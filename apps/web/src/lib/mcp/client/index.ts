/**
 * MCP Client — Public API
 */

export { MCPClientManager, getMCPClientManager, resetMCPClientManager } from './mcp-client';
export type { ExternalMCPTool } from './mcp-client';

export {
  registerApprovedServer,
  isServerApproved,
  deidentifyExternalInput,
  preCallSecurityCheck,
  postCallSecurityCheck,
  auditExternalToolCall,
} from './security-gate';
export type {
  ExternalServerConfig,
  SecurityGateContext,
  SecurityGateResult,
} from './security-gate';
