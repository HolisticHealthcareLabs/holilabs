/**
 * Database Seeding Script
 *
 * Seeds critical reference data for Web2 interoperability:
 * - ICD-10 codes (disease classification)
 * - LOINC codes (lab test standardization)
 *
 * Uses chunked inserts to avoid timeout errors on large datasets.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Chunk size for batch inserts (adjust based on DB performance)
const CHUNK_SIZE = 100;

/**
 * Helper function to insert data in chunks
 */
async function insertInChunks<T>(
  data: T[],
  insertFn: (chunk: T[]) => Promise<any>,
  chunkSize: number = CHUNK_SIZE
): Promise<void> {
  const totalChunks = Math.ceil(data.length / chunkSize);

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const chunkNumber = Math.floor(i / chunkSize) + 1;

    console.log(`  Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} records)...`);

    try {
      await insertFn(chunk);
    } catch (error) {
      console.error(`  ❌ Error in chunk ${chunkNumber}:`, error);
      throw error;
    }
  }
}

/**
 * Seed ICD-10 codes
 *
 * This is a minimal subset for testing. In production, you would:
 * 1. Download full ICD-10-CM dataset from CDC or WHO
 * 2. Parse the CSV/XML files
 * 3. Seed all ~70,000 codes
 *
 * For now, seeding common codes used in primary care and chronic diseases.
 */
