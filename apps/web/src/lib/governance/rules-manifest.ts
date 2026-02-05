/**
 * Rules Manifest (Sync Protocol)
 * ------------------------------
 * Generates a cryptographic fingerprint of the active ruleset.
 * Allows the Dashboard to verify if Edge Nodes are in sync.
 */

import { createHash } from 'crypto';
import { UNIFIED_RULES_DB } from './rules-db-seed';
import { RuleCache } from './shared-types';

export class RulesManifest {
    /**
     * Calculate SHA-256 fingerprint of the current ruleset.
     * Format: v{COUNT}.{DATE}-{HASH_PREFIX}
     */
    static generateManifest(rules: RuleCache[] = UNIFIED_RULES_DB): string {
        const content = JSON.stringify(rules.map(r => ({
            id: r.ruleId,
            logic: r.ruleLogic, // The logic dictates the behavior
            active: r.isActive
        })));

        const hash = createHash('sha256').update(content).digest('hex').substring(0, 6).toUpperCase();
        const date = new Date().toISOString().split('T')[0].replace(/-/g, ''); // 20241005
        const count = rules.length;

        // e.g. "v4.20241005-AF3D92"
        return `v${count}.${date}-${hash}`;
    }

    /**
     * Get the current active manifest for the Control Plane.
     */
    static getActiveManifest(): string {
        return this.generateManifest(UNIFIED_RULES_DB);
    }
}
