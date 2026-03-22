/**
 * Conflict Resolver
 * Detects and resolves conflicts between local and server data
 *
 * Safety Invariants:
 * - ELENA: Medication/prescription conflicts MUST require human review (never auto-resolve)
 * - Clinical safety takes precedence over convenience
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SyncConflict,
  ClinicalResourceType,
  ConflictResolution,
  ConflictResolutionStrategy,
  IConflictResolver,
} from './types';

/**
 * ConflictResolver
 * Manages conflict detection and resolution strategies per resource type
 */
export class ConflictResolver implements IConflictResolver {
  private conflicts: Map<string, SyncConflict> = new Map();

  /**
   * Detect if a conflict exists between local and server versions
   * Returns null if no conflict
   */
  async detectConflict(
    resourceType: ClinicalResourceType,
    localVersion: unknown,
    serverVersion: unknown,
  ): Promise<SyncConflict | null> {
    // If versions are identical, no conflict
    if (JSON.stringify(localVersion) === JSON.stringify(serverVersion)) {
      return null;
    }

    // Conflict detected
    const conflict: SyncConflict = {
      id: uuidv4(),
      localVersion,
      serverVersion,
      resourceType,
      resolution: 'PENDING',
      requiresHumanReview: this.requiresManualReview(resourceType),
      reviewReason: this.getReviewReason(resourceType),
      tenantId: '', // Will be set by caller
      detectedAt: new Date().toISOString(),
    };

    this.conflicts.set(conflict.id, conflict);
    return conflict;
  }

  /**
   * Resolve a conflict based on resource type and clinical rules
   * ELENA: Medication conflicts ALWAYS require human review
   */
  async resolve(conflict: SyncConflict): Promise<ConflictResolution> {
    const strategy = this.getResolutionStrategy(conflict.resourceType);

    switch (strategy) {
      case 'LAST_WRITE_WINS':
        // Assume local change is more recent (clinician's last entry)
        conflict.resolution = 'LOCAL_WINS';
        return 'LOCAL_WINS';

      case 'SERVER_WINS':
        // Server is authoritative (e.g., lab results)
        conflict.resolution = 'SERVER_WINS';
        return 'SERVER_WINS';

      case 'MANUAL_REVIEW':
        // ELENA: Human must review medication changes and other safety-critical conflicts
        conflict.resolution = 'MANUAL';
        return 'MANUAL';

      default:
        conflict.resolution = 'MANUAL';
        return 'MANUAL';
    }
  }

  /**
   * Check if this resource type requires manual review
   * ELENA: Medication, prescription, and clinical note conflicts ALWAYS require review
   */
  requiresManualReview(resourceType: ClinicalResourceType): boolean {
    const manualReviewTypes = new Set([
      'active-medications',
      'clinical-notes',
      // Note: We don't have 'prescriptions' as a separate type, but it would be here
    ]);

    return manualReviewTypes.has(resourceType);
  }

  /**
   * Get the resolution strategy for a resource type
   */
  private getResolutionStrategy(resourceType: ClinicalResourceType): ConflictResolutionStrategy {
    const strategies: Record<ClinicalResourceType, ConflictResolutionStrategy> = {
      'patient-demographics': 'LAST_WRITE_WINS',
      'active-medications': 'MANUAL_REVIEW', // ELENA: Safety-critical
      'lab-results': 'SERVER_WINS', // Lab is authoritative
      'vital-signs': 'LAST_WRITE_WINS', // Clinician entry is authoritative
      'prevention-alerts': 'SERVER_WINS', // System-generated, server is authoritative
      'reference-data': 'SERVER_WINS', // Static reference data
      'imaging-metadata': 'SERVER_WINS', // System-computed
      'encounter-active': 'LAST_WRITE_WINS', // Current clinician work
      'clinical-notes': 'MANUAL_REVIEW', // ELENA: Never auto-merge notes
    };

    return strategies[resourceType] ?? 'MANUAL_REVIEW'; // Default to manual for unknown types
  }