async function seedICD10Codes() {
  console.log('\n📋 Seeding ICD-10 codes...');

  const icd10Codes = [
    // Diabetes
    { code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Endocrine, nutritional and metabolic diseases', billable: false },
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine, nutritional and metabolic diseases', billable: true },
    { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', category: 'Endocrine, nutritional and metabolic diseases', billable: true },
    { code: 'E10', description: 'Type 1 diabetes mellitus', category: 'Endocrine, nutritional and metabolic diseases', billable: false },
    { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', category: 'Endocrine, nutritional and metabolic diseases', billable: true },

    // Hypertension
    { code: 'I10', description: 'Essential (primary) hypertension', category: 'Diseases of the circulatory system', billable: true },
    { code: 'I11', description: 'Hypertensive heart disease', category: 'Diseases of the circulatory system', billable: false },
    { code: 'I11.9', description: 'Hypertensive heart disease without heart failure', category: 'Diseases of the circulatory system', billable: true },
    { code: 'I12', description: 'Hypertensive chronic kidney disease', category: 'Diseases of the circulatory system', billable: false },
    { code: 'I12.9', description: 'Hypertensive chronic kidney disease with stage 1 through stage 4 CKD', category: 'Diseases of the circulatory system', billable: true },

    // COVID-19
    { code: 'U07.1', description: 'COVID-19', category: 'Emergency use of U07.1', billable: true },
    { code: 'U09.9', description: 'Post COVID-19 condition, unspecified', category: 'Emergency use of U09.9', billable: true },

    // Respiratory
    { code: 'J44', description: 'Other chronic obstructive pulmonary disease', category: 'Diseases of the respiratory system', billable: false },
    { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified', category: 'Diseases of the respiratory system', billable: true },
    { code: 'J45', description: 'Asthma', category: 'Diseases of the respiratory system', billable: false },
    { code: 'J45.9', description: 'Asthma, unspecified', category: 'Diseases of the respiratory system', billable: true },

    // Mental health
    { code: 'F41', description: 'Other anxiety disorders', category: 'Mental, Behavioral and Neurodevelopmental disorders', billable: false },
    { code: 'F41.9', description: 'Anxiety disorder, unspecified', category: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
    { code: 'F32', description: 'Major depressive disorder, single episode', category: 'Mental, Behavioral and Neurodevelopmental disorders', billable: false },
    { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },

    // Obesity
    { code: 'E66', description: 'Overweight and obesity', category: 'Endocrine, nutritional and metabolic diseases', billable: false },
    { code: 'E66.9', description: 'Obesity, unspecified', category: 'Endocrine, nutritional and metabolic diseases', billable: true },
    { code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories', category: 'Endocrine, nutritional and metabolic diseases', billable: true },

    // Cardiovascular
    { code: 'I25', description: 'Chronic ischemic heart disease', category: 'Diseases of the circulatory system', billable: false },
    { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', category: 'Diseases of the circulatory system', billable: true },
    { code: 'I50', description: 'Heart failure', category: 'Diseases of the circulatory system', billable: false },
    { code: 'I50.9', description: 'Heart failure, unspecified', category: 'Diseases of the circulatory system', billable: true },

    // Cancer screening
    { code: 'Z12', description: 'Encounter for screening for malignant neoplasms', category: 'Factors influencing health status', billable: false },
    { code: 'Z12.11', description: 'Encounter for screening for malignant neoplasm of colon', category: 'Factors influencing health status', billable: true },
    { code: 'Z12.31', description: 'Encounter for screening mammogram for malignant neoplasm of breast', category: 'Factors influencing health status', billable: true },

    // General symptoms
    { code: 'R50', description: 'Fever of other and unknown origin', category: 'Symptoms, signs and abnormal findings', billable: false },
    { code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms, signs and abnormal findings', billable: true },
    { code: 'R51', description: 'Headache', category: 'Symptoms, signs and abnormal findings', billable: true },
    { code: 'R06', description: 'Abnormalities of breathing', category: 'Symptoms, signs and abnormal findings', billable: false },
    { code: 'R06.02', description: 'Shortness of breath', category: 'Symptoms, signs and abnormal findings', billable: true },
  ];

  await insertInChunks(
    icd10Codes,
    async (chunk) => {
      await prisma.iCD10Code.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
  );

  console.log(`✅ Seeded ${icd10Codes.length} ICD-10 codes`);
}

/**
 * Seed LOINC codes
 *
 * This is a minimal subset for testing. In production, you would:
 * 1. Download full LOINC dataset from https://loinc.org/
 * 2. Parse the LOINC CSV files (~100,000 codes)
 * 3. Seed all relevant codes
 *
 * For now, seeding common lab tests used in primary care.
 */
async function seedLOINCCodes() {
  console.log('\n🔬 Seeding LOINC codes...');

  const loincCodes = [
    // Lipid panel
    {
      loincNumber: '2093-3',
      component: 'Cholesterol',
      property: 'MCnc',
      system: 'Ser/Plas',
      longCommonName: 'Cholesterol [Mass/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },
    {
      loincNumber: '2085-9',
      component: 'Cholesterol in HDL',
      property: 'MCnc',
      system: 'Ser/Plas',
      longCommonName: 'Cholesterol in HDL [Mass/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },
    {
      loincNumber: '2089-1',
      component: 'Cholesterol in LDL',
      property: 'MCnc',
      system: 'Ser/Plas',
      longCommonName: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },
    {
      loincNumber: '2571-8',
      component: 'Triglyceride',
      property: 'MCnc',
      system: 'Ser/Plas',
      longCommonName: 'Triglyceride [Mass/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },

    // Glucose/Diabetes markers
    {
      loincNumber: '2345-7',
      component: 'Glucose',
      property: 'MCnc',
      system: 'Ser/Plas',
      longCommonName: 'Glucose [Mass/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },
    {
      loincNumber: '4548-4',
      component: 'Hemoglobin A1c',
      property: 'MFr',
      system: 'Bld',
      longCommonName: 'Hemoglobin A1c/Hemoglobin.total in Blood',
      loincClass: 'CHEM'
    },

    // Complete Blood Count (CBC)
    {
      loincNumber: '6690-2',
      component: 'Leukocytes',
      property: 'NCnc',
      system: 'Bld',
      longCommonName: 'Leukocytes [#/volume] in Blood by Automated count',
      loincClass: 'HEM/BC'
    },
    {
      loincNumber: '789-8',
      component: 'Erythrocytes',
      property: 'NCnc',
      system: 'Bld',
      longCommonName: 'Erythrocytes [#/volume] in Blood by Automated count',
      loincClass: 'HEM/BC'
    },
    {
      loincNumber: '718-7',
      component: 'Hemoglobin',
      property: 'MCnc',
      system: 'Bld',
      longCommonName: 'Hemoglobin [Mass/volume] in Blood',
      loincClass: 'HEM/BC'
    },
    {
      loincNumber: '4544-3',
      component: 'Hematocrit',
      property: 'VFr',
      system: 'Bld',
      longCommonName: 'Hematocrit [Volume Fraction] of Blood by Automated count',
      loincClass: 'HEM/BC'
    },
    {
      loincNumber: '777-3',
      component: 'Platelets',
      property: 'NCnc',
      system: 'Bld',
      longCommonName: 'Platelets [#/volume] in Blood by Automated count',
      loincClass: 'HEM/BC'
    },

    // Liver function
    {
      loincNumber: '1742-6',
      component: 'Alanine aminotransferase',
      property: 'CCnc',
      system: 'Ser/Plas',
      longCommonName: 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },
    {
      loincNumber: '1920-8',
      component: 'Aspartate aminotransferase',
      property: 'CCnc',
      system: 'Ser/Plas',
      longCommonName: 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },

    // Kidney function
    {
      loincNumber: '2160-0',
      component: 'Creatinine',
      property: 'MCnc',
      system: 'Ser/Plas',
      longCommonName: 'Creatinine [Mass/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },
    {
      loincNumber: '33914-3',
      component: 'Glomerular filtration rate',
      property: 'VRat',
      system: 'Kidney',
      longCommonName: 'Glomerular filtration rate/1.73 sq M.predicted [Volume Rate/Area] in Serum or Plasma by Creatinine-based formula (CKD-EPI)',
      loincClass: 'CHEM'
    },

    // Thyroid function
    {
      loincNumber: '3016-3',
      component: 'Thyrotropin',
      property: 'SCnc',
      system: 'Ser/Plas',
      longCommonName: 'Thyrotropin [Units/volume] in Serum or Plasma',
      loincClass: 'CHEM'
    },

    // Vital signs (can also be coded with LOINC)
    {
      loincNumber: '8867-4',
      component: 'Heart rate',
      property: 'NRat',
      system: 'XXX',
      longCommonName: 'Heart rate',
      loincClass: 'CLINICAL'
    },
    {
      loincNumber: '8480-6',
      component: 'Systolic blood pressure',
      property: 'Pres',
      system: 'Arterial',
      longCommonName: 'Systolic blood pressure',
      loincClass: 'CLINICAL'
    },
    {
      loincNumber: '8462-4',
      component: 'Diastolic blood pressure',
      property: 'Pres',
      system: 'Arterial',
      longCommonName: 'Diastolic blood pressure',
      loincClass: 'CLINICAL'
    },
    {
      loincNumber: '29463-7',
      component: 'Body weight',
      property: 'Mass',
      system: 'Patient',
      longCommonName: 'Body weight',
      loincClass: 'CLINICAL'
    },
    {
      loincNumber: '39156-5',
      component: 'Body mass index',
      property: 'Ratio',
      system: 'Patient',
      longCommonName: 'Body mass index (BMI) [Ratio]',
      loincClass: 'CLINICAL'
    },
  ];

  await insertInChunks(
    loincCodes,
    async (chunk) => {
      await prisma.loincCode.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
  );

  console.log(`✅ Seeded ${loincCodes.length} LOINC codes`);
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🌱 Starting database seeding...');
  console.log(`📊 Using chunk size: ${CHUNK_SIZE} records per batch\n`);

  try {
    await seedICD10Codes();
    await seedLOINCCodes();

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`  - ICD-10 codes: ${await prisma.iCD10Code.count()}`);
    console.log(`  - LOINC codes: ${await prisma.loincCode.count()}`);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
