/**
 * Event Handler Registry
 *
 * Registers all Health 3.0 event handlers with the orchestrator.
 * Import this module to auto-register handlers.
 */

import { registerHandler } from '../orchestrator';
import { handleEncounterCompleted } from './encounter-handler';
import { handleSafetyIncident } from './safety-handler';

export function registerAllHandlers(): void {
  registerHandler(['encounter.completed'], handleEncounterCompleted);
  registerHandler(['safety.incident.reported'], handleSafetyIncident);
}
