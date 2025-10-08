-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFY';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "npi" TEXT;
