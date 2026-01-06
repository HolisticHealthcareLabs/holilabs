import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

/**
 * Vital Signs Critical Alert System
 *
 * Phase 2: Clinical Decision Support
 * Checks vital signs against age-specific normal ranges and generates alerts
 */

// Age-specific vital sign ranges
interface VitalRange {
  min: number;
  max: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
}

interface AgeBasedRanges {
  heartRate: VitalRange;
  systolicBP: VitalRange;
  diastolicBP: VitalRange;
  respiratoryRate: VitalRange;
  temperature: VitalRange;
  oxygenSaturation: VitalRange;
}

// Age groups: infant (0-1), toddler (1-3), child (3-12), teen (12-18), adult (18-65), elderly (65+)
const VITAL_RANGES: Record<string, AgeBasedRanges> = {
  infant: {
    heartRate: { min: 100, max: 160, criticalLow: 80, criticalHigh: 200, unit: 'bpm' },
    systolicBP: { min: 70, max: 100, criticalLow: 60, criticalHigh: 120, unit: 'mmHg' },
    diastolicBP: { min: 50, max: 70, criticalLow: 40, criticalHigh: 90, unit: 'mmHg' },
    respiratoryRate: { min: 30, max: 60, criticalLow: 20, criticalHigh: 80, unit: 'breaths/min' },
    temperature: { min: 36.5, max: 37.5, criticalLow: 35.5, criticalHigh: 39.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, criticalLow: 90, unit: '%' },
  },
  toddler: {
    heartRate: { min: 90, max: 140, criticalLow: 70, criticalHigh: 180, unit: 'bpm' },
    systolicBP: { min: 80, max: 110, criticalLow: 70, criticalHigh: 130, unit: 'mmHg' },
    diastolicBP: { min: 50, max: 80, criticalLow: 40, criticalHigh: 90, unit: 'mmHg' },
    respiratoryRate: { min: 24, max: 40, criticalLow: 18, criticalHigh: 60, unit: 'breaths/min' },
    temperature: { min: 36.5, max: 37.5, criticalLow: 35.5, criticalHigh: 39.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, criticalLow: 90, unit: '%' },
  },
  child: {
    heartRate: { min: 70, max: 120, criticalLow: 60, criticalHigh: 160, unit: 'bpm' },
    systolicBP: { min: 90, max: 120, criticalLow: 80, criticalHigh: 140, unit: 'mmHg' },
    diastolicBP: { min: 60, max: 80, criticalLow: 50, criticalHigh: 95, unit: 'mmHg' },
    respiratoryRate: { min: 20, max: 30, criticalLow: 15, criticalHigh: 40, unit: 'breaths/min' },
    temperature: { min: 36.5, max: 37.5, criticalLow: 35.5, criticalHigh: 39.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, criticalLow: 90, unit: '%' },
  },
  teen: {
    heartRate: { min: 60, max: 100, criticalLow: 50, criticalHigh: 140, unit: 'bpm' },
    systolicBP: { min: 110, max: 135, criticalLow: 90, criticalHigh: 160, unit: 'mmHg' },
    diastolicBP: { min: 70, max: 85, criticalLow: 60, criticalHigh: 100, unit: 'mmHg' },
    respiratoryRate: { min: 12, max: 20, criticalLow: 10, criticalHigh: 30, unit: 'breaths/min' },
    temperature: { min: 36.5, max: 37.5, criticalLow: 35.5, criticalHigh: 39.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, criticalLow: 90, unit: '%' },
  },
  adult: {
    heartRate: { min: 60, max: 100, criticalLow: 40, criticalHigh: 140, unit: 'bpm' },
    systolicBP: { min: 90, max: 120, criticalLow: 80, criticalHigh: 180, unit: 'mmHg' },
    diastolicBP: { min: 60, max: 80, criticalLow: 50, criticalHigh: 110, unit: 'mmHg' },
    respiratoryRate: { min: 12, max: 20, criticalLow: 8, criticalHigh: 30, unit: 'breaths/min' },
    temperature: { min: 36.1, max: 37.2, criticalLow: 35, criticalHigh: 40, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, criticalLow: 90, unit: '%' },
  },
  elderly: {
    heartRate: { min: 60, max: 100, criticalLow: 40, criticalHigh: 130, unit: 'bpm' },
    systolicBP: { min: 90, max: 140, criticalLow: 80, criticalHigh: 180, unit: 'mmHg' },
    diastolicBP: { min: 60, max: 90, criticalLow: 50, criticalHigh: 110, unit: 'mmHg' },
    respiratoryRate: { min: 12, max: 20, criticalLow: 8, criticalHigh: 30, unit: 'breaths/min' },
    temperature: { min: 36.1, max: 37.2, criticalLow: 35, criticalHigh: 39.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, criticalLow: 88, unit: '%' },
  },
};

interface VitalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'vital_sign';
  title: string;
  message: string;
  recommendation: string;
  vitalSign: string;
  value: number;
  unit: string;
  normalRange: string;
  ageGroup: string;
  deviation: 'high' | 'low' | 'critical_high' | 'critical_low';
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

