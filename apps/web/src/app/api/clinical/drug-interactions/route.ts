/**
 * Drug Interaction Checker API
 *
 * POST /api/clinical/drug-interactions
 * Check for drug-drug interactions
 *
 * Uses FDA Drug Interaction API and local knowledge base
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { validateArray, sanitizeMedicationName } from '@/lib/security/validation';
import { checkDrugInteractions } from '@/lib/openfda/drug-interactions';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Common drug interactions database (simplified for demo)
// In production, use FDA API or commercial drug interaction database
const DRUG_INTERACTIONS = [
  {
    drug1: 'warfarin',
    drug2: 'aspirin',
    severity: 'major',
    description: 'Increased risk of bleeding',
    recommendation: 'Monitor INR closely. Consider alternative antiplatelet therapy.',
  },
  {
    drug1: 'warfarin',
    drug2: 'ibuprofen',
    severity: 'major',
    description: 'Increased risk of bleeding',
    recommendation: 'Use alternative analgesic. If necessary, monitor INR frequently.',
  },
  {
    drug1: 'metformin',
    drug2: 'contrast dye',
    severity: 'major',
    description: 'Risk of lactic acidosis',
    recommendation: 'Discontinue metformin before contrast procedure. Resume after 48 hours if kidney function normal.',
  },
  {
    drug1: 'lisinopril',
    drug2: 'potassium',
    severity: 'moderate',
    description: 'Risk of hyperkalemia',
    recommendation: 'Monitor serum potassium levels. Avoid potassium supplementation unless necessary.',
  },
  {
    drug1: 'simvastatin',
    drug2: 'amlodipine',
    severity: 'moderate',
    description: 'Increased risk of myopathy',
    recommendation: 'Limit simvastatin dose to 20mg daily when used with amlodipine.',
  },
  {
    drug1: 'omeprazole',
    drug2: 'clopidogrel',
    severity: 'moderate',
    description: 'Reduced antiplatelet effect',
    recommendation: 'Consider alternative PPI (pantoprazole) or H2 blocker.',
  },
  {
    drug1: 'fluoxetine',
    drug2: 'tramadol',
    severity: 'major',
    description: 'Risk of serotonin syndrome',
    recommendation: 'Avoid combination. Monitor for serotonin syndrome symptoms.',
  },
  {
    drug1: 'metoprolol',
    drug2: 'verapamil',
    severity: 'major',
    description: 'Risk of bradycardia and heart block',
    recommendation: 'Avoid combination. Monitor heart rate and blood pressure closely if unavoidable.',
  },
  {
    drug1: 'digoxin',
    drug2: 'amiodarone',
    severity: 'major',
    description: 'Increased digoxin levels',
    recommendation: 'Reduce digoxin dose by 50%. Monitor digoxin levels.',
  },
  {
    drug1: 'levothyroxine',
    drug2: 'calcium',
    severity: 'moderate',
    description: 'Reduced levothyroxine absorption',
    recommendation: 'Separate administration by at least 4 hours.',
  },
];

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
}

/**
 * POST /api/clinical/drug-interactions
 * Check for interactions between medications
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const { medications } = body; // Array of medication names

      // Validate medications array
      try {
        validateArray(
          medications,
          50, // Max 50 medications
          (med: any) => typeof med === 'string' && med.trim().length > 0
        );
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (medications.length < 2) {
        return NextResponse.json(
          { error: 'At least 2 medications required' },
          { status: 400 }
        );
      }

      // Sanitize medication names
      const sanitizedMeds = medications.map((med: string) => sanitizeMedicationName(med));

      // Check interactions using OpenFDA API + local database
      const openFDAInteractions = await checkDrugInteractions(sanitizedMeds);

      // Map to expected format
      const interactions: DrugInteraction[] = openFDAInteractions.map((interaction) => {
        // Map severity from API (high/moderate/low) to expected (major/moderate/minor)
        const severityMap: Record<string, 'major' | 'moderate' | 'minor'> = {
          high: 'major',
          moderate: 'moderate',
          low: 'minor',
        };

        // Generate recommendation based on severity
        let recommendation = '';
        if (interaction.severity === 'high') {
          recommendation = 'Avoid combination if possible. Consult with clinical pharmacist if alternative unavailable.';
        } else if (interaction.severity === 'moderate') {
          recommendation = 'Use with caution. Monitor patient closely for adverse effects.';
        } else {
          recommendation = 'Monitor for potential interaction effects.';
        }

        return {
          drug1: interaction.drug1,
          drug2: interaction.drug2,
          severity: severityMap[interaction.severity],
          description: interaction.description,
          recommendation,
        };
      });

      // Sort by severity (major > moderate > minor)
      const severityOrder = { major: 3, moderate: 2, minor: 1 };
      interactions.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

      return NextResponse.json({
        success: true,
        data: {
          medications,
          interactions,
          summary: {
            total: interactions.length,
            major: interactions.filter((i) => i.severity === 'major').length,
            moderate: interactions.filter((i) => i.severity === 'moderate').length,
            minor: interactions.filter((i) => i.severity === 'minor').length,
          },
        },
      });
    } catch (error: any) {
      console.error('Error checking drug interactions:', error);
      return NextResponse.json(
        {
          error: 'Failed to check drug interactions',
          ...(process.env.NODE_ENV === 'development' && { details: error.message }),
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    audit: {
      action: 'CREATE',
      resource: 'DrugInteractionCheck',
      details: (req, context) => {
        const body = JSON.parse(req.body);
        return {
          medicationsCount: body.medications?.length || 0,
          accessType: 'DRUG_INTERACTION_CHECK',
        };
      },
    },
  }
);
