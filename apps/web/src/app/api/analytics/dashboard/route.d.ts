/**
 * Dashboard Analytics API
 *
 * GET /api/analytics/dashboard - Get comprehensive analytics for dashboard view
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest): Promise<NextResponse<{
    overview: {
        totalPatients: any;
        activePatients: any;
        totalConsultations: any;
        totalPrescriptions: any;
        totalForms: any;
        completedForms: any;
    };
    trends: {
        patientsGrowth: number;
        consultationsGrowth: number;
        formsGrowth: number;
    };
    recentActivity: {
        date: string;
        consultations: any;
        newPatients: any;
        formsSent: any;
    }[];
    topDiagnoses: {
        code: string;
        name: string;
        count: number;
    }[];
    formCompletionRate: {
        sent: any;
        completed: any;
        pending: number;
        rate: number;
    };
}>>;
//# sourceMappingURL=route.d.ts.map