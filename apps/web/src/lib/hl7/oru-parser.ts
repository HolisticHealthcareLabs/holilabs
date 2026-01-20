/**
 * HL7 ORU Message Parser
 *
 * Parses HL7 v2.x ORU (Observation Result) messages from Laboratory Information Systems
 * and converts them to internal lab result models or FHIR R4 DiagnosticReport resources.
 *
 * Supported message types:
 * - ORU^R01: Unsolicited transmission of an observation message
 * - ORU^R03: Display-oriented results (query response)
 * - ORU^R30: Unsolicited point-of-care observation (POCT)
 * - ORU^R31: Unsolicited new point-of-care device observation
 *
 * Key Segments:
 * - MSH: Message Header
 * - PID: Patient Identification
 * - ORC: Common Order (optional)
 * - OBR: Observation Request (test/panel info)
 * - OBX: Observation Result (actual values)
 * - NTE: Notes and Comments
 *
 * HL7 v2.x Standard: http://www.hl7.org/implement/standards/product_brief.cfm?product_id=185
 *
 * Phase: Telehealth & Lab Integration (OSS: HL7 ORU)
 */

import { Parser, Message, Segment } from 'simple-hl7';

/**
 * Single observation result from OBX segment
 */
export interface ObservationResult {
  setId: number;
  valueType: string; // NM (numeric), ST (string), CE (coded), etc.
  observationId: string;
  observationName: string;
  observationSubId?: string;
  value: string;
  units?: string;
  referenceRange?: string;
  abnormalFlags?: string[]; // H (high), L (low), A (abnormal), etc.
  resultStatus: string; // F (final), P (preliminary), C (corrected)
  observationDateTime?: Date;
  producerId?: string;
  responsibleObserver?: string;
  loincCode?: string;
}

/**
 * Observation request (test/panel) from OBR segment
 */
export interface ObservationRequest {
  setId: number;
  placerOrderNumber?: string;
  fillerOrderNumber?: string;
  universalServiceId: string;
  universalServiceName: string;
  priority?: string;
  requestedDateTime?: Date;
  observationDateTime?: Date;
  observationEndDateTime?: Date;
  collectionVolume?: string;
  collectorId?: string;
  specimenActionCode?: string;
  dangerCode?: string;
  relevantClinicalInfo?: string;
  specimenReceivedDateTime?: Date;
  specimenSource?: string;
  orderingProvider?: string;
  resultStatus: string;
  parentResult?: string;
  results: ObservationResult[];
  notes: string[];
  loincCode?: string;
}

/**
 * Patient identification from PID segment
 */
export interface ORUPatient {
  patientId: string;
  externalMrn?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: string;
  accountNumber?: string;
}

/**
 * Parsed ORU message with all extracted data
 */
export interface ParsedORU {
  messageType: string;
  messageControlId: string;
  eventType: string;
  timestamp: Date;
  sendingFacility: string;
  sendingApplication: string;
  receivingFacility: string;
  receivingApplication: string;
  patient: ORUPatient;
  orders: ObservationRequest[];
  metadata: {
    raw: string;
    version: string;
    segments: string[];
    totalObservations: number;
  };
}

/**
 * Abnormal flag meanings
 */
export const ABNORMAL_FLAGS: Record<string, string> = {
  L: 'Below low normal',
  H: 'Above high normal',
  LL: 'Below lower panic limits',
  HH: 'Above upper panic limits',
  '<': 'Below absolute low-off instrument scale',
  '>': 'Above absolute high-off instrument scale',
  N: 'Normal',
  A: 'Abnormal',
  AA: 'Very abnormal',
  U: 'Significant change up',
  D: 'Significant change down',
  B: 'Better',
  W: 'Worse',
  S: 'Susceptible (microbiology)',
  R: 'Resistant (microbiology)',
  I: 'Intermediate (microbiology)',
};

/**
 * Result status meanings
 */
export const RESULT_STATUS: Record<string, string> = {
  O: 'Order received',
  I: 'Specimen in lab',
  S: 'Specimen received',
  A: 'Some results available',
  P: 'Preliminary',
  C: 'Corrected final',
  R: 'Results stored; not yet verified',
  F: 'Final results',
  X: 'Cannot obtain results',
  Y: 'No order on record',
  Z: 'No record of this patient',
};

