/**
 * Wearables Data Adapter
 *
 * Unified interface for integrating IoT wearable data into CDS system
 * Converts diverse wearable formats to standardized FHIR Observations
 *
 * Supported Devices:
 * - Apple Watch / HealthKit
 * - Oura Ring
 * - Ultrahuman Ring AIR / M1 CGM
 *
 * Integration Strategy:
 * - Uses third-party aggregators (Terra API, Vital, WearConnect)
 * - Converts to FHIR R4 Observation format
 * - Maps to CDS Context for rule evaluation
 *
 * @compliance HL7 FHIR R4, HIPAA
 */

import type {
  VitalSigns,
  LabResult,
  PatientDemographics,
} from '../types';

/**
 * Wearable data sources
 */
export type WearableSource =
  | 'apple_health'
  | 'oura_ring'
  | 'ultrahuman_ring'
  | 'ultrahuman_cgm'
  | 'ultrahuman_blood'
  | 'fitbit'
  | 'garmin'
  | 'whoop';

/**
 * Generic wearable observation (pre-processing)
 */
export interface WearableObservation {
  source: WearableSource;
  timestamp: string;
  type: string; // e.g., 'heart_rate', 'sleep_duration', 'blood_glucose'
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

/**
 * Apple HealthKit Data Types
 * Based on HKQuantityTypeIdentifier
 */
export interface AppleHealthKitData {
  // Vital Signs
  heartRate?: { value: number; unit: 'bpm'; timestamp: string }[];
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    unit: 'mmHg';
    timestamp: string;
  }[];
  oxygenSaturation?: { value: number; unit: '%'; timestamp: string }[];
  respiratoryRate?: { value: number; unit: 'breaths/min'; timestamp: string }[];
  bodyTemperature?: { value: number; unit: '°F' | '°C'; timestamp: string }[];

  // Body Measurements
  height?: { value: number; unit: 'cm'; timestamp: string };
  bodyMass?: { value: number; unit: 'kg'; timestamp: string }[];
  bodyMassIndex?: { value: number; unit: 'count'; timestamp: string }[];
  bodyFatPercentage?: { value: number; unit: '%'; timestamp: string }[];

  // Activity
  stepCount?: { value: number; unit: 'count'; timestamp: string }[];
  activeEnergyBurned?: { value: number; unit: 'kcal'; timestamp: string }[];
  exerciseMinutes?: { value: number; unit: 'min'; timestamp: string }[];
  standHours?: { value: number; unit: 'hours'; timestamp: string }[];

  // Sleep (from Apple Watch)
  sleepAnalysis?: {
    asleep: number; // minutes
    awake: number;
    inBed: number;
    timestamp: string;
  }[];

  // Nutrition
  dietaryEnergyConsumed?: { value: number; unit: 'kcal'; timestamp: string }[];

  // Lab Values (if using connected devices)
  bloodGlucose?: { value: number; unit: 'mg/dL'; timestamp: string }[];
}

/**
 * Oura Ring Data Structure
 * Based on Oura API v2
 */
export interface OuraRingData {
  // Sleep metrics
  sleep?: {
    date: string;
    totalSleepDuration: number; // seconds
    deepSleepDuration: number;
    remSleepDuration: number;
    lightSleepDuration: number;
    awakeTime: number;
    sleepEfficiency: number; // 0-100
    restlessSleep: number; // 0-100
    sleepLatency: number; // seconds to fall asleep
    sleepScore: number; // 0-100
    averageHeartRate: number; // bpm
    lowestHeartRate: number; // bpm
    averageHrv: number; // ms
    respiratoryRate: number; // breaths/min
    bodyTemperature: number; // deviation from baseline in °C
  }[];

  // Activity metrics
  activity?: {
    date: string;
    steps: number;
    activeCalories: number; // kcal
    totalCalories: number; // kcal
    targetCalories: number;
    meetsActivityTargets: boolean;
    inactivityAlerts: number;
    low: number; // minutes
    medium: number; // minutes
    high: number; // minutes
    activityScore: number; // 0-100
  }[];

  // Readiness score
  readiness?: {
    date: string;
    readinessScore: number; // 0-100
    temperatureDeviation: number; // °C
    activityBalance: number; // previous day activity impact
    bodyTemperature: number; // deviation from baseline
    hrvBalance: number;
    recoveryIndex: number;
    restingHeartRate: number; // bpm
    sleepBalance: number;
  }[];

  // Heart rate (continuous)
  heartRate?: {
    timestamp: string;
    bpm: number;
    source: 'sleep' | 'activity' | 'rest';
  }[];
}

