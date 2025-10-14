/**
 * Unit Tests: Clinical Note Version Control
 * Tests version history, change tracking, and blockchain integrity
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  calculateNoteHash,
  getChangedFields,
  generateChangesSummary,
} from '../version-control';
import type { NoteType } from '@prisma/client';

describe('Clinical Note Version Control', () => {
  // ===========================================================================
  // Hash Calculation Tests (Blockchain Integrity)
  // ===========================================================================

  describe('calculateNoteHash', () => {
    it('should generate consistent SHA-256 hash for same content', () => {
      const note = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Patient reports feeling better',
        objective: 'BP: 120/80, HR: 72',
        assessment: 'Hypertension well-controlled',
        plan: 'Continue current medications',
        chiefComplaint: 'Follow-up visit',
        diagnosis: ['I10 - Essential hypertension'],
      };

      const hash1 = calculateNoteHash(note);
      const hash2 = calculateNoteHash(note);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 is 64 hex characters
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // Hexadecimal string
    });

    it('should generate different hash for different content', () => {
      const note1 = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Patient reports feeling better',
        objective: null,
        assessment: null,
        plan: null,
        chiefComplaint: null,
        diagnosis: [],
      };

      const note2 = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Patient reports feeling worse',
        objective: null,
        assessment: null,
        plan: null,
        chiefComplaint: null,
        diagnosis: [],
      };

      const hash1 = calculateNoteHash(note1);
      const hash2 = calculateNoteHash(note2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle null values in note fields', () => {
      const note = {
        type: 'PROGRESS' as NoteType,
        subjective: null,
        objective: null,
        assessment: null,
        plan: null,
        chiefComplaint: null,
        diagnosis: [],
      };

      const hash = calculateNoteHash(note);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should sort diagnosis array for consistent hashing', () => {
      const note1 = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Test',
        objective: null,
        assessment: null,
        plan: null,
        chiefComplaint: null,
        diagnosis: ['A', 'B', 'C'],
      };

      const note2 = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Test',
        objective: null,
        assessment: null,
        plan: null,
        chiefComplaint: null,
        diagnosis: ['C', 'A', 'B'], // Different order
      };

      const hash1 = calculateNoteHash(note1);
      const hash2 = calculateNoteHash(note2);

      // Should be the same since diagnosis is sorted
      expect(hash1).toBe(hash2);
    });

    it('should be sensitive to note type changes', () => {
      const note1 = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Test',
        objective: null,
        assessment: null,
        plan: null,
        chiefComplaint: null,
        diagnosis: [],
      };

      const note2 = {
        type: 'CONSULTATION' as NoteType,
        subjective: 'Test',
        objective: null,
        assessment: null,
        plan: null,
        chiefComplaint: null,
        diagnosis: [],
      };

      const hash1 = calculateNoteHash(note1);
      const hash2 = calculateNoteHash(note2);

      expect(hash1).not.toBe(hash2);
    });
  });

  // ===========================================================================
  // Change Detection Tests (Field-Level Tracking)
  // ===========================================================================

  describe('getChangedFields', () => {
    it('should detect single field change', () => {
      const oldNote = {
        type: 'PROGRESS' as NoteType,
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

      const changed = getChangedFields(oldNote, newNote);

      expect(changed).toEqual(['subjective']);
    });

    it('should detect multiple field changes', () => {
      const oldNote = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Old subjective',
        objective: 'Old objective',
        assessment: 'Old assessment',
        plan: 'Old plan',
        chiefComplaint: 'Old complaint',
        diagnosis: ['I10'],
      };

      const newNote = {
        type: 'PROGRESS' as NoteType,
        subjective: 'New subjective', // Changed
        objective: 'Old objective',
        assessment: 'New assessment', // Changed
        plan: 'New plan', // Changed
        chiefComplaint: 'Old complaint',
        diagnosis: ['I10'],
      };

      const changed = getChangedFields(oldNote, newNote);

      expect(changed).toHaveLength(3);
      expect(changed).toContain('subjective');
      expect(changed).toContain('assessment');
      expect(changed).toContain('plan');
    });

    it('should detect no changes when notes are identical', () => {
      const note = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Test',
        objective: 'Test',
        assessment: 'Test',
        plan: 'Test',
        chiefComplaint: 'Test',
        diagnosis: ['I10'],
      };

      const changed = getChangedFields(note, note);

      expect(changed).toEqual([]);
    });

    it('should detect diagnosis array changes', () => {
      const oldNote = {
        type: 'PROGRESS' as NoteType,
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

      const changed = getChangedFields(oldNote, newNote);

      expect(changed).toContain('diagnosis');
    });

    it('should detect note type changes', () => {
      const oldNote = {
        type: 'PROGRESS' as NoteType,
        subjective: 'Test',
        objective: null,
        assessment: null,
        plan: null,
        chiefComplaint: null,
        diagnosis: [],
      };

      const newNote = {
        ...oldNote,
        type: 'CONSULTATION' as NoteType,
      };

      const changed = getChangedFields(oldNote, newNote);

      expect(changed).toContain('type');
    });

    it('should handle null to value changes', () => {
      const oldNote = {
        type: 'PROGRESS' as NoteType,
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

      const changed = getChangedFields(oldNote, newNote);

      expect(changed).toContain('subjective');
    });

    it('should handle value to null changes', () => {
      const oldNote = {
        type: 'PROGRESS' as NoteType,
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

      const changed = getChangedFields(oldNote, newNote);

      expect(changed).toContain('subjective');
    });
  });

  // ===========================================================================
  // Change Summary Tests (Human-Readable)
  // ===========================================================================

  describe('generateChangesSummary', () => {
    it('should generate summary for single field change', () => {
      const changes = ['subjective'];
      const summary = generateChangesSummary(changes);

      expect(summary).toBe('Updated Subjective (S)');
    });

    it('should generate summary for two field changes', () => {
      const changes = ['subjective', 'objective'];
      const summary = generateChangesSummary(changes);

      expect(summary).toBe('Updated Subjective (S) and Objective (O)');
    });

    it('should generate summary for three or more field changes', () => {
      const changes = ['subjective', 'objective', 'assessment'];
      const summary = generateChangesSummary(changes);

      expect(summary).toBe('Updated Subjective (S), Objective (O), and Assessment (A)');
    });

    it('should generate summary for all SOAP fields', () => {
      const changes = ['subjective', 'objective', 'assessment', 'plan'];
      const summary = generateChangesSummary(changes);

      expect(summary).toContain('Subjective');
      expect(summary).toContain('Objective');
      expect(summary).toContain('Assessment');
      expect(summary).toContain('Plan');
    });

    it('should handle empty changes array', () => {
      const changes: string[] = [];
      const summary = generateChangesSummary(changes);

      expect(summary).toBe('No changes');
    });

    it('should handle diagnosis changes', () => {
      const changes = ['diagnosis'];
      const summary = generateChangesSummary(changes);

      expect(summary).toBe('Updated Diagnosis');
    });

    it('should handle chief complaint changes', () => {
      const changes = ['chiefComplaint'];
      const summary = generateChangesSummary(changes);

      expect(summary).toBe('Updated Chief Complaint');
    });

    it('should handle note type changes', () => {
      const changes = ['type'];
      const summary = generateChangesSummary(changes);

      expect(summary).toBe('Updated Note Type');
    });
  });

  // ===========================================================================
  // Integration Tests (Hash Chaining)
  // ===========================================================================

  describe('Hash Chaining (Blockchain-Style)', () => {
    it('should create different hashes for sequential versions', () => {
      const version1 = {
        type: 'PROGRESS' as NoteType,
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

      const hash1 = calculateNoteHash(version1);
      const hash2 = calculateNoteHash(version2);
      const hash3 = calculateNoteHash(version3);

      // All hashes should be different
      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
      expect(hash1).not.toBe(hash3);

      // All hashes should be valid SHA-256
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash2).toMatch(/^[a-f0-9]{64}$/);
      expect(hash3).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