  /**
   * Get reason why this resource type requires manual review
   */
  private getReviewReason(resourceType: ClinicalResourceType): string {
    const reasons: Record<ClinicalResourceType, string> = {
      'patient-demographics': 'Demographics conflict',
      'active-medications': 'Medication conflict - safety critical, requires pharmacist review',
      'lab-results': 'Lab result conflict',
      'vital-signs': 'Vital signs conflict',
      'prevention-alerts': 'Prevention alert conflict',
      'reference-data': 'Reference data conflict',
      'imaging-metadata': 'Imaging metadata conflict',
      'encounter-active': 'Active encounter conflict',
      'clinical-notes': 'Clinical notes conflict - manual merge required',
    };

    return reasons[resourceType] ?? 'Conflict requires manual review';
  }

  /**
   * Store a conflict for later review
   */
  addConflict(conflict: SyncConflict): void {
    this.conflicts.set(conflict.id, conflict);
  }

  /**
   * Get a conflict by ID
   */
  getConflict(conflictId: string): SyncConflict | null {
    return this.conflicts.get(conflictId) ?? null;
  }

  /**
   * Get all pending conflicts
   */
  getPendingConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter((c) => c.resolution === 'PENDING');
  }

  /**
   * Get all conflicts requiring manual review
   */
  getConflictsRequiringReview(): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter(
      (c) => c.requiresHumanReview && c.resolution === 'PENDING',
    );
  }

  /**
   * Manually resolve a conflict (user decision)
   */
  async manuallyResolve(
    conflictId: string,
    resolution: 'LOCAL_WINS' | 'SERVER_WINS',
    resolvedBy?: string,
  ): Promise<SyncConflict | null> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return null;

    conflict.resolution = resolution;
    if (resolvedBy) {
      conflict.assignedTo = resolvedBy;
    }

    return conflict;
  }

  /**
   * Clear resolved conflicts
   */
  clearResolved(): void {
    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolution !== 'PENDING') {
        this.conflicts.delete(id);
      }
    }
  }

  /**
   * Analyze two versions and provide merge suggestions
   * Used for clinical notes and complex resources
   */
  async suggestMerge(
    localVersion: unknown,
    serverVersion: unknown,
    resourceType: ClinicalResourceType,
  ): Promise<{
    suggestions: string[];
    canAutoMerge: boolean;
    requiresManualMerge: boolean;
  }> {
    // For clinical notes and medication changes, never auto-merge
    if (['clinical-notes', 'active-medications'].includes(resourceType)) {
      return {
        suggestions: [
          'Cannot auto-merge ' + resourceType,
          'Manual review required for clinical safety',
        ],
        canAutoMerge: false,
        requiresManualMerge: true,
      };
    }

    // For other types, provide useful suggestions
    const suggestions: string[] = [];

    if (typeof localVersion === 'object' && typeof serverVersion === 'object') {
      const localObj = localVersion as Record<string, unknown>;
      const serverObj = serverVersion as Record<string, unknown>;

      // Find differences
      const allKeys = new Set([...Object.keys(localObj), ...Object.keys(serverObj)]);
      for (const key of allKeys) {
        if (JSON.stringify(localObj[key]) !== JSON.stringify(serverObj[key])) {
          suggestions.push(`Difference in "${key}": local vs server`);
        }
      }
    } else {
      suggestions.push(
        `Values differ: ${JSON.stringify(localVersion)} vs ${JSON.stringify(serverVersion)}`,
      );
    }

    return {
      suggestions,
      canAutoMerge: suggestions.length === 0,
      requiresManualMerge: this.requiresManualReview(resourceType),
    };
  }

  /**
   * Get conflict statistics
   */
  getStatistics(): {
    totalConflicts: number;
    pendingConflicts: number;
    requiresManualReview: number;
    resolvedConflicts: number;
  } {
    const all = Array.from(this.conflicts.values());
    const pending = all.filter((c) => c.resolution === 'PENDING');
    const manualReview = all.filter((c) => c.requiresHumanReview && c.resolution === 'PENDING');
    const resolved = all.filter((c) => c.resolution !== 'PENDING');

    return {
      totalConflicts: all.length,
      pendingConflicts: pending.length,
      requiresManualReview: manualReview.length,
      resolvedConflicts: resolved.length,
    };
  }
}

/**
 * Default conflict resolver instance
 */
export const defaultConflictResolver = new ConflictResolver();
