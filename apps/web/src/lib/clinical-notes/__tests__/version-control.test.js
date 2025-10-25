"use strict";
/**
 * Unit Tests: Clinical Note Version Control
 * Tests version history, change tracking, and blockchain integrity
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const version_control_1 = require("../version-control");
(0, globals_1.describe)('Clinical Note Version Control', () => {
    // ===========================================================================
    // Hash Calculation Tests (Blockchain Integrity)
    // ===========================================================================
    (0, globals_1.describe)('calculateNoteHash', () => {
        (0, globals_1.it)('should generate consistent SHA-256 hash for same content', () => {
            const note = {
                type: 'PROGRESS',
                subjective: 'Patient reports feeling better',
                objective: 'BP: 120/80, HR: 72',
                assessment: 'Hypertension well-controlled',
                plan: 'Continue current medications',
                chiefComplaint: 'Follow-up visit',
                diagnosis: ['I10 - Essential hypertension'],
            };
            const hash1 = (0, version_control_1.calculateNoteHash)(note);
            const hash2 = (0, version_control_1.calculateNoteHash)(note);
            (0, globals_1.expect)(hash1).toBe(hash2);
            (0, globals_1.expect)(hash1).toHaveLength(64); // SHA-256 is 64 hex characters
            (0, globals_1.expect)(hash1).toMatch(/^[a-f0-9]{64}$/); // Hexadecimal string
        });
        (0, globals_1.it)('should generate different hash for different content', () => {
            const note1 = {
                type: 'PROGRESS',
                subjective: 'Patient reports feeling better',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const note2 = {
                type: 'PROGRESS',
                subjective: 'Patient reports feeling worse',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const hash1 = (0, version_control_1.calculateNoteHash)(note1);
            const hash2 = (0, version_control_1.calculateNoteHash)(note2);
            (0, globals_1.expect)(hash1).not.toBe(hash2);
        });
        (0, globals_1.it)('should handle null values in note fields', () => {
            const note = {
                type: 'PROGRESS',
                subjective: null,
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const hash = (0, version_control_1.calculateNoteHash)(note);
            (0, globals_1.expect)(hash).toBeDefined();
            (0, globals_1.expect)(hash).toHaveLength(64);
        });
        (0, globals_1.it)('should sort diagnosis array for consistent hashing', () => {
            const note1 = {
                type: 'PROGRESS',
                subjective: 'Test',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: ['A', 'B', 'C'],
            };
            const note2 = {
                type: 'PROGRESS',
                subjective: 'Test',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: ['C', 'A', 'B'], // Different order
            };
            const hash1 = (0, version_control_1.calculateNoteHash)(note1);
            const hash2 = (0, version_control_1.calculateNoteHash)(note2);
            // Should be the same since diagnosis is sorted
            (0, globals_1.expect)(hash1).toBe(hash2);
        });
        (0, globals_1.it)('should be sensitive to note type changes', () => {
            const note1 = {
                type: 'PROGRESS',
                subjective: 'Test',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const note2 = {
                type: 'CONSULTATION',
                subjective: 'Test',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const hash1 = (0, version_control_1.calculateNoteHash)(note1);
            const hash2 = (0, version_control_1.calculateNoteHash)(note2);
            (0, globals_1.expect)(hash1).not.toBe(hash2);
        });
    });
    // ===========================================================================
    // Change Detection Tests (Field-Level Tracking)
    // ===========================================================================
    (0, globals_1.describe)('getChangedFields', () => {
        (0, globals_1.it)('should detect single field change', () => {
            const oldNote = {
                type: 'PROGRESS',
                subjective: 'Patient reports pain',
                objective: 'BP: 120/80',
                assessment: 'Stable',
                plan: 'Continue',
                chiefComplaint: 'Pain',
                diagnosis: ['I10'],
            };
            const newNote = {
                ...oldNote,
                subjective: 'Patient reports no pain', // Changed
            };
            const changed = (0, version_control_1.getChangedFields)(oldNote, newNote);
            (0, globals_1.expect)(changed).toEqual(['subjective']);
        });
        (0, globals_1.it)('should detect multiple field changes', () => {
            const oldNote = {
                type: 'PROGRESS',
                subjective: 'Old subjective',
                objective: 'Old objective',
                assessment: 'Old assessment',
                plan: 'Old plan',
                chiefComplaint: 'Old complaint',
                diagnosis: ['I10'],
            };
            const newNote = {
                type: 'PROGRESS',
                subjective: 'New subjective', // Changed
                objective: 'Old objective',
                assessment: 'New assessment', // Changed
                plan: 'New plan', // Changed
                chiefComplaint: 'Old complaint',
                diagnosis: ['I10'],
            };
            const changed = (0, version_control_1.getChangedFields)(oldNote, newNote);
            (0, globals_1.expect)(changed).toHaveLength(3);
            (0, globals_1.expect)(changed).toContain('subjective');
            (0, globals_1.expect)(changed).toContain('assessment');
            (0, globals_1.expect)(changed).toContain('plan');
        });
        (0, globals_1.it)('should detect no changes when notes are identical', () => {
            const note = {
                type: 'PROGRESS',
                subjective: 'Test',
                objective: 'Test',
                assessment: 'Test',
                plan: 'Test',
                chiefComplaint: 'Test',
                diagnosis: ['I10'],
            };
            const changed = (0, version_control_1.getChangedFields)(note, note);
            (0, globals_1.expect)(changed).toEqual([]);
        });
        (0, globals_1.it)('should detect diagnosis array changes', () => {
            const oldNote = {
                type: 'PROGRESS',
                subjective: 'Test',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: ['I10'],
            };
            const newNote = {
                ...oldNote,
                diagnosis: ['I10', 'E11.9'], // Added diagnosis
            };
            const changed = (0, version_control_1.getChangedFields)(oldNote, newNote);
            (0, globals_1.expect)(changed).toContain('diagnosis');
        });
        (0, globals_1.it)('should detect note type changes', () => {
            const oldNote = {
                type: 'PROGRESS',
                subjective: 'Test',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const newNote = {
                ...oldNote,
                type: 'CONSULTATION',
            };
            const changed = (0, version_control_1.getChangedFields)(oldNote, newNote);
            (0, globals_1.expect)(changed).toContain('type');
        });
        (0, globals_1.it)('should handle null to value changes', () => {
            const oldNote = {
                type: 'PROGRESS',
                subjective: null,
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const newNote = {
                ...oldNote,
                subjective: 'New content',
            };
            const changed = (0, version_control_1.getChangedFields)(oldNote, newNote);
            (0, globals_1.expect)(changed).toContain('subjective');
        });
        (0, globals_1.it)('should handle value to null changes', () => {
            const oldNote = {
                type: 'PROGRESS',
                subjective: 'Old content',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const newNote = {
                ...oldNote,
                subjective: null,
            };
            const changed = (0, version_control_1.getChangedFields)(oldNote, newNote);
            (0, globals_1.expect)(changed).toContain('subjective');
        });
    });
    // ===========================================================================
    // Change Summary Tests (Human-Readable)
    // ===========================================================================
    (0, globals_1.describe)('generateChangesSummary', () => {
        (0, globals_1.it)('should generate summary for single field change', () => {
            const changes = ['subjective'];
            const summary = (0, version_control_1.generateChangesSummary)(changes);
            (0, globals_1.expect)(summary).toBe('Updated Subjective (S)');
        });
        (0, globals_1.it)('should generate summary for two field changes', () => {
            const changes = ['subjective', 'objective'];
            const summary = (0, version_control_1.generateChangesSummary)(changes);
            (0, globals_1.expect)(summary).toBe('Updated Subjective (S) and Objective (O)');
        });
        (0, globals_1.it)('should generate summary for three or more field changes', () => {
            const changes = ['subjective', 'objective', 'assessment'];
            const summary = (0, version_control_1.generateChangesSummary)(changes);
            (0, globals_1.expect)(summary).toBe('Updated Subjective (S), Objective (O), and Assessment (A)');
        });
        (0, globals_1.it)('should generate summary for all SOAP fields', () => {
            const changes = ['subjective', 'objective', 'assessment', 'plan'];
            const summary = (0, version_control_1.generateChangesSummary)(changes);
            (0, globals_1.expect)(summary).toContain('Subjective');
            (0, globals_1.expect)(summary).toContain('Objective');
            (0, globals_1.expect)(summary).toContain('Assessment');
            (0, globals_1.expect)(summary).toContain('Plan');
        });
        (0, globals_1.it)('should handle empty changes array', () => {
            const changes = [];
            const summary = (0, version_control_1.generateChangesSummary)(changes);
            (0, globals_1.expect)(summary).toBe('No changes');
        });
        (0, globals_1.it)('should handle diagnosis changes', () => {
            const changes = ['diagnosis'];
            const summary = (0, version_control_1.generateChangesSummary)(changes);
            (0, globals_1.expect)(summary).toBe('Updated Diagnosis');
        });
        (0, globals_1.it)('should handle chief complaint changes', () => {
            const changes = ['chiefComplaint'];
            const summary = (0, version_control_1.generateChangesSummary)(changes);
            (0, globals_1.expect)(summary).toBe('Updated Chief Complaint');
        });
        (0, globals_1.it)('should handle note type changes', () => {
            const changes = ['type'];
            const summary = (0, version_control_1.generateChangesSummary)(changes);
            (0, globals_1.expect)(summary).toBe('Updated Note Type');
        });
    });
    // ===========================================================================
    // Integration Tests (Hash Chaining)
    // ===========================================================================
    (0, globals_1.describe)('Hash Chaining (Blockchain-Style)', () => {
        (0, globals_1.it)('should create different hashes for sequential versions', () => {
            const version1 = {
                type: 'PROGRESS',
                subjective: 'Version 1',
                objective: null,
                assessment: null,
                plan: null,
                chiefComplaint: null,
                diagnosis: [],
            };
            const version2 = {
                ...version1,
                subjective: 'Version 2',
            };
            const version3 = {
                ...version1,
                subjective: 'Version 3',
            };
            const hash1 = (0, version_control_1.calculateNoteHash)(version1);
            const hash2 = (0, version_control_1.calculateNoteHash)(version2);
            const hash3 = (0, version_control_1.calculateNoteHash)(version3);
            // All hashes should be different
            (0, globals_1.expect)(hash1).not.toBe(hash2);
            (0, globals_1.expect)(hash2).not.toBe(hash3);
            (0, globals_1.expect)(hash1).not.toBe(hash3);
            // All hashes should be valid SHA-256
            (0, globals_1.expect)(hash1).toMatch(/^[a-f0-9]{64}$/);
            (0, globals_1.expect)(hash2).toMatch(/^[a-f0-9]{64}$/);
            (0, globals_1.expect)(hash3).toMatch(/^[a-f0-9]{64}$/);
        });
    });
});
//# sourceMappingURL=version-control.test.js.map