import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Lab Result Abnormality Alert System
 *
 * Phase 2: Clinical Decision Support
 * Checks lab results against normal ranges and generates clinical alerts
 */

// Normal lab ranges (adult population - adjust for pediatric/geriatric)
interface LabRange {
  min: number;
  max: number;
  unit: string;
  criticalLow?: number; // Critical thresholds
  criticalHigh?: number;
  category: 'hematology' | 'chemistry' | 'metabolic' | 'renal' | 'hepatic' | 'cardiac' | 'other';
}

const NORMAL_LAB_RANGES: Record<string, LabRange> = {
  // Hematology
  'WBC': { min: 4.5, max: 11, unit: 'K/µL', criticalLow: 2, criticalHigh: 30, category: 'hematology' },
  'RBC': { min: 4.5, max: 5.9, unit: 'M/µL', criticalLow: 2.5, category: 'hematology' },
  'Hemoglobin': { min: 13.5, max: 17.5, unit: 'g/dL', criticalLow: 7, criticalHigh: 20, category: 'hematology' },
  'Hematocrit': { min: 38, max: 50, unit: '%', criticalLow: 20, category: 'hematology' },
  'Platelets': { min: 150, max: 400, unit: 'K/µL', criticalLow: 50, criticalHigh: 1000, category: 'hematology' },

  // Chemistry - Electrolytes
  'Sodium': { min: 136, max: 145, unit: 'mEq/L', criticalLow: 120, criticalHigh: 160, category: 'chemistry' },
  'Potassium': { min: 3.5, max: 5.0, unit: 'mEq/L', criticalLow: 2.5, criticalHigh: 6.5, category: 'chemistry' },
  'Chloride': { min: 98, max: 107, unit: 'mEq/L', criticalLow: 80, criticalHigh: 120, category: 'chemistry' },
  'CO2': { min: 23, max: 29, unit: 'mEq/L', criticalLow: 10, criticalHigh: 40, category: 'chemistry' },
  'Calcium': { min: 8.5, max: 10.5, unit: 'mg/dL', criticalLow: 6.5, criticalHigh: 13, category: 'chemistry' },
  'Magnesium': { min: 1.7, max: 2.2, unit: 'mg/dL', criticalLow: 1.0, category: 'chemistry' },
  'Phosphorus': { min: 2.5, max: 4.5, unit: 'mg/dL', category: 'chemistry' },

  // Metabolic
  'Glucose': { min: 70, max: 100, unit: 'mg/dL', criticalLow: 40, criticalHigh: 400, category: 'metabolic' },
  'HbA1c': { min: 4, max: 5.6, unit: '%', category: 'metabolic' },

  // Renal Function
  'BUN': { min: 7, max: 20, unit: 'mg/dL', criticalHigh: 100, category: 'renal' },
  'Creatinine': { min: 0.7, max: 1.3, unit: 'mg/dL', criticalHigh: 10, category: 'renal' },
  'eGFR': { min: 60, max: 120, unit: 'mL/min/1.73m²', criticalLow: 15, category: 'renal' },

  // Hepatic Function
  'AST': { min: 10, max: 40, unit: 'U/L', criticalHigh: 1000, category: 'hepatic' },
  'ALT': { min: 7, max: 56, unit: 'U/L', criticalHigh: 1000, category: 'hepatic' },
  'Alkaline Phosphatase': { min: 44, max: 147, unit: 'U/L', category: 'hepatic' },
  'Bilirubin Total': { min: 0.1, max: 1.2, unit: 'mg/dL', criticalHigh: 15, category: 'hepatic' },
  'Albumin': { min: 3.5, max: 5.5, unit: 'g/dL', criticalLow: 2.0, category: 'hepatic' },

  // Lipid Panel
  'Total Cholesterol': { min: 0, max: 200, unit: 'mg/dL', category: 'metabolic' },
  'LDL': { min: 0, max: 100, unit: 'mg/dL', category: 'metabolic' },
  'HDL': { min: 40, max: 200, unit: 'mg/dL', category: 'metabolic' },
  'Triglycerides': { min: 0, max: 150, unit: 'mg/dL', criticalHigh: 500, category: 'metabolic' },

  // Cardiac
  'Troponin': { min: 0, max: 0.04, unit: 'ng/mL', criticalHigh: 0.04, category: 'cardiac' },
  'BNP': { min: 0, max: 100, unit: 'pg/mL', criticalHigh: 400, category: 'cardiac' },
  'CK-MB': { min: 0, max: 5, unit: 'ng/mL', category: 'cardiac' },

  // Thyroid
  'TSH': { min: 0.4, max: 4.0, unit: 'mIU/L', criticalLow: 0.1, criticalHigh: 20, category: 'other' },
  'T4': { min: 4.5, max: 12, unit: 'µg/dL', category: 'other' },

  // Coagulation
  'PT': { min: 11, max: 13.5, unit: 'seconds', criticalHigh: 20, category: 'hematology' },
  'INR': { min: 0.8, max: 1.1, unit: '', criticalHigh: 5, category: 'hematology' },
  'PTT': { min: 25, max: 35, unit: 'seconds', criticalHigh: 100, category: 'hematology' },
};

