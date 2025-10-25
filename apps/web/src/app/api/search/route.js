"use strict";
/**
 * Search API
 *
 * GET /api/search?q=query&types=patient,appointment
 * Universal search across all data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const patient_session_1 = require("@/lib/auth/patient-session");
const search_1 = require("@/lib/search");
const logger_1 = __importDefault(require("@/lib/logger"));
const rate_limit_1 = require("@/lib/rate-limit");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    try {
        // Rate limiting for search
        const rateLimitError = await (0, rate_limit_1.checkRateLimit)(request, 'search');
        if (rateLimitError)
            return rateLimitError;
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');
        const types = searchParams.get('types')?.split(',');
        const limit = parseInt(searchParams.get('limit') || '20');
        if (!query) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Query parameter "q" is required',
            }, { status: 400 });
        }
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            // Clinician search
            const results = await (0, search_1.search)({
                userId: clinicianSession.user.id,
                userType: 'clinician',
                query,
                limit,
                types,
            });
            logger_1.default.info({
                event: 'search_performed',
                userId: clinicianSession.user.id,
                userType: 'clinician',
                query,
                resultsCount: results.length,
            });
            return server_1.NextResponse.json({
                success: true,
                data: {
                    results,
                    query,
                    count: results.length,
                },
            }, { status: 200 });
        }
        // Try patient session
        try {
            const patientSession = await (0, patient_session_1.requirePatientSession)();
            // Patient search
            const results = await (0, search_1.search)({
                userId: patientSession.patientId,
                userType: 'patient',
                query,
                limit,
                types,
            });
            logger_1.default.info({
                event: 'search_performed',
                patientId: patientSession.patientId,
                userType: 'patient',
                query,
                resultsCount: results.length,
            });
            return server_1.NextResponse.json({
                success: true,
                data: {
                    results,
                    query,
                    count: results.length,
                },
            }, { status: 200 });
        }
        catch (error) {
            // Not a patient either
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
    }
    catch (error) {
        logger_1.default.error({
            event: 'search_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al realizar la búsqueda.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map