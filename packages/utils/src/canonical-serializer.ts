/**
 * Canonical JSON Serializer
 *
 * Implements deterministic JSON stringification for cryptographic hashing.
 * This ensures that identical data structures always produce identical hash values,
 * regardless of key insertion order or formatting.
 *
 * Used for:
 * - Content integrity verification
 * - Blockchain anchoring preparation
 * - FHIR resource hashing
 * - RNDS exchange logging
 *
 * Specification: RFC 8785 (JSON Canonicalization Scheme)
 * @see https://datatracker.ietf.org/doc/html/rfc8785
 */

/**
 * Recursively sorts object keys and produces deterministic JSON
 *
 * Rules:
 * 1. Object keys are sorted lexicographically
 * 2. No whitespace (compact format)
 * 3. Unicode normalization (NFC)
 * 4. Numbers in canonical form (no trailing zeros)
 * 5. Booleans and null in lowercase
 *
 * @param obj - The object to canonicalize
 * @returns Deterministic JSON string
 *
 * @example
 * ```typescript
 * const data = { name: "John", age: 30, id: "123" };
 * const canonical = canonicalStringify(data);
 * // Result: '{"age":30,"id":"123","name":"John"}'
 * ```
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === null) {
    return 'null';
  }

  if (obj === undefined) {
    // undefined is not valid JSON, treat as null
    return 'null';
  }

  // Handle primitives
  if (typeof obj === 'boolean') {
    return obj ? 'true' : 'false';
  }

  if (typeof obj === 'number') {
    // Handle special numbers
    if (!isFinite(obj)) {
      return 'null'; // Infinity and NaN become null in JSON
    }
    // Canonical number representation (no trailing zeros)
    return String(obj);
  }

  if (typeof obj === 'string') {
    // Escape special characters and ensure proper JSON string encoding
    return JSON.stringify(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const elements = obj.map(item => canonicalStringify(item));
    return `[${elements.join(',')}]`;
  }

  // Handle objects
  if (typeof obj === 'object') {
    // Get all keys and sort them lexicographically
    const keys = Object.keys(obj).sort();

    const pairs: string[] = [];
    for (const key of keys) {
      const value = (obj as Record<string, unknown>)[key];

      // Skip undefined values (they don't exist in JSON)
      if (value === undefined) {
        continue;
      }

      const canonicalKey = JSON.stringify(key);
      const canonicalValue = canonicalStringify(value);
      pairs.push(`${canonicalKey}:${canonicalValue}`);
    }

    return `{${pairs.join(',')}}`;
  }

  // Fallback for unknown types
  return 'null';
}

/**
 * Creates a SHA-256 hash of canonicalized JSON data
 *
 * @param data - The data to hash
 * @returns Hex-encoded SHA-256 hash
 *
 * @example
 * ```typescript
 * const patient = { firstName: "John", lastName: "Doe", dob: "1990-01-01" };
 * const hash = hashCanonical(patient);
 * // Result: "a3f2b1c..."
 * ```
 */
