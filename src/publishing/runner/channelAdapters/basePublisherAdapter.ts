/**
 * Base Publisher Adapter
 *
 * Abstract base class with shared functionality for all channel adapters
 */

import type {
  PublisherChannel,
  PublisherAdapterRequest,
  PublisherAdapterResponse,
  PublisherAdapterExecuteOptions,
  PublisherAdapterExecuteResult,
  PublisherAdapterDryRunResult,
  PublisherAdapterHealthResult,
} from '../types.js';
import type { PublisherAdapter } from './types.js';
import { getChannelTimeout } from '../constants.js';
import { info, warn, error as logError, debug } from '../../../utils/logger.js';

/**
 * Base adapter with shared helpers
 */
export abstract class BasePublisherAdapter implements PublisherAdapter {
  /**
   * Channel this adapter handles
   */
  abstract readonly channel: PublisherChannel;

  /**
   * Execute publishing
   */
  abstract execute(
    request: PublisherAdapterRequest,
    options?: PublisherAdapterExecuteOptions
  ): Promise<PublisherAdapterExecuteResult>;

  /**
   * Dry-run (simulate execution without publishing)
   */
  abstract dryRun(
    request: PublisherAdapterRequest,
    options?: PublisherAdapterExecuteOptions
  ): Promise<PublisherAdapterDryRunResult>;

  /**
   * Health check
   */
  async healthCheck(_options?: { timeoutMs?: number }): Promise<PublisherAdapterHealthResult> {
    // Default implementation - override in subclasses if needed
    return {
      healthy: true,
      channel: this.channel,
      latencyMs: 0,
    };
  }

  /**
   * Check if adapter supports a feature
   */
  supports(_feature: string): boolean {
    // Default: supports execute, dryRun, healthCheck
    return ['execute', 'dryRun', 'healthCheck'].includes(_feature);
  }

  /**
   * Validate payload
   */
  validatePayload(payload: Record<string, unknown>): { valid: boolean; errors: string[]; warnings?: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!payload.productId) {
      errors.push('Missing required field: productId');
    }

    if (!payload.contentId) {
      errors.push('Missing required field: contentId');
    }

    if (!payload.productUrl) {
      errors.push('Missing required field: productUrl');
    }

    // Channel-specific validation
    const channelValidation = this.validatePayloadByChannel(payload);
    errors.push(...channelValidation.errors);
    warnings.push(...(channelValidation.warnings || []));

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Channel-specific payload validation - override in subclasses
   */
  protected validatePayloadByChannel(payload: Record<string, unknown>): {
    errors: string[];
    warnings?: string[];
  } {
    // Default validation - check channel matches
    if (payload.channel && payload.channel !== this.channel) {
      return {
        errors: [`Channel mismatch: expected ${this.channel}, got ${payload.channel}`],
      };
    }
    return { errors: [] };
  }

  /**
   * Build execute result
   */
  protected buildExecuteResult(
    request: PublisherAdapterRequest,
    response: PublisherAdapterResponse,
    durationMs: number,
    dryRun: boolean
  ): PublisherAdapterExecuteResult {
    return {
      success: response.success,
      channel: this.channel,
      jobId: request.jobId,
      response,
      durationMs,
      dryRun,
    };
  }

  /**
   * Build dry-run result
   */
  protected buildDryRunResult(
    request: PublisherAdapterRequest,
    validation: { valid: boolean; errors: string[]; warnings?: string[] },
    simulatedResponse?: PublisherAdapterResponse
  ): PublisherAdapterDryRunResult {
    return {
      valid: validation.valid,
      channel: this.channel,
      jobId: request.jobId,
      wouldPublish: validation.valid && !this.hasBlockingErrors(validation.errors),
      validationErrors: validation.errors,
      warnings: validation.warnings || [],
      simulatedResponse,
    };
  }

  /**
   * Build error response
   */
  protected buildErrorResponse(
    error: Error | unknown,
    category: 'transient' | 'validation' | 'permanent' | 'rate_limit' | 'external' = 'external'
  ): PublisherAdapterResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      channel: this.channel,
      status: category === 'validation' ? 'validation_error' : 'failed',
      errorMessage,
      errorCode: 'ADAPTER_ERROR',
      errorCategory: category,
    };
  }

  /**
   * Build success response
   */
  protected buildSuccessResponse(
    externalPostId?: string,
    publishedUrl?: string,
    metadata?: Record<string, unknown>
  ): PublisherAdapterResponse {
    return {
      success: true,
      channel: this.channel,
      status: 'published',
      externalPostId,
      publishedUrl,
      responseMetadata: metadata,
    };
  }

  /**
   * Check if errors are blocking (should prevent dry-run from passing)
   */
  protected hasBlockingErrors(errors: string[]): boolean {
    return errors.some(e => e.toLowerCase().includes('required') || e.toLowerCase().includes('missing'));
  }

  /**
   * Get timeout for request
   */
  protected getTimeout(options?: PublisherAdapterExecuteOptions): number {
    return options?.timeoutMs ?? getChannelTimeout(this.channel);
  }

  /**
   * Wrap execution with timeout
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    );

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Log adapter operation
   */
  protected log(operation: 'execute' | 'dryRun' | 'healthCheck', data: Record<string, unknown>): void {
    const logFn = operation === 'healthCheck' ? debug : info;
    logFn(`[${this.channel}Adapter] ${operation}`, data);
  }

  /**
   * Log adapter error
   */
  protected logError(operation: string, err: unknown, data?: Record<string, unknown>): void {
    logError(`[${this.channel}Adapter] ${operation} failed`, err, data);
  }

  /**
   * Log adapter warning
   */
  protected logWarning(operation: string, message: string, data?: Record<string, unknown>): void {
    warn(`[${this.channel}Adapter] ${operation}: ${message}`, data);
  }
}
