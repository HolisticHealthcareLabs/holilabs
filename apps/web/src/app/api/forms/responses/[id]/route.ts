/**
 * Form Responses API
 *
 * GET /api/forms/responses/[id] - Get form responses for a specific form instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const formInstance = await prisma.formInstance.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        template: {
          select: {
            id: true,
            title: true,
            description: true,
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

    // Check if form is completed
    if (formInstance.status !== 'SIGNED' && formInstance.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Form has not been completed yet' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        form: {
          id: formInstance.id,
          status: formInstance.status,
          progressPercent: formInstance.progressPercent,
          responses: formInstance.responses,
          signatureDataUrl: formInstance.signatureDataUrl,
          completedAt: formInstance.completedAt,
          patient: formInstance.patient,
          template: formInstance.template,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching form responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form responses' },
      { status: 500 }
    );
  }
}