/**
 * Ultrahuman Platform Data
 * Ring AIR + M1 CGM + Blood Vision
 */
export interface UltrahumanData {
  // Ring AIR (movement, sleep, HRV)
  ringData?: {
    date: string;
    movementScore: number; // 0-100
    sleepScore: number; // 0-100
    recoveryScore: number; // 0-100
    steps: number;
    activeMinutes: number;
    caloriesBurned: number;
    sleepDuration: number; // minutes
    deepSleep: number; // minutes
    remSleep: number; // minutes
    heartRate: { timestamp: string; bpm: number }[];
    hrv: { timestamp: string; value: number }[]; // ms
  }[];

  // M1 CGM (Continuous Glucose Monitor)
  glucoseData?: {
    timestamp: string;
    glucose: number; // mg/dL
    trend: 'rising' | 'stable' | 'falling';
    trendRate: number; // mg/dL per minute
  }[];

  // Blood Vision (at-home blood testing)
  bloodTests?: {
    date: string;
    testType: 'metabolic_panel' | 'lipid_panel' | 'hba1c' | 'vitamin_d' | 'inflammation';
    results: Array<{
      biomarker: string;
      value: number;
      unit: string;
      referenceRange: string;
      status: 'low' | 'normal' | 'high' | 'critical';
    }>;
  }[];

  // Metabolic score
  metabolicHealth?: {
    date: string;
    metabolicScore: number; // 0-100
    glucoseVariability: number;
    timeInRange: number; // percentage (70-140 mg/dL)
    averageGlucose: number; // mg/dL
    peakGlucose: number;
    glucoseSpikes: number; // count per day
  }[];
}

/**
 * Wearables Adapter Class
 */
export class WearablesAdapter {
  /**
   * Convert Apple HealthKit data to CDS-compatible format
   */
  public static convertAppleHealthKit(data: AppleHealthKitData): {
    vitalSigns: Partial<VitalSigns>;
    labResults: LabResult[];
    observations: WearableObservation[];
  } {
    const vitalSigns: Partial<VitalSigns> = {};
    const labResults: LabResult[] = [];
    const observations: WearableObservation[] = [];

    // Latest vital signs
    if (data.heartRate && data.heartRate.length > 0) {
      const latest = data.heartRate[data.heartRate.length - 1];
      vitalSigns.heartRate = latest.value;
    }

    if (data.bloodPressure && data.bloodPressure.length > 0) {
      const latest = data.bloodPressure[data.bloodPressure.length - 1];
      vitalSigns.bloodPressureSystolic = latest.systolic;
      vitalSigns.bloodPressureDiastolic = latest.diastolic;
    }

    if (data.oxygenSaturation && data.oxygenSaturation.length > 0) {
      const latest = data.oxygenSaturation[data.oxygenSaturation.length - 1];
      vitalSigns.oxygenSaturation = latest.value;
    }

    if (data.respiratoryRate && data.respiratoryRate.length > 0) {
      const latest = data.respiratoryRate[data.respiratoryRate.length - 1];
      vitalSigns.respiratoryRate = latest.value;
    }

    if (data.bodyTemperature && data.bodyTemperature.length > 0) {
      const latest = data.bodyTemperature[data.bodyTemperature.length - 1];
      vitalSigns.temperature = latest.unit === '°C' ?
        (latest.value * 9/5) + 32 : latest.value; // Convert to Fahrenheit
    }

    if (data.bodyMass && data.bodyMass.length > 0) {
      const latest = data.bodyMass[data.bodyMass.length - 1];
      vitalSigns.weight = latest.value;
    }

    if (data.height) {
      vitalSigns.height = data.height.value;
    }

    if (data.bodyMassIndex && data.bodyMassIndex.length > 0) {
      const latest = data.bodyMassIndex[data.bodyMassIndex.length - 1];
      vitalSigns.bmi = latest.value;
    }

    // Blood glucose as lab result
    if (data.bloodGlucose && data.bloodGlucose.length > 0) {
      for (const reading of data.bloodGlucose.slice(-10)) { // Last 10 readings
        labResults.push({
          id: `apple-health-glucose-${reading.timestamp}`,
          testName: 'Blood Glucose',
          loincCode: '2339-0', // Glucose [Mass/volume] in Blood
          value: reading.value,
          unit: 'mg/dL',
          referenceRange: '70-100 mg/dL (fasting)',
          interpretation: reading.value < 70 ? 'low' :
                         reading.value > 125 ? 'high' :
                         reading.value > 100 ? 'high' : 'normal',
          effectiveDate: reading.timestamp,
          status: 'final',
        });
      }
    }

    // Store activity data as observations
    if (data.stepCount) {
      for (const step of data.stepCount.slice(-7)) { // Last 7 days
        observations.push({
          source: 'apple_health',
          timestamp: step.timestamp,
          type: 'step_count',
          value: step.value,
          unit: 'steps',
        });
      }
    }

    return { vitalSigns, labResults, observations };
  }

