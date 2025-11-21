/**
 * HL7 ADT Message Ingestion API
 *
 * POST /api/hl7/adt - Ingest HL7 ADT messages and create/update patients
 *
 * Supports HL7 v2.x ADT messages:
 * - ADT^A01: Patient admission
 * - ADT^A04: Patient registration
 * - ADT^A08: Patient information update
 * - ADT^A28: Add person information
 * - ADT^A31: Update person information
 *
 * Request body: Raw HL7 message (text/plain or application/hl7-v2)
 * Response: JSON with created/updated patient ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseADT, ADTParser } from '@/lib/hl7/adt-parser';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';
import { generateMRN, generateTokenId } from '@/lib/fhir/patient-mapper';
import { auditCreate, auditUpdate } from '@/lib/audit';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/hl7/adt
 * Ingest HL7 ADT message and create or update patient
 *
 * @body Raw HL7 ADT message (text/plain or application/hl7-v2)
 * @returns Created or updated patient information
 *
 * Response Codes:
 * - 200: Patient updated successfully
 * - 201: Patient created successfully
 * - 400: Invalid HL7 message format
 * - 409: Conflict (patient already exists with different data)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body as text (HL7 messages are plain text)
    const contentType = request.headers.get('content-type') || '';
    let hl7Message: string;

    if (
      contentType.includes('application/hl7-v2') ||
      contentType.includes('text/plain')
    ) {
      hl7Message = await request.text();
    } else {
      // Try to parse as JSON for flexibility (with { message: "..." })
      try {
        const json = await request.json();
        hl7Message = json.message || json.hl7 || json.data;
      } catch {
        return NextResponse.json(
          {
            error: 'Invalid content type',
            message:
              'Expected text/plain, application/hl7-v2, or JSON with message field',
          },
          { status: 400 }
        );
      }
    }

    if (!hl7Message || hl7Message.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Empty message',
          message: 'HL7 message body is required',
        },
        { status: 400 }
      );
    }

    // Validate HL7 message format
    const validation = ADTParser.validate(hl7Message);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid HL7 message',
          message: 'HL7 message format validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Parse HL7 ADT message
    let parsedADT;
    try {
      parsedADT = parseADT(hl7Message);
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'HL7 parsing failed',
          message: error.message || 'Failed to parse HL7 message',
        },
        { status: 400 }
      );
    }

    // Extract patient data
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      country,
      cpf,
      externalMrn,
      externalPatientId,
    } = parsedADT.patient;

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'Patient first name and last name are required',
        },
        { status: 400 }
      );
    }

    if (!dateOfBirth) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'Patient date of birth is required',
        },
        { status: 400 }
      );
    }

    // Check if patient already exists (by external MRN, CPF, or name+DOB)
    const orConditions: any[] = [];

    if (externalMrn) {
      orConditions.push({ externalMrn });
    }

    if (cpf) {
      orConditions.push({ cpf });
    }

    // Name + DOB matching (case-insensitive)
    orConditions.push({
      AND: [
        { firstName: { equals: firstName, mode: 'insensitive' as any } },
        { lastName: { equals: lastName, mode: 'insensitive' as any } },
        { dateOfBirth },
      ],
    });

    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: orConditions,
      },
    });

    // Handle message event types
    const isUpdateEvent = ['A08', 'A31'].includes(parsedADT.eventType);
    const isRegistrationEvent = ['A01', 'A04', 'A28'].includes(
      parsedADT.eventType
    );

    // Update existing patient
    if (existingPatient && isUpdateEvent) {
      // Prepare update data (only update non-empty fields)
      const updateData: any = {};

      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (postalCode) updateData.postalCode = postalCode;
      if (country) updateData.country = country;
      if (gender) updateData.gender = gender;
      if (externalMrn) updateData.externalMrn = externalMrn;

      // Regenerate hash if critical fields changed
      const criticalFieldsChanged = firstName !== existingPatient.firstName || lastName !== existingPatient.lastName;
      if (criticalFieldsChanged) {
        updateData.dataHash = generatePatientDataHash({
          id: existingPatient.id,
          firstName: firstName || existingPatient.firstName,
          lastName: lastName || existingPatient.lastName,
          dateOfBirth: dateOfBirth.toISOString(),
          mrn: existingPatient.mrn,
        });
        updateData.lastHashUpdate = new Date();
      }

      // Update patient
      const updatedPatient = await prisma.patient.update({
        where: { id: existingPatient.id },
        data: updateData,
      });

      // Create audit log
      await auditUpdate('Patient', updatedPatient.id, request, {
        patientName: `${updatedPatient.firstName} ${updatedPatient.lastName}`,
        mrn: updatedPatient.mrn,
        source: 'HL7_ADT',
        messageType: parsedADT.messageType,
        eventType: parsedADT.eventType,
        messageControlId: parsedADT.messageControlId,
        sendingFacility: parsedADT.sendingFacility,
      });

      return NextResponse.json(
        {
          success: true,
          action: 'updated',
          patientId: updatedPatient.id,
          mrn: updatedPatient.mrn,
          message: `Patient updated from HL7 ${parsedADT.eventType} message`,
          hl7: {
            messageType: parsedADT.messageType,
            eventType: parsedADT.eventType,
            messageControlId: parsedADT.messageControlId,
            sendingFacility: parsedADT.sendingFacility,
          },
        },
        { status: 200 }
      );
    }

    // Create new patient
    if (isRegistrationEvent || !existingPatient) {
      // Generate MRN and Token ID
      const mrn = generateMRN();
      const tokenId = generateTokenId();

      // Generate data hash
      const dataHash = generatePatientDataHash({
        id: 'pending',
        firstName,
        lastName,
        dateOfBirth: dateOfBirth.toISOString(),
        mrn,
      });

      // Create patient
      const newPatient = await prisma.patient.create({
        data: {
          firstName,
          lastName,
          dateOfBirth,
          gender: gender || 'UNKNOWN',
          email,
          phone,
          address,
          city,
          state,
          postalCode,
          country: country || 'BR',
          cpf,
          externalMrn,
          mrn,
          tokenId,
          dataHash,
          lastHashUpdate: new Date(),
          isActive: true,
        },
      });

      // Create audit log
      await auditCreate('Patient', newPatient.id, request, {
        patientName: `${newPatient.firstName} ${newPatient.lastName}`,
        mrn: newPatient.mrn,
        source: 'HL7_ADT',
        messageType: parsedADT.messageType,
        eventType: parsedADT.eventType,
        messageControlId: parsedADT.messageControlId,
        sendingFacility: parsedADT.sendingFacility,
      });

      return NextResponse.json(
        {
          success: true,
          action: 'created',
          patientId: newPatient.id,
          mrn: newPatient.mrn,
          message: `Patient created from HL7 ${parsedADT.eventType} message`,
          hl7: {
            messageType: parsedADT.messageType,
            eventType: parsedADT.eventType,
            messageControlId: parsedADT.messageControlId,
            sendingFacility: parsedADT.sendingFacility,
          },
        },
        { status: 201 }
      );
    }

    // Patient exists but message type is not for update/registration
    return NextResponse.json(
      {
        error: 'Patient already exists',
        message: `Patient already exists with MRN ${existingPatient.mrn}. Use ADT^A08 or ADT^A31 to update.`,
        existingPatientId: existingPatient.id,
        existingMrn: existingPatient.mrn,
      },
      { status: 409 }
    );
  } catch (error: any) {
    console.error('HL7 ADT ingestion error:', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to process HL7 message',
      },
      { status: 500 }
    );
  }
}
