/**
 * SOAP Note PDF Template
 *
 * Professional medical record PDF export using react-pdf
 * Industry-grade formatting with proper medical documentation standards
 */
import React from 'react';
interface Patient {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    mrn: string;
}
interface Clinician {
    firstName: string;
    lastName: string;
    specialty?: string;
    licenseNumber?: string;
    npi?: string;
}
interface SOAPNote {
    id: string;
    chiefComplaint?: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    vitalSigns?: Record<string, any>;
    diagnoses?: Array<{
        code: string;
        description: string;
    }>;
    medications?: Array<{
        name: string;
        dosage: string;
    }>;
    procedures?: Array<{
        code: string;
        description: string;
    }>;
    status: string;
    createdAt: string;
    signedAt?: string;
    noteHash?: string;
    patient: Patient;
    clinician: Clinician;
}
interface SOAPNotePDFProps {
    record: SOAPNote;
}
export declare const SOAPNotePDF: React.FC<SOAPNotePDFProps>;
export {};
//# sourceMappingURL=SOAPNotePDF.d.ts.map