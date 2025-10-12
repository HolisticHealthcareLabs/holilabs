/**
 * Send Form API
 *
 * POST /api/forms/send - Send a form to a patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendFormNotificationEmail } from '@/lib/email';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateDataHash(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, templateId, expiresAt, message } = body;

    // Validate inputs
    if (!patientId || !templateId) {
      return NextResponse.json(
        { error: 'Patient ID and Template ID are required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Verify template exists
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, title: true, structure: true },
    });

    if (!template) {
      return NextResponse.json({ error: 'Form template not found' }, { status: 404 });
    }

    // Generate secure access token
    const accessToken = generateAccessToken();

    // Set default expiration if not provided (7 days)
    const expiresAtDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create form instance
    const formInstance = await prisma.formInstance.create({
      data: {
        patientId,
        templateId,
        assignedBy: 'system', // TODO: Get from session
        status: 'PENDING',
        progressPercent: 0,
        accessToken,
        accessTokenHash: generateDataHash({ token: accessToken }),
        sentAt: new Date(),
        expiresAt: expiresAtDate,
        responses: {},
      },
    });

    // Increment usage count on template
    await prisma.formTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    // Create audit log
    await prisma.formAuditLog.create({
      data: {
        formInstanceId: formInstance.id,
        event: 'SENT',
        userType: 'clinician', // TODO: Get from session
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          patientId,
          templateId,
          expiresAt: expiresAtDate.toISOString(),
        },
      },
    });

    // Send email notification to patient
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/forms/${accessToken}`;

    try {
      await sendFormNotificationEmail(
        patient.email,
        `${patient.firstName} ${patient.lastName}`,
        template.title,
        publicUrl,
        expiresAtDate,
        message || undefined,
        undefined // TODO: Get clinician name from session
      );
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue even if email fails - form was created successfully
    }

    return NextResponse.json(
      {
        success: true,
        formInstanceId: formInstance.id,
        accessToken,
        publicUrl,
        message: 'Form sent successfully. Email notification sent to patient.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending form:', error);
    return NextResponse.json(
      {
        error: 'Failed to send form',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
