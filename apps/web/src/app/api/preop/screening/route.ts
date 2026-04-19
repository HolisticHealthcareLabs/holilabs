export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const screeningSchema = z.object({
  /** Free-text supplement names the patient reports taking */
  supplements: z.array(z.string().min(1).max(200)).min(0).max(50),
  /** Active medication classes from the patient's problem list (opt-in) */
  medicationClasses: z.array(z.string().min(1).max(100)).max(30).optional(),
  /** ISO date of the planned surgery, if known */
  surgeryDate: z.string().datetime().optional(),
});

/**
 * POST /api/preop/screening — match patient-reported supplements against the
 * SPAQI contraindication table and return a risk-sorted hold schedule.
 *
 * This endpoint intentionally does NOT store the submission. The risk list
 * is returned for the clinician/patient to act on; persistence belongs to a
 * separate `PreOpAssessment` record that requires patient auth.
 */
export const POST = createPublicRoute(
  async (request: Request) => {
    try {
      const body = await request.json();
      const { supplements, medicationClasses, surgeryDate } = screeningSchema.parse(body);

      // Build a searchable lowercase token set from each user-provided name
      const tokens = Array.from(
        new Set(
          supplements.flatMap((s) =>
            s
              .toLowerCase()
              .trim()
              .split(/[\s,/]+/)
              .filter((t) => t.length >= 3),
          ),
        ),
      );

      const allHerbals = await prisma.herbalContraindication.findMany();

      // Match by common name, scientific name, PT/ES localizations, or aliases
      const matched = allHerbals.filter((h) => {
        const haystack = [
          h.commonName,
          h.scientificName,
          h.commonNamePt ?? '',
          h.commonNameEs ?? '',
          ...h.aliases,
        ]
          .join(' ')
          .toLowerCase();
        return tokens.some((t) => haystack.includes(t));
      });

      const activeMeds = (medicationClasses ?? []).map((m) => m.toUpperCase());
      const surgery = surgeryDate ? new Date(surgeryDate) : null;

      const riskItems = matched.map((h) => {
        const medCollisions = h.interactingMedClasses.filter((cls) => activeMeds.includes(cls));
        const stopBy = surgery
          ? new Date(surgery.getTime() - h.holdDaysPreOp * 24 * 60 * 60 * 1000)
          : null;

        return {
          slug: h.slug,
          commonName: h.commonName,
          commonNamePt: h.commonNamePt,
          commonNameEs: h.commonNameEs,
          scientificName: h.scientificName,
          holdDaysPreOp: h.holdDaysPreOp,
          stopBy: stopBy?.toISOString() ?? null,
          primaryRiskCategory: h.primaryRiskCategory,
          riskCategories: h.riskCategories,
          evidenceLevel: h.evidenceLevel,
          clinicalConcern: h.clinicalConcern,
          mechanism: h.mechanism,
          mustDiscloseToAnesthesia: h.mustDiscloseToAnesthesia,
          activeMedCollisions: medCollisions,
          citationPmid: h.citationPmid,
          citationUrl: h.citationPmid
            ? `https://pubmed.ncbi.nlm.nih.gov/${h.citationPmid}/`
            : null,
        };
      });

      // Sort: longer holds first, then by # active med interactions (desc)
      riskItems.sort((a, b) => {
        if (b.holdDaysPreOp !== a.holdDaysPreOp) return b.holdDaysPreOp - a.holdDaysPreOp;
        return b.activeMedCollisions.length - a.activeMedCollisions.length;
      });

      const unmatched = supplements.filter((s) => {
        const tok = s
          .toLowerCase()
          .split(/[\s,/]+/)
          .find((t) => t.length >= 3);
        if (!tok) return false;
        return !matched.some((m) =>
          [m.commonName, m.scientificName, m.commonNamePt ?? '', m.commonNameEs ?? '', ...m.aliases]
            .join(' ')
            .toLowerCase()
            .includes(tok),
        );
      });

      const highRisk = riskItems.filter((r) => r.holdDaysPreOp >= 14);
      const moderateRisk = riskItems.filter((r) => r.holdDaysPreOp >= 7 && r.holdDaysPreOp < 14);
      const lowRisk = riskItems.filter((r) => r.holdDaysPreOp > 0 && r.holdDaysPreOp < 7);
      const discloseOnly = riskItems.filter((r) => r.holdDaysPreOp === 0);

      const disclaimer =
        'This is a decision-support tool, not medical advice. Always discuss supplement use with your anesthesiologist and prescribing physician before any procedure. Some items in this list may have been prescribed by a physician and must NOT be stopped without medical direction.';

      return NextResponse.json({
        data: {
          summary: {
            totalSupplementsAnalyzed: supplements.length,
            matched: matched.length,
            unmatched: unmatched.length,
            highRiskCount: highRisk.length,
            moderateRiskCount: moderateRisk.length,
            lowRiskCount: lowRisk.length,
            discloseOnlyCount: discloseOnly.length,
          },
          highRisk,
          moderateRisk,
          lowRisk,
          discloseOnly,
          unmatched,
          disclaimer,
        },
        meta: {
          source: 'SPAQI 2020 Consensus — Mayo Clin Proc 95(6):1344-1360',
          citationPmid: '32540015',
          dataTimestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  },
);
