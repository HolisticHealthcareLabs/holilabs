/**
 * Clinical Drug API - Drug information and safety checks
 * 
 * GET /api/clinical/drugs?name=aspirin - Get drug info
 * POST /api/clinical/drugs/interactions - Check drug interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { rxnormService } from '@/lib/clinical';
import { openFDAService } from '@/lib/clinical';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clinical/drugs
 * 
 * Query params:
 * - name: Drug name to look up
 * - includeLabel: Include FDA label data (default: false)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const drugName = searchParams.get('name');
        const includeLabel = searchParams.get('includeLabel') === 'true';

        if (!drugName) {
            return NextResponse.json(
                { success: false, error: 'Drug name is required' },
                { status: 400 }
            );
        }

        // Normalize to RxCUI
        const rxcuiResult = await rxnormService.normalizeToRxCUI(drugName);

        let fdaLabel = null;
        if (includeLabel) {
            fdaLabel = await openFDAService.getDrugLabel(drugName);
        }

        // Get drug classes
        const drugClasses = rxcuiResult
            ? await rxnormService.getDrugClass(rxcuiResult.rxcui)
            : [];

        return NextResponse.json({
            success: true,
            data: {
                query: drugName,
                rxnorm: rxcuiResult ? {
                    rxcui: rxcuiResult.rxcui,
                    normalizedName: rxcuiResult.name,
                    termType: rxcuiResult.tty,
                } : null,
                drugClasses: drugClasses.map(c => ({
                    classId: c.classId,
                    className: c.className,
                    classType: c.classType,
                })),
                fda: fdaLabel ? {
                    brandName: fdaLabel.brandName,
                    genericName: fdaLabel.genericName,
                    manufacturer: fdaLabel.manufacturer,
                    hasBlackBoxWarning: !!fdaLabel.boxedWarning,
                    applicationNumber: fdaLabel.applicationNumber,
                } : null,
            },
        });
    } catch (error) {
        console.error('Drug lookup error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to look up drug' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/clinical/drugs/interactions
 * 
 * Body: { drugs: string[] }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { drugs } = body;

        if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
            return NextResponse.json(
                { success: false, error: 'At least 2 drugs are required for interaction check' },
                { status: 400 }
            );
        }

        // Normalize all drug names to RxCUIs
        const rxcuis: string[] = [];
        const drugMap: Record<string, string> = {};

        for (const drug of drugs) {
            const result = await rxnormService.normalizeToRxCUI(drug);
            if (result) {
                rxcuis.push(result.rxcui);
                drugMap[result.rxcui] = drug;
            }
        }

        if (rxcuis.length < 2) {
            return NextResponse.json({
                success: true,
                data: {
                    message: 'Could not normalize enough drugs for interaction check',
                    normalizedCount: rxcuis.length,
                    interactions: [],
                },
            });
        }

        // Get interactions
        const interactions = await rxnormService.getInteractions(rxcuis);

        // Check for black box warnings
        const blackBoxDrugs: string[] = [];
        for (const drug of drugs) {
            const hasWarning = await openFDAService.hasBlackBoxWarning(drug);
            if (hasWarning) blackBoxDrugs.push(drug);
        }

        return NextResponse.json({
            success: true,
            data: {
                checkedDrugs: drugs,
                normalizedCount: rxcuis.length,
                interactions: interactions.map(i => ({
                    drug1: i.drug1.name || drugMap[i.drug1.rxcui],
                    drug2: i.drug2.name || drugMap[i.drug2.rxcui],
                    severity: i.severity,
                    description: i.description,
                    source: i.source,
                })),
                blackBoxWarnings: blackBoxDrugs,
                hasSevereInteractions: interactions.some(i => i.severity === 'high'),
                summary: interactions.length === 0
                    ? 'No known interactions detected between these medications.'
                    : `Found ${interactions.length} interaction(s). ${blackBoxDrugs.length} drug(s) have FDA Black Box Warnings.`,
            },
        });
    } catch (error) {
        console.error('Interaction check error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check interactions' },
            { status: 500 }
        );
    }
}
