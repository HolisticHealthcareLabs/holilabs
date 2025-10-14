/**
 * Clinical Note Version Control
 * HIPAA-compliant audit trail for all note edits
 */

import { prisma } from '../prisma';
import crypto from 'crypto';
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
export function calculateNoteHash(note: NoteSnapshot): string {
  const content = JSON.stringify({
    type: note.type,
    subjective: note.subjective,
    objective: note.objective,
    assessment: note.assessment,
    plan: note.plan,
    chiefComplaint: note.chiefComplaint,
    diagnosis: note.diagnosis.sort(), // Sort for consistent hashing
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Compare two note snapshots and return changed fields
 */
export function getChangedFields(
  oldNote: NoteSnapshot,
  newNote: NoteSnapshot
): string[] {
  const changed: string[] = [];

  if (oldNote.type !== newNote.type) changed.push('type');
  if (oldNote.subjective !== newNote.subjective) changed.push('subjective');
  if (oldNote.objective !== newNote.objective) changed.push('objective');
  if (oldNote.assessment !== newNote.assessment) changed.push('assessment');
  if (oldNote.plan !== newNote.plan) changed.push('plan');
  if (oldNote.chiefComplaint !== newNote.chiefComplaint)
    changed.push('chiefComplaint');

  // Compare diagnosis arrays
  const oldDiag = [...oldNote.diagnosis].sort();
  const newDiag = [...newNote.diagnosis].sort();
  if (JSON.stringify(oldDiag) !== JSON.stringify(newDiag)) {
    changed.push('diagnosis');
  }

  return changed;
}

/**
 * Generate human-readable summary of changes
 */
export function generateChangesSummary(changedFields: string[]): string {
  if (changedFields.length === 0) return 'No changes';

  const fieldNames: Record<string, string> = {
    type: 'Note Type',
    subjective: 'Subjective (S)',
    objective: 'Objective (O)',
    assessment: 'Assessment (A)',
    plan: 'Plan (P)',
    chiefComplaint: 'Chief Complaint',
    diagnosis: 'Diagnosis',
  };

  const readableFields = changedFields.map((f) => fieldNames[f] || f);

  if (readableFields.length === 1) {
    return `Updated ${readableFields[0]}`;
  } else if (readableFields.length === 2) {
    return `Updated ${readableFields[0]} and ${readableFields[1]}`;
  } else {
    const last = readableFields.pop();
    return `Updated ${readableFields.join(', ')}, and ${last}`;
  }
}

/**
 * Create a version snapshot when a note is updated
 */
export async function createNoteVersion(params: {
  noteId: string;
  oldNote: NoteSnapshot;
  newNote: NoteSnapshot;
  changedBy: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const { noteId, oldNote, newNote, changedBy, ipAddress, userAgent } = params;

  // Get current version number
  const latestVersion = await prisma.clinicalNoteVersion.findFirst({
    where: { noteId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true, noteHash: true },
  });

  const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;
  const previousHash = latestVersion?.noteHash;

  // Calculate hashes
  const oldHash = calculateNoteHash(oldNote);
  const newHash = calculateNoteHash(newNote);

  // Only create version if content actually changed
  if (oldHash === newHash) {
    return;
  }

  const changedFields = getChangedFields(oldNote, newNote);
  const changesSummary = generateChangesSummary(changedFields);

  // Create version record (snapshot of OLD version before the change)
  await prisma.clinicalNoteVersion.create({
    data: {
      noteId,
      versionNumber,
      changedBy,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      // Snapshot of OLD content
      type: oldNote.type,
      subjective: oldNote.subjective,
      objective: oldNote.objective,
      assessment: oldNote.assessment,
      plan: oldNote.plan,
      chiefComplaint: oldNote.chiefComplaint,
      diagnosis: oldNote.diagnosis,
      // Change metadata
      changedFields,
      changesSummary,
      // Blockchain
      noteHash: oldHash,
      previousHash,
    },
  });
}

/**
 * Get all versions for a clinical note
 */
export async function getNoteVersions(noteId: string) {
  return prisma.clinicalNoteVersion.findMany({
    where: { noteId },
    include: {
      changedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
    orderBy: { versionNumber: 'desc' },
  });
}

/**
 * Get a specific version
 */
export async function getNoteVersion(noteId: string, versionId: string) {
  return prisma.clinicalNoteVersion.findFirst({
    where: {
      id: versionId,
      noteId,
    },
    include: {
      changedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Rollback note to a specific version
 * Only administrators can perform rollbacks
 */
export async function rollbackToVersion(params: {
  noteId: string;
  versionId: string;
  rolledBackBy: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<ClinicalNote> {
  const { noteId, versionId, rolledBackBy, ipAddress, userAgent } = params;

  // Get the version to rollback to
  const version = await prisma.clinicalNoteVersion.findFirst({
    where: {
      id: versionId,
      noteId,
    },
  });

  if (!version) {
    throw new Error('Version not found');
  }

  // Get current note state (for version history)
  const currentNote = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
  });

  if (!currentNote) {
    throw new Error('Note not found');
  }

  // Create version snapshot of current state before rollback
  await createNoteVersion({
    noteId,
    oldNote: {
      type: currentNote.type,
      subjective: currentNote.subjective,
      objective: currentNote.objective,
      assessment: currentNote.assessment,
      plan: currentNote.plan,
      chiefComplaint: currentNote.chiefComplaint,
      diagnosis: currentNote.diagnosis,
    },
    newNote: {
      type: version.type,
      subjective: version.subjective,
      objective: version.objective,
      assessment: version.assessment,
      plan: version.plan,
      chiefComplaint: version.chiefComplaint,
      diagnosis: version.diagnosis,
    },
    changedBy: rolledBackBy,
    ipAddress,
    userAgent,
  });

  // Rollback note to version content
  const updatedNote = await prisma.clinicalNote.update({
    where: { id: noteId },
    data: {
      type: version.type,
      subjective: version.subjective,
      objective: version.objective,
      assessment: version.assessment,
      plan: version.plan,
      chiefComplaint: version.chiefComplaint,
      diagnosis: version.diagnosis,
      noteHash: version.noteHash,
    },
  });

  return updatedNote;
}
