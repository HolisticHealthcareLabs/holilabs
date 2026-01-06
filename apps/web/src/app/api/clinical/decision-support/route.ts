import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

/**
 * Unified Clinical Decision Support API
 *
 * Phase 2: Clinical Decision Support
 * Aggregates all clinical alerts: allergies, lab results, vital signs, preventive care
 */

interface UnifiedAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category:
    | 'drug_interaction'
    | 'contraindication'
    | 'lab_result'
    | 'vital_sign'
    | 'preventive_care';
  title: string;
  message: string;
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  dismissible: boolean;
  source: string;
  timestamp: Date;
  metadata?: any;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, includeAllergyCheck, includeLabCheck, includeVitalCheck, includePreventiveCare } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Fetch patient data
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medications: {
          where: { isActive: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const allAlerts: UnifiedAlert[] = [];

    // 1. Check for drug interactions (existing endpoint)
    try {
      if (patient.medications.length > 0) {
        const drugInteractionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clinical/drug-interactions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              medications: patient.medications.map((m) => m.name),
            }),
          }
        );

        if (drugInteractionResponse.ok) {
          const data = await drugInteractionResponse.json();
          if (data.interactions && data.interactions.length > 0) {
            for (const interaction of data.interactions) {
              allAlerts.push({
                id: `drug-${interaction.drug1}-${interaction.drug2}`,
                type: interaction.severity === 'major' ? 'critical' : 'warning',
                category: 'drug_interaction',
                title: `Drug Interaction: ${interaction.drug1} + ${interaction.drug2}`,
                message: interaction.effect,
                recommendation: interaction.recommendation,
                priority: interaction.severity === 'major' ? 'high' : 'medium',
                actionRequired: interaction.severity === 'major',
                dismissible: false,
                source: 'Drug Interaction Database',
                timestamp: new Date(),
                metadata: interaction,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Drug interaction check failed:', error);
    }

    // 2. Check for allergy contraindications
    if (includeAllergyCheck !== false && patient.medications.length > 0) {
      try {
        const allergyResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clinical/allergy-check`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientId,
              medications: patient.medications.map((m) => m.name),
            }),
          }
        );

        if (allergyResponse.ok) {
          const data = await allergyResponse.json();
          if (data.alerts && data.alerts.length > 0) {
            for (const alert of data.alerts) {
              allAlerts.push({
                id: alert.id,
                type: alert.type,
                category: 'contraindication',
                title: alert.title,
                message: alert.message,
                recommendation: alert.recommendation,
                priority: alert.priority,
                actionRequired: alert.actionRequired,
                dismissible: alert.type !== 'critical',
                source: 'Allergy Database',
                timestamp: new Date(),
                metadata: {
                  allergen: alert.allergen,
                  medication: alert.medication,
                  severity: alert.severity,
                  reactions: alert.reactions,
                },
              });
            }
          }
        }
      } catch (error) {
        console.error('Allergy check failed:', error);
      }
    }

    // 3. Check lab results for abnormalities
    if (includeLabCheck !== false) {
      try {
        const labResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clinical/lab-alerts?patientId=${patientId}&days=30`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (labResponse.ok) {
          const data = await labResponse.json();
          if (data.alerts && data.alerts.length > 0) {
            for (const alert of data.alerts) {
              allAlerts.push({
                id: alert.id,
                type: alert.type,
                category: 'lab_result',
                title: alert.title,
                message: alert.message,
                recommendation: alert.recommendation,
                priority: alert.priority,
                actionRequired: alert.actionRequired,
                dismissible: alert.type !== 'critical',
                source: 'Lab Results',
                timestamp: new Date(),
                metadata: {
                  labTest: alert.labTest,
                  value: alert.value,
                  unit: alert.unit,
                  normalRange: alert.normalRange,
                  deviation: alert.deviation,
                },
              });
            }
          }
        }
      } catch (error) {
        console.error('Lab check failed:', error);
      }
    }

    // 4. Check vital signs (requires recent vitals data)
    if (includeVitalCheck !== false && body.vitals) {
      try {
        const ageInYears = Math.floor(
          (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );

        const vitalResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clinical/vital-alerts`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientAge: ageInYears,
              vitals: body.vitals,
            }),
          }
        );

        if (vitalResponse.ok) {
          const data = await vitalResponse.json();
          if (data.alerts && data.alerts.length > 0) {
            for (const alert of data.alerts) {
              allAlerts.push({
                id: alert.id,
                type: alert.type,
                category: 'vital_sign',
                title: alert.title,
                message: alert.message,
                recommendation: alert.recommendation,
                priority: alert.priority,
                actionRequired: alert.actionRequired,
                dismissible: alert.type !== 'critical',
                source: 'Vital Signs Monitor',
                timestamp: new Date(),
                metadata: {
                  vitalSign: alert.vitalSign,
                  value: alert.value,
                  unit: alert.unit,
                  normalRange: alert.normalRange,
                  ageGroup: alert.ageGroup,
                  deviation: alert.deviation,
                },
              });
            }
          }
        }
      } catch (error) {
        console.error('Vital check failed:', error);
      }
    }

    // 5. Check preventive care reminders
    if (includePreventiveCare !== false) {
      try {
        const ageInYears = Math.floor(
          (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );

        const preventiveResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clinical/preventive-care?patientId=${patientId}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (preventiveResponse.ok) {
          const data = await preventiveResponse.json();
          if (data.reminders && data.reminders.length > 0) {
            for (const reminder of data.reminders) {
              const isOverdue = new Date(reminder.dueDate) < new Date();
              allAlerts.push({
                id: `preventive-${reminder.id}`,
                type: isOverdue ? 'warning' : 'info',
                category: 'preventive_care',
                title: isOverdue ? `Overdue: ${reminder.title}` : reminder.title,
                message: reminder.description,
                recommendation: `${reminder.guidelineSource} recommends this screening. ${
                  isOverdue ? 'Schedule appointment soon.' : 'Plan to schedule in advance.'
                }`,
                priority: reminder.priority === 'HIGH' ? 'high' : 'medium',
                actionRequired: false,
                dismissible: true,
                source: reminder.guidelineSource,
                timestamp: new Date(reminder.dueDate),
                metadata: {
                  screeningType: reminder.screeningType,
                  dueDate: reminder.dueDate,
                  status: reminder.status,
                },
              });
            }
          }
        }
      } catch (error) {
        console.error('Preventive care check failed:', error);
      }
    }

    // Sort alerts by priority and type
    allAlerts.sort((a, b) => {
      // Critical first
      if (a.type === 'critical' && b.type !== 'critical') return -1;
      if (a.type !== 'critical' && b.type === 'critical') return 1;

      // Then by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      // Then by timestamp (most recent first)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Generate summary
    const summary = {
      total: allAlerts.length,
      critical: allAlerts.filter((a) => a.type === 'critical').length,
      warnings: allAlerts.filter((a) => a.type === 'warning').length,
      info: allAlerts.filter((a) => a.type === 'info').length,
      actionRequired: allAlerts.filter((a) => a.actionRequired).length,
      byCategory: {
        drug_interaction: allAlerts.filter((a) => a.category === 'drug_interaction').length,
        contraindication: allAlerts.filter((a) => a.category === 'contraindication').length,
        lab_result: allAlerts.filter((a) => a.category === 'lab_result').length,
        vital_sign: allAlerts.filter((a) => a.category === 'vital_sign').length,
        preventive_care: allAlerts.filter((a) => a.category === 'preventive_care').length,
      },
    };

    // HIPAA Audit Log: Clinical decision support accessed for patient
    await createAuditLog({
      action: 'CREATE',
      resource: 'ClinicalDecisionSupport',
      resourceId: patientId,
      details: {
        patientId,
        alertsGenerated: allAlerts.length,
        criticalAlerts: summary.critical,
        warningAlerts: summary.warnings,
        infoAlerts: summary.info,
        categories: summary.byCategory,
        accessType: 'CLINICAL_DECISION_SUPPORT',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      alerts: allAlerts,
      summary,
      patient: {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        mrn: patient.mrn,
        age: Math.floor(
          (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        ),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Clinical decision support error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate clinical decision support',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET: Quick summary of clinical alerts for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Quick check - just counts
    const [allergies, activeReminders] = await Promise.all([
      prisma.allergy.count({
        where: { patientId, isActive: true, allergyType: 'MEDICATION' },
      }),
      prisma.preventiveCareReminder.count({
        where: {
          patientId,
          status: { in: ['DUE', 'OVERDUE'] },
        },
      }),
    ]);

    // HIPAA Audit Log: Clinical decision support summary accessed
    await createAuditLog({
      action: 'READ',
      resource: 'ClinicalDecisionSupport',
      resourceId: patientId,
      details: {
        patientId,
        medicationAllergies: allergies,
        preventiveCareReminders: activeReminders,
        accessType: 'CLINICAL_DECISION_SUPPORT_SUMMARY',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      hasAlerts: allergies > 0 || activeReminders > 0,
      summary: {
        medicationAllergies: allergies,
        preventiveCareReminders: activeReminders,
      },
    });
  } catch (error) {
    console.error('Clinical decision support summary error:', error);
    return NextResponse.json(
      { error: 'Failed to get clinical decision support summary' },
      { status: 500 }
    );
  }
}
