/**
 * Type declarations for dcmjs
 * Package doesn't have official TypeScript types
 */

declare module 'dcmjs' {
  export namespace data {
    export class DicomMessage {
      dict: Record<string, any>;
      static readFile(arrayBuffer: ArrayBuffer): DicomMessage;
    }

    export class DicomMetaDictionary {
      static naturalizeDataset(dict: Record<string, any>): Record<string, any>;
    }
  }
}
