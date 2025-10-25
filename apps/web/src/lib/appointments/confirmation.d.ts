/**
 * Appointment Confirmation System
 * Handles magic link generation, confirmation, and reschedule requests
 */
/**
 * Generate unique confirmation token
 */
export declare function generateConfirmationToken(): string;
/**
 * Create confirmation link for appointment
 */
export declare function createConfirmationLink(appointmentId: string): Promise<string>;
/**
 * Get appointment by confirmation token
 */
export declare function getAppointmentByToken(token: string): Promise<any>;
/**
 * Confirm appointment
 */
export declare function confirmAppointment(token: string): Promise<any>;
/**
 * Cancel appointment
 */
export declare function cancelAppointment(token: string, reason?: string): Promise<any>;
/**
 * Request reschedule
 */
export declare function requestReschedule(token: string, newTime: Date, reason?: string): Promise<any>;
/**
 * Get available time slots for rescheduling
 */
export declare function getAvailableSlots(clinicianId: string, startDate: Date, endDate: Date): Promise<Date[]>;
/**
 * Format appointment details for notifications
 */
export declare function formatAppointmentDetails(appointment: any): {
    patientName: string;
    clinicianName: string;
    date: string;
    time: string;
    dateTime: string;
    type: any;
};
//# sourceMappingURL=confirmation.d.ts.map