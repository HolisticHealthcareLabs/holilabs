import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

/**
 * Preventive Care Reminder System
 *
 * Phase 2: Clinical Decision Support
 * Generates age and gender-based preventive care recommendations
 */

interface PreventiveCareGuideline {
  screeningType: string;
  title: string;
  description: string;
  ageMin?: number;
  ageMax?: number;
  gender?: 'M' | 'F' | 'ALL';
  conditions?: string[]; // If patient has these conditions
  frequency: number; // Months between screenings
  guidelineSource: string;
  evidenceLevel: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

// USPSTF, ADA, AHA, CDC, and other clinical guidelines
const PREVENTIVE_CARE_GUIDELINES: PreventiveCareGuideline[] = [
  // Cancer Screenings
  {
    screeningType: 'MAMMOGRAM',
    title: 'Mammogram (Breast Cancer Screening)',
    description: 'Biennial screening mammography for women age 50-74',
    ageMin: 50,
    ageMax: 74,
    gender: 'F',
    frequency: 24, // Every 2 years
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade B',
    priority: 'HIGH',
  },
  {
    screeningType: 'MAMMOGRAM',
    title: 'Mammogram (Breast Cancer Screening)',
    description: 'Annual screening for women age 40-49 with higher risk',
    ageMin: 40,
    ageMax: 49,
    gender: 'F',
    frequency: 12, // Annual
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade C (Individual Decision)',
    priority: 'MEDIUM',
  },
  {
    screeningType: 'COLONOSCOPY',
    title: 'Colonoscopy (Colorectal Cancer Screening)',
    description: 'Colorectal cancer screening for adults age 45-75',
    ageMin: 45,
    ageMax: 75,
    gender: 'ALL',
    frequency: 120, // Every 10 years (if colonoscopy)
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade A',
    priority: 'HIGH',
  },
  {
    screeningType: 'CERVICAL_CANCER',
    title: 'Pap Smear (Cervical Cancer Screening)',
    description: 'Cervical cancer screening with cytology every 3 years',
    ageMin: 21,
    ageMax: 65,
    gender: 'F',
    frequency: 36, // Every 3 years
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade A',
    priority: 'HIGH',
  },
  {
    screeningType: 'PROSTATE_CANCER',
    title: 'PSA Test (Prostate Cancer Screening)',
    description: 'Prostate cancer screening decision for men age 55-69',
    ageMin: 55,
    ageMax: 69,
    gender: 'M',
    frequency: 24, // Every 2 years
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade C (Individual Decision)',
    priority: 'MEDIUM',
  },
  {
    screeningType: 'LUNG_CANCER',
    title: 'Low-Dose CT (Lung Cancer Screening)',
    description: 'Annual lung cancer screening for adults age 50-80 with smoking history',
    ageMin: 50,
    ageMax: 80,
    gender: 'ALL',
    frequency: 12, // Annual
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade B',
    priority: 'HIGH',
  },

  // Cardiovascular
  {
    screeningType: 'BLOOD_PRESSURE',
    title: 'Blood Pressure Screening',
    description: 'Annual blood pressure screening for adults',
    ageMin: 18,
    gender: 'ALL',
    frequency: 12, // Annual (more frequent if elevated)
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade A',
    priority: 'HIGH',
  },
  {
    screeningType: 'CHOLESTEROL',
    title: 'Lipid Panel (Cholesterol Screening)',
    description: 'Lipid screening for cardiovascular disease risk',
    ageMin: 40,
    ageMax: 75,
    gender: 'ALL',
    frequency: 60, // Every 5 years
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade B',
    priority: 'HIGH',
  },
  {
    screeningType: 'DIABETES_SCREENING',
    title: 'Diabetes Screening (Fasting Glucose or HbA1c)',
    description: 'Type 2 diabetes screening for adults age 35-70 with overweight/obesity',
    ageMin: 35,
    ageMax: 70,
    gender: 'ALL',
    frequency: 36, // Every 3 years
    guidelineSource: 'USPSTF 2024 / ADA 2024',
    evidenceLevel: 'Grade B',
    priority: 'HIGH',
  },

  // Vaccinations
  {
    screeningType: 'INFLUENZA',
    title: 'Influenza Vaccine',
    description: 'Annual flu vaccine for all adults',
    ageMin: 18,
    gender: 'ALL',
    frequency: 12, // Annual
    guidelineSource: 'CDC 2024',
    evidenceLevel: 'Strong Recommendation',
    priority: 'HIGH',
  },
  {
    screeningType: 'PNEUMONIA',
    title: 'Pneumococcal Vaccine',
    description: 'Pneumococcal vaccination for adults age 65+',
    ageMin: 65,
    gender: 'ALL',
    frequency: 60, // One-time (PCV15/PCV20) or booster PPSV23
    guidelineSource: 'CDC 2024',
    evidenceLevel: 'Strong Recommendation',
    priority: 'HIGH',
  },
  {
    screeningType: 'SHINGLES',
    title: 'Shingles Vaccine (Shingrix)',
    description: 'Shingles vaccination for adults age 50+',
    ageMin: 50,
    gender: 'ALL',
    frequency: 0, // One-time series (2 doses)
    guidelineSource: 'CDC 2024',
    evidenceLevel: 'Strong Recommendation',
    priority: 'MEDIUM',
  },
  {
    screeningType: 'COVID_19',
    title: 'COVID-19 Vaccine',
    description: 'Annual COVID-19 vaccination',
    ageMin: 18,
    gender: 'ALL',
    frequency: 12, // Annual booster
    guidelineSource: 'CDC 2024',
    evidenceLevel: 'Recommendation',
    priority: 'HIGH',
  },
  {
    screeningType: 'TDAP',
    title: 'Tdap/Td Vaccine (Tetanus, Diphtheria, Pertussis)',
    description: 'Tdap once, then Td booster every 10 years',
    ageMin: 18,
    gender: 'ALL',
    frequency: 120, // Every 10 years
    guidelineSource: 'CDC 2024',
    evidenceLevel: 'Strong Recommendation',
    priority: 'MEDIUM',
  },

  // Other Screenings
  {
    screeningType: 'BONE_DENSITY',
    title: 'DEXA Scan (Bone Density)',
    description: 'Osteoporosis screening for women age 65+',
    ageMin: 65,
    gender: 'F',
    frequency: 24, // Every 2 years
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade B',
    priority: 'HIGH',
  },
  {
    screeningType: 'VISION_SCREENING',
    title: 'Vision Screening',
    description: 'Eye exam for adults age 65+ annually',
    ageMin: 65,
    gender: 'ALL',
    frequency: 12, // Annual
    guidelineSource: 'AAO 2024',
    evidenceLevel: 'Recommendation',
    priority: 'MEDIUM',
  },
  {
    screeningType: 'DEPRESSION_SCREENING',
    title: 'Depression Screening (PHQ-9)',
    description: 'Depression screening for all adults',
    ageMin: 18,
    gender: 'ALL',
    frequency: 12, // Annual
    guidelineSource: 'USPSTF 2024',
    evidenceLevel: 'Grade B',
    priority: 'MEDIUM',
  },
  {
    screeningType: 'FALLS_RISK',
    title: 'Falls Risk Assessment',
    description: 'Falls screening for adults age 65+',
    ageMin: 65,
    gender: 'ALL',
    frequency: 12, // Annual
    guidelineSource: 'AGS/BGS Guidelines',
    evidenceLevel: 'Strong Recommendation',
    priority: 'HIGH',
  },
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, patientAge, patientGender, conditions } = body;

