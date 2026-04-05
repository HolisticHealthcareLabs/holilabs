/**
 * GET /api/lab-orders/catalog
 *
 * Searchable lab test/panel catalog with LOINC codes.
 * Returns panels from the canonical lab-order-panels.json asset.
 *
 * ELENA: every test includes pathological reference ranges (refMin/refMax).
 * CYRUS: protected route, organizationId scoped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import catalogData from '../../../../../../../sprint5-assets/lab-order-panels.json';

export const dynamic = 'force-dynamic';

interface CatalogTest {
  loincCode: string;
  name: Record<string, string>;
  unit: string;
  refMin: number;
  refMax: number;
}

interface CatalogPanel {
  id: string;
  name: Record<string, string>;
  abbreviation: string;
  tests: CatalogTest[];
  patientPrep: Record<string, string>;
  clinicalIndications: string[];
  tussCode: string;
}

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') ?? '').toLowerCase().trim();
    const locale = searchParams.get('locale') ?? 'en';

    let panels: CatalogPanel[] = catalogData.panels as CatalogPanel[];

    if (query) {
      panels = panels.filter((panel) => {
        const panelName = (panel.name[locale] ?? panel.name.en ?? '').toLowerCase();
        const abbr = panel.abbreviation.toLowerCase();
        const testMatch = panel.tests.some((t) => {
          const tName = (t.name[locale] ?? t.name.en ?? '').toLowerCase();
          return tName.includes(query) || t.loincCode.includes(query);
        });
        const icdMatch = panel.clinicalIndications.some((icd) =>
          icd.toLowerCase().includes(query)
        );
        return panelName.includes(query) || abbr.includes(query) || testMatch || icdMatch;
      });
    }

    return NextResponse.json({
      success: true,
      data: panels.map((p) => ({
        id: p.id,
        name: p.name[locale] ?? p.name.en,
        abbreviation: p.abbreviation,
        testCount: p.tests.length,
        tests: p.tests.map((t) => ({
          loincCode: t.loincCode,
          name: t.name[locale] ?? t.name.en,
          unit: t.unit,
          refRange: { min: t.refMin, max: t.refMax },
        })),
        patientPrep: p.patientPrep[locale] ?? p.patientPrep.en,
        clinicalIndications: p.clinicalIndications,
        tussCode: p.tussCode,
      })),
    });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true }
);
