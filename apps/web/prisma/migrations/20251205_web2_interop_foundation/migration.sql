-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLINICIAN', 'NURSE', 'STAFF');

-- CreateEnum
CREATE TYPE "OTPChannel" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('CLINICIAN', 'PATIENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'NEW_MESSAGE', 'MESSAGE_REPLY', 'NEW_DOCUMENT', 'DOCUMENT_SHARED', 'NEW_PRESCRIPTION', 'PRESCRIPTION_READY', 'LAB_RESULT_AVAILABLE', 'MEDICATION_REMINDER', 'CONSULTATION_COMPLETED', 'SOAP_NOTE_READY', 'CONSENT_REQUIRED', 'PAYMENT_DUE', 'PAYMENT_RECEIVED', 'SYSTEM_ALERT', 'SECURITY_ALERT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('WEIGHT', 'HEIGHT', 'BLOOD_PRESSURE', 'HEART_RATE', 'TEMPERATURE', 'BLOOD_GLUCOSE', 'GLUCOSE', 'OXYGEN_SATURATION', 'STEPS', 'SLEEP_HOURS', 'PAIN_LEVEL', 'MOOD', 'MEDICATION_ADHERENCE', 'CUSTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('PATIENT_MANUAL', 'CLINICIAN_MEASURED', 'DEVICE_SYNC', 'SMART_SCALE', 'FITNESS_TRACKER', 'BLOOD_PRESSURE_MONITOR', 'GLUCOMETER', 'APPLE_HEALTH', 'GOOGLE_FIT');

-- CreateEnum
CREATE TYPE "ShareableType" AS ENUM ('SOAP_NOTE', 'PRESCRIPTION', 'LAB_RESULT', 'IMAGING', 'DOCUMENT', 'MEDICAL_RECORD_BUNDLE');

-- CreateEnum
CREATE TYPE "MedicationAdministrationStatus" AS ENUM ('SCHEDULED', 'DUE', 'GIVEN', 'LATE', 'REFUSED', 'MISSED', 'HELD', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "LabResultStatus" AS ENUM ('PRELIMINARY', 'FINAL', 'CORRECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImagingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REPORTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING', 'SIGNED', 'SENT', 'FILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('GENERAL_CONSULTATION', 'TELEHEALTH', 'DATA_RESEARCH', 'SURGERY', 'PROCEDURE', 'PHOTOGRAPHY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'CANCELLED_BY_PATIENT', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LAB_RESULTS', 'IMAGING', 'CONSULTATION_NOTES', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'INSURANCE', 'CONSENT_FORM', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'DEIDENTIFYING', 'EXTRACTING', 'SYNCHRONIZED', 'FAILED');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('PROGRESS', 'CONSULTATION', 'ADMISSION', 'DISCHARGE', 'PROCEDURE', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT', 'DEIDENTIFY', 'REIDENTIFY', 'PRESCRIBE', 'SIGN', 'REVOKE', 'ROLLBACK', 'OPT_OUT', 'NOTIFY', 'DOCUMENT_UPLOADED');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REVERTED');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT', 'APPLE');

-- CreateEnum
CREATE TYPE "ScribeStatus" AS ENUM ('RECORDING', 'PAUSED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SOAPStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SIGNED', 'AMENDED', 'ADDENDUM');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('CHIEF_COMPLAINT', 'HISTORY_OF_PRESENT_ILLNESS', 'REVIEW_OF_SYSTEMS', 'PHYSICAL_EXAM', 'ASSESSMENT', 'PLAN', 'PRESCRIPTION', 'PATIENT_EDUCATION', 'FOLLOW_UP', 'PROCEDURE_NOTE', 'DISCHARGE_SUMMARY', 'PROGRESS_NOTE', 'CONSULTATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FormCategory" AS ENUM ('CONSENT', 'HIPAA_AUTHORIZATION', 'MEDICAL_HISTORY', 'TREATMENT_CONSENT', 'FINANCIAL_AGREEMENT', 'INSURANCE_INFORMATION', 'REFERRAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('PENDING', 'VIEWED', 'IN_PROGRESS', 'COMPLETED', 'SIGNED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "FormAuditEvent" AS ENUM ('SENT', 'VIEWED', 'STARTED', 'PROGRESS_SAVED', 'SUBMITTED', 'SIGNED', 'REMINDER_SENT', 'EXPIRED', 'REVOKED', 'UPDATED', 'DOWNLOADED');

-- CreateEnum
CREATE TYPE "PharmacyChain" AS ENUM ('GUADALAJARA', 'BENAVIDES', 'DEL_AHORRO', 'SIMILARES', 'SAN_PABLO', 'ROMA', 'YZA', 'INDEPENDIENTE', 'OTHER');

-- CreateEnum
CREATE TYPE "PharmacyPrescriptionStatus" AS ENUM ('SENT', 'RECEIVED', 'PROCESSING', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PICKUP', 'HOME_DELIVERY', 'CLINIC_DELIVERY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'VOID');

-- CreateEnum
CREATE TYPE "CFDIStatus" AS ENUM ('PENDING', 'GENERATING', 'STAMPED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'CASH', 'CHECK', 'INSURANCE', 'PAYMENT_PLAN', 'CRYPTOCURRENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "SubscriptionTierEnum" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'TRIALING', 'PAUSED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "CarePlanCategory" AS ENUM ('PAIN_MANAGEMENT', 'SYMPTOM_CONTROL', 'PSYCHOSOCIAL_SUPPORT', 'SPIRITUAL_CARE', 'FAMILY_SUPPORT', 'QUALITY_OF_LIFE', 'END_OF_LIFE_PLANNING', 'MOBILITY', 'NUTRITION', 'WOUND_CARE');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PainType" AS ENUM ('ACUTE', 'CHRONIC', 'BREAKTHROUGH', 'NEUROPATHIC', 'VISCERAL', 'SOMATIC');

-- CreateEnum
CREATE TYPE "FamilyAccessLevel" AS ENUM ('READ_ONLY', 'LIMITED_INTERACTION', 'FULL_ACCESS');

-- CreateEnum
CREATE TYPE "AllergyType" AS ENUM ('MEDICATION', 'FOOD', 'ENVIRONMENTAL', 'INSECT', 'LATEX', 'OTHER');

-- CreateEnum
CREATE TYPE "AllergyCategory" AS ENUM ('ANTIBIOTIC', 'ANALGESIC', 'ANESTHETIC', 'NSAID', 'OPIOID', 'SHELLFISH', 'NUTS', 'DAIRY', 'GLUTEN', 'POLLEN', 'DUST', 'MOLD', 'ANIMAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AllergyVerificationStatus" AS ENUM ('UNVERIFIED', 'PATIENT_REPORTED', 'CLINICIAN_VERIFIED', 'CHALLENGED', 'CONFIRMED_BY_TESTING');

-- CreateEnum
CREATE TYPE "PreventiveCareType" AS ENUM ('MAMMOGRAM', 'COLONOSCOPY', 'CERVICAL_CANCER', 'PROSTATE_CANCER', 'LUNG_CANCER', 'SKIN_CANCER', 'BLOOD_PRESSURE', 'CHOLESTEROL', 'DIABETES_SCREENING', 'INFLUENZA', 'PNEUMONIA', 'SHINGLES', 'COVID_19', 'TDAP', 'HPV', 'BONE_DENSITY', 'VISION_SCREENING', 'HEARING_SCREENING', 'DENTAL_EXAM', 'DEPRESSION_SCREENING', 'FALLS_RISK', 'OTHER');

-- CreateEnum
CREATE TYPE "PreventiveCareStatus" AS ENUM ('DUE', 'OVERDUE', 'SCHEDULED', 'COMPLETED', 'NOT_INDICATED', 'DECLINED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AdvanceDirectivesStatus" AS ENUM ('NOT_COMPLETED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED_ANNUALLY');

-- CreateEnum
CREATE TYPE "CodeStatus" AS ENUM ('FULL_CODE', 'DNR', 'DNI', 'DNR_DNI', 'COMFORT_CARE_ONLY', 'AND');

-- CreateEnum
CREATE TYPE "NotificationTemplateType" AS ENUM ('APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMATION', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_CANCELLED', 'PAYMENT_REMINDER', 'FOLLOWUP_1', 'FOLLOWUP_2', 'FOLLOWUP_3', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "TemplateLevel" AS ENUM ('CLINIC', 'DOCTOR');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('VACATION', 'SICK_LEAVE', 'CONFERENCE', 'TRAINING', 'PERSONAL', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WaitingListPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "WaitingListStatus" AS ENUM ('WAITING', 'NOTIFIED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('APPOINTMENT', 'LAB_RESULT', 'FOLLOW_UP', 'PRESCRIPTION', 'DOCUMENTATION', 'REVIEW', 'CALLBACK', 'GENERAL');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('MEDICAL_LICENSE', 'BOARD_CERTIFICATION', 'DEA_LICENSE', 'NPI', 'MEDICAL_DEGREE', 'SPECIALTY_FELLOWSHIP', 'HOSPITAL_PRIVILEGES', 'MALPRACTICE_INSURANCE', 'BLS_CERTIFICATION', 'ACLS_CERTIFICATION', 'CME_CREDITS', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'AUTO_VERIFIED', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('NPPES_LOOKUP', 'STATE_BOARD_API', 'ABMS_VERIFICATION', 'ECFMG_VERIFICATION', 'MANUAL_VERIFICATION', 'DOCUMENT_VERIFICATION', 'THIRD_PARTY_SERVICE');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('VERIFIED', 'PARTIAL_MATCH', 'NO_MATCH', 'NOT_FOUND', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "MedicalImageType" AS ENUM ('XRAY', 'CT', 'MRI', 'ULTRASOUND', 'MAMMOGRAPHY', 'PET', 'NUCLEAR_MEDICINE', 'FLUOROSCOPY', 'ENDOSCOPY', 'DERMOSCOPY', 'FUNDUS', 'OCT', 'ECG', 'EEG', 'PATHOLOGY', 'PHOTOGRAPH', 'OTHER');

-- CreateEnum
CREATE TYPE "ImageProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ImageAccessType" AS ENUM ('VIEW', 'DOWNLOAD', 'UPLOAD', 'DELETE', 'SHARE', 'ANNOTATE', 'PRINT', 'EXPORT', 'AI_ANALYSIS');

-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('MEASUREMENT', 'REGION', 'MARKER', 'TEXT', 'ARROW', 'CIRCLE', 'RECTANGLE', 'FREEHAND');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('HOSPITAL', 'CLINIC', 'LABORATORY', 'IMAGING_CENTER', 'PHARMACY', 'PUBLIC_HEALTH_UNIT', 'DIAGNOSTIC_CENTER');

-- CreateEnum
CREATE TYPE "RNDSStatus" AS ENUM ('NOT_SYNCED', 'SYNCING', 'SYNCED', 'ERROR', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('A1', 'A3');

-- CreateEnum
CREATE TYPE "RNDSOperation" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'SEARCH');

-- CreateEnum
CREATE TYPE "RNDSDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "GuiaType" AS ENUM ('CONSULTA', 'SP_SADT', 'INTERNACAO', 'URGENCIA', 'HONORARIOS');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'DENIED', 'CANCELLED', 'USED', 'EXPIRED', 'PARTIALLY_USED');

-- CreateEnum
CREATE TYPE "LoincStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'DISCOURAGED', 'TRIAL');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('ACTIVE', 'RECURRENCE', 'RELAPSE', 'INACTIVE', 'REMISSION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DiagnosisVerificationStatus" AS ENUM ('UNCONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'CONFIRMED', 'REFUTED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "ImmunizationStatus" AS ENUM ('COMPLETED', 'NOT_DONE', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "ProcedureStatus" AS ENUM ('PREPARATION', 'IN_PROGRESS', 'NOT_DONE', 'ON_HOLD', 'STOPPED', 'COMPLETED', 'ENTERED_IN_ERROR', 'UNKNOWN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "supabaseId" TEXT,
    "walletAddress" TEXT,
    "publicKey" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLINICIAN',
    "specialty" TEXT,
    "licenseNumber" TEXT,
    "npi" TEXT,
    "cboCode" VARCHAR(6),
    "cnesCode" VARCHAR(7),
    "cpf" VARCHAR(11),
    "fhirResourceId" TEXT,
    "icpBrasilCertificateId" TEXT,
    "organizationId" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_users" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "sentVia" "OTPChannel" NOT NULL DEFAULT 'SMS',
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "fromUserType" "UserType" NOT NULL,
    "toUserId" TEXT NOT NULL,
    "toUserType" "UserType" NOT NULL,
    "patientId" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "parentMessageId" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" "UserType" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deliveredInApp" BOOLEAN NOT NULL DEFAULT false,
    "deliveredEmail" BOOLEAN NOT NULL DEFAULT false,
    "deliveredSMS" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "smsSentAt" TIMESTAMP(3),
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_metrics" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "value" JSONB NOT NULL,
    "unit" TEXT,
    "loincCode" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'PATIENT_MANUAL',
    "deviceName" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "isOutOfRange" BOOLEAN NOT NULL DEFAULT false,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_shares" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "documentType" "ShareableType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentIds" TEXT[],
    "shareToken" TEXT NOT NULL,
    "shareTokenHash" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientName" TEXT,
    "purpose" TEXT,
    "expiresAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "maxAccesses" INTEGER,
    "accessedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "accessIpAddresses" TEXT[],
    "allowDownload" BOOLEAN NOT NULL DEFAULT true,
    "requirePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "blockchainId" TEXT,
    "dataHash" TEXT,
    "lastHashUpdate" TIMESTAMP(3),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'MX',
    "mrn" TEXT NOT NULL,
    "externalMrn" TEXT,
    "tokenId" TEXT NOT NULL,
    "ageBand" TEXT,
    "region" TEXT,
    "cns" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "municipalityCode" TEXT,
    "healthUnitCNES" TEXT,
    "susPacientId" TEXT,
    "isPalliativeCare" BOOLEAN NOT NULL DEFAULT false,
    "comfortCareOnly" BOOLEAN NOT NULL DEFAULT false,
    "advanceDirectivesStatus" "AdvanceDirectivesStatus",
    "advanceDirectivesDate" TIMESTAMP(3),
    "advanceDirectivesNotes" TEXT,
    "dnrStatus" BOOLEAN NOT NULL DEFAULT false,
    "dnrDate" TIMESTAMP(3),
    "dniStatus" BOOLEAN NOT NULL DEFAULT false,
    "dniDate" TIMESTAMP(3),
    "codeStatus" "CodeStatus",
    "primaryCaregiverId" TEXT,
    "qualityOfLifeScore" INTEGER,
    "lastQoLAssessment" TIMESTAMP(3),
    "religiousAffiliation" TEXT,
    "spiritualCareNeeds" TEXT,
    "chaplainAssigned" BOOLEAN NOT NULL DEFAULT false,
    "primaryContactName" TEXT,
    "primaryContactRelation" TEXT,
    "primaryContactPhone" TEXT,
    "primaryContactEmail" TEXT,
    "primaryContactAddress" TEXT,
    "secondaryContactName" TEXT,
    "secondaryContactRelation" TEXT,
    "secondaryContactPhone" TEXT,
    "secondaryContactEmail" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "familyPortalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "familyPortalInviteSent" TIMESTAMP(3),
    "photoUrl" TEXT,
    "photoConsentDate" TIMESTAMP(3),
    "photoConsentBy" TEXT,
    "preferredName" TEXT,
    "pronouns" TEXT,
    "culturalPreferences" TEXT,
    "hasSpecialNeeds" BOOLEAN NOT NULL DEFAULT false,
    "specialNeedsType" TEXT[],
    "communicationNeeds" TEXT,
    "mobilityNeeds" TEXT,
    "dietaryNeeds" TEXT,
    "sensoryNeeds" TEXT,
    "careTeamNotes" TEXT,
    "flaggedConcerns" TEXT[],
    "whatsappConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "whatsappConsentDate" TIMESTAMP(3),
    "whatsappConsentMethod" TEXT,
    "whatsappConsentWithdrawnAt" TIMESTAMP(3),
    "whatsappConsentLanguage" TEXT,
    "medicationRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "appointmentRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "labResultsAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preventiveCareAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preferredContactTimeStart" TEXT,
    "preferredContactTimeEnd" TEXT,
    "doNotDisturbEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastBloodPressureCheck" TIMESTAMP(3),
    "lastCholesterolTest" TIMESTAMP(3),
    "cvdRiskScore" DOUBLE PRECISION,
    "cvdRiskAssessmentDate" TIMESTAMP(3),
    "cvdRiskCategory" TEXT,
    "lastHbA1c" TIMESTAMP(3),
    "lastFastingGlucose" TIMESTAMP(3),
    "diabetesRiskScore" DOUBLE PRECISION,
    "diabetesRiskDate" TIMESTAMP(3),
    "diabetesRiskCategory" TEXT,
    "prediabetesDetected" BOOLEAN NOT NULL DEFAULT false,
    "enrolledInDPP" BOOLEAN NOT NULL DEFAULT false,
    "dppStartDate" TIMESTAMP(3),
    "lastMammogram" TIMESTAMP(3),
    "lastPapSmear" TIMESTAMP(3),
    "lastColonoscopy" TIMESTAMP(3),
    "lastProstateScreening" TIMESTAMP(3),
    "lastPhysicalExam" TIMESTAMP(3),
    "lastDentalCheckup" TIMESTAMP(3),
    "lastEyeExam" TIMESTAMP(3),
    "lastImmunizationUpdate" TIMESTAMP(3),
    "tobaccoUse" BOOLEAN NOT NULL DEFAULT false,
    "tobaccoType" TEXT,
    "tobaccoPackYears" DOUBLE PRECISION,
    "alcoholUse" BOOLEAN NOT NULL DEFAULT false,
    "alcoholDrinksPerWeek" INTEGER,
    "physicalActivityMinutesWeek" INTEGER,
    "dietQualityScore" INTEGER,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bmiCategory" TEXT,
    "lastBMIUpdate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedClinicianId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionHash" TEXT,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT,
    "instructions" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "prescribedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_schedules" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER,
    "isPRN" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL,
    "timesPerDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administrations" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "actualTime" TIMESTAMP(3),
    "status" "MedicationAdministrationStatus" NOT NULL,
    "isPRN" BOOLEAN NOT NULL DEFAULT false,
    "prnReason" TEXT,
    "doseGiven" TEXT,
    "route" TEXT,
    "site" TEXT,
    "administeredBy" TEXT NOT NULL,
    "witnessedBy" TEXT,
    "barcodeScanned" BOOLEAN NOT NULL DEFAULT false,
    "patientIdVerified" BOOLEAN NOT NULL DEFAULT false,
    "refusalReason" TEXT,
    "missedReason" TEXT,
    "patientResponse" TEXT,
    "adverseReaction" BOOLEAN NOT NULL DEFAULT false,
    "reactionDetails" TEXT,
    "notes" TEXT,
    "onTime" BOOLEAN NOT NULL DEFAULT true,
    "minutesLate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "resultHash" TEXT,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "loincCode" TEXT,
    "category" TEXT,
    "orderingDoctor" TEXT,
    "performingLab" TEXT,
    "value" TEXT,
    "unit" TEXT,
    "referenceRange" TEXT,
    "status" "LabResultStatus" NOT NULL DEFAULT 'PRELIMINARY',
    "interpretation" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "orderedDate" TIMESTAMP(3),
    "collectedDate" TIMESTAMP(3),
    "resultDate" TIMESTAMP(3) NOT NULL,
    "reviewedDate" TIMESTAMP(3),
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imaging_studies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "studyHash" TEXT,
    "studyInstanceUID" TEXT,
    "accessionNumber" TEXT,
    "modality" TEXT NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "indication" TEXT,
    "status" "ImagingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "orderingDoctor" TEXT,
    "referringDoctor" TEXT,
    "performingFacility" TEXT,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "imageUrls" TEXT[],
    "thumbnailUrl" TEXT,
    "reportUrl" TEXT,
    "findings" TEXT,
    "impression" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "scheduledDate" TIMESTAMP(3),
    "studyDate" TIMESTAMP(3) NOT NULL,
    "reportDate" TIMESTAMP(3),
    "reviewedDate" TIMESTAMP(3),
    "technician" TEXT,
    "radiologist" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imaging_studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_access_grants" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "grantedToType" TEXT NOT NULL,
    "grantedToId" TEXT,
    "grantedToEmail" TEXT,
    "grantedToName" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "labResultId" TEXT,
    "imagingStudyId" TEXT,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canDownload" BOOLEAN NOT NULL DEFAULT false,
    "canShare" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "purpose" TEXT,
    "consentFormId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "prescriptionHash" TEXT NOT NULL,
    "txHash" TEXT,
    "blockTimestamp" TIMESTAMP(3),
    "medications" JSONB NOT NULL,
    "instructions" TEXT,
    "diagnosis" TEXT,
    "signatureMethod" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "icpBrasilCertificateId" TEXT,
    "icpBrasilSignature" TEXT,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "sentToPharmacy" BOOLEAN NOT NULL DEFAULT false,
    "pharmacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consentHash" TEXT NOT NULL,
    "txHash" TEXT,
    "blockTimestamp" TIMESTAMP(3),
    "type" "ConsentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "witnessName" TEXT,
    "witnessSignature" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "googleEventId" TEXT,
    "outlookEventId" TEXT,
    "calendarSyncedAt" TIMESTAMP(3),
    "type" "AppointmentType" NOT NULL DEFAULT 'IN_PERSON',
    "meetingUrl" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmationToken" TEXT,
    "confirmationSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmationMethod" TEXT,
    "rescheduleRequested" BOOLEAN NOT NULL DEFAULT false,
    "rescheduleRequestedAt" TIMESTAMP(3),
    "rescheduleReason" TEXT,
    "rescheduleNewTime" TIMESTAMP(3),
    "rescheduleApproved" BOOLEAN,
    "rescheduleApprovedAt" TIMESTAMP(3),
    "rescheduleApprovedBy" TEXT,
    "branch" TEXT,
    "branchAddress" TEXT,
    "patientNotes" TEXT,
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "waitingRoomCheckedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "deidentifiedHash" TEXT,
    "txHash" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "originalStorageUrl" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "ocrText" TEXT,
    "entities" JSONB,
    "isDeidentified" BOOLEAN NOT NULL DEFAULT false,
    "phiDetected" INTEGER NOT NULL DEFAULT 0,
    "deidentifiedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "noteHash" TEXT NOT NULL,
    "txHash" TEXT,
    "type" "NoteType" NOT NULL DEFAULT 'PROGRESS',
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "chiefComplaint" TEXT,
    "diagnosis" TEXT[],
    "authorId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_note_versions" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changedBy" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "type" "NoteType" NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "chiefComplaint" TEXT,
    "diagnosis" TEXT[],
    "changedFields" TEXT[],
    "changesSummary" TEXT,
    "noteHash" TEXT NOT NULL,
    "previousHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_note_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_maps" (
    "id" TEXT NOT NULL,
    "encryptedMap" TEXT NOT NULL,
    "mapHash" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" JSONB,
    "dataHash" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_transactions" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" BIGINT,
    "network" TEXT NOT NULL DEFAULT 'polygon-mainnet',
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "dataHash" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "functionCalled" TEXT NOT NULL,
    "gasUsed" BIGINT,
    "gasCost" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT[],
    "calendarId" TEXT,
    "calendarName" TEXT,
    "calendarEmail" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncErrors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scribe_sessions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "audioFileUrl" TEXT,
    "audioFileName" TEXT,
    "audioDuration" INTEGER NOT NULL DEFAULT 0,
    "audioFormat" TEXT NOT NULL DEFAULT 'webm',
    "audioSize" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" "ScribeStatus" NOT NULL DEFAULT 'RECORDING',
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "transcriptionModel" TEXT DEFAULT 'whisper-1',
    "soapModel" TEXT DEFAULT 'claude-3-5-sonnet-20250219',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scribe_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "speakerCount" INTEGER NOT NULL DEFAULT 2,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'whisper-1',
    "language" TEXT NOT NULL DEFAULT 'es',
    "processingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcription_errors" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "speaker" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalText" TEXT NOT NULL,
    "correctedText" TEXT NOT NULL,
    "editDistance" INTEGER,
    "correctedBy" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcription_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soap_notes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "noteHash" TEXT NOT NULL,
    "txHash" TEXT,
    "subjective" TEXT NOT NULL,
    "subjectiveConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "objective" TEXT NOT NULL,
    "objectiveConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assessment" TEXT NOT NULL,
    "assessmentConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL,
    "planConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chiefComplaint" TEXT,
    "vitalSigns" JSONB,
    "diagnoses" JSONB NOT NULL,
    "procedures" JSONB,
    "medications" JSONB,
    "overallConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasEdited" BOOLEAN NOT NULL DEFAULT false,
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "editHistory" JSONB,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "signatureMethod" TEXT,
    "model" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20250219',
    "tokensUsed" INTEGER,
    "processingTime" INTEGER,
    "status" "SOAPStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soap_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL,
    "specialty" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "shortcut" TEXT,
    "createdById" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "userAgent" TEXT,
    "platform" TEXT,
    "deviceName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabledTypes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "FormCategory" NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "structure" JSONB,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "createdBy" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[],
    "estimatedMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_instances" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "responses" JSONB,
    "submittedData" JSONB,
    "signatureDataUrl" TEXT,
    "signatureIp" TEXT,
    "signedUserAgent" TEXT,
    "attachments" TEXT[],
    "accessToken" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "dataHash" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_audit_logs" (
    "id" TEXT NOT NULL,
    "formInstanceId" TEXT NOT NULL,
    "event" "FormAuditEvent" NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "userType" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chain" "PharmacyChain" NOT NULL,
    "branchCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'MX',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "isOpen24Hours" BOOLEAN NOT NULL DEFAULT false,
    "hasDelivery" BOOLEAN NOT NULL DEFAULT false,
    "acceptsEPrescriptions" BOOLEAN NOT NULL DEFAULT true,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_prescriptions" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "status" "PharmacyPrescriptionStatus" NOT NULL DEFAULT 'SENT',
    "pharmacyOrderId" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "finalCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'PICKUP',
    "deliveryAddress" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "patientNotified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "pharmacyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_preferences" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsAppointments" BOOLEAN NOT NULL DEFAULT true,
    "smsPrescriptions" BOOLEAN NOT NULL DEFAULT true,
    "smsResults" BOOLEAN NOT NULL DEFAULT true,
    "smsReminders" BOOLEAN NOT NULL DEFAULT true,
    "smsMarketing" BOOLEAN NOT NULL DEFAULT false,
    "smsConsentedAt" TIMESTAMP(3),
    "smsConsentIp" TEXT,
    "smsConsentMethod" TEXT,
    "smsOptedOutAt" TIMESTAMP(3),
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailAppointments" BOOLEAN NOT NULL DEFAULT true,
    "emailPrescriptions" BOOLEAN NOT NULL DEFAULT true,
    "emailResults" BOOLEAN NOT NULL DEFAULT true,
    "emailReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT false,
    "emailConsentedAt" TIMESTAMP(3),
    "emailConsentIp" TEXT,
    "emailConsentMethod" TEXT,
    "emailOptedOutAt" TIMESTAMP(3),
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushAppointments" BOOLEAN NOT NULL DEFAULT true,
    "pushPrescriptions" BOOLEAN NOT NULL DEFAULT true,
    "pushResults" BOOLEAN NOT NULL DEFAULT true,
    "pushMessages" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappConsented" BOOLEAN NOT NULL DEFAULT false,
    "whatsappConsentedAt" TIMESTAMP(3),
    "allowEmergencyOverride" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'es',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "referenceId" TEXT,
    "patientId" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 16.0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION,
    "totalAmount" INTEGER NOT NULL,
    "billingName" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT NOT NULL DEFAULT 'MX',
    "rfc" TEXT,
    "fiscalAddress" TEXT,
    "taxRegime" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "voidedDate" TIMESTAMP(3),
    "voidReason" TEXT,
    "issuedBy" TEXT,
    "paidBy" TEXT,
    "stripeInvoiceId" TEXT,
    "cfdiUUID" TEXT,
    "cfdiXml" TEXT,
    "cfdiPdfUrl" TEXT,
    "cfdiStampDate" TIMESTAMP(3),
    "cfdiSerie" TEXT,
    "cfdiNumber" TEXT,
    "cfdiStatus" "CFDIStatus" NOT NULL DEFAULT 'PENDING',
    "cfdiUsage" TEXT DEFAULT 'G03',
    "cfdiPaymentForm" TEXT DEFAULT '03',
    "cfdiPaymentMethod" TEXT DEFAULT 'PUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "cptCode" TEXT,
    "hcpcsCode" TEXT,
    "cbhpmCode" TEXT,
    "icd10Code" TEXT,
    "notes" TEXT,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "paymentNumber" TEXT NOT NULL,
    "referenceId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeRefundId" TEXT,
    "stripeCustomerId" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "bankName" TEXT,
    "bankAccountLast4" TEXT,
    "bankTransferDate" TIMESTAMP(3),
    "bankTransactionId" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyId" TEXT,
    "insuranceClaimId" TEXT,
    "receiptNumber" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "failureCode" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundedAmount" INTEGER,
    "refundReason" TEXT,
    "refundedBy" TEXT,
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "receiptUrl" TEXT,
    "receiptSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "userId" TEXT,
    "clinicId" TEXT,
    "patientId" TEXT,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "fromCache" BOOLEAN NOT NULL DEFAULT false,
    "queryComplexity" TEXT,
    "feature" TEXT,
    "promptPreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tiers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTierEnum" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "dailyAILimit" INTEGER NOT NULL DEFAULT 10,
    "monthlyAILimit" INTEGER NOT NULL DEFAULT 300,
    "dailyAIUsed" INTEGER NOT NULL DEFAULT 0,
    "monthlyAIUsed" INTEGER NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "billingCycle" "BillingCycle",
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "CarePlanCategory" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "goals" TEXT[],
    "targetDate" TIMESTAMP(3),
    "status" "CarePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedTeam" TEXT[],
    "progressNotes" TEXT[],
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pain_assessments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "painScore" INTEGER NOT NULL,
    "painType" "PainType",
    "location" TEXT,
    "description" TEXT,
    "quality" TEXT[],
    "timing" TEXT,
    "aggravatingFactors" TEXT[],
    "relievingFactors" TEXT[],
    "functionalImpact" TEXT,
    "sleepImpact" TEXT,
    "moodImpact" TEXT,
    "interventionsGiven" TEXT[],
    "responseToTreatment" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessedBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "pain_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_portal_access" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "familyMemberName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "accessToken" TEXT NOT NULL,
    "accessLevel" "FamilyAccessLevel" NOT NULL DEFAULT 'READ_ONLY',
    "canViewClinicalNotes" BOOLEAN NOT NULL DEFAULT true,
    "canViewMedications" BOOLEAN NOT NULL DEFAULT true,
    "canViewCarePlan" BOOLEAN NOT NULL DEFAULT true,
    "canViewPainAssessments" BOOLEAN NOT NULL DEFAULT true,
    "canReceiveDailyUpdates" BOOLEAN NOT NULL DEFAULT true,
    "canViewPhotos" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inviteSentAt" TIMESTAMP(3),
    "firstAccessAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_portal_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "allergyType" "AllergyType" NOT NULL,
    "category" "AllergyCategory",
    "snomedAllergenCode" TEXT,
    "severity" "AllergySeverity" NOT NULL,
    "reactions" TEXT[],
    "onsetDate" TIMESTAMP(3),
    "diagnosedBy" TEXT,
    "verificationStatus" "AllergyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "clinicalNotes" TEXT,
    "crossReactiveWith" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventive_care_reminders" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "screeningType" "PreventiveCareType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "recommendedBy" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "guidelineSource" TEXT,
    "evidenceLevel" TEXT,
    "status" "PreventiveCareStatus" NOT NULL DEFAULT 'DUE',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "resultNotes" TEXT,
    "recurringInterval" INTEGER,
    "nextDueDate" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "dismissedBy" TEXT,
    "dismissalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preventive_care_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "situations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "actionLabel" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "situations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_situations" (
    "appointmentId" TEXT NOT NULL,
    "situationId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "appointment_situations_pkey" PRIMARY KEY ("appointmentId","situationId")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NotificationTemplateType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "level" "TemplateLevel" NOT NULL DEFAULT 'CLINIC',
    "clinicId" TEXT,
    "doctorId" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "availableVariables" JSONB,
    "sendTiming" INTEGER,
    "sendTimingUnit" TEXT DEFAULT 'minutes',
    "requireConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reminders" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateSubject" TEXT,
    "templateMessage" TEXT NOT NULL,
    "templateVars" JSONB,
    "patientIds" JSONB NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "recurrencePattern" "RecurrencePattern",
    "recurrenceInterval" INTEGER,
    "recurrenceEndDate" TIMESTAMP(3),
    "recurrenceCount" INTEGER,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "lastExecuted" TIMESTAMP(3),
    "nextExecution" TIMESTAMP(3),
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "lastExecutionResults" JSONB,
    "createdBy" TEXT NOT NULL,
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_preferences" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "workingDays" INTEGER[],
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "minimumAdvanceNotice" INTEGER NOT NULL DEFAULT 24,
    "appointmentDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferBetweenSlots" INTEGER NOT NULL DEFAULT 0,
    "allowSameDayBooking" BOOLEAN NOT NULL DEFAULT false,
    "allowWeekendBooking" BOOLEAN NOT NULL DEFAULT false,
    "maxAppointmentsPerDay" INTEGER,
    "autoApproveReschedule" BOOLEAN NOT NULL DEFAULT false,
    "allowPatientReschedule" BOOLEAN NOT NULL DEFAULT true,
    "rescheduleMinNotice" INTEGER NOT NULL DEFAULT 12,
    "requireConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "confirmationDeadline" INTEGER NOT NULL DEFAULT 24,
    "lunchBreakStart" TEXT,
    "lunchBreakEnd" TEXT,
    "customBreaks" JSONB,
    "weeklyViewDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "notifyOnNewBooking" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnReschedule" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCancellation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "daysOfWeek" INTEGER[],
    "dayOfMonth" INTEGER,
    "startTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "seriesStart" TIMESTAMP(3) NOT NULL,
    "seriesEnd" TIMESTAMP(3),
    "maxOccurrences" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AppointmentType" NOT NULL DEFAULT 'IN_PERSON',
    "meetingUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "lastGeneratedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "recurringSeriesId" TEXT,

    CONSTRAINT "recurring_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_availability" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "maxBookings" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_time_off" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "TimeOffType" NOT NULL,
    "reason" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" "TimeOffStatus" NOT NULL DEFAULT 'APPROVED',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "affectedAppointments" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_type_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "appointmentType" "AppointmentType" NOT NULL,
    "defaultDuration" INTEGER NOT NULL,
    "bufferBefore" INTEGER NOT NULL DEFAULT 0,
    "bufferAfter" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "description" TEXT,
    "allowOnline" BOOLEAN NOT NULL DEFAULT true,
    "requireConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "maxAdvanceBooking" INTEGER,
    "minAdvanceBooking" INTEGER NOT NULL DEFAULT 0,
    "basePrice" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'MXN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_show_history" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "noShowMarkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedBy" TEXT,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3),
    "contactMethod" TEXT,
    "contactNotes" TEXT,
    "patientReason" TEXT,
    "willReschedule" BOOLEAN NOT NULL DEFAULT false,
    "feeCharged" BOOLEAN NOT NULL DEFAULT false,
    "feeAmount" DECIMAL(10,2),
    "feePaid" BOOLEAN NOT NULL DEFAULT false,
    "feePaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "no_show_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiting_list" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "preferredTimeStart" TEXT,
    "preferredTimeEnd" TEXT,
    "appointmentType" "AppointmentType" NOT NULL DEFAULT 'IN_PERSON',
    "priority" "WaitingListPriority" NOT NULL DEFAULT 'NORMAL',
    "reason" TEXT,
    "status" "WaitingListStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "response" TEXT,
    "appointmentId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "waiting_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT NOT NULL,
    "clinicId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "relatedType" TEXT,
    "relatedId" TEXT,
    "autoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialType" "CredentialType" NOT NULL,
    "credentialNumber" TEXT NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "issuingCountry" TEXT NOT NULL,
    "issuingState" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "neverExpires" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "ocrData" JSONB,
    "ocrConfidence" DOUBLE PRECISION,
    "autoVerified" BOOLEAN NOT NULL DEFAULT false,
    "manualVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationSource" TEXT,
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_verifications" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "verificationMethod" "VerificationMethod" NOT NULL,
    "verificationSource" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "VerificationResult" NOT NULL,
    "matchScore" DOUBLE PRECISION,
    "matchedData" JSONB,
    "discrepancies" JSONB,
    "externalRequestId" TEXT,
    "externalVerificationId" TEXT,
    "verificationNotes" TEXT,
    "adminReviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "credential_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_images" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "fileExtension" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "imageType" "MedicalImageType" NOT NULL,
    "modality" TEXT,
    "bodyPart" TEXT,
    "laterality" TEXT,
    "viewPosition" TEXT,
    "studyDescription" TEXT,
    "studyDate" TIMESTAMP(3),
    "acquisitionDate" TIMESTAMP(3),
    "isDeidentified" BOOLEAN NOT NULL DEFAULT false,
    "deidentificationDate" TIMESTAMP(3),
    "removedPHI" JSONB,
    "deidentificationMethod" TEXT,
    "isDICOM" BOOLEAN NOT NULL DEFAULT false,
    "studyInstanceUID" TEXT,
    "seriesInstanceUID" TEXT,
    "sopInstanceUID" TEXT,
    "dicomMetadata" JSONB,
    "thumbnailPath" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" "ImageProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "patientId" TEXT,
    "providerId" TEXT,
    "appointmentId" TEXT,
    "findings" TEXT,
    "clinicalNotes" TEXT,
    "diagnosis" TEXT,
    "recommendedAction" TEXT,
    "aiAnalysisPerformed" BOOLEAN NOT NULL DEFAULT false,
    "aiFindings" JSONB,
    "aiConfidenceScore" DOUBLE PRECISION,
    "aiModelVersion" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "sharedWith" JSONB,
    "shareExpiresAt" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_access_logs" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT,
    "accessType" "ImageAccessType" NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "actionTaken" TEXT,
    "hipaaCompliant" BOOLEAN NOT NULL DEFAULT true,
    "auditNotes" TEXT,

    CONSTRAINT "image_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_annotations" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "annotationType" "AnnotationType" NOT NULL,
    "coordinates" JSONB NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "color" TEXT,
    "measurementValue" DOUBLE PRECISION,
    "measurementUnit" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "cnesCode" VARCHAR(7) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "fhirResourceId" TEXT,
    "rndsStatus" "RNDSStatus" NOT NULL DEFAULT 'NOT_SYNCED',
    "lastRNDSSync" TIMESTAMP(3),
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "postalCode" VARCHAR(8) NOT NULL,
    "municipalityCode" VARCHAR(7) NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "organizationType" "OrgType" NOT NULL DEFAULT 'CLINIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icp_brasil_certificates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "certificateType" "CertificateType" NOT NULL,
    "subjectCN" TEXT NOT NULL,
    "subjectCPF" VARCHAR(11) NOT NULL,
    "issuerName" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "notBefore" TIMESTAMP(3) NOT NULL,
    "notAfter" TIMESTAMP(3) NOT NULL,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "certificatePEM" TEXT NOT NULL,
    "lastUsedA