    if (!patientId || patientAge === undefined || !patientGender) {
      return NextResponse.json(
        { error: 'Patient ID, age, and gender are required' },
        { status: 400 }
      );
    }

    // Fetch existing reminders for this patient
    const existingReminders = await prisma.preventiveCareReminder.findMany({
      where: {
        patientId,
        status: {
          in: ['DUE', 'OVERDUE', 'SCHEDULED'],
        },
      },
    });

    const remindersNeeded: any[] = [];
    const age = parseInt(patientAge.toString());
    const gender = patientGender.toUpperCase();

    // Check each guideline
    for (const guideline of PREVENTIVE_CARE_GUIDELINES) {
      // Check age eligibility
      if (guideline.ageMin && age < guideline.ageMin) continue;
      if (guideline.ageMax && age > guideline.ageMax) continue;

      // Check gender eligibility
      if (guideline.gender && guideline.gender !== 'ALL' && guideline.gender !== gender) continue;

      // Check if condition-specific (if applicable)
      if (guideline.conditions && guideline.conditions.length > 0) {
        const hasCondition = guideline.conditions.some((cond) =>
          conditions?.some((patientCond: string) =>
            patientCond.toLowerCase().includes(cond.toLowerCase())
          )
        );
        if (!hasCondition) continue;
      }

      // Check if already exists
      const existingReminder = existingReminders.find(
        (r) => r.screeningType === guideline.screeningType
      );

      if (!existingReminder) {
        // Calculate due date (default to now if first time)
        const dueDate = new Date();

        remindersNeeded.push({
          screeningType: guideline.screeningType,
          title: guideline.title,
          description: guideline.description,
          recommendedBy: new Date(),
          dueDate,
          priority: guideline.priority,
          guidelineSource: guideline.guidelineSource,
          evidenceLevel: guideline.evidenceLevel,
          status: 'DUE',
          recurringInterval: guideline.frequency > 0 ? guideline.frequency : null,
        });
      }
    }