  /**
   * Convert Oura Ring data to CDS-compatible format
   */
  public static convertOuraRing(data: OuraRingData): {
    vitalSigns: Partial<VitalSigns>;
    labResults: LabResult[];
    observations: WearableObservation[];
  } {
    const vitalSigns: Partial<VitalSigns> = {};
    const labResults: LabResult[] = [];
    const observations: WearableObservation[] = [];

    // Latest readiness data
    if (data.readiness && data.readiness.length > 0) {
      const latest = data.readiness[data.readiness.length - 1];
      vitalSigns.heartRate = latest.restingHeartRate;
      vitalSigns.temperature = (latest.bodyTemperature * 9/5) + 32 + 98.6; // Convert deviation to absolute Fahrenheit
    }

    // Latest sleep data
    if (data.sleep && data.sleep.length > 0) {
      const latest = data.sleep[data.sleep.length - 1];
      if (!vitalSigns.heartRate) {
        vitalSigns.heartRate = latest.averageHeartRate;
      }
      vitalSigns.respiratoryRate = latest.respiratoryRate;

      // Add sleep quality observation
      observations.push({
        source: 'oura_ring',
        timestamp: latest.date,
        type: 'sleep_score',
        value: latest.sleepScore,
        unit: 'score',
        metadata: {
          totalSleep: latest.totalSleepDuration / 3600, // hours
          deepSleep: latest.deepSleepDuration / 3600,
          remSleep: latest.remSleepDuration / 3600,
          efficiency: latest.sleepEfficiency,
        },
      });
    }

    // Activity data
    if (data.activity && data.activity.length > 0) {
      for (const activity of data.activity.slice(-7)) { // Last 7 days
        observations.push({
          source: 'oura_ring',
          timestamp: activity.date,
          type: 'activity_score',
          value: activity.activityScore,
          unit: 'score',
          metadata: {
            steps: activity.steps,
            activeCalories: activity.activeCalories,
            meetsTargets: activity.meetsActivityTargets,
          },
        });
      }
    }

    // Continuous heart rate
    if (data.heartRate) {
      for (const hr of data.heartRate.slice(-100)) { // Last 100 readings
        observations.push({
          source: 'oura_ring',
          timestamp: hr.timestamp,
          type: 'heart_rate',
          value: hr.bpm,
          unit: 'bpm',
          metadata: { context: hr.source },
        });
      }
    }

    return { vitalSigns, labResults, observations };
  }

  /**
   * Convert Ultrahuman data to CDS-compatible format
   */
  public static convertUltrahuman(data: UltrahumanData): {
    vitalSigns: Partial<VitalSigns>;
    labResults: LabResult[];
    observations: WearableObservation[];
  } {
    const vitalSigns: Partial<VitalSigns> = {};
    const labResults: LabResult[] = [];
    const observations: WearableObservation[] = [];

    // Ring AIR data
    if (data.ringData && data.ringData.length > 0) {
      const latest = data.ringData[data.ringData.length - 1];

      if (latest.heartRate && latest.heartRate.length > 0) {
        const latestHR = latest.heartRate[latest.heartRate.length - 1];
        vitalSigns.heartRate = latestHR.bpm;
      }

      // Recovery and sleep scores
      observations.push({
        source: 'ultrahuman_ring',
        timestamp: latest.date,
        type: 'recovery_score',
        value: latest.recoveryScore,
        unit: 'score',
        metadata: {
          movementScore: latest.movementScore,
          sleepScore: latest.sleepScore,
          sleepDuration: latest.sleepDuration / 60, // hours
        },
      });
    }

    // M1 CGM data (continuous glucose monitoring)
    if (data.glucoseData && data.glucoseData.length > 0) {
      // Get last 24 hours of glucose data
      const last24h = data.glucoseData.slice(-288); // 5-min intervals = 288 readings/day

      // Create lab results for each reading
      for (const reading of last24h.slice(-10)) { // Last 10 for lab results
        labResults.push({
          id: `ultrahuman-cgm-${reading.timestamp}`,
          testName: 'Continuous Glucose Monitoring',
          loincCode: '2339-0',
          value: reading.glucose,
          unit: 'mg/dL',
          referenceRange: '70-140 mg/dL',
          interpretation: reading.glucose < 70 ? 'low' :
                         reading.glucose > 140 ? 'high' :
                         reading.glucose > 100 ? 'high' : 'normal',
          effectiveDate: reading.timestamp,
          status: 'final',
        });
      }

      // Store all CGM readings as observations
      for (const reading of last24h) {
        observations.push({
          source: 'ultrahuman_cgm',
          timestamp: reading.timestamp,
          type: 'blood_glucose_cgm',
          value: reading.glucose,
          unit: 'mg/dL',
          metadata: {
            trend: reading.trend,
            trendRate: reading.trendRate,
          },
        });
      }
    }

    // Metabolic health summary
    if (data.metabolicHealth && data.metabolicHealth.length > 0) {
      const latest = data.metabolicHealth[data.metabolicHealth.length - 1];

      observations.push({
        source: 'ultrahuman_cgm',
        timestamp: latest.date,
        type: 'metabolic_score',
        value: latest.metabolicScore,
        unit: 'score',
        metadata: {
          averageGlucose: latest.averageGlucose,
          timeInRange: latest.timeInRange,
          glucoseVariability: latest.glucoseVariability,
          spikesPerDay: latest.glucoseSpikes,
        },
      });
    }

    // Blood Vision lab tests
    if (data.bloodTests && data.bloodTests.length > 0) {
      for (const test of data.bloodTests) {
        for (const result of test.results) {
          labResults.push({
            id: `ultrahuman-blood-${test.date}-${result.biomarker}`,
            testName: result.biomarker,
            value: result.value,
            unit: result.unit,
            referenceRange: result.referenceRange,
            interpretation: result.status === 'low' ? 'low' :
                           result.status === 'high' || result.status === 'critical' ? 'high' : 'normal',
            effectiveDate: test.date,
            status: 'final',
          });
        }
      }
    }

    return { vitalSigns, labResults, observations };
  }

