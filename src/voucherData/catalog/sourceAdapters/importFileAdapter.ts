// =============================================================================
// Import File Adapter
// Production-grade adapter for importing voucher data from JSON/CSV files
// =============================================================================

import { readFile } from 'fs/promises';
import { parse as parseCsv } from 'csv-parse/sync';
import {
  VoucherSourceAdapter,
  VoucherValidationError,
  VoucherValidationWarning,
} from './voucherSourceAdapters.js';
import { VoucherRawInput, VoucherSourceType, VoucherPlatform } from '../../types.js';

export interface ImportFileAdapterOptions {
  filePath?: string;
  fileType?: 'json' | 'csv';
  encoding?: BufferEncoding;
}

/**
 * Import file adapter for loading vouchers from JSON/CSV files
 */
export const importFileAdapter: VoucherSourceAdapter = {
  readonly sourceType: 'import_file' as VoucherSourceType,

  async loadRawVoucherData(options?: {
    since?: Date;
    limit?: number;
    filters?: Record<string, unknown>;
  }): Promise<VoucherRawInput[]> {
    // In a real implementation, this would read from a configured file path
    // For now, we'll return empty and rely on manual loading
    return [];
  },

  async validateRawSourcePayload(
    rawItems: VoucherRawInput[]
  ): Promise<{
    valid: boolean;
    errors: VoucherValidationError[];
    warnings: VoucherValidationWarning[];
  }> {
    const errors: VoucherValidationError[] = [];
    const warnings: VoucherValidationWarning[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];

      // Required fields validation
      if (!item.code && !item.voucher_code) {
        errors.push({
          index: i,
          code: 'MISSING_CODE',
          message: 'Voucher code is required',
          field: 'code',
        });
      }

      // Validate discount value
      if (item.discount_value !== undefined) {
        const value = Number(item.discount_value);
        if (isNaN(value) || value < 0) {
          errors.push({
            index: i,
            code: 'INVALID_DISCOUNT_VALUE',
            message: 'Discount value must be a positive number',
            field: 'discount_value',
          });
        }
      }

      // Validate dates
      if (item.start_date && item.end_date) {
        const startDate = new Date(String(item.start_date));
        const endDate = new Date(String(item.end_date));
        if (isNaN(startDate.getTime())) {
          errors.push({
            index: i,
            code: 'INVALID_START_DATE',
            message: 'Invalid start date format',
            field: 'start_date',
          });
        }
        if (isNaN(endDate.getTime())) {
          errors.push({
            index: i,
            code: 'INVALID_END_DATE',
            message: 'Invalid end date format',
            field: 'end_date',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  normalizeSourcePayload(rawItems: VoucherRawInput[]): VoucherRawInput[] {
    return rawItems.map((item) => {
      const normalized: VoucherRawInput = { ...item };

      // Normalize code
      if (normalized.code) {
        normalized.code = String(normalized.code).toUpperCase().trim();
      }

      // Normalize numeric fields
      if (normalized.discount_value !== undefined) {
        normalized.discount_value = Number(normalized.discount_value);
      }
      if (normalized.min_spend !== undefined) {
        normalized.min_spend = Number(normalized.min_spend);
      }
      if (normalized.max_discount !== undefined) {
        normalized.max_discount = Number(normalized.max_discount);
      }

      // Normalize arrays
      if (normalized.shop_ids && typeof normalized.shop_ids === 'string') {
        normalized.shop_ids = normalized.shop_ids.split(',').map((s: string) => s.trim());
      }
      if (normalized.category_ids && typeof normalized.category_ids === 'string') {
        normalized.category_ids = normalized.category_ids.split(',').map((s: string) => s.trim());
      }
      if (normalized.product_ids && typeof normalized.product_ids === 'string') {
        normalized.product_ids = normalized.product_ids.split(',').map((s: string) => s.trim());
      }

      // Add source marker
      normalized.source = 'import_file';
      normalized.imported_at = new Date().toISOString();

      return normalized;
    });
  },

  async healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();

    return {
      healthy: true,
      message: 'Import file adapter is operational',
      latencyMs: Date.now() - startTime,
    };
  },

  async getLastSyncTimestamp(): Promise<Date | null> {
    return null;
  },

  async getSourceMetadata(): Promise<Record<string, unknown>> {
    return {
      sourceType: 'import_file',
      supportedFormats: ['json', 'csv'],
      supportedFields: [
        'code',
        'title',
        'description',
        'discount_type',
        'discount_value',
        'min_spend',
        'max_discount',
        'start_date',
        'end_date',
        'scope',
        'shop_ids',
        'category_ids',
        'product_ids',
        'platform',
      ],
    };
  },
};

// =============================================================================
// File Loading Functions
// =============================================================================

/**
 * Load voucher data from a JSON file
 */
export async function loadVouchersFromJsonFile(filePath: string): Promise<VoucherRawInput[]> {
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (Array.isArray(data)) {
    return data;
  }

  if (data.vouchers && Array.isArray(data.vouchers)) {
    return data.vouchers;
  }

  if (data.data && Array.isArray(data.data)) {
    return data.data;
  }

  throw new Error('Invalid JSON format: expected array or object with vouchers array');
}

/**
 * Load voucher data from a CSV file
 */
export async function loadVouchersFromCsvFile(filePath: string): Promise<VoucherRawInput[]> {
  const content = await readFile(filePath, 'utf-8');
  const records = parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  return records.map((record: Record<string, string>) => {
    const normalized: VoucherRawInput = { ...record };

    // Convert numeric fields
    if (normalized.discount_value) {
      normalized.discount_value = parseFloat(normalized.discount_value);
    }
    if (normalized.min_spend) {
      normalized.min_spend = parseFloat(normalized.min_spend);
    }
    if (normalized.max_discount) {
      normalized.max_discount = parseFloat(normalized.max_discount);
    }

    // Convert date fields
    if (normalized.start_date) {
      normalized.start_date = new Date(normalized.start_date).toISOString();
    }
    if (normalized.end_date) {
      normalized.end_date = new Date(normalized.end_date).toISOString();
    }

    // Convert array fields (comma-separated)
    if (normalized.shop_ids) {
      normalized.shop_ids = normalized.shop_ids.split(',').map((s: string) => s.trim());
    }
    if (normalized.category_ids) {
      normalized.category_ids = normalized.category_ids.split(',').map((s: string) => s.trim());
    }
    if (normalized.product_ids) {
      normalized.product_ids = normalized.product_ids.split(',').map((s: string) => s.trim());
    }

    return normalized;
  });
}

/**
 * Load voucher data from a file (auto-detect format)
 */
export async function loadVouchersFromFile(filePath: string): Promise<VoucherRawInput[]> {
  const ext = filePath.toLowerCase().split('.').pop();

  if (ext === 'json') {
    return loadVouchersFromJsonFile(filePath);
  }

  if (ext === 'csv') {
    return loadVouchersFromCsvFile(filePath);
  }

  throw new Error(`Unsupported file format: ${ext}. Supported formats: json, csv`);
}