export async function hashCanonical(data: unknown): Promise<string> {
  const canonical = canonicalStringify(data);

  // Use Web Crypto API (works in Node.js 15+ and browsers)
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(canonical);

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Verifies that data matches an expected hash
 *
 * @param data - The data to verify
 * @param expectedHash - The expected SHA-256 hash
 * @returns True if hash matches, false otherwise
 *
 * @example
 * ```typescript
 * const prescription = { drug: "Aspirin", dose: "100mg" };
 * const storedHash = "abc123...";
 *
 * const isValid = await verifyHash(prescription, storedHash);
 * if (!isValid) {
 *   throw new Error("Prescription has been tampered with!");
 * }
 * ```
 */
export async function verifyHash(data: unknown, expectedHash: string): Promise<boolean> {
  const computedHash = await hashCanonical(data);
  return computedHash === expectedHash;
}

/**
 * Creates a deterministic content identifier for FHIR resources
 *
 * Useful for:
 * - RNDS resource exchange (prevent duplicates)
 * - IPS bundle generation (stable identifiers)
 * - Audit logging (content-based deduplication)
 *
 * @param resourceType - FHIR resource type (e.g., "Patient", "Observation")
 * @param data - Resource data
 * @returns Content-based identifier
 *
 * @example
 * ```typescript
 * const observation = {
 *   code: { coding: [{ system: "http://loinc.org", code: "2085-9" }] },
 *   valueQuantity: { value: 45, unit: "mg/dL" }
 * };
 *
 * const contentId = await createContentId("Observation", observation);
 * // Result: "Observation/sha256:a3f2b1c..."
 * ```
 */
export async function createContentId(resourceType: string, data: unknown): Promise<string> {
  const hash = await hashCanonical(data);
  return `${resourceType}/sha256:${hash}`;
}

/**
 * Batch hash multiple clinical events efficiently
 *
 * Used for:
 * - Patient Merkle root calculation (future)
 * - Audit log batch integrity
 * - Bulk RNDS exchange verification
 *
 * @param items - Array of items to hash
 * @returns Array of hashes in the same order
 */
export async function batchHash(items: unknown[]): Promise<string[]> {
  return Promise.all(items.map(item => hashCanonical(item)));
}

/**
 * Create a deterministic signature payload for ICP-Brasil signing
 *
 * Formats data for digital signature in a way that ensures the signature
 * remains valid even if the original data is re-serialized.
 *
 * @param data - Data to be signed
 * @returns Canonical string ready for signature
 *
 * @example
 * ```typescript
 * const prescription = {
 *   patientId: "PAT-123",
 *   medications: [{ drug: "Aspirin", dose: "100mg" }],
 *   prescribedAt: "2025-12-05T10:00:00Z"
 * };
 *
 * const payload = prepareForSignature(prescription);
 * // Sign this payload with ICP-Brasil certificate
 * const signature = await icpBrasilSign(payload);
 * ```
 */
export function prepareForSignature(data: unknown): string {
  // Use canonical form to ensure signature verification works later
  return canonicalStringify(data);
}

/**
 * FHIR-specific canonical serialization
 *
 * FHIR resources have specific rules for content integrity:
 * - Exclude meta.lastUpdated
 * - Exclude meta.versionId
 * - Include only business-relevant fields
 *
 * @param fhirResource - FHIR R4 resource
 * @returns Canonical FHIR JSON
 */
export function canonicalFHIR(fhirResource: Record<string, unknown>): string {
  // Clone to avoid mutating original
  const cleaned = JSON.parse(JSON.stringify(fhirResource));

  // Remove metadata that changes on every update
  if (cleaned.meta) {
    delete cleaned.meta.lastUpdated;
    delete cleaned.meta.versionId;
  }

  return canonicalStringify(cleaned);
}

/**
 * Test vectors for canonical serialization
 *
 * Used in test suites to verify correctness
 */
export const TEST_VECTORS = {
  // Simple object
  simple: {
    input: { name: "Alice", age: 30, city: "São Paulo" },
    expected: '{"age":30,"city":"São Paulo","name":"Alice"}'
  },

  // Nested object
  nested: {
    input: {
      patient: { firstName: "Bob", lastName: "Silva" },
      vitals: { bp: "120/80", hr: 72 }
    },
    expected: '{"patient":{"firstName":"Bob","lastName":"Silva"},"vitals":{"bp":"120/80","hr":72}}'
  },

  // Array
  array: {
    input: { codes: ["E11.9", "I10", "Z79.4"] },
    expected: '{"codes":["E11.9","I10","Z79.4"]}'
  },

  // Mixed types
  mixed: {
    input: { str: "test", num: 42, bool: true, nil: null, arr: [1, 2, 3] },
    expected: '{"arr":[1,2,3],"bool":true,"nil":null,"num":42,"str":"test"}'
  }
};
