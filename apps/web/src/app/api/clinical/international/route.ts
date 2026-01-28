/**
 * International Clinical Standards API
 * 
 * GET /api/clinical/international - Query international clinical standards
 * 
 * Provides access to:
 * - WHO ICD-11 codes and mappings
 * - WHO Essential Medicines List
 * - NICE (UK) clinical guidelines
 * - ESC (Europe) clinical guidelines
 */

import { NextRequest, NextResponse } from 'next/server';
import { icd11Service } from '@/lib/clinical';
import { internationalGuidelinesService } from '@/lib/clinical';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clinical/international
 * 
 * Query params:
 * - type: 'icd11' | 'icd10-map' | 'essential-medicines' | 'guidelines'
 * - query: Search term
 * - condition: Clinical condition (for guidelines)
 * - source: Guideline source (NICE, ESC, WHO)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'summary';
        const query = searchParams.get('query');
        const condition = searchParams.get('condition');
        const source = searchParams.get('source');

        switch (type) {
            // ICD-11 code lookup
            case 'icd11':
                if (query) {
                    const results = icd11Service.search(query);
                    return NextResponse.json({
                        success: true,
                        data: {
                            type: 'icd11_search',
                            query,
                            results: results.matches,
                            totalCount: results.totalCount,
                        },
                    });
                }
                return NextResponse.json({
                    success: true,
                    data: {
                        type: 'icd11_codes',
                        codes: icd11Service.getAllCodes(),
                    },
                });

            // ICD-10 to ICD-11 mapping
            case 'icd10-map':
                if (!query) {
                    return NextResponse.json(
                        { success: false, error: 'ICD-10 code required in query param' },
                        { status: 400 }
                    );
                }
                const mapping = icd11Service.mapFromICD10(query);
                return NextResponse.json({
                    success: true,
                    data: {
                        type: 'icd10_to_icd11_mapping',
                        icd10Code: query,
                        icd11Code: mapping.icd11Code,
                        entity: mapping.entity,
                    },
                });

            // WHO Essential Medicines
            case 'essential-medicines':
                const category = query || '';
                const medicines = category
                    ? internationalGuidelinesService.getEssentialMedicinesByCategory(category)
                    : internationalGuidelinesService.WHO_ESSENTIAL_MEDICINES;
                return NextResponse.json({
                    success: true,
                    data: {
                        type: 'who_essential_medicines',
                        source: 'WHO Model List of Essential Medicines (22nd edition)',
                        filter: category || 'all',
                        count: medicines.length,
                        medicines,
                    },
                });

            // Clinical Guidelines
            case 'guidelines':
                let guidelines = internationalGuidelinesService.INTERNATIONAL_GUIDELINES;

                if (condition) {
                    guidelines = internationalGuidelinesService.getGuidelinesForCondition(condition);
                }
                if (source) {
                    guidelines = guidelines.filter(g => g.source === source);
                }

                return NextResponse.json({
                    success: true,
                    data: {
                        type: 'clinical_guidelines',
                        sources: ['NICE (UK)', 'ESC (Europe)', 'WHO', 'USPSTF (US)'],
                        filter: { condition, source },
                        count: guidelines.length,
                        guidelines,
                    },
                });

            // Summary - default response
            case 'summary':
            default:
                return NextResponse.json({
                    success: true,
                    data: {
                        type: 'international_standards_summary',
                        available: {
                            icd11: {
                                description: 'WHO ICD-11 International Classification of Diseases',
                                endpoint: '?type=icd11&query=diabetes',
                                codesAvailable: icd11Service.getAllCodes().length,
                            },
                            icd10Mapping: {
                                description: 'Map ICD-10 codes to ICD-11',
                                endpoint: '?type=icd10-map&query=I21',
                            },
                            essentialMedicines: {
                                description: 'WHO Essential Medicines List',
                                endpoint: '?type=essential-medicines',
                                medicinesAvailable: internationalGuidelinesService.WHO_ESSENTIAL_MEDICINES.length,
                            },
                            guidelines: {
                                description: 'International Clinical Guidelines (NICE, ESC)',
                                endpoint: '?type=guidelines&condition=hypertension',
                                guidelinesAvailable: internationalGuidelinesService.INTERNATIONAL_GUIDELINES.length,
                            },
                        },
                    },
                });
        }
    } catch (error) {
        console.error('International standards API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to query international standards' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/clinical/international/validate
 * 
 * Validate clinical data against international standards
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { drugName, icd11Code, conditions } = body;

        const validation: any = {
            success: true,
            validations: [],
        };

        // Check if drug is on WHO Essential Medicines List
        if (drugName) {
            const essential = internationalGuidelinesService.isEssentialMedicine(drugName);
            validation.validations.push({
                type: 'who_essential_medicine',
                drug: drugName,
                isEssential: !!essential,
                details: essential || { message: 'Not on WHO Essential Medicines List' },
            });
        }

        // Validate ICD-11 code
        if (icd11Code) {
            const isValid = icd11Service.validate(icd11Code);
            const entity = icd11Service.getEntity(icd11Code);
            validation.validations.push({
                type: 'icd11_validation',
                code: icd11Code,
                isValid,
                entity,
            });
        }

        // Get guidelines for conditions
        if (conditions && Array.isArray(conditions)) {
            const summary = internationalGuidelinesService.generateGuidelinesSummary(conditions);
            validation.validations.push({
                type: 'guidelines_summary',
                conditions,
                summary,
            });
        }

        return NextResponse.json(validation);
    } catch (error) {
        console.error('Validation error:', error);
        return NextResponse.json(
            { success: false, error: 'Validation failed' },
            { status: 500 }
        );
    }
}
