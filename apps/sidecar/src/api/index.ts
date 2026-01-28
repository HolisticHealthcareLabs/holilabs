/**
 * Sidecar API Module
 *
 * Local API server for Sidecar ↔ Edge Node communication.
 *
 * @module sidecar/api
 */

export {
  SidecarAPIServer,
  type ContextRequest,
  type EvaluateRequest,
  type DecisionRequest,
  type ChatRequest,
  type StatusResponse,
} from './server';
