import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Allergy Contraindication Checker
 *
 * Phase 2: Clinical Decision Support
 * Checks medications against patient allergies and returns warnings
 */

// Common medication cross-reactions
const MEDICATION_CROSS_REACTIONS: Record<string, string[]> = {
  'Penicillin': ['Amoxicillin', 'Ampicillin', 'Penicillin G', 'Penicillin V', 'Piperacillin', 'Ticarcillin'],
  'Amoxicillin': ['Penicillin', 'Ampicillin', 'Penicillin G', 'Penicillin V', 'Piperacillin'],
  'Cephalosporin': ['Cefazolin', 'Cephalexin', 'Ceftriaxone', 'Cefuroxime', 'Cefotaxime'],
  'Sulfonamide': ['Sulfamethoxazole', 'Trimethoprim-Sulfamethoxazole', 'Bactrim', 'Septra'],
  'Aspirin': ['Ibuprofen', 'Naproxen', 'Diclofenac', 'Indomethacin', 'Ketorolac', 'Celecoxib'],
  'NSAID': ['Aspirin', 'Ibuprofen', 'Naproxen', 'Diclofenac', 'Indomethacin', 'Ketorolac'],
  'Morphine': ['Codeine', 'Hydrocodone', 'Oxycodone', 'Hydromorphone', 'Oxymorphone'],
  'Codeine': ['Morphine', 'Hydrocodone', 'Oxycodone', 'Tramadol'],
};

// Medication category mappings for better matching
const MEDICATION_CATEGORIES: Record<string, string[]> = {
  'ANTIBIOTIC_PENICILLIN': ['Penicillin', 'Amoxicillin', 'Ampicillin', 'Penicillin G', 'Penicillin V'],
  'ANTIBIOTIC_CEPHALOSPORIN': ['Cefazolin', 'Cephalexin', 'Ceftriaxone', 'Cefuroxime', 'Cefotaxime'],
  'NSAID': ['Aspirin', 'Ibuprofen', 'Naproxen', 'Diclofenac', 'Indomethacin', 'Ketorolac'],
  'OPIOID': ['Morphine', 'Codeine', 'Hydrocodone', 'Oxycodone', 'Tramadol', 'Fentanyl'],
};

