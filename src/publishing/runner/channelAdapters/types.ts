/**
 * Channel Adapter Types
 *
 * Type contracts for channel publisher adapters
 */

import type {
  PublisherChannel,
  PublisherAdapterCapability,
  PublisherAdapterRequest,
  PublisherAdapterResponse,
  PublisherAdapterExecuteOptions,
  PublisherAdapterExecuteResult,
  PublisherAdapterHealthResult,
  PublisherAdapterDryRunResult,
  PublisherAdapterFeatures,
} from '../types.js';

// ============================================
// Adapter Interface
// ============================================

/**
 * Publisher adapter interface
 */
export interface PublisherAdapter {
  /**
   * Channel this adapter handles
   */
  readonly channel: PublisherChannel;

  /**
   * Execute publishing
   */
  execute(
    request: PublisherAdapterRequest,
    options?: PublisherAdapterExecuteOptions
  ): Promise<PublisherAdapterExecuteResult>;

  /**
   * Dry-run (simulate execution without publishing)
   */
  dryRun(
    request: PublisherAdapterRequest,
    options?: PublisherAdapterExecuteOptions
  ): Promise<PublisherAdapterDryRunResult>;

  /**
   * Health check
   */
  healthCheck(options?: {
    timeoutMs?: number;
  }): Promise<PublisherAdapterHealthResult>;

  /**
   * Check if adapter supports a feature
   */
  supports(feature: PublisherAdapterCapability): boolean;

  /**
   * Validate payload
   */
  validatePayload(payload: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    warnings?: string[];
  };
}

// ============================================
// Adapter Factory
// ============================================

/**
 * Adapter factory options
 */
export interface AdapterFactoryOptions {
  /**
   * Use mock adapters (for testing/development)
   */
  useMock?: boolean;

  /**
   * Custom timeout override
   */
  timeoutMs?: number;

  /**
   * Enable dry-run by default
   */
  defaultDryRun?: boolean;

  /**
   * API credentials (if required)
   */
  credentials?: Record<string, string>;
}

/**
 * Get adapter for a channel
 */
export type GetPublisherAdapter = (
  channel: PublisherChannel,
  options?: AdapterFactoryOptions
) => PublisherAdapter;

/**
 * Get all available adapters
 */
export type GetAllPublisherAdapters = (
  options?: AdapterFactoryOptions
) => Map<PublisherChannel, PublisherAdapter>;