function getAgeGroup(ageYears: number): string {
  if (ageYears < 1) return 'infant';
  if (ageYears < 3) return 'toddler';
  if (ageYears < 12) return 'child';
  if (ageYears < 18) return 'teen';
  if (ageYears < 65) return 'adult';
  return 'elderly';
}

function checkVital(
  vitalName: string,
  value: number,
  range: VitalRange,
  ageGroup: string
): VitalAlert | null {
  let deviation: 'high' | 'low' | 'critical_high' | 'critical_low' | null = null;
  let alertType: 'critical' | 'warning' | 'info' = 'info';

  // Check critical ranges first
  if (range.criticalLow && value < range.criticalLow) {
    deviation = 'critical_low';
    alertType = 'critical';
  } else if (range.criticalHigh && value > range.criticalHigh) {
    deviation = 'critical_high';
    alertType = 'critical';
  } else if (value < range.min) {
    deviation = 'low';
    alertType = 'warning';
  } else if (value > range.max) {
    deviation = 'high';
    alertType = 'warning';
  }

  if (!deviation) return null;

  const recommendation = generateVitalRecommendation(vitalName, value, range, deviation, ageGroup);

  return {
    id: `vital-alert-${vitalName}-${Date.now()}`,
    type: alertType,
    category: 'vital_sign',
    title:
      alertType === 'critical'
        ? `🚨 CRITICAL: Abnormal ${vitalName}`
        : `⚠️ Abnormal ${vitalName}`,
    message: `${vitalName}: ${value} ${range.unit} (${
      deviation.includes('low') ? 'below' : 'above'
    } normal range: ${range.min}-${range.max} ${range.unit})`,
    recommendation,
    vitalSign: vitalName,
    value,
    unit: range.unit,
    normalRange: `${range.min}-${range.max}`,
    ageGroup,
    deviation,
    priority: alertType === 'critical' ? 'high' : 'medium',
    actionRequired: alertType === 'critical',
  };
}

