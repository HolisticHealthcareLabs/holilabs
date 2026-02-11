-- Add missing Appointment.notes column (used by seed + schema.prisma).

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

