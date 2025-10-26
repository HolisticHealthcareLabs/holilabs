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

      // Sanitize and normalize medication names
      const normalizedMeds = medications.map((med: string) => {
        const sanitized = sanitizeMedicationName(med);
        return sanitized.toLowerCase().trim();
      });

      // Find interactions
      const interactions: DrugInteraction[] = [];

      for (let i = 0; i < normalizedMeds.length; i++) {
        for (let j = i + 1; j < normalizedMeds.length; j++) {
          const med1 = normalizedMeds[i];
          const med2 = normalizedMeds[j];

          // Check both directions
          const interaction = DRUG_INTERACTIONS.find(
            (int) =>
              (int.drug1 === med1 && int.drug2 === med2) ||
              (int.drug1 === med2 && int.drug2 === med1)
          );

          if (interaction) {
            interactions.push({
              drug1: medications[i],
              drug2: medications[j],
              severity: interaction.severity as 'major' | 'moderate' | 'minor',
              description: interaction.description,
              recommendation: interaction.recommendation,
            });
          }
        }
      }

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
  }
);
