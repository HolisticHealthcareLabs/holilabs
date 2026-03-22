/**
 * Generic REST API Connector
 *
 * Pulls data from any HTTP endpoint using configurable field mapping.
 * Supports polling (for periodic sync) and webhook (for push-based sources).
 * JSONPath expressions extract fields from nested response objects.
 */

import { BaseConnector } from './base.connector';
import type {
  CanonicalHealthRecord,
  CanonicalLabResult,
  CanonicalVitalSign,
  DataSource,
  RestApiSourceConfig,
} from '../types';
import { validateCanonical } from '../validators/canonical.validator';

export class RestApiConnector extends BaseConnector {
  private config: RestApiSourceConfig;

  constructor(source: DataSource) {
    super(source);
    if (source.config.kind !== 'REST_API') {
      throw new Error('RestApiConnector requires a REST_API source config');
    }
    this.config = source.config as RestApiSourceConfig;
  }

  protected async fetchRaw(): Promise<unknown[]> {
    const response = await fetch(this.config.baseUrl, {
      method: this.config.method,
      headers: this.config.headers ?? {},
    });

    if (!response.ok) {
      throw new Error(`REST fetch failed: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as Record<string, unknown>;

    // If body is an array, use it directly; if object with data/items/results, extract
    if (Array.isArray(body)) return body as unknown[];
    if (Array.isArray(body['data'])) return body['data'] as unknown[];
    if (Array.isArray(body['items'])) return body['items'] as unknown[];
    if (Array.isArray(body['results'])) return body['results'] as unknown[];
    if (Array.isArray(body['entries'])) return body['entries'] as unknown[];

    // Single object — wrap in array
    return [body];
  }

  protected normalize(raw: unknown, _index: number): CanonicalHealthRecord {
    const obj = raw as Record<string, unknown>;
    const mapped = this.applyFieldMapping(obj);

    // Infer record type from mapped fields
    if (mapped['vitalType']) {
      const payload: CanonicalVitalSign = {
        kind: 'VITAL_SIGN',
        vitalType: (mapped['vitalType'] as CanonicalVitalSign['vitalType']) ?? 'OTHER',
        value: parseFloat(String(mapped['value'] ?? 0)),
        unit: String(mapped['unit'] ?? ''),
        measuredAt: mapped['measuredAt'] ? new Date(String(mapped['measuredAt'])) : new Date(),
        deviceId: mapped['deviceId'] ? String(mapped['deviceId']) : undefined,
      };
      const base = this.buildBaseRecord(raw, 'VITAL_SIGN');
      return { ...base, payload, validation: validateCanonical(payload) };
    }

    // Default: lab result
    const value = mapped['value'] ?? '';
    const numericValue = parseFloat(String(value));

    const payload: CanonicalLabResult = {
      kind: 'LAB_RESULT',
      testName: String(mapped['testName'] ?? 'Unknown'),
      loincCode: mapped['loincCode'] ? String(mapped['loincCode']) : undefined,
      value: isNaN(numericValue) ? String(value) : numericValue,
      unit: String(mapped['unit'] ?? ''),
      resultedAt: mapped['resultedAt'] ? new Date(String(mapped['resultedAt'])) : undefined,
    };

    const base = this.buildBaseRecord(raw, 'LAB_RESULT');
    return { ...base, payload, validation: validateCanonical(payload) };
  }

  /**
   * Apply JSONPath-style field mapping.
   * Simple dot-notation supported: "result.value" → obj.result.value
   */
  private applyFieldMapping(obj: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [jsonPath, canonicalField] of Object.entries(this.config.fieldMapping)) {
      mapped[canonicalField] = this.extractByPath(obj, jsonPath);
    }
    return mapped;
  }

  private extractByPath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }
}
