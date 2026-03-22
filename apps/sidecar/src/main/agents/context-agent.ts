/**
 * Context Agent
 *
 * Fetches comprehensive patient context including demographics, medications,
 * allergies, and labs via EdgeNodeClient (web API calls).
 *
 * Reconciles scribeOutput with historical data to detect inconsistencies.
 *
 * @module sidecar/agents/context-agent
 */


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContextAgentInput {
  patientId: string;
  encounterId?: string;
  edgeNodeUrl?: string;
  sessionId?: string;
  scribeOutput?: {
    medications?: Array<{ name: string; dose?: string; frequency?: string }>;
    allergies?: string[];
    diagnosis?: string;
  };
}

export interface MergedPatientState {
  patientId: string;
  demographics?: {
    age?: number;
    weight?: number;
    sex?: string;
  };
  currentMedications?: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    route?: string;
    rxNormCode?: string;
  }>;
  knownAllergies?: string[];
  recentLabValues?: Array<{
    testName: string;
    value: number;
    unit?: string;
    referenceRange?: string;
    collectedAt?: string;
  }>;
  comorbidities?: string[]; // ICD-10 codes
}

export interface ContextAgentOutput {
  mergedState: MergedPatientState;
  extractedFields: {
    icd10Codes?: string[];
    medicationNames?: string[];
    allergyCategories?: string[];
  };
  reconciliationAlerts?: Array<{
    severity: 'warning' | 'critical';
    message: string;
    detail?: string;
  }>;
  latencyMs: number;
  sourceCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT AGENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ContextAgent {
  private edgeNodeUrl: string;
  private sessionId: string;

  constructor(edgeNodeUrl = 'http://localhost:3001', sessionId = '') {
    this.edgeNodeUrl = edgeNodeUrl;
    this.sessionId = sessionId || `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gather comprehensive patient context in parallel
   */
  async gather(input: ContextAgentInput): Promise<ContextAgentOutput> {
    const startTime = Date.now();
    const edgeNodeUrl = input.edgeNodeUrl || this.edgeNodeUrl;
    const patientId = input.patientId;

    try {
      // Parallel fetch: demographics, medications, allergies, labs
      const [demographics, medications, allergies, labs] = await Promise.all([
        this.fetchDemographics(edgeNodeUrl, patientId),
        this.fetchMedications(edgeNodeUrl, patientId),
        this.fetchAllergies(edgeNodeUrl, patientId),
        this.fetchLabValues(edgeNodeUrl, patientId),
      ]);

      // Reconcile with scribeOutput if provided
      const reconciliationAlerts: Array<{ severity: 'warning' | 'critical'; message: string; detail?: string }> = [];

      if (input.scribeOutput) {
        const scribeAlerts = this.reconcileScribeOutput(
          input.scribeOutput,
          medications,
          allergies
        );
        reconciliationAlerts.push(...scribeAlerts);
      }

      // Extract fields for downstream processing
      const extractedFields = {
        icd10Codes: [],
        medicationNames: (medications || []).map(m => m.name),
        allergyCategories: allergies || [],
      };

      const mergedState: MergedPatientState = {
        patientId,
        demographics,
        currentMedications: medications,
        knownAllergies: allergies,
        recentLabValues: labs,
      };

      return {
        mergedState,
        extractedFields,
        reconciliationAlerts,
        latencyMs: Date.now() - startTime,
        sourceCount: 4, // demographics, meds, allergies, labs
      };
    } catch (error) {
      console.error('[ContextAgent] gather() failed:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async fetchDemographics(
    baseUrl: string,
    patientId: string
  ): Promise<{ age?: number; weight?: number; sex?: string } | null> {
    try {
      const response = await fetch(`${baseUrl}/api/patients/${patientId}/demographics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;
      return await response.json() as any;
    } catch (error) {
      console.warn('[ContextAgent] fetchDemographics failed:', error);
      return null;
    }
  }

  private async fetchMedications(
    baseUrl: string,
    patientId: string
  ): Promise<Array<{ name: string; dose?: string; frequency?: string; route?: string; rxNormCode?: string }> | null> {
    try {
      const response = await fetch(`${baseUrl}/api/patients/${patientId}/medications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;
      return await response.json() as any;
    } catch (error) {
      console.warn('[ContextAgent] fetchMedications failed:', error);
      return null;
    }
  }

  private async fetchAllergies(
    baseUrl: string,
    patientId: string
  ): Promise<string[] | null> {
    try {
      const response = await fetch(`${baseUrl}/api/patients/${patientId}/allergies`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;
      const data = await response.json() as any;
      return Array.isArray(data) ? data : (data?.allergies || null);
    } catch (error) {
      console.warn('[ContextAgent] fetchAllergies failed:', error);
      return null;
    }
  }

  private async fetchLabValues(
    baseUrl: string,
    patientId: string
  ): Promise<Array<{ testName: string; value: number; unit?: string; referenceRange?: string; collectedAt?: string }> | null> {
    try {
      const response = await fetch(`${baseUrl}/api/patients/${patientId}/labs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;
      return await response.json() as any;
    } catch (error) {
      console.warn('[ContextAgent] fetchLabValues failed:', error);
      return null;
    }
  }

  private reconcileScribeOutput(
    scribeOutput: {
      medications?: Array<{ name: string; dose?: string; frequency?: string }>;
      allergies?: string[];
      diagnosis?: string;
    },
    historicalMeds: Array<{ name: string; dose?: string; frequency?: string; route?: string; rxNormCode?: string }> | null,
    historicalAllergies: string[] | null
  ): Array<{ severity: 'warning' | 'critical'; message: string; detail?: string }> {
    const alerts: Array<{ severity: 'warning' | 'critical'; message: string; detail?: string }> = [];

    // Check for new medications not in historical record
    if (scribeOutput.medications && historicalMeds) {
      for (const scribeMed of scribeOutput.medications) {
        const found = historicalMeds.find(
          m => m.name.toLowerCase() === scribeMed.name.toLowerCase()
        );
        if (!found) {
          alerts.push({
            severity: 'warning',
            message: `New medication "${scribeMed.name}" detected in scribe output but not in patient history`,
          });
        }
      }
    }

    // Check for allergy consistency
    if (scribeOutput.allergies && historicalAllergies) {
      for (const scribeAllergy of scribeOutput.allergies) {
        const found = historicalAllergies.some(
          a => a.toLowerCase() === scribeAllergy.toLowerCase()
        );
        if (!found) {
          alerts.push({
            severity: 'warning',
            message: `Allergy "${scribeAllergy}" mentioned in scribe but not in historical allergies`,
          });
        }
      }
    }

    return alerts;
  }
}
