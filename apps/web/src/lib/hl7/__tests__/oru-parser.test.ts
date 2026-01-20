/**
 * HL7 ORU Parser Tests
 *
 * Unit tests for the ORU^R01 parser that handles lab results
 * from Laboratory Information Systems.
 *
 * Phase: Telehealth & Lab Integration (OSS: HL7 ORU)
 */

import {
  ORUParser,
  parseORU,
  createORUParser,
  toFHIRBundle,
  ABNORMAL_FLAGS,
  RESULT_STATUS,
  type ObservationResult,
  type FHIRBundleFromORU,
} from '../oru-parser';

/**
 * Sample HL7 ORU^R01 message (Complete Blood Count)
 * Note: Using proper HL7 encoding characters
 */
const SAMPLE_ORU_CBC = [
  'MSH|^~\\&|LAB_SYS|HOSPITAL_LAB|HOLI_EMR|HOLILABS|20250119120000||ORU^R01|MSG123456|P|2.5|||AL|NE|BR',
  'PID|1||MRN12345678^^^HOLILABS^MR||Silva^João^Carlos||19800515|M|||Rua das Flores 123^^São Paulo^SP^01234567^BR||(11)98765-4321',
  'ORC|RE|ORD001|FIL001||CM||||20250119100000|||^OLIVEIRA^MARIA',
  'OBR|1|ORD001|FIL001|26604-4^CBC^LN|||20250119090000|||||||||^OLIVEIRA^MARIA||||||||F',
  'OBX|1|NM|6690-2^WBC^LN||8.5|10*3/uL|4.5-11.0|N|||F|||20250119115500',
  'OBX|2|NM|789-8^RBC^LN||4.8|10*6/uL|4.5-5.5|N|||F|||20250119115500',
  'OBX|3|NM|718-7^Hemoglobin^LN||14.2|g/dL|13.5-17.5|N|||F|||20250119115500',
  'OBX|4|NM|4544-3^Hematocrit^LN||42|%|40-52|N|||F|||20250119115500',
  'OBX|5|NM|787-2^MCV^LN||88|fL|80-100|N|||F|||20250119115500',
  'OBX|6|NM|777-3^Platelets^LN||250|10*3/uL|150-400|N|||F|||20250119115500',
  'NTE|1||Results verified by Dr. Garcia',
].join('\r');

/**
 * Sample HL7 ORU with abnormal results (Critical High Glucose)
 */
const SAMPLE_ORU_ABNORMAL = [
  'MSH|^~\\&|LAB_SYS|HOSPITAL_LAB|HOLI_EMR|HOLILABS|20250119140000||ORU^R01|MSG789012|P|2.5|||AL|NE|BR',
  'PID|1||MRN98765432^^^HOLILABS^MR||Pereira^Ana^Maria||19650320|F|||Av. Paulista 1000^^São Paulo^SP^01310100^BR||(11)91234-5678',
  'ORC|RE|ORD002|FIL002||CM||||20250119130000|||^SANTOS^PEDRO',
  'OBR|1|ORD002|FIL002|2345-7^Glucose^LN|||20250119125000|||||||||^SANTOS^PEDRO||||||||F',
  'OBX|1|NM|2345-7^Glucose^LN||285|mg/dL|70-100|HH|||F|||20250119135500',
  'NTE|1||CRITICAL VALUE - Physician notified at 13:56',
].join('\r');