  /**
   * Universal converter - auto-detects source and converts
   */
  public static convert(
    source: WearableSource,
    data: AppleHealthKitData | OuraRingData | UltrahumanData
  ): {
    vitalSigns: Partial<VitalSigns>;
    labResults: LabResult[];
    observations: WearableObservation[];
  } {
    switch (source) {
      case 'apple_health':
        return this.convertAppleHealthKit(data as AppleHealthKitData);

      case 'oura_ring':
        return this.convertOuraRing(data as OuraRingData);

      case 'ultrahuman_ring':
      case 'ultrahuman_cgm':
      case 'ultrahuman_blood':
        return this.convertUltrahuman(data as UltrahumanData);

      default:
        throw new Error(`Unsupported wearable source: ${source}`);
    }
  }

  /**
   * Calculate HRV (Heart Rate Variability) risk assessment
   * Lower HRV = Higher stress / Worse cardiovascular health
   */
  public static assessHRVRisk(hrvMs: number): {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    recommendation: string;
  } {
    if (hrvMs >= 60) {
      return {
        status: 'excellent',
        recommendation: 'HRV is excellent, indicating good cardiovascular health and stress resilience.',
      };
    } else if (hrvMs >= 40) {
      return {
        status: 'good',
        recommendation: 'HRV is within healthy range. Continue current lifestyle habits.',
      };
    } else if (hrvMs >= 20) {
      return {
        status: 'fair',
        recommendation: 'HRV is lower than optimal. Consider stress management, better sleep, and regular exercise.',
      };
    } else {
      return {
        status: 'poor',
        recommendation: 'HRV is low, indicating high stress or cardiovascular concern. Medical evaluation recommended.',
      };
    }
  }

  /**
   * Assess sleep quality from wearable data
   */
  public static assessSleepQuality(
    totalMinutes: number,
    deepMinutes: number,
    efficiency: number
  ): {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    recommendation: string;
  } {
    const totalHours = totalMinutes / 60;
    const deepPercentage = (deepMinutes / totalMinutes) * 100;

    if (totalHours >= 7 && totalHours <= 9 && deepPercentage >= 15 && efficiency >= 85) {
      return {
        status: 'excellent',
        recommendation: 'Sleep quality is excellent. Maintain current sleep habits.',
      };
    } else if (totalHours >= 6 && efficiency >= 75) {
      return {
        status: 'good',
        recommendation: 'Sleep quality is adequate but could be improved.',
      };
    } else if (totalHours >= 5) {
      return {
        status: 'fair',
        recommendation: 'Sleep duration or quality is suboptimal. Consider sleep hygiene improvements.',
      };
    } else {
      return {
        status: 'poor',
        recommendation: 'Significant sleep deficiency detected. Evaluate for sleep disorders.',
      };
    }
  }
}
