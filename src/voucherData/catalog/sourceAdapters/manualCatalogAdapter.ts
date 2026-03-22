// =============================================================================
// Manual Catalog Adapter
// Production-grade adapter for manually entered voucher data
// =============================================================================

import {
  VoucherSourceAdapter,
  VoucherSourceAdapterOptions,
  VoucherValidationError,
  VoucherValidationWarning,
} from './voucherSourceAdapters.js';
import { VoucherRawInput, VoucherSourceType, VoucherPlatform } from '../../types.js';

// In-memory storage for manual entries (in production, this would be in database)
const manualVoucherStore: VoucherRawInput[] = [];
let lastSyncTimestamp: Date | null = null;

/**
 * Manual catalog adapter for hand-entered voucher data
 */
export const manualCatalogAdapter: VoucherSourceAdapter = {
  readonly sourceType: 'manual' as VoucherSourceType,

  async loadRawVoucherData(options?: {
    since?: Date;
    limit?: number;
    filters?: Record<string, unknown>;
  }): Promise<VoucherRawInput[]> {
    let vouchers = [...manualVoucherStore];

    // Apply filters
    if (options?.filters) {
      vouchers = vouchers.filter((v) => {
        for (const [key, value] of Object.entries(options.filters!)) {
          if (v[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    // Apply since filter
    if (options?.since) {
      vouchers = vouchers.filter((v) => {
        const createdAt = v.created_at || v.createdAt;
        if (!createdAt) return false;
        return new Date(createdAt) >= options.since!;
      });
    }

    // Apply limit
    if (options?.limit) {
      vouchers = vouchers.slice(0, options.limit);
    }

    lastSyncTimestamp = new Date();

    return vouchers;
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

      // Validate discount type
      if (item.discount_type && !['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y', 'other'].includes(String(item.discount_type).toLowerCase())) {
        errors.push({
          index: i,
          code: 'INVALID_DISCOUNT_TYPE',
          message: `Invalid discount type: ${item.discount_type}`,
          field: 'discount_type',
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

        if (String(item.discount_type).toLowerCase() === 'percentage' && value > 100) {
          warnings.push({
            index: i,
            code: 'HIGH_PERCENTAGE',
            message: 'Percentage discount exceeds 100%',
            field: 'discount_value',
          });
        }
      }

      // Validate date range
      if (item.start_date && item.end_date) {
        const startDate = new Date(String(item.start_date));
        const endDate = new Date(String(item.end_date));
        if (endDate < startDate) {
          errors.push({
            index: i,
            code: 'INVALID_DATE_RANGE',
            message: 'End date must be after start date',
            field: 'end_date',
          });
        }
      }

      // Validate min_spend
      if (item.min_spend !== undefined) {
        const minSpend = Number(item.min_spend);
        if (isNaN(minSpend) || minSpend < 0) {
          errors.push({
            index: i,
            code: 'INVALID_MIN_SPEND',
            message: 'Minimum spend must be a non-negative number',
            field: 'min_spend',
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

      // Normalize code to uppercase
      if (normalized.code) {
        normalized.code = String(normalized.code).toUpperCase().trim();
      }

      // Normalize discount type
      if (normalized.discount_type) {
        normalized.discount_type = String(normalized.discount_type).toLowerCase().replace(' ', '_');
      }

      // Normalize platform
      if (normalized.platform) {
        normalized.platform = String(normalized.platform).toLowerCase();
      }

      // Normalize scope
      if (normalized.scope) {
        normalized.scope = String(normalized.scope).toLowerCase().replace(' ', '_');
      }

      // Ensure required fields exist
      if (!normalized.created_at && !normalized.createdAt) {
        normalized.created_at = new Date().toISOString();
      }

      return normalized;
    });
  },

  async healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();

    try {
      // Check if we can access the store
      const testAccess = manualVoucherStore.length >= 0;

      return {
        healthy: testAccess,
        message: testAccess ? 'Manual catalog adapter is operational' : 'Unable to access manual voucher store',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  },

  async getLastSyncTimestamp(): Promise<Date | null> {
    return lastSyncTimestamp;
  },

  async getSourceMetadata(): Promise<Record<string, unknown>> {
    return {
      sourceType: 'manual',
      totalVouchers: manualVoucherStore.length,
      lastSync: lastSyncTimestamp?.toISOString() || null,
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
// Manual Entry Management Functions
// =============================================================================

/**
 * Add a manual voucher entry
 */
export function addManualVoucherEntry(voucher: VoucherRawInput): VoucherRawInput {
  const entry = {
    ...voucher,
    source: 'manual',
    created_at: new Date().toISOString(),
    id: `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  };

  manualVoucherStore.push(entry);
  return entry;
}

/**
 * Update a manual voucher entry
 */
export function updateManualVoucherEntry(id: string, updates: VoucherRawInput): VoucherRawInput | null {
  const index = manualVoucherStore.findIndex((v) => v.id === id);
  if (index === -1) return null;

  manualVoucherStore[index] = {
    ...manualVoucherStore[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  return manualVoucherStore[index];
}

/**
 * Delete a manual voucher entry
 */
export function deleteManualVoucherEntry(id: string): boolean {
  const index = manualVoucherStore.findIndex((v) => v.id === id);
  if (index === -1) return false;

  manualVoucherStore.splice(index, 1);
  return true;
}

/**
 * Get all manual voucher entries
 */
export function getAllManualVouchers(): VoucherRawInput[] {
  return [...manualVoucherStore];
}

/**
 * Clear all manual entries (for testing)
 */
export function clearManualVoucherStore(): void {
  manualVoucherStore.length = 0;
  lastSyncTimestamp = null;
}
