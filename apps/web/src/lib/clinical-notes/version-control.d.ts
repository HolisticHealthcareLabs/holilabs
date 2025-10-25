/**
 * Clinical Note Version Control
 * HIPAA-compliant audit trail for all note edits
 */
import type { ClinicalNote, NoteType } from '@prisma/client';
interface NoteSnapshot {
    type: NoteType;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    chiefComplaint: string | null;
    diagnosis: string[];
}
/**
 * Calculate hash of note content for blockchain integrity
 */
export declare function calculateNoteHash(note: NoteSnapshot): string;
/**
 * Compare two note snapshots and return changed fields
 */
export declare function getChangedFields(oldNote: NoteSnapshot, newNote: NoteSnapshot): string[];
/**
 * Generate human-readable summary of changes
 */
export declare function generateChangesSummary(changedFields: string[]): string;
/**
 * Create a version snapshot when a note is updated
 */
export declare function createNoteVersion(params: {
    noteId: string;
    oldNote: NoteSnapshot;
    newNote: NoteSnapshot;
    changedBy: string;
    ipAddress?: string;
    userAgent?: string;
}): Promise<void>;
/**
 * Get all versions for a clinical note
 */
export declare function getNoteVersions(noteId: string): Promise<any>;
/**
 * Get a specific version
 */
export declare function getNoteVersion(noteId: string, versionId: string): Promise<any>;
/**
 * Rollback note to a specific version
 * Only administrators can perform rollbacks
 */
export declare function rollbackToVersion(params: {
    noteId: string;
    versionId: string;
    rolledBackBy: string;
    ipAddress?: string;
    userAgent?: string;
}): Promise<ClinicalNote>;
export {};
//# sourceMappingURL=version-control.d.ts.map