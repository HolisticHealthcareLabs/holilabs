/**
 * HL7 ADT Message Parser
 *
 * Parses HL7 v2.x ADT (Admission, Discharge, Transfer) messages
 * and converts them to internal Patient model or FHIR R4 Patient resources
 *
 * Supported message types:
 * - ADT^A01: Patient admission
 * - ADT^A02: Patient transfer
 * - ADT^A03: Patient discharge
 * - ADT^A04: Patient registration
 * - ADT^A08: Patient information update
 * - ADT^A11: Cancel patient admission
 * - ADT^A28: Add person information
 * - ADT^A31: Update person information
 *
 * HL7 v2.x Standard: http://www.hl7.org/implement/standards/product_brief.cfm?product_id=185
 */

import { Parser, Message, Segment } from 'simple-hl7';
import type { Patient } from '@prisma/client';

/**
 * Parsed ADT message with extracted patient data
 */
export interface ParsedADT {
  messageType: string;
  messageControlId: string;
  eventType: string;
  timestamp: Date;
  sendingFacility: string;
  receivingFacility: string;
  patient: Partial<Patient> & {
    externalPatientId?: string;
    accountNumber?: string;
    visitNumber?: string;
  };
  metadata: {
    raw: string;
    version: string;
    segments: string[];
  };
}

/**
 * HL7 ADT Parser
 */