interface LabAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'lab_result';
  title: string;
  message: string;
  recommendation: string;
  labTest: string;
  value: number;
  unit: string;
  normalRange: string;
  deviation: 'high' | 'low' | 'critical_high' | 'critical_low';
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  labResultId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, labResults } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const alerts: LabAlert[] = [];
    let resultsChecked = 0;

    // If labResults provided, check those; otherwise fetch recent labs
    let labsToCheck = labResults;
    if (!labsToCheck) {
      const recentLabs = await prisma.labResult.findMany({
        where: {
          patientId,
          resultDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { resultDate: 'desc' },
        take: 50,
      });
      labsToCheck = recentLabs;
    }

    if (!labsToCheck || labsToCheck.length === 0) {
      return NextResponse.json({
        alerts: [],
        hasAbnormalities: false,
        summary: 'No recent lab results to check',
      });
    }

    // Check each lab result
    for (const lab of labsToCheck) {
      const testName = lab.testName || lab.name;
      if (!testName) continue;

      // Find matching normal range
      const normalRange = NORMAL_LAB_RANGES[testName];
      if (!normalRange) continue; // Skip if we don't have reference range

      const value = typeof lab.value === 'number' ? lab.value : parseFloat(lab.value);
      if (isNaN(value)) continue;

      resultsChecked++;

      let deviation: 'high' | 'low' | 'critical_high' | 'critical_low' | null = null;
      let alertType: 'critical' | 'warning' | 'info' = 'info';

      // Check critical ranges first
      if (normalRange.criticalLow && value < normalRange.criticalLow) {
        deviation = 'critical_low';
        alertType = 'critical';
      } else if (normalRange.criticalHigh && value > normalRange.criticalHigh) {
        deviation = 'critical_high';
        alertType = 'critical';
      } else if (value < normalRange.min) {
        deviation = 'low';
        alertType = 'warning';
      } else if (value > normalRange.max) {
        deviation = 'high';
        alertType = 'warning';
      }

      if (deviation) {
        const recommendation = generateRecommendation(testName, value, normalRange, deviation);

        alerts.push({
          id: `lab-alert-${lab.id || testName}-${Date.now()}`,
          type: alertType,
          category: 'lab_result',
          title:
            alertType === 'critical'
              ? `🚨 CRITICAL: Abnormal ${testName}`
              : `⚠️ Abnormal ${testName}`,
          message: `${testName}: ${value} ${normalRange.unit} (${
            deviation.includes('low') ? 'below' : 'above'
          } normal range: ${normalRange.min}-${normalRange.max} ${normalRange.unit})`,
          recommendation,
          labTest: testName,
          value,
          unit: normalRange.unit,
          normalRange: `${normalRange.min}-${normalRange.max}`,
          deviation,
          priority: alertType === 'critical' ? 'high' : 'medium',
          actionRequired: alertType === 'critical',
          labResultId: lab.id,
        });
      }
    }

    // Sort by priority
    alerts.sort((a, b) => {
      if (a.type === 'critical' && b.type !== 'critical') return -1;
      if (a.type !== 'critical' && b.type === 'critical') return 1;
      return 0;
    });

    const criticalAlerts = alerts.filter((a) => a.type === 'critical');
    const warningAlerts = alerts.filter((a) => a.type === 'warning');

    return NextResponse.json({
      alerts,
      hasAbnormalities: alerts.length > 0,
      summary: {
        total: alerts.length,
        critical: criticalAlerts.length,
        warnings: warningAlerts.length,
      },
      resultsChecked,
    });
  } catch (error) {
    console.error('Lab alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to check lab results', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateRecommendation(
  testName: string,
  value: number,
  range: LabRange,
  deviation: string
): string {
  const isCritical = deviation.includes('critical');

  // Test-specific recommendations
  const recommendations: Record<string, Record<string, string>> = {
    'Potassium': {
      critical_high: 'URGENT: Risk of cardiac arrhythmia. Check ECG immediately. Consider calcium gluconate, insulin/glucose, or dialysis. Recheck in 1-2 hours.',
      critical_low: 'URGENT: Risk of arrhythmia. Replace potassium urgently (IV if <2.5). Monitor cardiac rhythm. Recheck in 2-4 hours.',
      high: 'Recheck potassium. Review medications (ACE inhibitors, ARBs, spironolactone). Consider dietary counseling.',
      low: 'Replace potassium (oral or IV based on severity). Check for diuretic use, vomiting, diarrhea.',
    },
    'Sodium': {
      critical_high: 'URGENT: Severe hypernatremia. Risk of seizures. Correct slowly with hypotonic fluids. Neurology consult.',
      critical_low: 'URGENT: Severe hyponatremia. Risk of cerebral edema. Determine if acute/chronic. Consider hypertonic saline if symptomatic.',
      high: 'Assess hydration status. Review fluid intake. Consider diabetes insipidus if persistent.',
      low: 'Assess volume status. Check urine sodium/osmolality. Consider SIADH, CHF, cirrhosis.',
    },
    'Glucose': {
      critical_high: 'URGENT: Severe hyperglycemia. Check for DKA (if diabetic) or HHS. Start insulin protocol. Fluid resuscitation. Check electrolytes.',
      critical_low: 'URGENT: Severe hypoglycemia. Give glucose immediately (oral if conscious, IV if altered mental status). Recheck in 15 minutes.',
      high: 'Review diabetes management. Consider medication adjustment. Check HbA1c. Assess for infection/stress.',
      low: 'Assess for symptoms. Review insulin/diabetes meds. Educate on hypoglycemia management.',
    },
    'Troponin': {
      critical_high: 'URGENT: Elevated troponin suggests myocardial injury. Rule out acute MI. Cardiology consult. ECG, serial troponins, consider cardiac cath.',
      high: 'Elevated troponin. Consider cardiac workup, ECG, stress test. Review for recent cardiac event.',
    },
    'Creatinine': {
      critical_high: 'URGENT: Severe renal impairment. Consider acute kidney injury vs ESRD. Nephrology consult. May need dialysis. Hold nephrotoxic drugs.',
      high: 'Elevated creatinine suggests renal dysfunction. Check eGFR, electrolytes. Review medications. Consider nephrology referral.',
    },
    'Hemoglobin': {
      critical_low: 'URGENT: Severe anemia. Assess for active bleeding. Consider transfusion (typically if <7 g/dL). Check iron studies, B12, folate.',
      low: 'Anemia detected. Investigate cause (iron deficiency, chronic disease, bleeding). Iron studies, reticulocyte count.',
    },
  };

  const testRecs = recommendations[testName];
  if (testRecs && testRecs[deviation]) {
    return testRecs[deviation];
  }

  // Generic recommendations based on category and deviation
  if (isCritical) {
    return `URGENT: Critical ${testName} level requires immediate clinical attention. Repeat test to confirm. Assess patient symptoms. Consult specialist if needed.`;
  } else if (deviation.includes('high')) {
    return `Elevated ${testName}. Recheck to confirm. Review medications and patient history. Consider specialist consultation if persistent.`;
  } else {
    return `Low ${testName}. Recheck to confirm. Assess for underlying causes. Consider supplementation or dietary counseling if appropriate.`;
  }
}

// GET: Fetch recent abnormal labs for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const recentLabs = await prisma.labResult.findMany({
      where: {
        patientId,
        resultDate: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { resultDate: 'desc' },
    });

    // Process through the alert checker
    const response = await POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ patientId, labResults: recentLabs }),
      })
    );

    return response;
  } catch (error) {
    console.error('Fetch lab alerts error:', error);
    return NextResponse.json({ error: 'Failed to fetch lab alerts' }, { status: 500 });
  }
}