interface AllergyAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'contraindication';
  title: string;
  message: string;
  recommendation: string;
  allergyId: string;
  allergen: string;
  medication: string;
  severity: string;
  reactions: string[];
  crossReactive: boolean;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, medications } = body;

    if (!patientId || !medications || !Array.isArray(medications)) {
      return NextResponse.json(
        { error: 'Patient ID and medications array are required' },
        { status: 400 }
      );
    }

    // Fetch patient allergies
    const allergies = await prisma.allergy.findMany({
      where: {
        patientId,
        isActive: true,
        allergyType: 'MEDICATION', // Only check medication allergies
      },
      orderBy: {
        severity: 'desc', // SEVERE first
      },
    });

    if (allergies.length === 0) {
      return NextResponse.json({
        alerts: [],
        hasContraindications: false,
        summary: 'No active medication allergies on file',
      });
    }

    const alerts: AllergyAlert[] = [];

    // Check each medication against allergies
    for (const medication of medications) {
      const medName = typeof medication === 'string' ? medication : medication.name;
      if (!medName) continue;

      for (const allergy of allergies) {
        let isContraindicated = false;
        let crossReactive = false;

        // Direct match (case-insensitive)
        if (
          medName.toLowerCase().includes(allergy.allergen.toLowerCase()) ||
          allergy.allergen.toLowerCase().includes(medName.toLowerCase())
        ) {
          isContraindicated = true;
        }

        // Check cross-reactions
        if (!isContraindicated && MEDICATION_CROSS_REACTIONS[allergy.allergen]) {
          for (const crossReactiveMed of MEDICATION_CROSS_REACTIONS[allergy.allergen]) {
            if (
              medName.toLowerCase().includes(crossReactiveMed.toLowerCase()) ||
              crossReactiveMed.toLowerCase().includes(medName.toLowerCase())
            ) {
              isContraindicated = true;
              crossReactive = true;
              break;
            }
          }
        }

        // Check stored cross-reactivity from allergy record
        if (!isContraindicated && allergy.crossReactiveWith.length > 0) {
          for (const cross of allergy.crossReactiveWith) {
            if (
              medName.toLowerCase().includes(cross.toLowerCase()) ||
              cross.toLowerCase().includes(medName.toLowerCase())
            ) {
              isContraindicated = true;
              crossReactive = true;
              break;
            }
          }
        }

        if (isContraindicated) {
          // Determine alert severity based on allergy severity
          const alertType =
            allergy.severity === 'SEVERE'
              ? 'critical'
              : allergy.severity === 'MODERATE'
              ? 'warning'
              : 'info';

          // Generate recommendation based on severity
          let recommendation = '';
          if (allergy.severity === 'SEVERE') {
            recommendation = `⚠️ CONTRAINDICATED - DO NOT PRESCRIBE. ${
              crossReactive ? 'Cross-reactive with' : 'Direct allergy to'
            } ${allergy.allergen}. ${
              allergy.reactions.length > 0
                ? `Previous reaction: ${allergy.reactions.join(', ')}.`
                : ''
            } Consider alternative medications. Consult pharmacy/allergy specialist if uncertain.`;
          } else if (allergy.severity === 'MODERATE') {
            recommendation = `Use with extreme caution. ${
              crossReactive ? 'May cross-react with' : 'Patient has documented allergy to'
            } ${allergy.allergen}. ${
              allergy.reactions.length > 0
                ? `Previous reaction: ${allergy.reactions.join(', ')}.`
                : ''
            } Monitor closely if prescribing is necessary. Consider alternatives.`;
          } else {
            recommendation = `Patient reported sensitivity to ${allergy.allergen}. ${
              crossReactive ? 'Possible cross-reactivity with' : 'Related to'
            } ${medName}. Review with patient before prescribing.`;
          }

          alerts.push({
            id: `allergy-alert-${allergy.id}-${medName}`,
            type: alertType,
            category: 'contraindication',
            title: `${
              allergy.severity === 'SEVERE'
                ? '🚨 SEVERE Allergy Contraindication'
                : allergy.severity === 'MODERATE'
                ? '⚠️ Moderate Allergy Warning'
                : 'ℹ️ Allergy Alert'
            }`,
            message: `${medName} ${
              crossReactive ? 'may cross-react with' : 'contraindicated due to'
            } documented ${allergy.allergen} allergy${
              allergy.verificationStatus === 'CLINICIAN_VERIFIED'
                ? ' (clinician-verified)'
                : allergy.verificationStatus === 'PATIENT_REPORTED'
                ? ' (patient-reported)'
                : ''
            }`,
            recommendation,
            allergyId: allergy.id,
            allergen: allergy.allergen,
            medication: medName,
            severity: allergy.severity,
            reactions: allergy.reactions,
            crossReactive,
            priority: allergy.severity === 'SEVERE' ? 'high' : 'medium',
            actionRequired: allergy.severity === 'SEVERE',
          });
        }
      }
    }

    // Sort alerts by severity (critical first)
    alerts.sort((a, b) => {
      if (a.type === 'critical' && b.type !== 'critical') return -1;
      if (a.type !== 'critical' && b.type === 'critical') return 1;
      if (a.type === 'warning' && b.type === 'info') return -1;
      if (a.type === 'info' && b.type === 'warning') return 1;
      return 0;
    });

    const criticalAlerts = alerts.filter((a) => a.type === 'critical');
    const warningAlerts = alerts.filter((a) => a.type === 'warning');

    return NextResponse.json({
      alerts,
      hasContraindications: alerts.length > 0,
      summary: {
        total: alerts.length,
        critical: criticalAlerts.length,
        warnings: warningAlerts.length,
        info: alerts.length - criticalAlerts.length - warningAlerts.length,
      },
      allergiesChecked: allergies.length,
      medicationsChecked: medications.length,
    });
  } catch (error) {
    console.error('Allergy check error:', error);
    return NextResponse.json(
      { error: 'Failed to check allergies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Fetch all patient allergies
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

    const allergies = await prisma.allergy.findMany({
      where: {
        patientId,
        isActive: true,
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      allergies,
      count: allergies.length,
      hasMedicationAllergies: allergies.some((a) => a.allergyType === 'MEDICATION'),
    });
  } catch (error) {
    console.error('Fetch allergies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allergies' },
      { status: 500 }
    );
  }
}
