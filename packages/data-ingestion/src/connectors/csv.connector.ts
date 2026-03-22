/**
 * CSV / Excel Connector
 *
 * Handles flat-file lab exports, device CSVs, legacy EHR exports.
 * The column mapping in SourceConfig drives all field extraction —
 * no hardcoded column names, fully configurable per source.
 */

import { BaseConnector } from './base.connector';
import type {
  CanonicalHealthRecord,
  CanonicalLabResult,
  CanonicalVitalSign,
  CanonicalSupplyChainItem,
  CsvSourceConfig,
  DataSource,
  ValidationResult,
} from '../types';
import { validateCanonical } from '../validators/canonical.validator';

export class CsvConnector extends BaseConnector {
  private config: CsvSourceConfig;
  private rawFileContent: string;

  /**
   * @param source     DataSource config
   * @param csvContent Raw CSV string (caller is responsible for reading file)
   */
  constructor(source: DataSource, csvContent: string) {
    super(source);
    if (source.config.kind !== 'CSV' && source.config.kind !== 'EXCEL') {
      throw new Error('CsvConnector requires a CSV or EXCEL source config');
    }
    this.config = source.config as CsvSourceConfig;
    this.rawFileContent = csvContent;
  }

  protected async fetchRaw(): Promise<Record<string, string>[]> {
    return this.parseCsv(this.rawFileContent);
  }

  protected normalize(raw: unknown, _index: number): CanonicalHealthRecord {
    const row = raw as Record<string, string>;

    // Infer record type from mapped fields
    const mapped = this.applyColumnMapping(row);

    // Try to detect record type from mapped field names
    if (mapped['loincCode'] || mapped['testName'] || mapped['referenceRangeLow']) {
      return this.normalizeLabResult(mapped, row);
    }
    if (mapped['vitalType'] || mapped['vitalTypeCode']) {
      return this.normalizeVitalSign(mapped, row);
    }
    if (mapped['itemId'] || mapped['facilityId'] || mapped['transactionType']) {
      return this.normalizeSupplyChainItem(mapped, row);
    }

    // Default to lab result if ambiguous (most common CSV export type)
    return this.normalizeLabResult(mapped, row);
  }

  private normalizeLabResult(
    mapped: Record<string, string>,
    raw: unknown,
  ): CanonicalHealthRecord {
    const value = mapped['value'] ?? '';
    const numericValue = parseFloat(value);

    const payload: CanonicalLabResult = {
      kind: 'LAB_RESULT',
      testName: mapped['testName'] ?? 'Unknown',
      loincCode: mapped['loincCode'],
      value: isNaN(numericValue) ? value : numericValue,
      unit: mapped['unit'] ?? '',
      referenceRangeLow: mapped['referenceRangeLow'] ? parseFloat(mapped['referenceRangeLow']) : undefined,
      referenceRangeHigh: mapped['referenceRangeHigh'] ? parseFloat(mapped['referenceRangeHigh']) : undefined,
      interpretation: this.interpretValue(numericValue, mapped),
      resultedAt: mapped['resultedAt'] ? this.parseDate(mapped['resultedAt']) : undefined,
      specimenCollectedAt: mapped['specimenCollectedAt'] ? this.parseDate(mapped['specimenCollectedAt']) : undefined,
      performingLabName: mapped['labName'],
      note: mapped['note'],
    };

    const base = this.buildBaseRecord(raw, 'LAB_RESULT');
    const validation = validateCanonical(payload);
    return { ...base, payload, validation };
  }

