/**
 * Prescription Signing API
 *
 * POST /api/prescriptions/[id]/sign - Electronically sign prescription
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import crypto from 'crypto';
import { compare } from 'bcryptjs';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import { logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { verifyWebAuthnToken } from '@/lib/auth/webauthn-token';
import {
  verifyIcpBrasilSignature,
  generatePrescriptionSigningHash,
} from '@/lib/auth/icp-brasil-signer';
import { classifyPrescription } from '@/lib/brazil-interop/anvisa-drug-registry';
import {
  calculateValidUntil,
  validatePrescription,
} from '@/lib/prescriptions/validity-rules';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/prescriptions/[id]/sign
 * Electronically sign a prescription
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const prescriptionId = context.params?.id;

      if (!prescriptionId) {
        return NextResponse.json(
          { error: 'Prescription ID is required' },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate required fields
      if (!body.signatureMethod || !body.signatureData) {
        return NextResponse.json(
          { error: 'signatureMethod and signatureData are required' },
          { status: 400 }
        );
      }

      // Validate signature method
      const VALID_METHODS = ['pin', 'signature_pad', 'webauthn', 'icp_brasil'];
      if (!VALID_METHODS.includes(body.signatureMethod)) {
        return NextResponse.json(
          { error: `signatureMethod must be one of: ${VALID_METHODS.join(', ')}` },
          { status: 400 }
        );
      }

      // Find prescription
      const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!prescription) {
        return NextResponse.json(
          { error: 'Prescription not found' },
          { status: 404 }
        );
      }

      // Verify access - only the prescribing clinician can sign
      if (prescription.clinicianId !== context.user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the prescribing clinician can sign this prescription' },
          { status: 403 }
        );
      }

      // Check if already signed
      if (prescription.status === 'SIGNED' || prescription.status === 'SENT') {
        return NextResponse.json(
          { error: 'Prescription is already signed' },
          { status: 400 }
        );
      }

      // Verify PIN if using PIN method
      if (body.signatureMethod === 'pin') {
        if (!/^\d{4,6}$/.test(body.signatureData)) {
          return NextResponse.json(
            { error: 'Invalid PIN format. Must be 4-6 digits.' },
            { status: 400 }
          );
        }

        const signer = await prisma.user.findUnique({
          where: { id: context.user.id },
          select: { signingPinHash: true },
        });

        if (!signer?.signingPinHash) {
          return NextResponse.json(
            { error: 'PIN not configured — set up your signing PIN in Settings' },
            { status: 400 }
          );
        }

        const pinValid = await compare(body.signatureData, signer.signingPinHash);
        if (!pinValid) {
          logger.warn({ event: 'invalid_signing_pin', userId: context.user.id, prescriptionId });
          return NextResponse.json(
            { error: 'Invalid PIN' },
            { status: 403 }
          );
        }

        body.signatureData = crypto
          .createHash('sha256')
          .update(body.signatureData)
          .digest('hex');
      }

      // ===================================================================
      // WEBAUTHN VERIFICATION
      // ===================================================================
      if (body.signatureMethod === 'webauthn') {
        const payload = await verifyWebAuthnToken(body.signatureData);
        if (!payload || payload.userId !== context.user.id) {
          return NextResponse.json(
            { error: 'Invalid or expired biometric signature token' },
            { status: 401 }
          );
        }
        // Hash the token for storage (don't store raw JWT)
        body.signatureData = crypto
          .createHash('sha256')
          .update(body.signatureData)
          .digest('hex');
      }

      // ===================================================================
      // ICP-BRASIL VERIFICATION (ANVISA RDC 1.000/2025)
      // ===================================================================
      let icpBrasilCertSerial: string | null = null;
      let icpBrasilSignatureBlob: string | null = null;

      if (body.signatureMethod === 'icp_brasil') {
        if (!body.certificatePem || !body.signatureBlob) {
          return NextResponse.json(
            { error: 'ICP-Brasil signing requires certificatePem and signatureBlob' },
            { status: 400 }
          );
        }

        const signingHash = generatePrescriptionSigningHash({
          prescriptionId,
          patientId: prescription.patientId,
          clinicianId: prescription.clinicianId,
          medications: prescription.medications,
          timestamp: new Date().toISOString(),
        });

        const verification = await verifyIcpBrasilSignature({
          signatureBlob: body.signatureBlob,
          certificatePem: body.certificatePem,
          signedDataHash: signingHash,
        });

        if (!verification.valid) {
          return NextResponse.json(
            { error: `ICP-Brasil signature verification failed: ${verification.error}` },
            { status: 401 }
          );
        }

        icpBrasilCertSerial = verification.certSerial;
        icpBrasilSignatureBlob = body.signatureBlob;
        body.signatureData = signingHash; // Store the hash, not the raw sig
      }

      // ===================================================================
      // ANVISA PRESCRIPTION CLASSIFICATION
      // ===================================================================
      const medications = prescription.medications as Array<{ name: string; genericName?: string }>;
      const medNames = medications.map((m) => m.genericName || m.name);
      const classification = classifyPrescription(medNames);

      // Validate against ANVISA rules
      const validationErrors = validatePrescription({
        prescriptionType: classification.prescriptionType,
        controlledSchedule: classification.controlledSchedule,
        signatureMethod: body.signatureMethod,
        medicationCount: medications.length,
        daysSupply: prescription.daysSupply,
        hasWitness: body.hasWitness ?? false,
      });

      const blockingErrors = validationErrors.filter((e) => e.severity === 'BLOCK');
      if (blockingErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'ANVISA compliance violation — prescription cannot be signed',
            violations: blockingErrors,
          },
          { status: 422 }
        );
      }

      const warnings = validationErrors.filter((e) => e.severity === 'WARNING');
      const signedAt = new Date();
      const validUntil = calculateValidUntil(classification.prescriptionType, signedAt);

      // Generate prescription hash if not already set
      let prescriptionHash = prescription.prescriptionHash;
      if (!prescriptionHash) {
        const prescriptionData = {
          patientId: prescription.patientId,
          clinicianId: prescription.clinicianId,
          medications: prescription.medications,
          timestamp: signedAt.toISOString(),
        };

        prescriptionHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(prescriptionData))
          .digest('hex');
      }

      // Determine SNCR requirement
      const sncrRequired = classification.prescriptionType !== 'BRANCA';

      // Update prescription with signature + ANVISA classification
      const signedPrescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          status: 'SIGNED',
          signatureMethod: body.signatureMethod,
          signatureData: body.signatureData,
          digitalSignatureType: body.signatureMethod === 'icp_brasil' ? 'ICP_BRASIL'
            : body.signatureMethod === 'webauthn' ? 'WEBAUTHN'
            : body.signatureMethod === 'signature_pad' ? 'SIGNATURE_PAD'
            : 'PIN',
          signedAt,
          prescriptionHash,
          // ANVISA fields
          prescriptionType: classification.prescriptionType,
          controlledSubstanceClass: classification.controlledSchedule,
          validUntil,
          // ICP-Brasil fields (null for other methods)
          icpBrasilCertSerial,
          icpBrasilSignatureBlob,
          // SNCR status
          sncrStatus: sncrRequired ? 'PENDING' : 'NOT_REQUIRED',
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              licenseNumber: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'SIGN',
          resource: 'Prescription',
          resourceId: prescriptionId,
          details: {
            signatureMethod: body.signatureMethod,
            prescriptionHash,
            patientId: prescription.patientId,
            prescriptionType: classification.prescriptionType,
            controlledSchedule: classification.controlledSchedule,
            icpBrasilCertSerial,
            sncrRequired,
          },
          success: true,
        },
      });

      // Track analytics event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.PRESCRIPTION_SIGNED,
        context.user.id,
        {
          signatureMethod: body.signatureMethod,
          prescriptionType: classification.prescriptionType,
          controlledSubstance: !!classification.controlledSchedule,
          sncrRequired,
          success: true,
        }
      );

      return NextResponse.json({
        success: true,
        data: signedPrescription,
        message: 'Prescription signed successfully',
        prescriptionType: classification.prescriptionType,
        validUntil: validUntil.toISOString(),
        ...(sncrRequired ? { sncrStatus: 'PENDING', sncrMessage: 'Prescription must be submitted to SNCR.' } : {}),
        ...(warnings.length > 0 ? { anvisaWarnings: warnings } : {}),
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to sign prescription' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'SIGN', resource: 'Prescription' },
  }
);
