/**
 * Clinical Protocol Seed Data
 *
 * Migrates top 20 hardcoded rules from screening-triggers.ts and interventions.ts
 * to database-stored JSON-Logic rules.
 *
 * Run with: npx tsx prisma/seed/clinical-protocols.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from holilabsv2/.env (monorepo root)
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ClinicalProtocolSeed {
  ruleId: string;
  name: string;
  category: string;
  version: string;
  source: string;
  logic: Record<string, unknown>;
  minConfidence: number;
  requireHumanReview: boolean;
  maxDataAgeHours: number | null;
  evidenceLevel: string;
  references: string[];
  isActive: boolean;
}

/**
 * Top 20 Clinical Protocol Rules
 *
 * Categories:
 * - screening: Preventive screenings (USPSTF Grade A/B)
 * - vaccination: Immunization schedules
 * - drug_interaction: Medication safety checks
 * - clinical_alert: Urgent clinical conditions
 * - monitoring: Chronic disease monitoring
 */
const CLINICAL_PROTOCOLS: ClinicalProtocolSeed[] = [
  // ========================================
  // SCREENING RULES (from screening-triggers.ts)
  // ========================================

  // 1. Blood Pressure Screening - USPSTF Grade A
  {
    ruleId: 'SCREEN-BP-001',
    name: 'Blood Pressure Screening',
    category: 'screening',
    version: '1.0',
    source: 'USPSTF',
    logic: {
      if: [
        { '>=': [{ var: 'demographics.age' }, 18] },
        'order_blood_pressure_check',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: false,
    maxDataAgeHours: 8760, // 1 year
    evidenceLevel: 'A',
    references: [
      'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/high-blood-pressure-in-adults-screening',
    ],
    isActive: true,
  },

  // 2. Lipid Panel - USPSTF Grade B
  {
    ruleId: 'SCREEN-LIPID-001',
    name: 'Lipid Panel (Cholesterol) Screening',
    category: 'screening',
    version: '1.0',
    source: 'USPSTF',
    logic: {
      if: [
        {
          and: [
            { '>=': [{ var: 'demographics.age' }, 40] },
            { '<=': [{ var: 'demographics.age' }, 75] },
          ],
        },
        'order_lipid_panel',
        'no_action',
      ],
    },
    minConfidence: 0.85,
    requireHumanReview: false,
    maxDataAgeHours: 43800, // 5 years
    evidenceLevel: 'B',
    references: [
      'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/statin-use-in-adults-preventive-medication',
    ],
    isActive: true,
  },

  // 3. Diabetes Screening - USPSTF Grade B
  {
    ruleId: 'SCREEN-DM-001',
    name: 'Diabetes Screening (HbA1c)',
    category: 'screening',
    version: '1.0',
    source: 'USPSTF',
    logic: {
      if: [
        {
          and: [
            { between: [{ var: 'demographics.age' }, 35, 70] },
            { '>=': [{ var: 'demographics.bmi' }, 25] },
          ],
        },
        'order_hba1c',
        'no_action',
      ],
    },
    minConfidence: 0.85,
    requireHumanReview: false,
    maxDataAgeHours: 26280, // 3 years
    evidenceLevel: 'B',
    references: [
      'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-for-prediabetes-and-type-2-diabetes',
    ],
    isActive: true,
  },

  // 4. Colorectal Cancer Screening - USPSTF Grade A
  {
    ruleId: 'SCREEN-CRC-001',
    name: 'Colorectal Cancer Screening',
    category: 'screening',
    version: '1.0',
    source: 'USPSTF',
    logic: {
      if: [
        { between: [{ var: 'demographics.age' }, 45, 75] },
        'order_colonoscopy',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: false,
    maxDataAgeHours: 87600, // 10 years
    evidenceLevel: 'A',
    references: [
      'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening',
    ],
    isActive: true,
  },

  // 5. Breast Cancer Screening - USPSTF Grade B
  {
    ruleId: 'SCREEN-BRCA-001',
    name: 'Breast Cancer Screening (Mammogram)',
    category: 'screening',
    version: '1.0',
    source: 'USPSTF',
    logic: {
      if: [
        {
          and: [
            { between: [{ var: 'demographics.age' }, 50, 74] },
            { '==': [{ var: 'demographics.sex' }, 'female'] },
          ],
        },
        'order_mammogram',
        'no_action',
      ],
    },
    minConfidence: 0.85,
    requireHumanReview: false,
    maxDataAgeHours: 17520, // 2 years
    evidenceLevel: 'B',
    references: [
      'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening',
    ],
    isActive: true,
  },

  // 6. Cervical Cancer Screening - USPSTF Grade A
  {
    ruleId: 'SCREEN-CERV-001',
    name: 'Cervical Cancer Screening',
    category: 'screening',
    version: '1.0',
    source: 'USPSTF',
    logic: {
      if: [
        {
          and: [
            { between: [{ var: 'demographics.age' }, 21, 65] },
            { '==': [{ var: 'demographics.sex' }, 'female'] },
          ],
        },
        'order_pap_smear',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: false,
    maxDataAgeHours: 26280, // 3 years
    evidenceLevel: 'A',
    references: [
      'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/cervical-cancer-screening',
    ],
    isActive: true,
  },

  // 7. Lung Cancer Screening - USPSTF Grade B
  {
    ruleId: 'SCREEN-LUNG-001',
    name: 'Lung Cancer Screening',
    category: 'screening',
    version: '1.0',
    source: 'USPSTF',
    logic: {
      if: [
        {
          and: [
            { between: [{ var: 'demographics.age' }, 50, 80] },
            { '==': [{ var: 'demographics.tobaccoUse' }, true] },
          ],
        },
        'order_low_dose_ct',
        'no_action',
      ],
    },
    minConfidence: 0.85,
    requireHumanReview: true, // Requires smoking history verification
    maxDataAgeHours: 8760, // 1 year
    evidenceLevel: 'B',
    references: [
      'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/lung-cancer-screening',
    ],
    isActive: true,
  },

  // ========================================
  // VACCINATION RULES
  // ========================================

  // 8. Influenza Vaccine
  {
    ruleId: 'VAX-FLU-001',
    name: 'Influenza Vaccine',
    category: 'vaccination',
    version: '1.0',
    source: 'CDC',
    logic: {
      if: [
        { '>=': [{ var: 'demographics.age' }, 18] },
        'recommend_influenza_vaccine',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: false,
    maxDataAgeHours: 8760, // 1 year
    evidenceLevel: 'A',
    references: ['https://www.cdc.gov/flu/prevent/vaccinations.htm'],
    isActive: true,
  },

  // 9. Pneumococcal Vaccine
  {
    ruleId: 'VAX-PNEUMO-001',
    name: 'Pneumococcal Vaccine',
    category: 'vaccination',
    version: '1.0',
    source: 'CDC',
    logic: {
      if: [
        { '>=': [{ var: 'demographics.age' }, 65] },
        'recommend_pneumococcal_vaccine',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: false,
    maxDataAgeHours: 43800, // 5 years
    evidenceLevel: 'A',
    references: [
      'https://www.cdc.gov/vaccines/vpd/pneumo/public/index.html',
    ],
    isActive: true,
  },

  // 10. Shingles Vaccine
  {
    ruleId: 'VAX-SHINGLES-001',
    name: 'Shingles Vaccine (Shingrix)',
    category: 'vaccination',
    version: '1.0',
    source: 'CDC',
    logic: {
      if: [
        { '>=': [{ var: 'demographics.age' }, 50] },
        'recommend_shingles_vaccine',
        'no_action',
      ],
    },
    minConfidence: 0.85,
    requireHumanReview: false,
    maxDataAgeHours: 43800, // 5 years
    evidenceLevel: 'A',
    references: ['https://www.cdc.gov/vaccines/vpd/shingles/public/shingrix/index.html'],
    isActive: true,
  },

  // ========================================
  // CLINICAL ALERT RULES
  // ========================================

  // 11. Hypertensive Crisis Alert
  {
    ruleId: 'ALERT-HTN-CRISIS-001',
    name: 'Hypertensive Crisis Alert',
    category: 'clinical_alert',
    version: '1.0',
    source: 'AHA',
    logic: {
      if: [
        {
          or: [
            { '>': [{ var: 'vitals.bp_systolic' }, 180] },
            { '>': [{ var: 'vitals.bp_diastolic' }, 120] },
          ],
        },
        'alert_hypertensive_crisis',
        'no_action',
      ],
    },
    minConfidence: 0.95,
    requireHumanReview: true, // Always requires immediate review
    maxDataAgeHours: 1, // Must be current
    evidenceLevel: 'A',
    references: [
      'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/hypertensive-crisis-when-you-should-call-911-for-high-blood-pressure',
    ],
    isActive: true,
  },

  // 12. Hypoglycemia Alert
  {
    ruleId: 'ALERT-HYPO-001',
    name: 'Hypoglycemia Alert',
    category: 'clinical_alert',
    version: '1.0',
    source: 'ADA',
    logic: {
      if: [
        { '<': [{ var: 'vitals.glucose' }, 70] },
        'alert_hypoglycemia',
        'no_action',
      ],
    },
    minConfidence: 0.95,
    requireHumanReview: true,
    maxDataAgeHours: 1,
    evidenceLevel: 'A',
    references: ['https://diabetes.org/healthy-living/medication-treatments/blood-glucose-testing-and-control/hypoglycemia'],
    isActive: true,
  },

  // 13. Severe Bradycardia Alert
  {
    ruleId: 'ALERT-BRADY-001',
    name: 'Severe Bradycardia Alert',
    category: 'clinical_alert',
    version: '1.0',
    source: 'AHA',
    logic: {
      if: [
        { '<': [{ var: 'vitals.heart_rate' }, 50] },
        'alert_bradycardia',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: true,
    maxDataAgeHours: 1,
    evidenceLevel: 'B',
    references: ['https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/bradycardia--slow-heart-rate'],
    isActive: true,
  },

  // 14. Kidney Function Alert (eGFR < 30)
  {
    ruleId: 'ALERT-CKD-001',
    name: 'Severe Kidney Impairment Alert',
    category: 'clinical_alert',
    version: '1.0',
    source: 'KDIGO',
    logic: {
      if: [
        { '<': [{ var: 'vitals.egfr' }, 30] },
        'alert_severe_ckd',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: true,
    maxDataAgeHours: 168, // 1 week
    evidenceLevel: 'A',
    references: ['https://kdigo.org/guidelines/ckd-evaluation-and-management/'],
    isActive: true,
  },

  // ========================================
  // DRUG INTERACTION RULES
  // ========================================

  // 15. Metformin + CKD Contraindication
  {
    ruleId: 'DRUG-MET-CKD-001',
    name: 'Metformin Contraindication in Severe CKD',
    category: 'drug_interaction',
    version: '1.0',
    source: 'FDA',
    logic: {
      if: [
        {
          and: [
            { has_medication: ['metformin', { var: 'meds' }] },
            { '<': [{ var: 'vitals.egfr' }, 30] },
          ],
        },
        'alert_metformin_contraindicated',
        'no_action',
      ],
    },
    minConfidence: 0.95,
    requireHumanReview: true,
    maxDataAgeHours: 168,
    evidenceLevel: 'A',
    references: ['https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-revises-warnings-regarding-use-diabetes-medicine-metformin'],
    isActive: true,
  },

  // 16. ACE-I + Potassium Interaction
  {
    ruleId: 'DRUG-ACEI-K-001',
    name: 'ACE-I Hyperkalemia Risk',
    category: 'drug_interaction',
    version: '1.0',
    source: 'AHA',
    logic: {
      if: [
        {
          and: [
            {
              or: [
                { has_medication: ['lisinopril', { var: 'meds' }] },
                { has_medication: ['enalapril', { var: 'meds' }] },
                { has_medication: ['ramipril', { var: 'meds' }] },
              ],
            },
            { '>': [{ var: 'vitals.potassium' }, 5.0] },
          ],
        },
        'alert_hyperkalemia_risk',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: true,
    maxDataAgeHours: 168,
    evidenceLevel: 'B',
    references: ['https://www.ahajournals.org/doi/10.1161/CIR.0000000000001063'],
    isActive: true,
  },

  // 17. Warfarin + NSAIDs Interaction
  {
    ruleId: 'DRUG-WARF-NSAID-001',
    name: 'Warfarin-NSAID Bleeding Risk',
    category: 'drug_interaction',
    version: '1.0',
    source: 'FDA',
    logic: {
      if: [
        {
          and: [
            { has_medication: ['warfarin', { var: 'meds' }] },
            {
              or: [
                { has_medication: ['ibuprofen', { var: 'meds' }] },
                { has_medication: ['naproxen', { var: 'meds' }] },
                { has_medication: ['aspirin', { var: 'meds' }] },
              ],
            },
          ],
        },
        'alert_bleeding_risk',
        'no_action',
      ],
    },
    minConfidence: 0.95,
    requireHumanReview: true,
    maxDataAgeHours: 24,
    evidenceLevel: 'A',
    references: ['https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/warfarin-coumadin-information'],
    isActive: true,
  },

  // ========================================
  // CHRONIC DISEASE MONITORING RULES
  // ========================================

  // 18. Diabetes - Poor A1c Control
  {
    ruleId: 'MONITOR-DM-A1C-001',
    name: 'Diabetes - Uncontrolled A1c',
    category: 'monitoring',
    version: '1.0',
    source: 'ADA',
    logic: {
      if: [
        {
          and: [
            { has_condition_icd: ['E11', { var: 'conditions' }] }, // Type 2 DM
            { '>': [{ var: 'vitals.a1c' }, 8.0] },
          ],
        },
        'flag_poor_glycemic_control',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: false,
    maxDataAgeHours: 2160, // 90 days
    evidenceLevel: 'A',
    references: ['https://diabetesjournals.org/care/article/46/Supplement_1/S97/148053/6-Glycemic-Targets-Standards-of-Care-in-Diabetes'],
    isActive: true,
  },

  // 19. Hypertension - Uncontrolled
  {
    ruleId: 'MONITOR-HTN-001',
    name: 'Hypertension - Uncontrolled',
    category: 'monitoring',
    version: '1.0',
    source: 'AHA',
    logic: {
      if: [
        {
          and: [
            { has_condition_icd: ['I10', { var: 'conditions' }] }, // Essential HTN
            {
              or: [
                { '>': [{ var: 'vitals.bp_systolic' }, 140] },
                { '>': [{ var: 'vitals.bp_diastolic' }, 90] },
              ],
            },
          ],
        },
        'flag_uncontrolled_hypertension',
        'no_action',
      ],
    },
    minConfidence: 0.9,
    requireHumanReview: false,
    maxDataAgeHours: 720, // 30 days
    evidenceLevel: 'A',
    references: ['https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065'],
    isActive: true,
  },

  // 20. Hyperlipidemia - LDL Not at Goal
  {
    ruleId: 'MONITOR-LIPID-001',
    name: 'LDL Cholesterol Not at Goal',
    category: 'monitoring',
    version: '1.0',
    source: 'ACC/AHA',
    logic: {
      if: [
        {
          and: [
            { has_condition_icd: ['E78', { var: 'conditions' }] }, // Hyperlipidemia
            { '>': [{ var: 'vitals.ldl' }, 100] },
          ],
        },
        'flag_ldl_not_at_goal',
        'no_action',
      ],
    },
    minConfidence: 0.85,
    requireHumanReview: false,
    maxDataAgeHours: 8760, // 1 year
    evidenceLevel: 'A',
    references: ['https://www.ahajournals.org/doi/10.1161/CIR.0000000000000625'],
    isActive: true,
  },
];

/**
 * Seed the database with clinical protocols
 */
async function seedClinicalProtocols(): Promise<void> {
  console.log('🌱 Seeding clinical protocols...');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const protocol of CLINICAL_PROTOCOLS) {
    try {
      // Check if rule already exists
      const existing = await prisma.clinicalProtocol.findUnique({
        where: { ruleId: protocol.ruleId },
      });

      if (existing) {
        // Update if version changed
        if (existing.version !== protocol.version) {
          await prisma.clinicalProtocol.update({
            where: { ruleId: protocol.ruleId },
            data: {
              name: protocol.name,
              category: protocol.category,
              version: protocol.version,
              source: protocol.source,
              logic: protocol.logic,
              minConfidence: protocol.minConfidence,
              requireHumanReview: protocol.requireHumanReview,
              maxDataAgeHours: protocol.maxDataAgeHours,
              evidenceLevel: protocol.evidenceLevel,
              references: protocol.references,
              isActive: protocol.isActive,
              updatedAt: new Date(),
            },
          });
          updated++;
          console.log(`  ↻ Updated: ${protocol.ruleId} (${protocol.name})`);
        } else {
          skipped++;
        }
      } else {
        // Create new rule
        await prisma.clinicalProtocol.create({
          data: {
            ruleId: protocol.ruleId,
            name: protocol.name,
            category: protocol.category,
            version: protocol.version,
            source: protocol.source,
            logic: protocol.logic,
            minConfidence: protocol.minConfidence,
            requireHumanReview: protocol.requireHumanReview,
            maxDataAgeHours: protocol.maxDataAgeHours,
            evidenceLevel: protocol.evidenceLevel,
            references: protocol.references,
            isActive: protocol.isActive,
            createdBy: 'seed-script',
          },
        });
        created++;
        console.log(`  ✓ Created: ${protocol.ruleId} (${protocol.name})`);
      }
    } catch (error) {
      console.error(`  ✗ Error with ${protocol.ruleId}:`, error);
    }
  }

  console.log(`\n📊 Seed Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total rules: ${CLINICAL_PROTOCOLS.length}`);
}

/**
 * Export protocols for use in tests
 */
export { CLINICAL_PROTOCOLS };

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    await seedClinicalProtocols();
    console.log('\n✅ Clinical protocols seeding complete!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
