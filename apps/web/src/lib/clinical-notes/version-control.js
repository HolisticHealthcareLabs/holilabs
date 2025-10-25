"use strict";
/**
 * Clinical Note Version Control
 * HIPAA-compliant audit trail for all note edits
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNoteHash = calculateNoteHash;
exports.getChangedFields = getChangedFields;
exports.generateChangesSummary = generateChangesSummary;
exports.createNoteVersion = createNoteVersion;
exports.getNoteVersions = getNoteVersions;
exports.getNoteVersion = getNoteVersion;
exports.rollbackToVersion = rollbackToVersion;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Calculate hash of note content for blockchain integrity
 */
function calculateNoteHash(note) {
    const content = JSON.stringify({
        type: note.type,
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        chiefComplaint: note.chiefComplaint,
        diagnosis: note.diagnosis.sort(), // Sort for consistent hashing
    });
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
/**
 * Compare two note snapshots and return changed fields
 */
function getChangedFields(oldNote, newNote) {
    const changed = [];
    if (oldNote.type !== newNote.type)
        changed.push('type');
    if (oldNote.subjective !== newNote.subjective)
        changed.push('subjective');
    if (oldNote.objective !== newNote.objective)
        changed.push('objective');
    if (oldNote.assessment !== newNote.assessment)
        changed.push('assessment');
    if (oldNote.plan !== newNote.plan)
        changed.push('plan');
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
function generateChangesSummary(changedFields) {
    if (changedFields.length === 0)
        return 'No changes';
    const fieldNames = {
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
    }
    else if (readableFields.length === 2) {
        return `Updated ${readableFields[0]} and ${readableFields[1]}`;
    }
    else {
        const last = readableFields.pop();
        return `Updated ${readableFields.join(', ')}, and ${last}`;
    }
}
/**
 * Create a version snapshot when a note is updated
 */
async function createNoteVersion(params) {
    const { noteId, oldNote, newNote, changedBy, ipAddress, userAgent } = params;
    // Get current version number
    const latestVersion = await prisma_1.prisma.clinicalNoteVersion.findFirst({
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
    await prisma_1.prisma.clinicalNoteVersion.create({
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
async function getNoteVersions(noteId) {
    return prisma_1.prisma.clinicalNoteVersion.findMany({
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
async function getNoteVersion(noteId, versionId) {
    return prisma_1.prisma.clinicalNoteVersion.findFirst({
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
async function rollbackToVersion(params) {
    const { noteId, versionId, rolledBackBy, ipAddress, userAgent } = params;
    // Get the version to rollback to
    const version = await prisma_1.prisma.clinicalNoteVersion.findFirst({
        where: {
            id: versionId,
            noteId,
        },
    });
    if (!version) {
        throw new Error('Version not found');
    }
    // Get current note state (for version history)
    const currentNote = await prisma_1.prisma.clinicalNote.findUnique({
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
    const updatedNote = await prisma_1.prisma.clinicalNote.update({
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
//# sourceMappingURL=version-control.js.map