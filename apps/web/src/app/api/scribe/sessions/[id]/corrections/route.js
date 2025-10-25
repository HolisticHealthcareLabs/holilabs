"use strict";
/**
 * Scribe Session Corrections API
 *
 * POST /api/scribe/sessions/:id/corrections - Save transcript segment correction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
/**
 * POST /api/scribe/sessions/:id/corrections
 * Save a correction to a transcript segment
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const sessionId = context.params.id;
        const body = await request.json();
        const { segmentIndex, originalText, correctedText, confidence, speaker, startTime, endTime, } = body;
        // Validate required fields
        if (segmentIndex === undefined ||
            !originalText ||
            !correctedText ||
            confidence === undefined) {
            return server_1.NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        // Verify session belongs to this clinician
        const session = await prisma_1.prisma.scribeSession.findFirst({
            where: {
                id: sessionId,
                clinicianId: context.user.id,
            },
            include: {
                transcription: true,
            },
        });
        if (!session) {
            return server_1.NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
        }
        if (!session.transcription) {
            return server_1.NextResponse.json({ error: 'No transcription found for this session' }, { status: 404 });
        }
        // Get current segments
        const segments = session.transcription.segments;
        if (!Array.isArray(segments) || segmentIndex >= segments.length) {
            return server_1.NextResponse.json({ error: 'Invalid segment index' }, { status: 400 });
        }
        // Update the segment with corrected text
        const updatedSegments = [...segments];
        updatedSegments[segmentIndex] = {
            ...updatedSegments[segmentIndex],
            text: correctedText,
            originalText: originalText, // Store original for reference
            correctedAt: new Date().toISOString(),
            correctedBy: context.user.id,
        };
        // Update transcription in database
        await prisma_1.prisma.transcription.update({
            where: { id: session.transcription.id },
            data: {
                segments: updatedSegments,
                updatedAt: new Date(),
            },
        });
        // TODO: Phase 1.3 - Log to TranscriptionError model for ML improvement
        // For now, we'll log to console for tracking
        console.log('📝 Transcript correction saved:', {
            sessionId,
            segmentIndex,
            confidence,
            speaker,
            originalLength: originalText.length,
            correctedLength: correctedText.length,
            timestamp: new Date().toISOString(),
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                segmentIndex,
                correctedText,
                updatedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('Error saving correction:', error);
        return server_1.NextResponse.json({ error: 'Failed to save correction', message: error.message }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map