/**
 * HL7 ORU Parser
 */
export class ORUParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Parse an HL7 ORU message
   * @param hl7Message Raw HL7 message string (with \r or \n separators)
   * @returns Parsed ORU data with patient and lab results
   */
  parse(hl7Message: string): ParsedORU {
    // Normalize line endings to \r
    const normalized = hl7Message.replace(/\r?\n/g, '\r');

    // Parse HL7 message
    const message = this.parser.parse(normalized);

    // Extract MSH segment (Message Header)
    // Note: simple-hl7 stores MSH in message.header, not in segments array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msh = (message as any).header as Segment;
    if (!msh || msh.name !== 'MSH') {
      throw new Error('Invalid HL7 message: Missing MSH segment');
    }

    // Extract message type and event
    const messageType = this.getField(msh, 9, 0); // MSH-9.1: Message Type
    const eventType = this.getField(msh, 9, 1); // MSH-9.2: Trigger Event
    const messageControlId = this.getField(msh, 10); // MSH-10: Message Control ID
    const timestamp = this.parseHL7DateTime(this.getField(msh, 7)) || new Date(); // MSH-7: Date/Time
    const sendingApplication = this.getField(msh, 3); // MSH-3: Sending Application
    const sendingFacility = this.getField(msh, 4); // MSH-4: Sending Facility
    const receivingApplication = this.getField(msh, 5); // MSH-5: Receiving Application
    const receivingFacility = this.getField(msh, 6); // MSH-6: Receiving Facility
    const version = this.getField(msh, 12); // MSH-12: Version ID

    // Validate ORU message type
    if (messageType !== 'ORU') {
      throw new Error(`Expected ORU message, got ${messageType}`);
    }

    // Extract PID segment (Patient Identification)
    const pid = message.getSegment('PID');
    if (!pid) {
      throw new Error('Invalid ORU message: Missing PID segment');
    }

    // Extract patient data
    const patient = this.extractPatientData(pid);

    // Extract all OBR segments and their associated OBX/NTE segments
    const orders = this.extractOrders(message);

    // Extract all segment types for metadata
    // Note: simple-hl7 stores MSH in header, not in segments array
    const segments = ['MSH', ...message.segments.map((seg: Segment) => seg.name)];

    // Count total observations
    const totalObservations = orders.reduce(
      (sum, order) => sum + order.results.length,
      0
    );

    return {
      messageType,
      messageControlId,
      eventType,
      timestamp,
      sendingFacility,
      sendingApplication,
      receivingFacility,
      receivingApplication,
      patient,
      orders,
      metadata: {
        raw: normalized,
        version,
        segments,
        totalObservations,
      },
    };
  }

  /**
   * Extract patient data from PID segment
   */
  private extractPatientData(pid: Segment): ORUPatient {
    // PID-3: Patient Identifier List
    const patientId = this.getField(pid, 3, 0);
    const externalMrn = this.getField(pid, 3, 0);

    // PID-5: Patient Name
    const lastName = this.getField(pid, 5, 0);
    const firstName = this.getField(pid, 5, 1);

    // PID-7: Date of Birth
    const dobString = this.getField(pid, 7);
    const dateOfBirth = this.parseHL7Date(dobString);

    // PID-8: Administrative Sex
    const adminSex = this.getField(pid, 8);
    const gender = this.mapHL7Gender(adminSex);

    // PID-18: Patient Account Number
    const accountNumber = this.getField(pid, 18);

    return {
      patientId,
      externalMrn,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      accountNumber,
    };
  }

  /**
   * Extract all orders (OBR segments) with their results (OBX) and notes (NTE)
   */
  private extractOrders(message: Message): ObservationRequest[] {
    const orders: ObservationRequest[] = [];
    const segments = message.segments;

    let currentOrder: ObservationRequest | null = null;

    for (const segment of segments) {
      if (segment.name === 'OBR') {
        // Save previous order if exists
        if (currentOrder) {
          orders.push(currentOrder);
        }

        // Start new order
        currentOrder = this.extractOBR(segment);
      } else if (segment.name === 'OBX' && currentOrder) {
        // Add observation to current order
        const result = this.extractOBX(segment);
        currentOrder.results.push(result);
      } else if (segment.name === 'NTE' && currentOrder) {
        // Add note to current order
        const note = this.getField(segment, 3);
        if (note) {
          currentOrder.notes.push(note);
        }
      }
    }

    // Don't forget the last order
    if (currentOrder) {
      orders.push(currentOrder);
    }

    return orders;
  }

  /**
   * Extract observation request from OBR segment
   */
  private extractOBR(obr: Segment): ObservationRequest {
    // OBR-1: Set ID
    const setId = parseInt(this.getField(obr, 1)) || 1;

    // OBR-2: Placer Order Number
    const placerOrderNumber = this.getField(obr, 2);

    // OBR-3: Filler Order Number
    const fillerOrderNumber = this.getField(obr, 3);

    // OBR-4: Universal Service Identifier (test code)
    const universalServiceId = this.getField(obr, 4, 0);
    const universalServiceName = this.getField(obr, 4, 1) || universalServiceId;
    const loincCode = this.getField(obr, 4, 2); // Often LOINC

    // OBR-5: Priority
    const priority = this.getField(obr, 5);

    // OBR-6: Requested Date/Time
    const requestedDateTime = this.parseHL7DateTime(this.getField(obr, 6));

    // OBR-7: Observation Date/Time
    const observationDateTime = this.parseHL7DateTime(this.getField(obr, 7));

    // OBR-8: Observation End Date/Time
    const observationEndDateTime = this.parseHL7DateTime(this.getField(obr, 8));

    // OBR-9: Collection Volume
    const collectionVolume = this.getField(obr, 9);

    // OBR-10: Collector Identifier
    const collectorId = this.getField(obr, 10);

    // OBR-11: Specimen Action Code
    const specimenActionCode = this.getField(obr, 11);

    // OBR-12: Danger Code
    const dangerCode = this.getField(obr, 12);

    // OBR-13: Relevant Clinical Information
    const relevantClinicalInfo = this.getField(obr, 13);

    // OBR-14: Specimen Received Date/Time
    const specimenReceivedDateTime = this.parseHL7DateTime(
      this.getField(obr, 14)
    );

    // OBR-15: Specimen Source
    const specimenSource = this.getField(obr, 15);

    // OBR-16: Ordering Provider
    const orderingProvider = this.getField(obr, 16, 1); // Family name

    // OBR-25: Result Status
    const resultStatus = this.getField(obr, 25) || 'F';

    // OBR-26: Parent Result
    const parentResult = this.getField(obr, 26);

    return {
      setId,
      placerOrderNumber,
      fillerOrderNumber,
      universalServiceId,
      universalServiceName,
      priority,
      requestedDateTime,
      observationDateTime,
      observationEndDateTime,
      collectionVolume,
      collectorId,
      specimenActionCode,
      dangerCode,
      relevantClinicalInfo,
      specimenReceivedDateTime,
      specimenSource,
      orderingProvider,
      resultStatus,
      parentResult,
      results: [],
      notes: [],
      loincCode,
    };
  }

  /**
   * Extract observation result from OBX segment
   */
  private extractOBX(obx: Segment): ObservationResult {
    // OBX-1: Set ID
    const setId = parseInt(this.getField(obx, 1)) || 1;

    // OBX-2: Value Type (NM, ST, CE, TX, etc.)
    const valueType = this.getField(obx, 2);

    // OBX-3: Observation Identifier
    const observationId = this.getField(obx, 3, 0);
    const observationName = this.getField(obx, 3, 1) || observationId;
    const loincCode = this.getField(obx, 3, 2); // Often LOINC

    // OBX-4: Observation Sub-ID
    const observationSubId = this.getField(obx, 4);

    // OBX-5: Observation Value
    const value = this.getField(obx, 5);

    // OBX-6: Units
    const units = this.getField(obx, 6, 0);

    // OBX-7: Reference Range
    const referenceRange = this.getField(obx, 7);

    // OBX-8: Abnormal Flags (can be multiple repetitions separated by ~)
    // Note: simple-hl7 parses ~ repetitions into separate array entries
    const abnormalFlags = this.getFieldRepetitions(obx, 8);

    // OBX-11: Result Status
    const resultStatus = this.getField(obx, 11) || 'F';

    // OBX-14: Date/Time of Observation
    const observationDateTime = this.parseHL7DateTime(this.getField(obx, 14));

    // OBX-15: Producer's ID
    const producerId = this.getField(obx, 15);

    // OBX-16: Responsible Observer
    const responsibleObserver = this.getField(obx, 16, 1);

    return {
      setId,
      valueType,
      observationId,
      observationName,
      observationSubId,
      value,
      units,
      referenceRange,
      abnormalFlags,
      resultStatus,
      observationDateTime,
      producerId,
      responsibleObserver,
      loincCode,
    };
  }

  /**
   * Get field value from segment
   *
   * Note: simple-hl7 stores fields differently for MSH vs other segments:
   * - MSH (header): Fields start at MSH-3 in index 0 (MSH-1 and MSH-2 are special)
   * - Other segments: Fields are 0-indexed (field 1 at index 0)
   *
   * Field structure: segment.fields[arrayIndex].value[repIdx][componentIdx].value[subComponentIdx]
   */
  private getField(
    segment: Segment,
    fieldIndex: number,
    componentIndex: number = 0
  ): string {
    try {
      // Calculate array index based on segment type
      // For MSH (header), field 3 is at index 0, so subtract 3
      // For other segments, field 1 is at index 0, so subtract 1
      const isMSH = segment.name === 'MSH';
      const arrayIndex = isMSH ? fieldIndex - 3 : fieldIndex - 1;

      if (arrayIndex < 0) return '';

      // Access the raw field structure from simple-hl7
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields = (segment as any).fields;
      if (!fields || !fields[arrayIndex]) return '';

      const field = fields[arrayIndex];
      if (!field || !field.value) return '';

      // Structure: value[repIdx][componentIdx].value[subComponentIdx]
      const repetitions = field.value;
      if (!repetitions || !repetitions[0]) return '';

      const components = repetitions[0];
      if (!components || !components[componentIndex]) return '';

      const component = components[componentIndex];
      if (!component || !component.value) return '';

      // Return first subcomponent value
      return component.value[0] || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Get all repetition values from a field (used for fields with ~ separator)
   * Returns array of values from all repetitions
   *
   * Note: simple-hl7 has inconsistent structure for single vs multiple repetitions:
   * - Single repetition: field.value[0][componentIdx].value[subComponentIdx]
   * - Multiple repetitions: field.value[repIdx].value[0][componentIdx].value[subComponentIdx]
   */
  private getFieldRepetitions(
    segment: Segment,
    fieldIndex: number,
    componentIndex: number = 0
  ): string[] {
    try {
      const isMSH = segment.name === 'MSH';
      const arrayIndex = isMSH ? fieldIndex - 3 : fieldIndex - 1;

      if (arrayIndex < 0) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields = (segment as any).fields;
      if (!fields || !fields[arrayIndex]) return [];

      const field = fields[arrayIndex];
      if (!field || !field.value) return [];

      const repetitions = field.value;
      if (!repetitions || repetitions.length === 0) return [];

      const values: string[] = [];

      for (const rep of repetitions) {
        if (!rep) continue;

        // Check if this is a nested repetition (has .value property) or direct components
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const components = (rep as any).value ? (rep as any).value[0] : rep;

        if (components && components[componentIndex]) {
          const component = components[componentIndex];
          if (component && component.value && component.value[0]) {
            values.push(component.value[0]);
          }
        }
      }

      return values;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse HL7 date format (YYYYMMDD) to JavaScript Date
   */
  private parseHL7Date(dateString: string): Date | undefined {
    if (!dateString || dateString.length < 8) return undefined;

    try {
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1;
      const day = parseInt(dateString.substring(6, 8));

      if (dateString.length >= 14) {
        const hour = parseInt(dateString.substring(8, 10));
        const minute = parseInt(dateString.substring(10, 12));
        const second = parseInt(dateString.substring(12, 14));
        return new Date(year, month, day, hour, minute, second);
      }

      return new Date(year, month, day);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Parse HL7 datetime format
   */
  private parseHL7DateTime(dateTimeString: string): Date | undefined {
    return this.parseHL7Date(dateTimeString);
  }

  /**
   * Map HL7 gender to internal enum
   */
  private mapHL7Gender(hl7Gender: string): string {
    const genderMap: Record<string, string> = {
      M: 'MALE',
      F: 'FEMALE',
      O: 'OTHER',
      U: 'UNKNOWN',
    };
    return genderMap[hl7Gender?.toUpperCase()] || 'UNKNOWN';
  }

  /**
   * Check if a result has critical/panic values
   */
  static isCriticalResult(result: ObservationResult): boolean {
    const criticalFlags = ['LL', 'HH', 'AA'];
    return result.abnormalFlags?.some((flag) =>
      criticalFlags.includes(flag)
    ) || false;
  }

  /**
   * Check if a result is abnormal
   */
  static isAbnormalResult(result: ObservationResult): boolean {
    const abnormalIndicators = ['L', 'H', 'LL', 'HH', 'A', 'AA', '<', '>'];
    return result.abnormalFlags?.some((flag) =>
      abnormalIndicators.includes(flag)
    ) || false;
  }

  /**
   * Get human-readable abnormal flag description
   */
  static getAbnormalFlagDescription(flag: string): string {
    return ABNORMAL_FLAGS[flag] || 'Unknown';
  }

  /**
   * Get human-readable result status description
   */
  static getResultStatusDescription(status: string): string {
    return RESULT_STATUS[status] || 'Unknown';
  }

  /**
   * Validate HL7 ORU message format
   */
  static validate(hl7Message: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!hl7Message.startsWith('MSH')) {
      errors.push('Message must start with MSH segment');
    }

    if (!hl7Message.includes('PID')) {
      errors.push('Message must contain PID segment');
    }

    if (!hl7Message.includes('OBR')) {
      errors.push('Message must contain at least one OBR segment');
    }

    if (!hl7Message.includes('OBX')) {
      errors.push('Message must contain at least one OBX segment');
    }

    // Check message type
    const messageType = ORUParser.getMessageType(hl7Message);
    if (messageType && !messageType.startsWith('ORU')) {
      errors.push(`Expected ORU message type, got ${messageType}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract message type from HL7 message without full parsing
   */
  static getMessageType(hl7Message: string): string | null {
    try {
      const mshLine = hl7Message.split(/\r?\n/)[0];
      if (!mshLine.startsWith('MSH')) return null;

      const fields = mshLine.split('|');
      if (fields.length < 9) return null;

      return fields[8];
    } catch (error) {
      return null;
    }
  }
}

/**
 * Create a new ORU parser instance
 */
export function createORUParser(): ORUParser {
  return new ORUParser();
}

/**
 * Quick parse function for convenience
 */
export function parseORU(hl7Message: string): ParsedORU {
  const parser = createORUParser();
  return parser.parse(hl7Message);
}

/**
 * Example HL7 ORU^R01 message for testing (Complete Blood Count)
 */
export const EXAMPLE_ORU_R01 = `MSH|^~\\&|LAB_SYS|HOSPITAL_LAB|HOLI_EMR|HOLILABS|20250119120000||ORU^R01|MSG123456|P|2.5|||AL|NE|BR
PID|1||MRN12345678^^^HOLILABS^MR||Silva^João^Carlos||19800515|M|||Rua das Flores 123^^São Paulo^SP^01234567^BR||(11)98765-4321
ORC|RE|ORD001|FIL001||CM||||20250119100000|||^OLIVEIRA^MARIA
OBR|1|ORD001|FIL001|26604-4^CBC^LN|||20250119090000|||||||||^OLIVEIRA^MARIA||||||||F
OBX|1|NM|6690-2^WBC^LN||8.5|10*3/uL|4.5-11.0|N|||F|||20250119115500
OBX|2|NM|789-8^RBC^LN||4.8|10*6/uL|4.5-5.5|N|||F|||20250119115500
OBX|3|NM|718-7^Hemoglobin^LN||14.2|g/dL|13.5-17.5|N|||F|||20250119115500
OBX|4|NM|4544-3^Hematocrit^LN||42|%|40-52|N|||F|||20250119115500
OBX|5|NM|787-2^MCV^LN||88|fL|80-100|N|||F|||20250119115500
OBX|6|NM|777-3^Platelets^LN||250|10*3/uL|150-400|N|||F|||20250119115500
NTE|1||Results verified by Dr. Garcia`;

/**
 * Example ORU with abnormal results
 */
export const EXAMPLE_ORU_ABNORMAL = `MSH|^~\\&|LAB_SYS|HOSPITAL_LAB|HOLI_EMR|HOLILABS|20250119140000||ORU^R01|MSG789012|P|2.5|||AL|NE|BR
PID|1||MRN98765432^^^HOLILABS^MR||Pereira^Ana^Maria||19650320|F|||Av. Paulista 1000^^São Paulo^SP^01310100^BR||(11)91234-5678
ORC|RE|ORD002|FIL002||CM||||20250119130000|||^SANTOS^PEDRO
OBR|1|ORD002|FIL002|2345-7^Glucose^LN|||20250119125000|||||||||^SANTOS^PEDRO||||||||F
OBX|1|NM|2345-7^Glucose^LN||285|mg/dL|70-100|HH|||F|||20250119135500
NTE|1||CRITICAL VALUE - Physician notified at 13:56`;

// ============================================================================
// FHIR R4 CONVERSION
// ============================================================================

/**
 * FHIR R4 Observation resource interface (simplified for ORU conversion)
 */
export interface FHIRObservationFromORU {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  }>;
  code: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  issued?: string;
  valueQuantity?: {
    value: number;
    unit?: string;
  };
  valueString?: string;
  interpretation?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  referenceRange?: Array<{
    text?: string;
  }>;
}

/**
 * FHIR R4 DiagnosticReport resource interface
 */
export interface FHIRDiagnosticReportFromORU {
  resourceType: 'DiagnosticReport';
  id: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  code: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  issued?: string;
  performer?: Array<{
    display?: string;
  }>;
  result?: Array<{
    reference: string;
    display?: string;
  }>;
  conclusion?: string;
}

/**
 * FHIR R4 Bundle containing DiagnosticReport and Observations
 */
export interface FHIRBundleFromORU {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: Array<{
    fullUrl?: string;
    resource: FHIRDiagnosticReportFromORU | FHIRObservationFromORU;
  }>;
}

/**
 * Convert ParsedORU to FHIR R4 Bundle
 * Creates DiagnosticReport resources for each order and Observation resources for each result
 *
 * @param parsedORU - Parsed ORU message from parser
 * @param patientFhirId - FHIR Patient resource ID (not MRN)
 * @returns FHIR R4 Bundle containing DiagnosticReport and Observations
 */
export function toFHIRBundle(parsedORU: ParsedORU, patientFhirId: string): FHIRBundleFromORU {
  const bundle: FHIRBundleFromORU = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: parsedORU.timestamp.toISOString(),
    entry: [],
  };

  // Map result status to FHIR Observation status
  const mapToObservationStatus = (status: string): 'preliminary' | 'final' | 'corrected' | 'cancelled' | 'unknown' => {
    const statusMap: Record<string, 'preliminary' | 'final' | 'corrected' | 'cancelled' | 'unknown'> = {
      'F': 'final',
      'P': 'preliminary',
      'C': 'corrected',
      'X': 'cancelled',
      'R': 'preliminary',
      'A': 'preliminary',
    };
    return statusMap[status] || 'unknown';
  };

  // Map result status to FHIR DiagnosticReport status
  const mapToReportStatus = (status: string): 'preliminary' | 'final' | 'corrected' | 'cancelled' | 'unknown' => {
    return mapToObservationStatus(status);
  };

  let observationCounter = 0;

  for (const order of parsedORU.orders) {
    const reportId = `report-${parsedORU.messageControlId}-${order.setId}`;
    const observationRefs: Array<{ reference: string; display?: string }> = [];

    // Create Observation resources for each result
    for (const result of order.results) {
      observationCounter++;
      const obsId = `obs-${parsedORU.messageControlId}-${observationCounter}`;

      const observation: FHIRObservationFromORU = {
        resourceType: 'Observation',
        id: obsId,
        status: mapToObservationStatus(result.resultStatus),
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory',
          }],
        }],
        code: {
          text: result.observationName,
        },
        subject: {
          reference: `Patient/${patientFhirId}`,
        },
      };

      // Add LOINC code if available
      if (result.loincCode || result.observationId) {
        observation.code.coding = [{
          system: 'http://loinc.org',
          code: result.loincCode || result.observationId,
          display: result.observationName,
        }];
      }

      // Add value
      if (result.value) {
        const numericValue = parseFloat(result.value);
        if (!isNaN(numericValue) && result.valueType === 'NM') {
          observation.valueQuantity = {
            value: numericValue,
            unit: result.units,
          };
        } else {
          observation.valueString = result.value;
        }
      }

      // Add reference range
      if (result.referenceRange) {
        observation.referenceRange = [{ text: result.referenceRange }];
      }

      // Add interpretation based on abnormal flags
      if (result.abnormalFlags && result.abnormalFlags.length > 0) {
        const primaryFlag = result.abnormalFlags[0];
        observation.interpretation = [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: primaryFlag,
            display: ABNORMAL_FLAGS[primaryFlag] || primaryFlag,
          }],
          text: result.abnormalFlags.map(f => ABNORMAL_FLAGS[f] || f).join(', '),
        }];
      }

      // Add effective date
      if (result.observationDateTime) {
        observation.effectiveDateTime = result.observationDateTime.toISOString();
      } else if (order.observationDateTime) {
        observation.effectiveDateTime = order.observationDateTime.toISOString();
      }

      // Add observation to bundle
      bundle.entry.push({
        fullUrl: `urn:uuid:${obsId}`,
        resource: observation,
      });

      // Track reference for DiagnosticReport
      observationRefs.push({
        reference: `Observation/${obsId}`,
        display: result.observationName,
      });
    }

    // Create DiagnosticReport resource
    const report: FHIRDiagnosticReportFromORU = {
      resourceType: 'DiagnosticReport',
      id: reportId,
      status: mapToReportStatus(order.resultStatus),
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'LAB',
          display: 'Laboratory',
        }],
        text: 'Laboratory',
      }],
      code: {
        text: order.universalServiceName,
      },
      subject: {
        reference: `Patient/${patientFhirId}`,
      },
      result: observationRefs,
    };

    // Add LOINC code if available
    if (order.loincCode || order.universalServiceId) {
      report.code.coding = [{
        system: 'http://loinc.org',
        code: order.loincCode || order.universalServiceId,
        display: order.universalServiceName,
      }];
    }

    // Add effective date
    if (order.observationDateTime) {
      report.effectiveDateTime = order.observationDateTime.toISOString();
    }

    // Add issued timestamp
    report.issued = parsedORU.timestamp.toISOString();

    // Add performer (sending facility)
    if (parsedORU.sendingFacility) {
      report.performer = [{ display: parsedORU.sendingFacility }];
    }

    // Add conclusion if there are critical/abnormal results
    const criticalResults = order.results.filter(r => ORUParser.isCriticalResult(r));
    const abnormalResults = order.results.filter(r => ORUParser.isAbnormalResult(r));

    if (criticalResults.length > 0) {
      report.conclusion = `CRITICAL: ${criticalResults.length} critical value(s) require immediate attention. ${order.notes.join(' ')}`;
    } else if (abnormalResults.length > 0) {
      report.conclusion = `${abnormalResults.length} abnormal result(s). Review recommended.`;
    }

    // Add DiagnosticReport to bundle (at the beginning for visibility)
    bundle.entry.unshift({
      fullUrl: `urn:uuid:${reportId}`,
      resource: report,
    });
  }

  return bundle;
}
