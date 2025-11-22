/**
 * Type declarations for simple-hl7
 * Package doesn't have official TypeScript types
 */

declare module 'simple-hl7' {
  export class Parser {
    parse(message: string): Message;
  }

  export class Message {
    segments: Segment[];
    getSegment(name: string): Segment | null;
  }

  export class Segment {
    name: string;
    fields: Field[];
    parsed: {
      parsed: string[];
      raw: string;
    };
    getField(index: number): Field | null;
  }

  export class Field {
    value: string;
    getComponent(index: number): Field | null;
  }
}
