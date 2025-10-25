/**
 * WhatsApp Notifications via Twilio
 *
 * Sends WhatsApp messages to patients and doctors for:
 * - SOAP note ready for review
 * - E-prescriptions
 * - Appointment reminders
 * - Test results available
 */
/**
 * Send SOAP note ready notification to patient
 */
export declare function notifyPatientSOAPReady({ patientPhone, patientName, doctorName, noteUrl, language, }: {
    patientPhone: string;
    patientName: string;
    doctorName: string;
    noteUrl: string;
    language?: 'pt' | 'es';
}): Promise<{
    success: boolean;
    messageSid: string;
}>;
/**
 * Send e-prescription to patient
 */
export declare function notifyPatientPrescription({ patientPhone, patientName, doctorName, prescriptionUrl, medications, language, }: {
    patientPhone: string;
    patientName: string;
    doctorName: string;
    prescriptionUrl: string;
    medications: Array<{
        name: string;
        dose: string;
        frequency: string;
    }>;
    language?: 'pt' | 'es';
}): Promise<{
    success: boolean;
    messageSid: string;
}>;
/**
 * Send signature request to doctor
 */
export declare function notifyDoctorSignatureRequest({ doctorPhone, doctorName, patientName, signatureUrl, language, }: {
    doctorPhone: string;
    doctorName: string;
    patientName: string;
    signatureUrl: string;
    language?: 'pt' | 'es';
}): Promise<{
    success: boolean;
    messageSid: string;
}>;
/**
 * Send appointment reminder
 */
export declare function notifyAppointmentReminder({ patientPhone, patientName, doctorName, appointmentDate, appointmentTime, clinicAddress, language, }: {
    patientPhone: string;
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    clinicAddress?: string;
    language?: 'pt' | 'es';
}): Promise<{
    success: boolean;
    messageSid: string;
}>;
/**
 * Send appointment CONFIRMATION with magic link (for automated reminders)
 * This is the main function used by the cron job
 */
export declare function sendAppointmentConfirmationWhatsApp(patientPhone: string, patientName: string, dateTime: string, clinicianName: string, confirmationUrl: string, language?: 'pt' | 'es'): Promise<boolean>;
/**
 * Send test results notification
 */
export declare function notifyTestResults({ patientPhone, patientName, doctorName, testName, resultsUrl, language, }: {
    patientPhone: string;
    patientName: string;
    doctorName: string;
    testName: string;
    resultsUrl: string;
    language?: 'pt' | 'es';
}): Promise<{
    success: boolean;
    messageSid: string;
}>;
//# sourceMappingURL=whatsapp.d.ts.map