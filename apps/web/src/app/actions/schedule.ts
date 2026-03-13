'use server';

import { auth } from '@/lib/auth/auth';

const ADMIN_ROLES = ['ADMIN', 'ORG_ADMIN', 'FRONT_DESK', 'RECEPTIONIST', 'STAFF'];
const CLINICAL_ROLES = ['ADMIN', 'ORG_ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'];

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  const role = String(session.user.role ?? '').toUpperCase();
  if (!ADMIN_ROLES.includes(role)) {
    return { success: false, error: 'Insufficient permissions: only administrative staff can update appointment status' };
  }

  if (!appointmentId || typeof appointmentId !== 'string') {
    return { success: false, error: 'Invalid appointment ID' };
  }

  const validStatuses = ['Scheduled', 'Arrived', 'In Progress', 'Finished', 'Pending Signature'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: `Invalid status: ${newStatus}` };
  }

  return { success: true, message: `Status updated to ${newStatus}` };
}

export async function markPatientArrived(appointmentId: string): Promise<ActionResult> {
  return updateAppointmentStatus(appointmentId, 'Arrived');
}

export async function nudgeProvider(params: {
  noteId: string;
  providerName: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  const role = String(session.user.role ?? '').toUpperCase();
  if (!CLINICAL_ROLES.includes(role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!params.noteId) {
    return { success: false, error: 'Invalid note ID' };
  }

  return { success: true, message: `Reminder sent to ${params.providerName}` };
}