export class ADTParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Parse an HL7 ADT message
   * @param hl7Message Raw HL7 message string (with \r or \n separators)
   * @returns Parsed ADT data with patient information
   */
  parse(hl7Message: string): ParsedADT {
    // Normalize line endings to \r
    const normalized = hl7Message.replace(/\r?\n/g, '\r');

    // Parse HL7 message
    const message = this.parser.parse(normalized);

    // Extract MSH segment (Message Header)
    const msh = message.getSegment('MSH');
    if (!msh) {
      throw new Error('Invalid HL7 message: Missing MSH segment');
    }

    // Extract message type and event
    const messageType = this.getField(msh, 9, 0); // MSH-9.1: Message Type
    const eventType = this.getField(msh, 9, 1); // MSH-9.2: Trigger Event
    const messageControlId = this.getField(msh, 10); // MSH-10: Message Control ID
    const timestamp = this.parseHL7DateTime(this.getField(msh, 7)); // MSH-7: Date/Time of Message
    const sendingFacility = this.getField(msh, 4); // MSH-4: Sending Facility
    const receivingFacility = this.getField(msh, 6); // MSH-6: Receiving Facility
    const version = this.getField(msh, 12); // MSH-12: Version ID

    // Validate ADT message type
    if (messageType !== 'ADT') {
      throw new Error(`Expected ADT message, got ${messageType}`);
    }

    // Extract PID segment (Patient Identification)
    const pid = message.getSegment('PID');
    if (!pid) {
      throw new Error('Invalid ADT message: Missing PID segment');
    }

    // Extract patient data
    const patient = this.extractPatientData(pid, message);

    // Extract all segment types for metadata
    const segments = message.segments.map((seg: Segment) => seg.name);

    return {
      messageType,
      messageControlId,
      eventType,
      timestamp,
      sendingFacility,
      receivingFacility,
      patient,
      metadata: {
        raw: normalized,
        version,
        segments,
      },
    };
  }

  /**
   * Extract patient data from PID segment
   */
  private extractPatientData(
    pid: Segment,
    message: Message
  ): ParsedADT['patient'] {
    // PID-3: Patient Identifier List
    const patientIdList = this.getRepeatingField(pid, 3);
    const externalMrn = patientIdList[0] || '';
    const externalPatientId = this.getField(pid, 3, 0);

    // PID-5: Patient Name (formatted as: Last^First^Middle^Suffix^Prefix)
    const lastName = this.getField(pid, 5, 0);
    const firstName = this.getField(pid, 5, 1);

    // PID-7: Date of Birth (format: YYYYMMDD or YYYYMMDDHHMMSS)
    const dobString = this.getField(pid, 7);
    const dateOfBirth = this.parseHL7Date(dobString);

    // PID-8: Administrative Sex (M, F, O, U)
    const adminSex = this.getField(pid, 8);
    const gender = this.mapHL7Gender(adminSex);

    // PID-11: Patient Address (formatted as: Street^OtherDesignation^City^State^Zip^Country)
    const address = this.getField(pid, 11, 0);
    const city = this.getField(pid, 11, 2);
    const state = this.getField(pid, 11, 3);
    const postalCode = this.getField(pid, 11, 4);
    const country = this.getField(pid, 11, 5) || 'BR';

    // PID-13: Phone Number - Home
    const phone = this.getField(pid, 13);

    // PID-18: Patient Account Number
    const accountNumber = this.getField(pid, 18);

    // PID-19: SSN Number - Patient (can be CPF in Brazil)
    const cpf = this.getField(pid, 19);

    // Extract email from PID-13 or PID-14 if available
    let email: string | undefined;
    const phoneFields = this.getRepeatingField(pid, 13);
    for (const phoneField of phoneFields) {
      if (phoneField.includes('@')) {
        email = phoneField;
        break;
      }
    }

    // Extract PV1 segment (Patient Visit) if available
    const pv1 = message.getSegment('PV1');
    let visitNumber: string | undefined;
    if (pv1) {
      visitNumber = this.getField(pv1, 19); // PV1-19: Visit Number
    }

    return {
      externalMrn,
      externalPatientId,
      accountNumber,
      visitNumber,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      country,
      cpf,
    };
  }

  /**
   * Get field value from segment
   * @param segment HL7 segment
   * @param fieldIndex Field index (1-based)
   * @param componentIndex Component index (0-based, optional)
   */
  private getField(
    segment: Segment,
    fieldIndex: number,
    componentIndex?: number
  ): string {
    try {
      const field = segment.getField(fieldIndex);
      if (!field) return '';

      if (componentIndex !== undefined) {
        const component = field.getComponent(componentIndex);
        return component?.value || '';
      }

      return field.value || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Get all repetitions of a field
   */
  private getRepeatingField(segment: Segment, fieldIndex: number): string[] {
    try {
      const field = segment.getField(fieldIndex);
      if (!field) return [];

      // Get all field repetitions
      const values: string[] = [];
      const value = field.value;
      if (value) {
        // Split by repetition separator (~)
        const parts = value.split('~');
        for (const part of parts) {
          if (part) values.push(part);
        }
      }

      return values.length > 0 ? values : [value || ''];
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse HL7 date format (YYYYMMDD or YYYYMMDDHHMMSS) to JavaScript Date
   */
  private parseHL7Date(dateString: string): Date | undefined {
    if (!dateString || dateString.length < 8) return undefined;

    try {
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1; // JS months are 0-indexed
      const day = parseInt(dateString.substring(6, 8));

      // Check if time is included
      if (dateString.length >= 14) {
        const hour = parseInt(dateString.substring(8, 10));
        const minute = parseInt(dateString.substring(10, 12));
        const second = parseInt(dateString.substring(12, 14));
        return new Date(year, month, day, hour, minute, second);
      }

      return new Date(year, month, day);
    } catch (error) {
      console.error('Failed to parse HL7 date:', dateString, error);
      return undefined;
    }
  }

  /**
   * Parse HL7 datetime format (YYYYMMDDHHMMSS) to JavaScript Date
   */
  private parseHL7DateTime(dateTimeString: string): Date {
    const parsed = this.parseHL7Date(dateTimeString);
    return parsed || new Date();
  }

  /**
   * Map HL7 administrative sex to internal gender enum
   */
  private mapHL7Gender(hl7Gender: string): string {
    const genderMap: Record<string, string> = {
      M: 'MALE',
      F: 'FEMALE',
      O: 'OTHER',
      U: 'UNKNOWN',
      A: 'OTHER', // Ambiguous
      N: 'UNKNOWN', // Not applicable
    };

    return genderMap[hl7Gender?.toUpperCase()] || 'UNKNOWN';
  }

  /**
   * Validate HL7 message format
   */
  static validate(hl7Message: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if message starts with MSH
    if (!hl7Message.startsWith('MSH')) {
      errors.push('Message must start with MSH segment');
    }

    // Check for minimum required segments
    if (!hl7Message.includes('PID')) {
      errors.push('Message must contain PID segment');
    }

    // Check message structure
    const lines = hl7Message.split(/\r?\n/);
    if (lines.length < 2) {
      errors.push('Message must contain at least MSH and PID segments');
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

      // MSH segment fields are separated by the field separator (usually |)
      const fields = mshLine.split('|');
      if (fields.length < 9) return null;

      // MSH-9 contains message type (e.g., ADT^A01)
      const messageType = fields[8];
      return messageType;
    } catch (error) {
      return null;
    }
  }
}

/**
 * Create a new ADT parser instance
 */
export function createADTParser(): ADTParser {
  return new ADTParser();
}

/**
 * Quick parse function for convenience
 */
export function parseADT(hl7Message: string): ParsedADT {
  const parser = createADTParser();
  return parser.parse(hl7Message);
}

/**
 * Example HL7 ADT^A04 message for testing
 */
export const EXAMPLE_ADT_A04 = `MSH|^~\\&|HOLI_EMR|HOLILABS|HOSPITAL_SYS|HOSPITAL|20250119203000||ADT^A04|MSG001|P|2.5|||AL|NE|BR
EVN|A04|20250119203000|||^SISTEMA^EMR
PID|1||MRN12345678^^^HOLILABS^MR~CPF12345678901^^^BR^CPF||Silva^João^Carlos||19800515|M||2106-3|Rua das Flores 123^^São Paulo^SP^01234567^BR||(11)98765-4321||PT|S||ACC9876543||12345678901|||2076-8
PV1|1|O|^^^HOLILABS||||^OLIVEIRA^MARIA|||||||||||||||||||||||||||||||||||20250119203000`;
