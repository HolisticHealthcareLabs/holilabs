/**
 * Patient Data Export API (GDPR Compliance)
 *
 * GET /api/portal/export - Export all patient data in JSON format
 *
 * GDPR Article 20: Right to Data Portability
 * Patients have the right to receive their personal data in a structured,
 * commonly used, and machine-readable format.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface PatientExportData {
  exportDate: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    country: string | null;
    emergencyContact: any;
    insuranceInfo: any;
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
  };
  appointments: Array<{
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    type: string;
    status: string;
    clinician: {
      firstName: string;
      lastName: string;
      specialty: string | null;
    };
    notes: string | null;
  }>;
  medications: Array<{
    id: string;
    name: string;
    genericName: string | null;
    dosage: string | null;
    frequency: string | null;
    instructions: string | null;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
    prescribedBy: string | null;
    sideEffects: string | null;
  }>;
  labResults: Array<{
    id: string;
    testName: string;
    testCode: string | null;
    value: string;
    unit: string | null;
    referenceRange: string | null;
    status: string;
    resultDate: string;
    category: string | null;
    notes: string | null;
    clinician: {
      firstName: string;
      lastName: string;
    } | null;
  }>;
  documents: Array<{
    id: string;
    filename: string;
    contentType: string | null;
    size: number | null;
    category: string | null;
    description: string | null;
    uploadedAt: string;
  }>;
  consultations: Array<{
    id: string;
    date: string;
    chiefComplaint: string | null;
    diagnosis: string | null;
    treatment: string | null;
    notes: string | null;
    clinician: {
      firstName: string;
      lastName: string;
      specialty: string | null;
    };
  }>;
  auditLog: Array<{
    id: string;
    action: string;
    timestamp: string;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  metadata: {
    exportVersion: string;
    totalRecords: number;
    dataRetentionPolicy: string;
    contactForQuestions: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();
    const patientId = session.patientId;

    // HIPAA/GDPR Audit Log: Patient requested full data export
    await createAuditLog({
      userId: patientId,
      userEmail: session.email || 'patient@portal.access',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'EXPORT',
      resource: 'Patient',
      resourceId: patientId,
      details: {
        patientId,
        exportType: 'GDPR_FULL_DATA_EXPORT',
        exportFormat: 'JSON',
        accessType: 'PATIENT_DATA_EXPORT_REQUEST',
      },
      success: true,
    });

    // Fetch patient data
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        patientUser: {
          select: {
            email: true,
            phone: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            mfaEnabled: true,
            createdAt: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Fetch appointments
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: {
        clinician: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    // Fetch medications
    const medications = await prisma.medication.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch lab results
    const labResults = await prisma.labResult.findMany({
      where: { patientId },
      orderBy: { resultDate: 'desc' },
    });

    // Fetch documents
    const documents = await prisma.document.findMany({
      where: { patientId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        documentType: true,
        createdAt: true,
        // Exclude actual file data for privacy/size
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch consultations (clinical notes)
    const consultations = await prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        chiefComplaint: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        diagnosis: true,
        authorId: true,
      },
    });

    // Fetch audit log for this patient
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        resource: 'Patient',
        resourceId: patientId,
      },
      orderBy: { timestamp: 'desc' },
      take: 100, // Last 100 actions
    });

    // Build export data
    const exportData: PatientExportData = {
      exportDate: new Date().toISOString(),
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth.toISOString(),
        gender: patient.gender,
        email: patient.patientUser?.email || null,
        phone: patient.patientUser?.phone || null,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        zipCode: patient.postalCode,
        country: patient.country,
        emergencyContact: {
          name: patient.emergencyContactName,
          phone: patient.emergencyContactPhone,
          relation: patient.emergencyContactRelation,
        },
        insuranceInfo: null,
        allergies: [],
        chronicConditions: [],
        currentMedications: [],
      },
      appointments: appointments.map((apt) => ({
        id: apt.id,
        title: apt.title,
        description: apt.description,
        startTime: apt.startTime.toISOString(),
        endTime: apt.endTime.toISOString(),
        type: apt.type,
        status: apt.status,
        clinician: {
          firstName: apt.clinician.firstName,
          lastName: apt.clinician.lastName,
          specialty: apt.clinician.specialty,
        },
        notes: apt.description,
      })),
      medications: medications.map((med) => ({
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        dosage: med.dose,
        frequency: med.frequency,
        instructions: med.instructions,
        isActive: med.isActive,
        startDate: med.startDate?.toISOString() || null,
        endDate: med.endDate?.toISOString() || null,
        prescribedBy: med.prescribedBy,
        sideEffects: null,
      })),
      labResults: labResults.map((result) => ({
        id: result.id,
        testName: result.testName,
        testCode: result.testCode,
        value: result.value || '',
        unit: result.unit,
        referenceRange: result.referenceRange,
        status: result.status,
        resultDate: result.resultDate.toISOString(),
        category: result.category,
        notes: result.notes,
        clinician: null,
      })),
      documents: documents.map((doc) => ({
        id: doc.id,
        filename: doc.fileName,
        contentType: doc.fileType,
        size: doc.fileSize,
        category: doc.documentType,
        description: null,
        uploadedAt: doc.createdAt.toISOString(),
      })),
      consultations: consultations.map((consult) => ({
        id: consult.id,
        date: consult.createdAt.toISOString(),
        chiefComplaint: consult.chiefComplaint || null,
        diagnosis: consult.diagnosis.length > 0 ? consult.diagnosis.join(', ') : null,
        treatment: consult.plan || null,
        notes: consult.subjective || null,
        clinician: {
          firstName: 'Unknown',
          lastName: 'Unknown',
          specialty: null,
        },
      })),
      auditLog: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        timestamp: log.timestamp.toISOString(),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      })),
      metadata: {
        exportVersion: '1.0.0',
        totalRecords:
          appointments.length +
          medications.length +
          labResults.length +
          documents.length +
          consultations.length +
          auditLogs.length,
        dataRetentionPolicy: 'Data is retained for 7 years as per HIPAA regulations',
        contactForQuestions: 'support@holilabs.com',
      },
    };

    // HIPAA/GDPR Audit Log: Data export completed successfully
    await createAuditLog({
      userId: patientId,
      userEmail: session.email || 'patient@portal.access',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'EXPORT',
      resource: 'Patient',
      resourceId: patientId,
      details: {
        patientId,
        exportType: 'GDPR_FULL_DATA_EXPORT',
        exportFormat: 'JSON',
        totalRecords: exportData.metadata.totalRecords,
        recordBreakdown: {
          appointments: exportData.appointments.length,
          medications: exportData.medications.length,
          labResults: exportData.labResults.length,
          documents: exportData.documents.length,
          consultations: exportData.consultations.length,
          auditLogs: exportData.auditLog.length,
        },
        accessType: 'PATIENT_DATA_EXPORT_COMPLETED',
      },
      success: true,
    });

    // Return as JSON download
    const filename = `holilabs-patient-data-${patient.firstName}-${patient.lastName}-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Records': exportData.metadata.totalRecords.toString(),
      },
    });
  } catch (error) {
    logger.error({
      event: 'gdpr_data_export_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to export patient data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
