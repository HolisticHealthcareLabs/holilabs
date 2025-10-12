/**
 * Form Submission API
 *
 * POST /api/forms/public/[token]/submit - Final form submission with signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendFormCompletionEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { responses, signatureDataUrl } = body;

    // Validate inputs
    if (!signatureDataUrl) {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      );
    }

    // Find form instance
    const formInstance = await prisma.formInstance.findUnique({
      where: { accessToken: token },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        template: {
          select: {
            title: true,
            structure: true,
          },
        },
      },
    });

    if (!formInstance) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(formInstance.expiresAt)) {
      return NextResponse.json(
        { error: 'Form has expired' },
        { status: 410 }
      );
    }

    // Check if already completed
    if (formInstance.status === 'SIGNED' || formInstance.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Form has already been submitted' },
        { status: 410 }
      );
    }

    // Update form instance with signature and mark as completed
    const updatedForm = await prisma.formInstance.update({
      where: { id: formInstance.id },
      data: {
        responses,
        signatureDataUrl,
        status: 'SIGNED',
        completedAt: new Date(),
        progress: 100,
      },
    });

    // Create audit log for submission
    await prisma.formAuditLog.create({
      data: {
        formInstanceId: formInstance.id,
        event: 'SUBMITTED',
        performedBy: 'patient',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          signatureProvided: true,
          completedAt: new Date().toISOString(),
        },
      },
    });

    // Send completion email to clinician
    try {
      const formResponseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/forms/responses/${formInstance.id}`;

      // TODO: Get clinician email from session/database
      // For now, we'll log that the email would be sent
      console.log('Would send form completion email for:', {
        patient: `${formInstance.patient.firstName} ${formInstance.patient.lastName}`,
        form: formInstance.template.title,
        url: formResponseUrl,
      });

      // Uncomment when clinician email is available:
      // await sendFormCompletionEmail(
      //   clinicianEmail,
      //   `${formInstance.patient.firstName} ${formInstance.patient.lastName}`,
      //   formInstance.template.title,
      //   updatedForm.completedAt || new Date(),
      //   formResponseUrl
      // );
    } catch (emailError) {
      console.error('Error sending completion email:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Form submitted successfully',
        completedAt: updatedForm.completedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit form',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