  private normalizeVitalSign(
    mapped: Record<string, string>,
    raw: unknown,
  ): CanonicalHealthRecord {
    const payload: CanonicalVitalSign = {
      kind: 'VITAL_SIGN',
      vitalType: (mapped['vitalType'] as CanonicalVitalSign['vitalType']) ?? 'OTHER',
      value: parseFloat(mapped['value'] ?? '0'),
      secondaryValue: mapped['secondaryValue'] ? parseFloat(mapped['secondaryValue']) : undefined,
      unit: mapped['unit'] ?? '',
      loincCode: mapped['loincCode'],
      measuredAt: mapped['measuredAt'] ? this.parseDate(mapped['measuredAt']) : new Date(),
      deviceId: mapped['deviceId'],
    };

    const base = this.buildBaseRecord(raw, 'VITAL_SIGN');
    const validation = validateCanonical(payload);
    return { ...base, payload, validation };
  }

  private normalizeSupplyChainItem(
    mapped: Record<string, string>,
    raw: unknown,
  ): CanonicalHealthRecord {
    const payload: CanonicalSupplyChainItem = {
      kind: 'SUPPLY_CHAIN_ITEM',
      itemId: mapped['itemId'] ?? 'UNKNOWN',
      itemName: mapped['itemName'] ?? 'Unknown',
      category: mapped['category'] ?? '',
      quantity: parseFloat(mapped['quantity'] ?? '0'),
      unit: mapped['unit'] ?? 'units',
      facilityId: mapped['facilityId'] ?? '',
      transactionType: (mapped['transactionType'] as CanonicalSupplyChainItem['transactionType']) ?? 'RECEIVED',
      transactionAt: mapped['transactionAt'] ? this.parseDate(mapped['transactionAt']) : new Date(),
      batchNumber: mapped['batchNumber'],
      expiresAt: mapped['expiresAt'] ? this.parseDate(mapped['expiresAt']) : undefined,
      costUsd: mapped['costUsd'] ? parseFloat(mapped['costUsd']) : undefined,
    };

    const base = this.buildBaseRecord(raw, 'SUPPLY_CHAIN_ITEM');
    const validation = validateCanonical(payload);
    return { ...base, payload, validation };
  }

  // ─── CSV Parsing ──────────────────────────────────────────────────────────

  private parseCsv(content: string): Record<string, string>[] {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const delimiter = this.config.delimiter ?? ',';
    const headers = this.config.hasHeader
      ? this.splitLine(lines[0], delimiter)
      : [];

    const dataLines = this.config.hasHeader ? lines.slice(1) : lines;

    return dataLines.map((line, i) => {
      const values = this.splitLine(line, delimiter);
      const row: Record<string, string> = {};
      if (headers.length > 0) {
        headers.forEach((header, idx) => {
          row[header.trim()] = (values[idx] ?? '').trim();
        });
      } else {
        values.forEach((val, idx) => {
          row[`col_${idx}`] = val.trim();
        });
      }
      return row;
    });
  }

  private splitLine(line: string, delimiter: string): string[] {
    // Handle quoted fields (CSV spec)
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /** Apply the user-configured column mapping */
  private applyColumnMapping(row: Record<string, string>): Record<string, string> {
    const mapping = this.config.columnMapping;
    const mapped: Record<string, string> = {};
    for (const [sourceCol, canonicalField] of Object.entries(mapping)) {
      if (row[sourceCol] !== undefined) {
        mapped[canonicalField] = row[sourceCol];
      }
    }
    return mapped;
  }

  private interpretValue(
    value: number,
    mapped: Record<string, string>,
  ): CanonicalLabResult['interpretation'] {
    const low = parseFloat(mapped['referenceRangeLow'] ?? '');
    const high = parseFloat(mapped['referenceRangeHigh'] ?? '');
    if (isNaN(value) || isNaN(low) || isNaN(high)) return 'INDETERMINATE';
    if (value < low || value > high) return 'ABNORMAL';
    return 'NORMAL';
  }

  private parseDate(str: string): Date {
    // Try multiple common date formats
    const formats = [
      str, // ISO 8601
      str.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'), // DD/MM/YYYY
      str.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1'), // DD-MM-YYYY
    ];
    for (const fmt of formats) {
      const d = new Date(fmt);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }
}
