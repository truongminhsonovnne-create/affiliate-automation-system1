// =============================================================================
// Voucher Source Adapter Contracts and Factory
// Production-grade abstraction for voucher ingestion from various sources
// =============================================================================

import { VoucherRawInput, VoucherSourceType, VoucherPlatform } from '../../types.js';

export interface VoucherSourceAdapterOptions {
  sourceConfig?: Record<string, unknown>;
  platform?: VoucherPlatform;
  defaultValidityDays?: number;
}

export interface VoucherSourceAdapter {
  /**
   * Source type identifier
   */
  readonly sourceType: VoucherSourceType;

  /**
   * Load raw voucher data from the source
   */
  loadRawVoucherData(options?: {
    since?: Date;
    limit?: number;
    filters?: Record<string, unknown>;
  }): Promise<VoucherRawInput[]>;

  /**
   * Validate raw source payload before normalization
   */
  validateRawSourcePayload(rawItems: VoucherRawInput[]): Promise<{
    valid: boolean;
    errors: VoucherValidationError[];
    warnings: VoucherValidationWarning[];
  }>;

  /**
   * Normalize source-specific payload to canonical format
   */
  normalizeSourcePayload(rawItems: VoucherRawInput[]): VoucherRawInput[];

  /**
   * Check if the source is healthy and accessible
   */
  healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    latencyMs?: number;
  }>;

  /**
   * Get the last sync timestamp from the source
   */
  getLastSyncTimestamp(): Promise<Date | null>;

  /**
   * Get source metadata
   */
  getSourceMetadata(): Promise<Record<string, unknown>>;
}

export interface VoucherValidationError {
  index: number;
  itemId?: string;
  code: string;
  message: string;
  field?: string;
}

export interface VoucherValidationWarning {
  index: number;
  itemId?: string;
  code: string;
  message: string;
  field?: string;
}

// =============================================================================
// Adapter Factory
// =============================================================================

import { manualCatalogAdapter } from './manualCatalogAdapter.js';
import { importFileAdapter } from './importFileAdapter.js';

const adapterRegistry = new Map<VoucherSourceType, () => VoucherSourceAdapter>();

// Register built-in adapters
adapterRegistry.set('manual', () => manualCatalogAdapter);
adapterRegistry.set('import_file', () => importFileAdapter);

/**
 * Get a voucher source adapter by type
 */
export function getVoucherSourceAdapter(
  sourceType: VoucherSourceType,
  options?: VoucherSourceAdapterOptions
): VoucherSourceAdapter {
  const factory = adapterRegistry.get(sourceType);

  if (!factory) {
    throw new Error(`Unknown voucher source type: ${sourceType}. Available types: ${Array.from(adapterRegistry.keys()).join(', ')}`);
  }

  const adapter = factory();

  // Apply options if adapter supports them
  if ('setOptions' in adapter && typeof (adapter as unknown as { setOptions: (opts: VoucherSourceAdapterOptions) => void }).setOptions === 'function') {
    (adapter as unknown as { setOptions: (opts: VoucherSourceAdapterOptions) => void }).setOptions(options!);
  }

  return adapter;
}

/**
 * Get all registered voucher source adapters
 */
export function getAllVoucherSourceAdapters(): VoucherSourceAdapter[] {
  return Array.from(adapterRegistry.values()).map((factory) => factory());
}

/**
 * Register a custom source adapter
 */
export function registerVoucherSourceAdapter(
  sourceType: VoucherSourceType,
  factory: () => VoucherSourceAdapter
): void {
  if (adapterRegistry.has(sourceType)) {
    console.warn(`Overwriting existing adapter for source type: ${sourceType}`);
  }
  adapterRegistry.set(sourceType, factory);
}

/**
 * Get supported source types
 */
export function getSupportedSourceTypes(): VoucherSourceType[] {
  return Array.from(adapterRegistry.keys());
}
