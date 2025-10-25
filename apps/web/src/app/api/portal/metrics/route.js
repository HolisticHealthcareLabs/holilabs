"use strict";
/**
 * Patient Health Metrics API
 *
 * GET /api/portal/metrics
 * Fetch health metrics for authenticated patient
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
async function GET(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const days = parseInt(searchParams.get('days') || '30', 10);
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Fetch clinical notes with vital signs
        const clinicalNotes = await prisma_1.prisma.clinicalNote.findMany({
            where: {
                patientId: session.patientId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                // TODO: vitalSigns field doesn't exist in Prisma schema yet
                // vitalSigns: true,
                createdAt: true,
            },
        });
        // TODO: vitalSigns field doesn't exist - cannot extract metrics
        // Extract and aggregate vital signs
        const metrics = [];
        // const metrics = clinicalNotes
        //   .filter((note) => note.vitalSigns)
        //   .map((note) => ({
        //     date: note.createdAt,
        //     ...note.vitalSigns,
        //   }));
        // Calculate latest values and trends
        const latestMetric = metrics[0];
        const previousMetric = metrics[1];
        const calculateTrend = (current, previous) => {
            if (!current || !previous)
                return 'stable';
            if (current > previous)
                return 'up';
            if (current < previous)
                return 'down';
            return 'stable';
        };
        const summary = {
            bloodPressure: {
                systolic: latestMetric?.bloodPressureSystolic || null,
                diastolic: latestMetric?.bloodPressureDiastolic || null,
                trend: calculateTrend(latestMetric?.bloodPressureSystolic || null, previousMetric?.bloodPressureSystolic || null),
                unit: 'mmHg',
            },
            heartRate: {
                value: latestMetric?.heartRate || null,
                trend: calculateTrend(latestMetric?.heartRate || null, previousMetric?.heartRate || null),
                unit: 'bpm',
            },
            temperature: {
                value: latestMetric?.temperature || null,
                trend: calculateTrend(latestMetric?.temperature || null, previousMetric?.temperature || null),
                unit: '°C',
            },
            respiratoryRate: {
                value: latestMetric?.respiratoryRate || null,
                trend: calculateTrend(latestMetric?.respiratoryRate || null, previousMetric?.respiratoryRate || null),
                unit: 'resp/min',
            },
            oxygenSaturation: {
                value: latestMetric?.oxygenSaturation || null,
                trend: calculateTrend(latestMetric?.oxygenSaturation || null, previousMetric?.oxygenSaturation || null),
                unit: '%',
            },
            weight: {
                value: latestMetric?.weight || null,
                trend: calculateTrend(latestMetric?.weight || null, previousMetric?.weight || null),
                unit: 'kg',
            },
        };
        logger_1.default.info({
            event: 'patient_metrics_fetched',
            patientId: session.patientId,
            patientUserId: session.userId,
            metricsCount: metrics.length,
            days,
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                metrics,
                summary,
                dateRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    days,
                },
            },
        }, { status: 200 });
    }
    catch (error) {
        // Check if it's an auth error
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
        logger_1.default.error({
            event: 'patient_metrics_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar métricas de salud.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map