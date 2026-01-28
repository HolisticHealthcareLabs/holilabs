/**
 * Clinical Trials API
 * 
 * GET /api/clinical/trials - Search and match trials
 * POST /api/clinical/trials/match - Match patient to trials
 */

import { NextRequest, NextResponse } from 'next/server';
import { clinicalTrialsService } from '@/lib/clinical';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clinical/trials
 * 
 * Query params:
 * - condition: Search by condition
 * - intervention: Search by intervention
 * - phase: Filter by phase (e.g., PHASE2, PHASE3)
 * - status: Filter by status (default: RECRUITING)
 * - nctId: Get specific trial by NCT ID
 * - limit: Max results (default: 20)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const condition = searchParams.get('condition');
        const intervention = searchParams.get('intervention');
        const phase = searchParams.get('phase');
        const status = searchParams.get('status');
        const nctId = searchParams.get('nctId');
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get single trial by NCT ID
        if (nctId) {
            const trial = clinicalTrialsService.getById(nctId);
            if (!trial) {
                return NextResponse.json(
                    { success: false, error: 'Trial not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json({
                success: true,
                data: trial,
            });
        }

        // Search trials
        const trials = await clinicalTrialsService.search({
            condition: condition || undefined,
            intervention: intervention || undefined,
            phase: phase ? [phase as any] : undefined,
            status: status ? [status as any] : ['RECRUITING'],
            limit,
        });

        return NextResponse.json({
            success: true,
            data: {
                trials,
                meta: {
                    count: trials.length,
                    recruitingCounts: clinicalTrialsService.getRecruitingCounts(),
                },
            },
        });
    } catch (error) {
        console.error('Clinical trials search error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to search clinical trials' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/clinical/trials
 * 
 * Match patient to eligible trials
 * 
 * Body: {
 *   age: number,
 *   sex: 'MALE' | 'FEMALE',
 *   conditions: string[],
 *   medications?: string[]
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { age, sex, conditions, medications } = body;

        if (!age || !sex || !conditions || !Array.isArray(conditions)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: age, sex, conditions[]',
                },
                { status: 400 }
            );
        }

        const matches = await clinicalTrialsService.matchPatient({
            age,
            sex,
            conditions,
            medications,
        });

        const summary = clinicalTrialsService.generateSummary(matches);

        return NextResponse.json({
            success: true,
            data: {
                matches,
                summary,
                meta: {
                    totalMatches: matches.length,
                    likelyEligible: matches.filter(m => m.eligibilityStatus === 'LIKELY_ELIGIBLE').length,
                    possiblyEligible: matches.filter(m => m.eligibilityStatus === 'POSSIBLY_ELIGIBLE').length,
                    reviewRequired: matches.filter(m => m.eligibilityStatus === 'REVIEW_REQUIRED').length,
                },
            },
        });
    } catch (error) {
        console.error('Patient trial matching error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to match patient to trials' },
            { status: 500 }
        );
    }
}
