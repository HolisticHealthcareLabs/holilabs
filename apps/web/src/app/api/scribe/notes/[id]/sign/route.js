"use strict";
/**
 * SOAP Note Signature API
 *
 * POST /api/scribe/notes/:id/sign - Sign and finalize SOAP note
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
const crypto_1 = require("crypto");
exports.dynamic = 'force-dynamic';
/**
 * POST /api/scribe/notes/:id/sign
 * Sign SOAP note (makes it immutable)
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const noteId = context.params.id;
        const body = await request.json();
        const { signatureMethod, pin } = body;
        if (!signatureMethod || !pin) {
            return server_1.NextResponse.json({ error: 'Signature method and PIN are required' }, { status: 400 });
        }
        // Verify note belongs to this clinician
        const note = await prisma_1.prisma.sOAPNote.findFirst({
            where: {
                id: noteId,
                clinicianId: context.user.id,
            },
        });
        if (!note) {
            return server_1.NextResponse.json({ error: 'SOAP note not found or access denied' }, { status: 404 });
        }
        // Can't re-sign signed notes
        if (note.status === 'SIGNED') {
            return server_1.NextResponse.json({ error: 'Note is already signed' }, { status: 400 });
        }
        // Validate PIN (in production, verify against stored hash)
        if (pin.length < 4) {
            return server_1.NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
        }
        // Hash the PIN for storage (never store plain text)
        const pinHash = (0, crypto_1.createHash)('sha256').update(pin).digest('hex');
        // Update note with signature
        const signedNote = await prisma_1.prisma.sOAPNote.update({
            where: { id: noteId },
            data: {
                status: 'SIGNED',
                signedAt: new Date(),
                signedBy: context.user.id,
                signatureMethod,
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
                action: 'SIGN',
                resource: 'SOAPNote',
                resourceId: noteId,
                details: {
                    signatureMethod,
                    noteHash: note.noteHash,
                },
                dataHash: note.noteHash,
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                id: signedNote.id,
                status: signedNote.status,
                signedAt: signedNote.signedAt,
                signedBy: signedNote.signedBy,
            },
            message: 'SOAP note signed successfully',
        });
    }
    catch (error) {
        console.error('Error signing SOAP note:', error);
        return server_1.NextResponse.json({ error: 'Failed to sign SOAP note', message: error.message }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map