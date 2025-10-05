/**
 * Clinical Notes API
 * 
 * POST /api/clinical-notes - Create clinical note
 * GET /api/clinical-notes?patientId=xxx - Get notes for patient
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * POST /api/clinical-notes
 * Create new clinical note with blockchain hash
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.patientId || !body.clinicianId || !body.noteType) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, clinicianId, noteType' },
        { status: 400 }
      );
    }

    // Generate data hash for blockchain verification
    const noteData = {
      patientId: body.patientId,
      clinicianId: body.clinicianId,
      noteType: body.noteType,
      content: body.content || {},
      timestamp: new Date().toISOString(),
    };

    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(noteData))
      .digest('hex');

    // Create clinical note
    const note = await prisma.clinicalNote.create({
      data: {
        patientId: body.patientId,
        clinicianId: body.clinicianId,
        noteType: body.noteType,
        chiefComplaint: body.chiefComplaint || '',
        subjective: body.subjective || '',
        objective: body.objective || '',
        assessment: body.assessment || '',
        plan: body.plan || '',
        vitalSigns: body.vitalSigns || {},
        diagnoses: body.diagnoses || [],
        procedures: body.procedures || [],
        dataHash,
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
            specialty: true,
            licenseNumber: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: body.clinicianId,
        userEmail: 'system',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'ClinicalNote',
        resourceId: note.id,
        details: { noteType: body.noteType, dataHash },
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: note,
        message: 'Clinical note created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating clinical note:', error);
    return NextResponse.json(
      { error: 'Failed to create clinical note', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/clinical-notes?patientId=xxx
 * Get clinical notes for a patient
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter is required' },
        { status: 400 }
      );
    }

    const notes = await prisma.clinicalNote.findMany({
      where: { patientId },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (error: any) {
    console.error('Error fetching clinical notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinical notes', details: error.message },
      { status: 500 }
    );
  }
}
