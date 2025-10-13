-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'CANCELLED_BY_PATIENT', 'NO_RESPONSE');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "confirmationMethod" TEXT,
ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "confirmationToken" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "rescheduleApproved" BOOLEAN,
ADD COLUMN     "rescheduleApprovedAt" TIMESTAMP(3),
ADD COLUMN     "rescheduleApprovedBy" TEXT,
ADD COLUMN     "rescheduleNewTime" TIMESTAMP(3),
ADD COLUMN     "rescheduleReason" TEXT,
ADD COLUMN     "rescheduleRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rescheduleRequestedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_confirmationToken_key" ON "appointments"("confirmationToken");

-- CreateIndex
CREATE INDEX "appointments_confirmationToken_idx" ON "appointments"("confirmationToken");

-- CreateIndex
CREATE INDEX "appointments_confirmationStatus_idx" ON "appointments"("confirmationStatus");