function generateVitalRecommendation(
  vitalName: string,
  value: number,
  range: VitalRange,
  deviation: string,
  ageGroup: string
): string {
  const isCritical = deviation.includes('critical');

  const recommendations: Record<string, Record<string, string>> = {
    'Heart Rate': {
      critical_high: 'URGENT: Severe tachycardia. Assess patient immediately. Check for sepsis, hypovolemia, arrhythmia, pain, anxiety. Consider ECG. May need IV fluids or antiarrhythmics.',
      critical_low: 'URGENT: Severe bradycardia. Assess patient immediately. Check for heart block, medication effect (beta-blockers), hypothermia. ECG and cardiology consult may be needed. Consider atropine if symptomatic.',
      high: 'Tachycardia detected. Assess for fever, pain, anxiety, dehydration. Recheck in 15-30 minutes. Monitor for sustained elevation.',
      low: 'Bradycardia detected. Assess for symptoms (dizziness, syncope). Review medications. Recheck in 15-30 minutes.',
    },
    'Systolic BP': {
      critical_high: 'URGENT: Hypertensive crisis. Risk of stroke, MI, acute kidney injury. Assess for symptoms (headache, chest pain, vision changes). Urgent BP control needed. Consider nitroprusside or labetalol. Neurology consult if symptomatic.',
      critical_low: 'URGENT: Severe hypotension/shock. Assess perfusion (mental status, urine output). Place in Trendelenburg. IV fluid bolus. Check for bleeding, sepsis, cardiac cause. Consider vasopressors.',
      high: 'Elevated blood pressure. Recheck in 5-10 minutes. Assess for symptoms. Review medications. Consider outpatient follow-up if persistently elevated.',
      low: 'Low blood pressure. Assess for symptoms (dizziness, weakness). Check for dehydration, medication effect. Encourage fluids if not contraindicated.',
    },
    'Diastolic BP': {
      critical_high: 'URGENT: Severely elevated diastolic pressure. Risk of hypertensive emergency. Assess for end-organ damage. Gradual BP control needed.',
      critical_low: 'URGENT: Critically low diastolic pressure. Assess cardiac output and perfusion. Consider cardiac workup.',
      high: 'Elevated diastolic pressure. Recheck and monitor. Consider outpatient cardiology follow-up.',
      low: 'Low diastolic pressure. Monitor for symptoms. May be normal in some patients.',
    },
    'Respiratory Rate': {
      critical_high: 'URGENT: Severe tachypnea. Assess airway and breathing immediately. Check for respiratory distress, pneumonia, PE, acidosis. ABG may be needed. Consider oxygen support.',
      critical_low: 'URGENT: Severe bradypnea or respiratory depression. Assess consciousness. Check for opioid overdose, neurological cause. May need naloxone or respiratory support.',
      high: 'Tachypnea detected. Assess for dyspnea, wheezing, fever. Check oxygen saturation. Chest X-ray if persistent.',
      low: 'Low respiratory rate. Assess consciousness and ventilation. Review medications (opioids, sedatives).',
    },
    'Temperature': {
      critical_high: 'URGENT: Hyperthermia/severe fever. Risk of seizures (especially children). Aggressive cooling measures. Check for infection/sepsis. Blood cultures. Broad-spectrum antibiotics if septic.',
      critical_low: 'URGENT: Hypothermia. Risk of cardiac arrhythmia. Warm patient slowly. Core temperature monitoring. Check for exposure, hypothyroidism.',
      high: 'Fever detected. Assess for infection source. Antipyretics (acetaminophen/ibuprofen). Increase fluids. Monitor closely.',
      low: 'Low temperature. Assess for hypothermia risk. Warm patient. Recheck in 30 minutes.',
    },
    'Oxygen Saturation': {
      critical_low: 'URGENT: Severe hypoxemia. Apply high-flow oxygen immediately. Assess respiratory status. Consider ABG. Chest X-ray. May need non-invasive ventilation or intubation.',
      low: 'Hypoxemia detected. Apply supplemental oxygen. Assess for respiratory distress. Pulse oximetry may be inaccurate (check perfusion, nail polish).',
    },
  };

  const vitalRecs = recommendations[vitalName];
  if (vitalRecs && vitalRecs[deviation]) {
    return vitalRecs[deviation];
  }

  // Generic recommendation
  if (isCritical) {
    return `URGENT: Critical ${vitalName} for ${ageGroup} age group. Immediate assessment and intervention required. Recheck frequently.`;
  } else {
    return `Abnormal ${vitalName} for ${ageGroup} age group. Assess patient symptoms. Recheck in 15-30 minutes. Investigate underlying cause if persistent.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientAge, vitals } = body;

    if (patientAge === undefined || !vitals) {
      return NextResponse.json(
        { error: 'Patient age and vitals are required' },
        { status: 400 }
      );
    }

    const ageGroup = getAgeGroup(patientAge);
    const ranges = VITAL_RANGES[ageGroup];
    const alerts: VitalAlert[] = [];

    // Map of common vital sign field names to standardized names
    const vitalMapping: Record<string, string> = {
      heartRate: 'Heart Rate',
      hr: 'Heart Rate',
      pulse: 'Heart Rate',
      bloodPressureSystolic: 'Systolic BP',
      systolic: 'Systolic BP',
      sbp: 'Systolic BP',
      bloodPressureDiastolic: 'Diastolic BP',
      diastolic: 'Diastolic BP',
      dbp: 'Diastolic BP',
      respiratoryRate: 'Respiratory Rate',
      rr: 'Respiratory Rate',
      respRate: 'Respiratory Rate',
      temperature: 'Temperature',
      temp: 'Temperature',
      oxygenSaturation: 'Oxygen Saturation',
      spo2: 'Oxygen Saturation',
      o2sat: 'Oxygen Saturation',
    };

    // Check each vital sign
    for (const [field, value] of Object.entries(vitals)) {
      const vitalName = vitalMapping[field] || field;
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);

      if (isNaN(numValue)) continue;

      let range: VitalRange | null = null;
      if (vitalName === 'Heart Rate' && ranges.heartRate) range = ranges.heartRate;
      else if (vitalName === 'Systolic BP' && ranges.systolicBP) range = ranges.systolicBP;
      else if (vitalName === 'Diastolic BP' && ranges.diastolicBP) range = ranges.diastolicBP;
      else if (vitalName === 'Respiratory Rate' && ranges.respiratoryRate) range = ranges.respiratoryRate;
      else if (vitalName === 'Temperature' && ranges.temperature) range = ranges.temperature;
      else if (vitalName === 'Oxygen Saturation' && ranges.oxygenSaturation) range = ranges.oxygenSaturation;

      if (range) {
        const alert = checkVital(vitalName, numValue, range, ageGroup);
        if (alert) {
          alerts.push(alert);
        }
      }
    }

    // Sort by priority (critical first)
    alerts.sort((a, b) => {
      if (a.type === 'critical' && b.type !== 'critical') return -1;
      if (a.type !== 'critical' && b.type === 'critical') return 1;
      return 0;
    });

    const criticalAlerts = alerts.filter((a) => a.type === 'critical');
    const warningAlerts = alerts.filter((a) => a.type === 'warning');

    // HIPAA Audit Log: Vital signs checked for patient
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'CREATE',
      resource: 'VitalAlert',
      resourceId: 'vital-check',
      details: {
        patientAge,
        ageGroup,
        vitalsChecked: Object.keys(vitals).length,
        alertsGenerated: alerts.length,
        criticalAlerts: criticalAlerts.length,
        warningAlerts: warningAlerts.length,
        accessType: 'VITAL_SIGNS_MONITORING',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      alerts,
      hasAbnormalities: alerts.length > 0,
      summary: {
        total: alerts.length,
        critical: criticalAlerts.length,
        warnings: warningAlerts.length,
      },
      ageGroup,
      vitalsChecked: Object.keys(vitals).length,
    });
  } catch (error) {
    console.error('Vital alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to check vital signs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