    // HIPAA Audit Log: Preventive care recommendations generated
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'CREATE',
      resource: 'PreventiveCare',
      resourceId: patientId,
      details: {
        patientId,
        patientAge: age,
        patientGender: gender,
        remindersGenerated: remindersNeeded.length,
        existingReminders: existingReminders.length,
        accessType: 'PREVENTIVE_CARE_RECOMMENDATIONS',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      reminders: remindersNeeded,
      count: remindersNeeded.length,
      existingCount: existingReminders.length,
      patientAge: age,
      patientGender: gender,
    });
  } catch (error) {
    console.error('Preventive care check error:', error);
    return NextResponse.json(
      { error: 'Failed to check preventive care', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Fetch preventive care reminders for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const where: any = { patientId };
    if (status) {
      where.status = status;
    } else {
      // Default: show due, overdue, and scheduled
      where.status = { in: ['DUE', 'OVERDUE', 'SCHEDULED'] };
    }

    const reminders = await prisma.preventiveCareReminder.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    // Update overdue status
    const now = new Date();
    for (const reminder of reminders) {
      if (reminder.status === 'DUE' && reminder.dueDate < now) {
        await prisma.preventiveCareReminder.update({
          where: { id: reminder.id },
          data: { status: 'OVERDUE' },
        });
      }
    }

    const dueCount = reminders.filter((r) => r.status === 'DUE').length;
    const overdueCount = reminders.filter((r) => r.status === 'OVERDUE').length;

    // HIPAA Audit Log: Preventive care reminders accessed
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'READ',
      resource: 'PreventiveCare',
      resourceId: patientId,
      details: {
        patientId,
        remindersCount: reminders.length,
        dueCount,
        overdueCount,
        accessType: 'PREVENTIVE_CARE_REMINDERS',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      reminders,
      count: reminders.length,
      summary: {
        due: dueCount,
        overdue: overdueCount,
        scheduled: reminders.filter((r) => r.status === 'SCHEDULED').length,
      },
    });
  } catch (error) {
    console.error('Fetch preventive care error:', error);
    return NextResponse.json({ error: 'Failed to fetch preventive care reminders' }, { status: 500 });
  }
}

// PUT: Create preventive care reminders for a patient
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, reminders } = body;

    if (!patientId || !reminders || !Array.isArray(reminders)) {
      return NextResponse.json(
        { error: 'Patient ID and reminders array are required' },
        { status: 400 }
      );
    }

    // Create reminders in bulk
    const created = await prisma.preventiveCareReminder.createMany({
      data: reminders.map((reminder: any) => ({
        ...reminder,
        patientId,
      })),
      skipDuplicates: true,
    });

    // HIPAA Audit Log: Preventive care reminders created
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'CREATE',
      resource: 'PreventiveCare',
      resourceId: patientId,
      details: {
        patientId,
        remindersCreated: created.count,
        accessType: 'PREVENTIVE_CARE_CREATE_REMINDERS',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      success: true,
      created: created.count,
    });
  } catch (error) {
    console.error('Create preventive care reminders error:', error);
    return NextResponse.json(
      { error: 'Failed to create reminders' },
      { status: 500 }
    );
  }
}
