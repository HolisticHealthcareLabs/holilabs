/**
 * MCP Server Facade — Public API
 */

export { getOrCreateMCPServer, resetMCPServer } from './mcp-server';
export { zodToMCPJsonSchema, convertToolToMCPSchema, convertAllToolsToMCPSchemas } from './schema-converter';
export type { MCPToolSchema } from './schema-converter';
export {
  executeWithMiddleware,
  validateMCPContext,
  auditToolExecution,
  emitGovernanceEvent,
  deidentifyResponseIfExternal,
} from './middleware-adapter';
export type { MCPMiddlewareContext, MiddlewareResult } from './middleware-adapter';
