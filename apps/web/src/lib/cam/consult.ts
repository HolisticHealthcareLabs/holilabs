/**
 * CAM consult engine — rule-based MVP.
 *
 * Given a clinical complaint, active medication classes, and optional
 * patient location, return a structured set of CAM suggestions:
 *   1. Relevant modalities with evidence tiers
 *   2. Contraindications: herbs/supplements the patient should avoid
 *      given their active medications (sourced from HerbalContraindication)
 *   3. Suggested practitioners from our directory
 *
 * RAG integration point: `resolveComplaint()` consumes MODALITIES today;
 * swap to a vector-retrieval store when Dr. Ahmed El Tassa's content ships
 * without changing the call sites.
 */
import type { PrismaClient, MedicalSystemType } from '@prisma/client';
import { MODALITIES, tagComplaint, type ModalitySuggestion, type EvidenceTier } from './knowledge-base';

export interface CamConsultInput {
  /** Chief complaint / reason for the visit. Free text, English/PT/ES. */
  chiefComplaint: string;
  /** Active medication classes (uppercase, matching HerbalContraindication.interactingMedClasses) */
  activeMedClasses?: string[];
  /** Explicit patient interest in CAM alternatives — shown in UI as a clinician-flagged checkbox */
  patientInterestedInCam?: boolean;
  /** ISO 2-letter country — BR | MX | CO — narrows practitioner matches */
  country?: string;
  /** City — further narrows practitioner matches */
  city?: string;
  /** System types the patient is specifically interested in (filter) */
  preferredSystemTypes?: MedicalSystemType[];
}

export interface CamConsultContraindication {
  herbalSlug: string;
  commonName: string;
  scientificName: string;
  withMedClass: string;
  concern: string;
  mechanism: string;
  holdDaysPreOp: number;
  citationPmid: string | null;
}

export interface CamConsultPractitioner {
  id: string;
  name: string;
  systemType: MedicalSystemType;
  primarySpecialty: string | null;
  city: string | null;
  state: string | null;
  country: string;
  avgRating: number;
  reviewCount: number;
  claimStatus: string;
  profileUrl: string;
}

export interface CamConsultResult {
  /** Internal tags derived from the complaint string */
  matchedTags: string[];
  /** Modalities relevant to this complaint, ordered by evidence tier then match count */
  modalities: Array<
    ModalitySuggestion & {
      matchedTagCount: number;
    }
  >;
  /** Supplement contraindications active given the patient's medications */
  contraindications: CamConsultContraindication[];
  /** Directory practitioners suitable for this complaint + patient location */
  practitioners: CamConsultPractitioner[];
  /** The plain-text disclaimer shown in UI — not autonomous clinical advice */
  disclaimer: string;
  /** Whether RAG-retrieved content is in use (false for rule-based MVP) */
  ragActive: boolean;
  /** Future RAG attribution — when flipped, surface expert contributors */
  expertContributors: string[];
  meta: {
    knowledgeBaseVersion: string;
    generatedAt: string;
  };
}

const DISCLAIMER =
  'This is a decision-support tool. Suggestions are non-autonomous and advisory only. Evidence tiers summarise the strength of the peer-reviewed literature for the modality in general, not for an individual patient. Always confirm contraindications and coordinate CAM care with the patient’s primary clinical team.';

const KB_VERSION = '2026-04-18-rule-based-mvp';

/**
 * Run the rule-based CAM consult. Pure function over the knowledge base
 * plus a Prisma read against `HerbalContraindication` and `PhysicianCatalog`.
 */
export async function runCamConsult(
  prisma: PrismaClient,
  input: CamConsultInput,
): Promise<CamConsultResult> {
  const tags = tagComplaint(input.chiefComplaint);

  // ── 1. Modality matching ──────────────────────────────────────────────
  const scored = MODALITIES.map((m) => ({
    ...m,
    matchedTagCount: m.indicationTags.filter((t) => tags.includes(t)).length,
  }))
    .filter((m) => m.matchedTagCount > 0)
    .filter(
      (m) =>
        !input.preferredSystemTypes?.length ||
        input.preferredSystemTypes.includes(m.systemType),
    );

  const tierWeight: Record<EvidenceTier, number> = { A: 4, B: 3, C: 2, D: 1 };
  scored.sort((a, b) => {
    const byTier = tierWeight[b.evidenceTier] - tierWeight[a.evidenceTier];
    if (byTier !== 0) return byTier;
    return b.matchedTagCount - a.matchedTagCount;
  });

  // ── 2. Contraindication matching ──────────────────────────────────────
  const activeMeds = (input.activeMedClasses ?? []).map((m) => m.toUpperCase());
  const contraindications: CamConsultContraindication[] = [];

  if (activeMeds.length > 0) {
    const herbals = await prisma.herbalContraindication.findMany({
      where: {
        interactingMedClasses: { hasSome: activeMeds },
      },
      select: {
        slug: true,
        commonName: true,
        scientificName: true,
        clinicalConcern: true,
        mechanism: true,
        holdDaysPreOp: true,
        citationPmid: true,
        interactingMedClasses: true,
      },
    });

    for (const h of herbals) {
      for (const medClass of h.interactingMedClasses) {
        if (activeMeds.includes(medClass)) {
          contraindications.push({
            herbalSlug: h.slug,
            commonName: h.commonName,
            scientificName: h.scientificName,
            withMedClass: medClass,
            concern: h.clinicalConcern,
            mechanism: h.mechanism,
            holdDaysPreOp: h.holdDaysPreOp,
            citationPmid: h.citationPmid,
          });
        }
      }
    }
  }

  // ── 3. Practitioner matching ──────────────────────────────────────────
  const candidateSystemTypes = Array.from(new Set(scored.map((m) => m.systemType)));
  let practitioners: CamConsultPractitioner[] = [];

  if (candidateSystemTypes.length > 0) {
    const providers = await prisma.physicianCatalog.findMany({
      where: {
        isRegistryActive: true,
        publicProfileEnabled: true,
        ...(input.country ? { country: input.country } : {}),
        ...(input.city ? { addressCity: { contains: input.city, mode: 'insensitive' } } : {}),
        specialties: {
          some: {
            specialty: {
              systemType: { in: candidateSystemTypes },
            },
          },
        },
      },
      include: {
        specialties: {
          where: { isPrimary: true },
          include: {
            specialty: { select: { displayEn: true, systemType: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ completenessScore: 'desc' }, { avgRating: 'desc' }],
      take: 8,
    });

    practitioners = providers.map((p) => ({
      id: p.id,
      name: p.name,
      systemType: p.specialties[0]?.specialty.systemType ?? 'CONVENTIONAL',
      primarySpecialty: p.specialties[0]?.specialty.displayEn ?? null,
      city: p.addressCity,
      state: p.addressState,
      country: p.country,
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
      claimStatus: p.claimStatus,
      profileUrl: `/find-doctor/${p.id}`,
    }));
  }

  return {
    matchedTags: tags,
    modalities: scored,
    contraindications,
    practitioners,
    disclaimer: DISCLAIMER,
    ragActive: false,
    expertContributors: [],
    meta: {
      knowledgeBaseVersion: KB_VERSION,
      generatedAt: new Date().toISOString(),
    },
  };
}
