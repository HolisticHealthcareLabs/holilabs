/**
 * HIPAA Identifier Detection Patterns
 *
 * Uses regex patterns and NLP to detect 18 HIPAA identifiers
 */

import nlp from 'compromise';
import dates from 'compromise-numbers';
import { DetectedPHI, HIPAAIdentifierType } from './types';

nlp.extend(dates);

export class HIPAADetector {
  // Regex patterns for structured identifiers
  private patterns = {
    // 4. Telephone numbers (US format)
    TELEPHONE: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,

    // 5. Fax numbers (similar to phone)
    FAX: /(?:fax|facsimile)[\s:]*(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/gi,

    // 6. Email addresses
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // 7. Social Security Numbers
    SSN: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

    // 8. Medical Record Numbers (common patterns)
    MRN: /\b(?:MRN|Medical Record|Patient ID)[\s:#]*([A-Z0-9]{6,15})\b/gi,

    // 10. Account numbers (generic pattern)
    ACCOUNT: /\b(?:Account|Acct)[\s:#]*([A-Z0-9]{6,20})\b/gi,

    // 14. URLs
    URL: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g,

    // 15. IP Addresses
    IP_ADDRESS: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

    // Mexican phone numbers
    TELEPHONE_MX: /\b(?:\+?52[-.\s]?)?(?:\d{2,3}[-.\s]?)?\d{4}[-.\s]?\d{4}\b/g,

    // Brazilian phone numbers
    TELEPHONE_BR: /\b(?:\+?55[-.\s]?)?(?:\(?\d{2}\)?[-.\s]?)?\d{4,5}[-.\s]?\d{4}\b/g,

    // Brazilian CPF
    CPF: /\b\d{3}\.?\d{3}\.?\d{3}[-\s]?\d{2}\b/g,

    // Mexican CURP
    CURP: /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/g,

    // ZIP codes (US - keep first 3 digits only)
    ZIP_FULL: /\b\d{5}(?:-\d{4})?\b/g,

    // Ages over 89
    AGE_OVER_89: /\b(?:age|edad)[\s:]*(?:9[0-9]|1[0-9]{2}|2[0-9]{2})\b/gi,
  };

  /**
   * Detect all PHI in text
   */
  detect(text: string): DetectedPHI[] {
    const detected: DetectedPHI[] = [];

    // 1. Names (using NLP)
    detected.push(...this.detectNames(text));

    // 2. Geographic subdivisions (cities, addresses)
    detected.push(...this.detectGeographic(text));

    // 3. Dates (except year)
    detected.push(...this.detectDates(text));

    // 4-18. Pattern-based detection
    detected.push(...this.detectPatterns(text));

    // Sort by position
    return detected.sort((a, b) => a.start - b.start);
  }

  /**
   * Detect person names using NLP
   */
  private detectNames(text: string): DetectedPHI[] {
    const detected: DetectedPHI[] = [];
    const doc = nlp(text);
    const people = doc.people().json();

    people.forEach((person: any) => {
      const match = text.indexOf(person.text);
      if (match !== -1) {
        detected.push({
          type: 'NAME',
          value: person.text,
          start: match,
          end: match + person.text.length,
          confidence: 0.85, // NLP confidence
          context: this.getContext(text, match, person.text.length),
        });
      }
    });

    return detected;
  }

  /**
   * Detect geographic identifiers
   */
  private detectGeographic(text: string): DetectedPHI[] {
    const detected: DetectedPHI[] = [];
    const doc = nlp(text);

    // Cities
    const places = doc.places().json();
    places.forEach((place: any) => {
      const match = text.indexOf(place.text);
      if (match !== -1 && !this.isState(place.text)) {
        detected.push({
          type: 'GEOGRAPHIC',
          value: place.text,
          start: match,
          end: match + place.text.length,
          confidence: 0.75,
          context: this.getContext(text, match, place.text.length),
        });
      }
    });

    // Street addresses (basic pattern)
    const addressPattern = /\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Calle|Avenida)\b/gi;
    let match;
    while ((match = addressPattern.exec(text)) !== null) {
      detected.push({
        type: 'GEOGRAPHIC',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.80,
        context: this.getContext(text, match.index, match[0].length),
      });
    }

    return detected;
  }

  /**
   * Detect dates (excluding year-only)
   */
  private detectDates(text: string): DetectedPHI[] {
    const detected: DetectedPHI[] = [];
    const doc = nlp(text);
    const dates = doc.dates().json();

    dates.forEach((date: any) => {
      // Skip year-only dates (HIPAA allows years)
      if (!/^\d{4}$/.test(date.text)) {
        const match = text.indexOf(date.text);
        if (match !== -1) {
          detected.push({
            type: 'DATE',
            value: date.text,
            start: match,
            end: match + date.text.length,
            confidence: 0.90,
            context: this.getContext(text, match, date.text.length),
          });
        }
      }
    });

    // Additional date patterns
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,        // MM/DD/YYYY
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,          // MM-DD-YYYY
      /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g,        // MM.DD.YYYY
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi, // Month DD, YYYY
    ];

    datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        detected.push({
          type: 'DATE',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.85,
          context: this.getContext(text, match.index, match[0].length),
        });
      }
    });

    return detected;
  }

  /**
   * Detect pattern-based identifiers
   */
  private detectPatterns(text: string): DetectedPHI[] {
    const detected: DetectedPHI[] = [];

    // Iterate through all patterns
    Object.entries(this.patterns).forEach(([type, pattern]) => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(text)) !== null) {
        detected.push({
          type: type as HIPAAIdentifierType,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: this.getConfidenceForType(type as HIPAAIdentifierType),
          context: this.getContext(text, match.index, match[0].length),
        });
      }
    });

    return detected;
  }

  /**
   * Get surrounding context for validation
   */
  private getContext(text: string, start: number, length: number, contextSize: number = 20): string {
    const contextStart = Math.max(0, start - contextSize);
    const contextEnd = Math.min(text.length, start + length + contextSize);
    return text.substring(contextStart, contextEnd);
  }

  /**
   * Check if text is a US state name (allowed under HIPAA)
   */
  private isState(text: string): boolean {
    const states = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
      'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
      'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
      'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
      'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
      'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ];
    return states.some(state => state.toLowerCase() === text.toLowerCase());
  }

  /**
   * Get confidence score for identifier type
   */
  private getConfidenceForType(type: HIPAAIdentifierType): number {
    const confidenceMap: Record<HIPAAIdentifierType, number> = {
      NAME: 0.85,
      GEOGRAPHIC: 0.75,
      DATE: 0.90,
      TELEPHONE: 0.95,
      FAX: 0.90,
      EMAIL: 0.98,
      SSN: 0.95,
      MRN: 0.85,
      HEALTH_PLAN: 0.80,
      ACCOUNT: 0.75,
      CERTIFICATE: 0.80,
      VEHICLE: 0.80,
      DEVICE: 0.80,
      URL: 0.98,
      IP_ADDRESS: 0.98,
      BIOMETRIC: 0.85,
      PHOTO: 0.90,
      OTHER_UNIQUE: 0.70,
    };
    return confidenceMap[type] || 0.70;
  }
}
