/**
 * Conflict Resolver Tests
 * Test ELENA invariant: medication conflicts MUST require manual review
 */

import { ConflictResolver } from '../conflict-resolver';
import { SyncConflict } from '../types';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('Conflict Detection', () => {
    it('should detect no conflict when versions are identical', async () => {
      const version = { medication: 'aspirin', dose: '500mg' };

      const conflict = await resolver.detectConflict(
        'active-medications',
        version,
        version,
      );

      expect(conflict).toBeNull();
    });

    it('should detect conflict when versions differ', async () => {
      const localVersion = { medication: 'aspirin', dose: '500mg' };
      const serverVersion = { medication: 'aspirin', dose: '250mg' };

      const conflict = await resolver.detectConflict(
        'active-medications',
        localVersion,
        serverVersion,
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.localVersion).toEqual(localVersion);
      expect(conflict?.serverVersion).toEqual(serverVersion);
    });

    it('should detect conflicts for all resource types', async () => {
      const resourceTypes = [
        'patient-demographics',
        'active-medications',
        'lab-results',
        'vital-signs',
        'clinical-notes',
      ] as const;

      for (const type of resourceTypes) {
        const conflict = await resolver.detectConflict(type, { v: 1 }, { v: 2 });
        expect(conflict).not.toBeNull();
        expect(conflict?.resourceType).toBe(type);
      }
    });
  });

  describe('ELENA: Medication Conflicts Require Manual Review', () => {
    it('should mark medication conflicts as requiring human review', async () => {
      const conflict = await resolver.detectConflict(
        'active-medications',
        { medication: 'lisinopril', dose: '10mg' },
        { medication: 'lisinopril', dose: '5mg' },
      );

      expect(conflict?.requiresHumanReview).toBe(true);
      expect(resolver.requiresManualReview('active-medications')).toBe(true);
    });

    it('should mark clinical notes as requiring human review', async () => {
      const conflict = await resolver.detectConflict(
        'clinical-notes',
        { note: 'Patient complained of headache' },
        { note: 'Patient reported fever' },
      );

      expect(conflict?.requiresHumanReview).toBe(true);
      expect(resolver.requiresManualReview('clinical-notes')).toBe(true);
    });

    it('should never auto-resolve medication conflicts', async () => {
      const conflict = await resolver.detectConflict(
        'active-medications',
        { medication: 'metformin', dose: '1000mg' },
        { medication: 'metformin', dose: '500mg' },
      );

      const resolution = await resolver.resolve(conflict!);

      // Should require manual review, not auto-resolve
      expect(resolution).toBe('MANUAL');
      expect(conflict?.requiresHumanReview).toBe(true);
    });

    it('should provide review reason for medication conflicts', async () => {
      const conflict = await resolver.detectConflict(
        'active-medications',
        { medication: 'warfarin' },
        { medication: 'warfarin', dose: 'updated' },
      );

      expect(conflict?.reviewReason).toContain('Medication conflict');
      expect(conflict?.reviewReason).toContain('safety');
    });

    it('should not auto-resolve any medication-related conflicts', async () => {
      const medications = [
        { med: 'aspirin', dose: '325mg' },
        { med: 'lisinopril', dose: '10mg' },
        { med: 'metformin', dose: '500mg' },
        { med: 'warfarin', dose: '5mg' },
      ];

      for (const med of medications) {
        const conflict = await resolver.detectConflict(
          'active-medications',
          { ...med },
          { ...med, dose: 'changed' },
        );

        const resolution = await resolver.resolve(conflict!);
        expect(resolution).toBe('MANUAL');
        expect(conflict?.requiresHumanReview).toBe(true);
      }
    });
  });

  describe('Resolution Strategies by Resource Type', () => {
    it('should use LAST_WRITE_WINS for demographics', async () => {
      const conflict = await resolver.detectConflict(
        'patient-demographics',
        { name: 'John Doe' },
        { name: 'Jane Doe' },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('LOCAL_WINS');
      expect(conflict?.requiresHumanReview).toBe(false);
    });

    it('should use SERVER_WINS for lab results', async () => {
      const conflict = await resolver.detectConflict(
        'lab-results',
        { result: 'positive', date: '2024-01-01' },
        { result: 'negative', date: '2024-01-02' },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('SERVER_WINS');
      expect(conflict?.requiresHumanReview).toBe(false);
    });

    it('should use LAST_WRITE_WINS for vital signs', async () => {
      const conflict = await resolver.detectConflict(
        'vital-signs',
        { heart_rate: 72, bp_systolic: 120 },
        { heart_rate: 75, bp_systolic: 118 },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('LOCAL_WINS');
      expect(conflict?.requiresHumanReview).toBe(false);
    });

    it('should use SERVER_WINS for prevention alerts', async () => {
      const conflict = await resolver.detectConflict(
        'prevention-alerts',
        { alert: 'old-alert' },
        { alert: 'new-alert' },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('SERVER_WINS');
      expect(conflict?.requiresHumanReview).toBe(false);
    });

    it('should use SERVER_WINS for reference data', async () => {
      const conflict = await resolver.detectConflict(
        'reference-data',
        { code: 'ICD-10-A00', description: 'old' },
        { code: 'ICD-10-A00', description: 'new' },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('SERVER_WINS');
      expect(conflict?.requiresHumanReview).toBe(false);
    });

    it('should use SERVER_WINS for imaging metadata', async () => {
      const conflict = await resolver.detectConflict(
        'imaging-metadata',
        { dicom_id: 'old-hash' },
        { dicom_id: 'new-hash' },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('SERVER_WINS');
    });

    it('should use LAST_WRITE_WINS for active encounters', async () => {
      const conflict = await resolver.detectConflict(
        'encounter-active',
        { status: 'in-progress' },
        { status: 'updated' },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('LOCAL_WINS');
    });

    it('should require MANUAL_REVIEW for clinical notes', async () => {
      const conflict = await resolver.detectConflict(
        'clinical-notes',
        { note: 'Local note' },
        { note: 'Server note' },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('MANUAL');
      expect(conflict?.requiresHumanReview).toBe(true);
    });

    it('should default to MANUAL_REVIEW for unknown types', async () => {
      const conflict = await resolver.detectConflict(
        'unknown-resource' as any,
        { data: 'local' },
        { data: 'server' },
      );

      const resolution = await resolver.resolve(conflict!);
      expect(resolution).toBe('MANUAL');
    });
  });

  describe('Conflict Storage and Retrieval', () => {
    it('should store conflicts for later review', async () => {
      const conflict = await resolver.detectConflict(
        'active-medications',
        { med: 'aspirin' },
        { med: 'ibuprofen' },
      );

      resolver.addConflict(conflict!);

      const retrieved = resolver.getConflict(conflict!.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(conflict!.id);
    });

    it('should retrieve all pending conflicts', async () => {
      const conflict1 = await resolver.detectConflict(
        'active-medications',
        { med: 'aspirin' },
        { med: 'ibuprofen' },
      );

      const conflict2 = await resolver.detectConflict(
        'clinical-notes',
        { note: 'local' },
        { note: 'server' },
      );

      resolver.addConflict(conflict1!);
      resolver.addConflict(conflict2!);

      const pending = resolver.getPendingConflicts();
      expect(pending.length).toBe(2);
      expect(pending.every((c) => c.resolution === 'PENDING')).toBe(true);
    });

    it('should retrieve conflicts requiring review', async () => {
      const medConflict = await resolver.detectConflict(
        'active-medications',
        { med: 'aspirin' },
        { med: 'ibuprofen' },
      );

      const demoConflict = await resolver.detectConflict(
        'patient-demographics',
        { name: 'John' },
        { name: 'Jane' },
      );

      resolver.addConflict(medConflict!);
      resolver.addConflict(demoConflict!);

      const requireingReview = resolver.getConflictsRequiringReview();
      expect(requireingReview.length).toBe(1); // Only medication conflict requires review
      expect(requireingReview[0].resourceType).toBe('active-medications');
    });
  });

  describe('Manual Conflict Resolution', () => {
    it('should allow manual resolution to LOCAL_WINS', async () => {
      const conflict = await resolver.detectConflict(
        'clinical-notes',
        { note: 'local version' },
        { note: 'server version' },
      );

      resolver.addConflict(conflict!);

      const resolved = await resolver.manuallyResolve(
        conflict!.id,
        'LOCAL_WINS',
        'dr-smith',
      );

      expect(resolved?.resolution).toBe('LOCAL_WINS');
      expect(resolved?.assignedTo).toBe('dr-smith');
    });

    it('should allow manual resolution to SERVER_WINS', async () => {
      const conflict = await resolver.detectConflict(
        'clinical-notes',
        { note: 'local version' },
        { note: 'server version' },
      );

      resolver.addConflict(conflict!);

      const resolved = await resolver.manuallyResolve(conflict!.id, 'SERVER_WINS');

      expect(resolved?.resolution).toBe('SERVER_WINS');
    });

    it('should clear resolved conflicts', async () => {
      const conflict1 = await resolver.detectConflict(
        'active-medications',
        { med: 'aspirin' },
        { med: 'ibuprofen' },
      );

      const conflict2 = await resolver.detectConflict(
        'clinical-notes',
        { note: 'local' },
        { note: 'server' },
      );

      resolver.addConflict(conflict1!);
      resolver.addConflict(conflict2!);

      await resolver.manuallyResolve(conflict1!.id, 'LOCAL_WINS');

      let pending = resolver.getPendingConflicts();
      expect(pending.length).toBe(1);

      resolver.clearResolved();

      pending = resolver.getPendingConflicts();
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(conflict2!.id);
    });
  });

  describe('Merge Suggestions', () => {
    it('should not suggest auto-merge for medications', async () => {
      const suggestions = await resolver.suggestMerge(
        { med: 'aspirin', dose: '500mg' },
        { med: 'aspirin', dose: '250mg' },
        'active-medications',
      );

      expect(suggestions.canAutoMerge).toBe(false);
      expect(suggestions.requiresManualMerge).toBe(true);
    });

    it('should not suggest auto-merge for clinical notes', async () => {
      const suggestions = await resolver.suggestMerge(
        { note: 'local note' },
        { note: 'server note' },
        'clinical-notes',
      );

      expect(suggestions.canAutoMerge).toBe(false);
      expect(suggestions.requiresManualMerge).toBe(true);
    });

    it('should provide specific differences for other resources', async () => {
      const suggestions = await resolver.suggestMerge(
        { name: 'John', age: 30 },
        { name: 'John', age: 31 },
        'patient-demographics',
      );

      expect(suggestions.canAutoMerge).toBe(false);
      expect(suggestions.suggestions.some((s) => s.includes('age'))).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track conflict statistics', async () => {
      const conflict1 = await resolver.detectConflict(
        'active-medications',
        { med: 'aspirin' },
        { med: 'ibuprofen' },
      );

      const conflict2 = await resolver.detectConflict(
        'patient-demographics',
        { name: 'John' },
        { name: 'Jane' },
      );

      resolver.addConflict(conflict1!);
      resolver.addConflict(conflict2!);

      await resolver.manuallyResolve(conflict1!.id, 'LOCAL_WINS');

      const stats = resolver.getStatistics();

      expect(stats.totalConflicts).toBe(2);
      expect(stats.pendingConflicts).toBe(1);
      expect(stats.requiresManualReview).toBe(0); // conflict1 was resolved
      expect(stats.resolvedConflicts).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle complex nested objects', async () => {
      const localVersion = {
        patient: {
          demographics: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'Springfield',
            },
          },
        },
      };

      const serverVersion = {
        patient: {
          demographics: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'Shelbyville',
            },
          },
        },
      };

      const conflict = await resolver.detectConflict(
        'patient-demographics',
        localVersion,
        serverVersion,
      );

      expect(conflict).not.toBeNull();
      expect(JSON.stringify(conflict?.localVersion)).not.toBe(
        JSON.stringify(conflict?.serverVersion),
      );
    });

    it('should handle null/undefined values', async () => {
      const conflict1 = await resolver.detectConflict(
        'vital-signs',
        { heart_rate: null },
        { heart_rate: 72 },
      );

      const conflict2 = await resolver.detectConflict(
        'vital-signs',
        { heart_rate: undefined },
        { heart_rate: 72 },
      );

      expect(conflict1).not.toBeNull();
      expect(conflict2).not.toBeNull();
    });

    it('should handle array values', async () => {
      const conflict = await resolver.detectConflict(
        'clinical-notes',
        { medications: ['aspirin', 'ibuprofen'] },
        { medications: ['aspirin', 'acetaminophen'] },
      );

      expect(conflict).not.toBeNull();
    });
  });
});
