-- Clinical Intelligence Models (Logic-as-Data)
-- Implements Law 1: Clinical rules stored as data, not code

-- SymptomDiagnosisMap: Maps symptom keywords to potential diagnoses
CREATE TABLE "symptom_diagnosis_maps" (
    "id" TEXT NOT NULL,
    "symptomKeywords" TEXT[],
    "symptomCategory" TEXT NOT NULL,
    "icd10Code" TEXT NOT NULL,
    "diagnosisName" TEXT NOT NULL,
    "baseProbability" DOUBLE PRECISION NOT NULL,
    "probabilityModifiers" JSONB,
    "redFlags" TEXT[],
    "workupSuggestions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "symptom_diagnosis_maps_pkey" PRIMARY KEY ("id")
);

-- TreatmentProtocol: Evidence-based treatment guidelines
CREATE TABLE "treatment_protocols" (
    "id" TEXT NOT NULL,
    "conditionIcd10" TEXT NOT NULL,
    "conditionName" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "guidelineSource" TEXT NOT NULL,
    "guidelineUrl" TEXT,
    "guidelineCitation" TEXT,
    "eligibility" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "treatment_protocols_pkey" PRIMARY KEY ("id")
);

-- Indexes for SymptomDiagnosisMap
CREATE INDEX "symptom_diagnosis_maps_symptomCategory_isActive_idx" ON "symptom_diagnosis_maps"("symptomCategory", "isActive");
CREATE INDEX "symptom_diagnosis_maps_icd10Code_idx" ON "symptom_diagnosis_maps"("icd10Code");

-- Indexes for TreatmentProtocol
CREATE UNIQUE INDEX "treatment_protocols_conditionIcd10_version_key" ON "treatment_protocols"("conditionIcd10", "version");
CREATE INDEX "treatment_protocols_conditionIcd10_isActive_idx" ON "treatment_protocols"("conditionIcd10", "isActive");
CREATE INDEX "treatment_protocols_effectiveDate_expirationDate_idx" ON "treatment_protocols"("effectiveDate", "expirationDate");