describe('ORUParser', () => {
  let parser: ORUParser;

  beforeEach(() => {
    parser = new ORUParser();
  });

  describe('parse()', () => {
    describe('MSH segment extraction', () => {
      it('should extract message type as ORU', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.messageType).toBe('ORU');
      });

      it('should extract event type as R01', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.eventType).toBe('R01');
      });

      it('should extract message control ID', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.messageControlId).toBe('MSG123456');
      });

      it('should extract sending facility', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.sendingFacility).toBe('HOSPITAL_LAB');
      });

      it('should extract sending application', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.sendingApplication).toBe('LAB_SYS');
      });

      it('should extract receiving facility', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.receivingFacility).toBe('HOLILABS');
      });

      it('should extract receiving application', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.receivingApplication).toBe('HOLI_EMR');
      });

      it('should extract timestamp as Date', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.getFullYear()).toBe(2025);
        expect(result.timestamp.getMonth()).toBe(0); // January
        expect(result.timestamp.getDate()).toBe(19);
      });

      it('should extract version in metadata', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.metadata.version).toBe('2.5');
      });
    });

    describe('PID segment extraction (patient data)', () => {
      it('should extract patient ID/MRN', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.patient.patientId).toBe('MRN12345678');
        expect(result.patient.externalMrn).toBe('MRN12345678');
      });

      it('should extract patient name', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.patient.lastName).toBe('Silva');
        expect(result.patient.firstName).toBe('João');
      });

      it('should extract and parse date of birth', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.patient.dateOfBirth).toBeInstanceOf(Date);
        expect(result.patient.dateOfBirth?.getFullYear()).toBe(1980);
        expect(result.patient.dateOfBirth?.getMonth()).toBe(4); // May
        expect(result.patient.dateOfBirth?.getDate()).toBe(15);
      });

      it('should extract and map gender', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.patient.gender).toBe('MALE');
      });

      it('should map female gender correctly', () => {
        const result = parser.parse(SAMPLE_ORU_ABNORMAL);
        expect(result.patient.gender).toBe('FEMALE');
      });
    });

    describe('OBR segment extraction (orders)', () => {
      it('should extract orders array', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders).toHaveLength(1);
      });

      it('should extract filler order number', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].fillerOrderNumber).toBe('FIL001');
      });

      it('should extract placer order number', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].placerOrderNumber).toBe('ORD001');
      });

      it('should extract universal service ID (test code)', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].universalServiceId).toBe('26604-4');
      });

      it('should extract universal service name', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].universalServiceName).toBe('CBC');
      });

      it('should extract LOINC code from OBR', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].loincCode).toBe('LN');
      });

      it('should extract ordering provider', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].orderingProvider).toBe('OLIVEIRA');
      });

      it('should extract result status', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].resultStatus).toBe('F');
      });

      it('should extract observation date/time', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const obsDateTime = result.orders[0].observationDateTime;
        expect(obsDateTime).toBeInstanceOf(Date);
        expect(obsDateTime?.getFullYear()).toBe(2025);
      });
    });

    describe('OBX segment extraction (results)', () => {
      it('should extract all observation results', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].results).toHaveLength(6);
      });

      it('should extract observation ID and name', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const wbc = result.orders[0].results[0];
        expect(wbc.observationId).toBe('6690-2');
        expect(wbc.observationName).toBe('WBC');
      });

      it('should extract numeric value', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const wbc = result.orders[0].results[0];
        expect(wbc.value).toBe('8.5');
        expect(wbc.valueType).toBe('NM');
      });

      it('should extract units', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const wbc = result.orders[0].results[0];
        expect(wbc.units).toBe('10*3/uL');
      });

      it('should extract reference range', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const wbc = result.orders[0].results[0];
        expect(wbc.referenceRange).toBe('4.5-11.0');
      });

      it('should extract normal abnormal flag', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const wbc = result.orders[0].results[0];
        expect(wbc.abnormalFlags).toContain('N');
      });

      it('should extract LOINC code from OBX', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const wbc = result.orders[0].results[0];
        expect(wbc.loincCode).toBe('LN');
      });

      it('should extract result status from OBX', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const wbc = result.orders[0].results[0];
        expect(wbc.resultStatus).toBe('F');
      });

      it('should extract observation date/time', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        const wbc = result.orders[0].results[0];
        expect(wbc.observationDateTime).toBeInstanceOf(Date);
      });
    });

    describe('NTE segment extraction (notes)', () => {
      it('should extract notes for order', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.orders[0].notes).toHaveLength(1);
        expect(result.orders[0].notes[0]).toBe(
          'Results verified by Dr. Garcia'
        );
      });

      it('should extract critical value notification note', () => {
        const result = parser.parse(SAMPLE_ORU_ABNORMAL);
        expect(result.orders[0].notes[0]).toContain('CRITICAL VALUE');
      });
    });

    describe('metadata extraction', () => {
      it('should include raw message in metadata', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.metadata.raw).toContain('MSH|');
      });

      it('should count total observations', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.metadata.totalObservations).toBe(6);
      });

      it('should list all segment types', () => {
        const result = parser.parse(SAMPLE_ORU_CBC);
        expect(result.metadata.segments).toContain('MSH');
        expect(result.metadata.segments).toContain('PID');
        expect(result.metadata.segments).toContain('ORC');
        expect(result.metadata.segments).toContain('OBR');
        expect(result.metadata.segments).toContain('OBX');
        expect(result.metadata.segments).toContain('NTE');
      });
    });

    describe('abnormal results', () => {
      it('should parse critical high flag (HH)', () => {
        const result = parser.parse(SAMPLE_ORU_ABNORMAL);
        const glucose = result.orders[0].results[0];
        expect(glucose.abnormalFlags).toContain('HH');
      });

      it('should extract abnormal value correctly', () => {
        const result = parser.parse(SAMPLE_ORU_ABNORMAL);
        const glucose = result.orders[0].results[0];
        expect(glucose.value).toBe('285');
        expect(glucose.referenceRange).toBe('70-100');
      });
    });

    describe('line ending normalization', () => {
      it('should handle \\r\\n line endings', () => {
        const msgWithCRLF = SAMPLE_ORU_CBC.replace(/\n/g, '\r\n');
        const result = parser.parse(msgWithCRLF);
        expect(result.messageType).toBe('ORU');
      });

      it('should handle \\r line endings', () => {
        const msgWithCR = SAMPLE_ORU_CBC.replace(/\n/g, '\r');
        const result = parser.parse(msgWithCR);
        expect(result.messageType).toBe('ORU');
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid message without proper MSH', () => {
        // When a message doesn't start with MSH, simple-hl7 creates a header
        // but message type parsing fails, resulting in ORU validation error
        const invalidMsg = 'PID|1||12345';
        expect(() => parser.parse(invalidMsg)).toThrow('Expected ORU message');
      });

      it('should throw error for non-ORU message type', () => {
        const adtMsg = `MSH|^~\\&|ADT|HOSP|EMR|CLI|20250119||ADT^A01|123|P|2.5
PID|1||12345`;
        expect(() => parser.parse(adtMsg)).toThrow(
          'Expected ORU message, got ADT'
        );
      });

      it('should throw error for missing PID segment', () => {
        const noPatient = `MSH|^~\\&|LAB|HOSP|EMR|CLI|20250119||ORU^R01|123|P|2.5
OBR|1||FIL001|CBC|||20250119
OBX|1|NM|WBC||5.0|10*3/uL`;
        expect(() => parser.parse(noPatient)).toThrow(
          'Invalid ORU message: Missing PID segment'
        );
      });
    });
  });

  describe('static methods', () => {
    describe('isCriticalResult()', () => {
      it('should return true for HH (critical high)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '2345-7',
          observationName: 'Glucose',
          value: '285',
          abnormalFlags: ['HH'],
          resultStatus: 'F',
        };
        expect(ORUParser.isCriticalResult(result)).toBe(true);
      });

      it('should return true for LL (critical low)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '2345-7',
          observationName: 'Glucose',
          value: '30',
          abnormalFlags: ['LL'],
          resultStatus: 'F',
        };
        expect(ORUParser.isCriticalResult(result)).toBe(true);
      });

      it('should return true for AA (very abnormal)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '12345',
          observationName: 'Test',
          value: '100',
          abnormalFlags: ['AA'],
          resultStatus: 'F',
        };
        expect(ORUParser.isCriticalResult(result)).toBe(true);
      });

      it('should return false for H (high but not critical)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '2345-7',
          observationName: 'Glucose',
          value: '120',
          abnormalFlags: ['H'],
          resultStatus: 'F',
        };
        expect(ORUParser.isCriticalResult(result)).toBe(false);
      });

      it('should return false for N (normal)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '6690-2',
          observationName: 'WBC',
          value: '8.5',
          abnormalFlags: ['N'],
          resultStatus: 'F',
        };
        expect(ORUParser.isCriticalResult(result)).toBe(false);
      });

      it('should return false for no flags', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '6690-2',
          observationName: 'WBC',
          value: '8.5',
          abnormalFlags: [],
          resultStatus: 'F',
        };
        expect(ORUParser.isCriticalResult(result)).toBe(false);
      });

      it('should return false for undefined flags', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '6690-2',
          observationName: 'WBC',
          value: '8.5',
          resultStatus: 'F',
        };
        expect(ORUParser.isCriticalResult(result)).toBe(false);
      });
    });

    describe('isAbnormalResult()', () => {
      it('should return true for H (high)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '2345-7',
          observationName: 'Glucose',
          value: '120',
          abnormalFlags: ['H'],
          resultStatus: 'F',
        };
        expect(ORUParser.isAbnormalResult(result)).toBe(true);
      });

      it('should return true for L (low)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '6690-2',
          observationName: 'WBC',
          value: '3.0',
          abnormalFlags: ['L'],
          resultStatus: 'F',
        };
        expect(ORUParser.isAbnormalResult(result)).toBe(true);
      });

      it('should return true for A (abnormal)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '12345',
          observationName: 'Test',
          value: '100',
          abnormalFlags: ['A'],
          resultStatus: 'F',
        };
        expect(ORUParser.isAbnormalResult(result)).toBe(true);
      });

      it('should return true for < (below scale)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '12345',
          observationName: 'Test',
          value: '<0.1',
          abnormalFlags: ['<'],
          resultStatus: 'F',
        };
        expect(ORUParser.isAbnormalResult(result)).toBe(true);
      });

      it('should return true for > (above scale)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '12345',
          observationName: 'Test',
          value: '>1000',
          abnormalFlags: ['>'],
          resultStatus: 'F',
        };
        expect(ORUParser.isAbnormalResult(result)).toBe(true);
      });

      it('should return false for N (normal)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'NM',
          observationId: '6690-2',
          observationName: 'WBC',
          value: '8.5',
          abnormalFlags: ['N'],
          resultStatus: 'F',
        };
        expect(ORUParser.isAbnormalResult(result)).toBe(false);
      });

      it('should return false for S (susceptible)', () => {
        const result: ObservationResult = {
          setId: 1,
          valueType: 'ST',
          observationId: 'CULTURE',
          observationName: 'Culture',
          value: 'S',
          abnormalFlags: ['S'],
          resultStatus: 'F',
        };
        expect(ORUParser.isAbnormalResult(result)).toBe(false);
      });
    });

    describe('getAbnormalFlagDescription()', () => {
      it('should return description for H', () => {
        expect(ORUParser.getAbnormalFlagDescription('H')).toBe(
          'Above high normal'
        );
      });

      it('should return description for L', () => {
        expect(ORUParser.getAbnormalFlagDescription('L')).toBe(
          'Below low normal'
        );
      });

      it('should return description for HH', () => {
        expect(ORUParser.getAbnormalFlagDescription('HH')).toBe(
          'Above upper panic limits'
        );
      });

      it('should return description for LL', () => {
        expect(ORUParser.getAbnormalFlagDescription('LL')).toBe(
          'Below lower panic limits'
        );
      });

      it('should return description for microbiology flags', () => {
        expect(ORUParser.getAbnormalFlagDescription('S')).toBe(
          'Susceptible (microbiology)'
        );
        expect(ORUParser.getAbnormalFlagDescription('R')).toBe(
          'Resistant (microbiology)'
        );
        expect(ORUParser.getAbnormalFlagDescription('I')).toBe(
          'Intermediate (microbiology)'
        );
      });

      it('should return "Unknown" for unrecognized flag', () => {
        expect(ORUParser.getAbnormalFlagDescription('XYZ')).toBe('Unknown');
      });
    });

    describe('getResultStatusDescription()', () => {
      it('should return description for F (final)', () => {
        expect(ORUParser.getResultStatusDescription('F')).toBe('Final results');
      });

      it('should return description for P (preliminary)', () => {
        expect(ORUParser.getResultStatusDescription('P')).toBe('Preliminary');
      });

      it('should return description for C (corrected)', () => {
        expect(ORUParser.getResultStatusDescription('C')).toBe(
          'Corrected final'
        );
      });

      it('should return description for X (cannot obtain)', () => {
        expect(ORUParser.getResultStatusDescription('X')).toBe(
          'Cannot obtain results'
        );
      });

      it('should return "Unknown" for unrecognized status', () => {
        expect(ORUParser.getResultStatusDescription('Q')).toBe('Unknown');
      });
    });

    describe('validate()', () => {
      it('should return valid for proper ORU message', () => {
        const validation = ORUParser.validate(SAMPLE_ORU_CBC);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should fail if message does not start with MSH', () => {
        const validation = ORUParser.validate('PID|1||12345');
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain(
          'Message must start with MSH segment'
        );
      });

      it('should fail if PID segment is missing', () => {
        const validation = ORUParser.validate(
          `MSH|^~\\&|LAB|HOSP|EMR|CLI|20250119||ORU^R01|123|P|2.5
OBR|1||FIL001|CBC
OBX|1|NM|WBC||5.0`
        );
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Message must contain PID segment');
      });

      it('should fail if OBR segment is missing', () => {
        const validation = ORUParser.validate(
          `MSH|^~\\&|LAB|HOSP|EMR|CLI|20250119||ORU^R01|123|P|2.5
PID|1||12345
OBX|1|NM|WBC||5.0`
        );
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain(
          'Message must contain at least one OBR segment'
        );
      });

      it('should fail if OBX segment is missing', () => {
        const validation = ORUParser.validate(
          `MSH|^~\\&|LAB|HOSP|EMR|CLI|20250119||ORU^R01|123|P|2.5
PID|1||12345
OBR|1||FIL001|CBC`
        );
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain(
          'Message must contain at least one OBX segment'
        );
      });

      it('should fail if message type is not ORU', () => {
        const validation = ORUParser.validate(
          `MSH|^~\\&|ADT|HOSP|EMR|CLI|20250119||ADT^A01|123|P|2.5
PID|1||12345
OBR|1||FIL001|CBC
OBX|1|NM|WBC||5.0`
        );
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain(
          'Expected ORU message type, got ADT^A01'
        );
      });

      it('should collect multiple errors', () => {
        const validation = ORUParser.validate('INVALID');
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(1);
      });
    });

    describe('getMessageType()', () => {
      it('should extract ORU^R01 message type', () => {
        const type = ORUParser.getMessageType(SAMPLE_ORU_CBC);
        expect(type).toBe('ORU^R01');
      });

      it('should return null for invalid message', () => {
        expect(ORUParser.getMessageType('INVALID')).toBeNull();
      });

      it('should return null if MSH field count is insufficient', () => {
        expect(ORUParser.getMessageType('MSH|^~\\&|LAB')).toBeNull();
      });
    });
  });

  describe('convenience functions', () => {
    describe('createORUParser()', () => {
      it('should create new parser instance', () => {
        const newParser = createORUParser();
        expect(newParser).toBeInstanceOf(ORUParser);
      });
    });

    describe('parseORU()', () => {
      it('should parse ORU message without creating parser manually', () => {
        const result = parseORU(SAMPLE_ORU_CBC);
        expect(result.messageType).toBe('ORU');
        expect(result.orders).toHaveLength(1);
      });
    });
  });

  describe('constants', () => {
    describe('ABNORMAL_FLAGS', () => {
      it('should have all standard abnormal flags', () => {
        expect(ABNORMAL_FLAGS['H']).toBeDefined();
        expect(ABNORMAL_FLAGS['L']).toBeDefined();
        expect(ABNORMAL_FLAGS['HH']).toBeDefined();
        expect(ABNORMAL_FLAGS['LL']).toBeDefined();
        expect(ABNORMAL_FLAGS['A']).toBeDefined();
        expect(ABNORMAL_FLAGS['AA']).toBeDefined();
        expect(ABNORMAL_FLAGS['N']).toBeDefined();
      });

      it('should have microbiology flags', () => {
        expect(ABNORMAL_FLAGS['S']).toBeDefined();
        expect(ABNORMAL_FLAGS['R']).toBeDefined();
        expect(ABNORMAL_FLAGS['I']).toBeDefined();
      });
    });

    describe('RESULT_STATUS', () => {
      it('should have all standard result statuses', () => {
        expect(RESULT_STATUS['F']).toBeDefined();
        expect(RESULT_STATUS['P']).toBeDefined();
        expect(RESULT_STATUS['C']).toBeDefined();
        expect(RESULT_STATUS['X']).toBeDefined();
      });
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple orders in single message', () => {
      const multiOrderMsg = `MSH|^~\\&|LAB|HOSP|EMR|CLI|20250119120000||ORU^R01|MSG001|P|2.5
PID|1||MRN001|||Patient^Test||19800101|M
OBR|1||FIL001|CBC|||20250119
OBX|1|NM|WBC||8.5|10*3/uL|4.5-11.0|N|||F
OBX|2|NM|RBC||4.8|10*6/uL|4.5-5.5|N|||F
OBR|2||FIL002|CMP|||20250119
OBX|1|NM|Glucose||95|mg/dL|70-100|N|||F
OBX|2|NM|Creatinine||1.0|mg/dL|0.7-1.3|N|||F`;

      const result = parser.parse(multiOrderMsg);
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].results).toHaveLength(2);
      expect(result.orders[1].results).toHaveLength(2);
      expect(result.metadata.totalObservations).toBe(4);
    });

    it('should handle message with multiple abnormal flags per result', () => {
      const multiFlag = `MSH|^~\\&|LAB|HOSP|EMR|CLI|20250119||ORU^R01|MSG001|P|2.5
PID|1||MRN001|||Patient^Test||19800101|M
OBR|1||FIL001|TEST|||20250119
OBX|1|NM|TEST||500|mg/dL|70-100|H~A|||F`;

      const result = parser.parse(multiFlag);
      const obs = result.orders[0].results[0];
      expect(obs.abnormalFlags).toContain('H');
      expect(obs.abnormalFlags).toContain('A');
      expect(obs.abnormalFlags).toHaveLength(2);
    });

    it('should handle empty abnormal flags field', () => {
      const noFlags = `MSH|^~\\&|LAB|HOSP|EMR|CLI|20250119||ORU^R01|MSG001|P|2.5
PID|1||MRN001|||Patient^Test||19800101|M
OBR|1||FIL001|TEST|||20250119
OBX|1|NM|TEST||100|mg/dL|70-120||||F`;

      const result = parser.parse(noFlags);
      expect(result.orders[0].results[0].abnormalFlags).toEqual([]);
    });
  });

  describe('FHIR conversion', () => {
    describe('toFHIRBundle()', () => {
      it('should create FHIR Bundle with correct resourceType', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        expect(bundle.resourceType).toBe('Bundle');
        expect(bundle.type).toBe('collection');
      });

      it('should include timestamp in ISO format', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        expect(bundle.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('should create DiagnosticReport for each order', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const reports = bundle.entry.filter(
          (e) => e.resource.resourceType === 'DiagnosticReport'
        );
        expect(reports).toHaveLength(1);
      });

      it('should create Observation for each result', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const observations = bundle.entry.filter(
          (e) => e.resource.resourceType === 'Observation'
        );
        expect(observations).toHaveLength(6); // 6 results in CBC
      });

      it('should set correct subject reference', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-xyz');

        const report = bundle.entry.find(
          (e) => e.resource.resourceType === 'DiagnosticReport'
        )?.resource as any;

        expect(report.subject.reference).toBe('Patient/patient-xyz');
      });

      it('should include LOINC codes in Observations', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const observation = bundle.entry.find(
          (e) =>
            e.resource.resourceType === 'Observation' &&
            (e.resource as any).code.text === 'WBC'
        )?.resource as any;

        expect(observation.code.coding).toBeDefined();
        expect(observation.code.coding[0].system).toBe('http://loinc.org');
      });

      it('should include valueQuantity for numeric results', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const wbcObs = bundle.entry.find(
          (e) =>
            e.resource.resourceType === 'Observation' &&
            (e.resource as any).code.text === 'WBC'
        )?.resource as any;

        expect(wbcObs.valueQuantity).toBeDefined();
        expect(wbcObs.valueQuantity.value).toBe(8.5);
        expect(wbcObs.valueQuantity.unit).toBe('10*3/uL');
      });

      it('should include referenceRange', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const wbcObs = bundle.entry.find(
          (e) =>
            e.resource.resourceType === 'Observation' &&
            (e.resource as any).code.text === 'WBC'
        )?.resource as any;

        expect(wbcObs.referenceRange).toBeDefined();
        expect(wbcObs.referenceRange[0].text).toBe('4.5-11.0');
      });

      it('should include interpretation for abnormal results', () => {
        const parsed = parseORU(SAMPLE_ORU_ABNORMAL);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const glucoseObs = bundle.entry.find(
          (e) => e.resource.resourceType === 'Observation'
        )?.resource as any;

        expect(glucoseObs.interpretation).toBeDefined();
        expect(glucoseObs.interpretation[0].coding[0].code).toBe('HH');
      });

      it('should include conclusion for critical results', () => {
        const parsed = parseORU(SAMPLE_ORU_ABNORMAL);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const report = bundle.entry.find(
          (e) => e.resource.resourceType === 'DiagnosticReport'
        )?.resource as any;

        expect(report.conclusion).toContain('CRITICAL');
      });

      it('should include performer from sending facility', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const report = bundle.entry.find(
          (e) => e.resource.resourceType === 'DiagnosticReport'
        )?.resource as any;

        expect(report.performer).toBeDefined();
        expect(report.performer[0].display).toBe('HOSPITAL_LAB');
      });

      it('should link DiagnosticReport to Observations via result array', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const report = bundle.entry.find(
          (e) => e.resource.resourceType === 'DiagnosticReport'
        )?.resource as any;

        expect(report.result).toHaveLength(6);
        expect(report.result[0].reference).toMatch(/^Observation\//);
      });

      it('should set correct status for final results', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const report = bundle.entry.find(
          (e) => e.resource.resourceType === 'DiagnosticReport'
        )?.resource as any;

        expect(report.status).toBe('final');
      });

      it('should include laboratory category', () => {
        const parsed = parseORU(SAMPLE_ORU_CBC);
        const bundle = toFHIRBundle(parsed, 'patient-123');

        const observation = bundle.entry.find(
          (e) => e.resource.resourceType === 'Observation'
        )?.resource as any;

        expect(observation.category[0].coding[0].code).toBe('laboratory');
      });
    });
  });
});
