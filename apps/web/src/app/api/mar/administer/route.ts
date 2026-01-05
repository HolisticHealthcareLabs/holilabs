import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMinutesLate, getDoseStatus } from '@/lib/mar/schedule-generator';
import { logAuditEvent } from '@/lib/audit';
import { logger } from '@/lib/logger';

/**
 * MAR Administration API
 *
 * Record medication administration (given, refused, missed, held)
 * CRITICAL for patient safety and regulatory compliance
 */

// POST: Record medication administration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      scheduleId,
      medicationId,
      patientId,
      scheduledTime,
      status,
      isPRN,
      prnReason,
      doseGiven,
      route,
      site,
      witnessedBy,
      barcodeScanned,
      patientIdVerified,
      refusalReason,
      missedReason,
      patientResponse,
      adverseReaction,
      reactionDetails,
      notes,
    } = body;

    // Validation
    if (!medicationId || !patientId || !scheduledTime || !status) {
      return NextResponse.json(
        { error: 'Medication ID, Patient ID, Scheduled Time, and Status are required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const scheduled = new Date(scheduledTime);

    // Calculate timing
    const minutesLate = getMinutesLate(scheduled, now);
    const onTime = minutesLate <= 30;

    // Determine actual time
    const actualTime = status === 'GIVEN' ? now : null;

    // Create administration record
    const administration = await prisma.medicationAdministration.create({
      data: {
        scheduleId: scheduleId || null,
        medicationId,
        patientId,
        scheduledTime: scheduled,
        actualTime,
        status,
        isPRN: isPRN || false,
        prnReason,
        doseGiven,
        route,
        site,
        administeredBy: session.user.id,
        witnessedBy,
        barcodeScanned: barcodeScanned || false,
        patientIdVerified: patientIdVerified || false,
        refusalReason,
        missedReason,
        patientResponse,
        adverseReaction: adverseReaction || false,
        reactionDetails,
        notes,
        onTime,
        minutesLate: minutesLate > 0 ? minutesLate : null,
      },
      include: {
        medication: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
          },
        },
      },
    });

    // Audit log
    await logAuditEvent(
      {
        action: 'CREATE',
        resource: 'MedicationAdministration',
        resourceId: administration.id,
        details: {
          medicationId,
          medicationName: administration.medication.name,
          patientId,
          patientMRN: administration.patient.mrn,
          status,
          scheduledTime: scheduled.toISOString(),
          actualTime: actualTime?.toISOString(),
          onTime,
          minutesLate,
          isPRN,
          adverseReaction,
        },
      },
      request,
      session.user.id,
      session.user.email || undefined
    );

    // If adverse reaction, create urgent notification
    if (adverseReaction) {
      // TODO: Send urgent notification to physician and pharmacy
      logger.warn({
        event: 'mar_adverse_reaction_reported',
        patientMRN: administration.patient.mrn,
        medicationName: administration.medication.name,
        reactionDetails,
        administrationId: administration.id,
      });
    }

    return NextResponse.json({
      success: true,
      administration,
      message: getAdministrationMessage(status, administration.medication.name),
    });
  } catch (error) {
    logger.error({
      event: 'mar_administration_failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to record administration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Fetch administration records (MAR view)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const medicationId = searchParams.get('medicationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const shift = searchParams.get('shift'); // 'day' (7am-3pm), 'evening' (3pm-11pm), 'night' (11pm-7am)

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const where: any = { patientId };

    if (medicationId) where.medicationId = medicationId;
    if (status) where.status = status;

    // Date range filter
    if (startDate || endDate) {
      where.scheduledTime = {};
      if (startDate) where.scheduledTime.gte = new Date(startDate);
      if (endDate) where.scheduledTime.lte = new Date(endDate);
    }

    // Shift filter (based on scheduled time hour)
    if (shift) {
      const shiftHours = {
        day: { start: 7, end: 15 },      // 7am-3pm
        evening: { start: 15, end: 23 }, // 3pm-11pm
        night: { start: 23, end: 7 },    // 11pm-7am (wraps around)
      };

      const hours = shiftHours[shift as keyof typeof shiftHours];
      if (hours) {
        // TODO: Add hour-based filtering (requires raw query or JS filtering)
      }
    }

    const administrations = await prisma.medicationAdministration.findMany({
      where,
      include: {
        medication: true,
        schedule: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'desc' }],
    });

    // Group by medication for MAR table view
    const groupedByMedication = administrations.reduce((acc, admin) => {
      const medId = admin.medicationId;
      if (!acc[medId]) {
        acc[medId] = {
          medication: admin.medication,
          administrations: [],
        };
      }
      acc[medId].administrations.push(admin);
      return acc;
    }, {} as Record<string, any>);

    // Audit log for MAR access
    await logAuditEvent(
      {
        action: 'READ',
        resource: 'MedicationAdministration',
        resourceId: patientId,
        details: {
          patientId,
          medicationId,
          recordsAccessed: administrations.length,
          dateRange: {
            start: startDate,
            end: endDate,
          },
          shift,
          accessType: 'MAR_RECORD_ACCESS',
        },
      },
      request,
      session.user.id,
      session.user.email || undefined
    );

    return NextResponse.json({
      administrations,
      groupedByMedication,
      count: administrations.length,
      summary: {
        given: administrations.filter((a) => a.status === 'GIVEN').length,
        refused: administrations.filter((a) => a.status === 'REFUSED').length,
        missed: administrations.filter((a) => a.status === 'MISSED').length,
        late: administrations.filter((a) => a.status === 'LATE').length,
        held: administrations.filter((a) => a.status === 'HELD').length,
        adverseReactions: administrations.filter((a) => a.adverseReaction).length,
      },
    });
  } catch (error) {
    logger.error({
      event: 'mar_fetch_failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Failed to fetch MAR' }, { status: 500 });
  }
}

// Helper function to generate user-friendly message
function getAdministrationMessage(status: string, medicationName: string): string {
  const messages: Record<string, string> = {
    GIVEN: `${medicationName} administered successfully`,
    REFUSED: `${medicationName} refused by patient`,
    MISSED: `${medicationName} not administered`,
    HELD: `${medicationName} held per clinical judgment`,
    LATE: `${medicationName} marked as late`,
  };
  return messages[status] || `${medicationName} status updated`;
}
