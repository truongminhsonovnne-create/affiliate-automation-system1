/**
 * TikTok Publisher Adapter
 *
 * Production-ready adapter abstraction for TikTok publishing
 * Currently uses stub/mock - designed to be replaced with real implementation
 */

import type {
  PublisherAdapterRequest,
  PublisherAdapterExecuteOptions,
  PublisherAdapterExecuteResult,
  PublisherAdapterDryRunResult,
  PublisherAdapterHealthResult,
} from '../types.js';
import type { PublisherAdapter } from './types.js';
import { BasePublisherAdapter } from './basePublisherAdapter.js';
import { getChannelTimeout } from '../constants.js';
import { info, warn, debug } from '../../../utils/logger.js';

// ============================================
// TikTok Adapter Implementation
// ============================================

/**
 * TikTok Publisher Adapter
 *
 * Design for production:
 * - Replace execute() with real TikTok API / browser automation
 * - Supports mock mode for testing
 */
export class TikTokPublisherAdapter extends BasePublisherAdapter {
  readonly channel = 'tiktok' as const;

  private readonly mockMode: boolean;
  private readonly credentials?: Record<string, string>;

  constructor(options?: {
    mockMode?: boolean;
    credentials?: Record<string, string>;
  }) {
    super();
    this.mockMode = options?.mockMode ?? true; // Default to mock for safety
    this.credentials = options?.credentials;
  }

  /**
   * Execute publishing to TikTok
   *
   * In production, this would:
   * 1. Authenticate with TikTok API
   * 2. Upload media (video/image)
   * 3. Create post with caption, hashtags
   * 4. Return post ID and URL
   *
   * Currently: Stub implementation for development/testing
   */
  async execute(
    request: PublisherAdapterRequest,
    options?: PublisherAdapterExecuteOptions
  ): Promise<PublisherAdapterExecuteResult> {
    const startTime = Date.now();
    const timeout = this.getTimeout(options);

    this.log('execute', {
      jobId: request.jobId,
      productId: request.productId,
      dryRun: options?.dryRun,
    });

    // Validate payload first
    if (options?.validatePayload !== false) {
      const validation = this.validatePayload(request.payload);
      if (!validation.valid) {
        return this.buildExecuteResult(
          request,
          {
            success: false,
            channel: this.channel,
            status: 'validation_error',
            errorMessage: validation.errors.join('; '),
            errorCategory: 'validation',
          },
          Date.now() - startTime,
          false
        );
      }
    }

    try {
      // Execute with timeout
      const response = await this.withTimeout(
        this.doExecute(request, options),
        timeout,
        `TikTok publish timeout after ${timeout}ms`
      );

      const durationMs = Date.now() - startTime;

      return this.buildExecuteResult(request, response, durationMs, false);
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const error = err as Error;

      this.logError('execute', err, { jobId: request.jobId });

      return this.buildExecuteResult(
        request,
        this.buildErrorResponse(error, 'external'),
        durationMs,
        false
      );
    }
  }

  /**
   * Dry-run: simulate execution without publishing
   */
  async dryRun(
    request: PublisherAdapterRequest,
    options?: PublisherAdapterExecuteOptions
  ): Promise<PublisherAdapterDryRunResult> {
    this.log('dryRun', { jobId: request.jobId });

    // Validate payload
    const validation = this.validatePayload(request.payload);

    if (!validation.valid) {
      return this.buildDryRunResult(request, validation);
    }

    // Simulate successful execution
    const simulatedResponse = this.buildSuccessResponse(
      `mock_tiktok_post_${Date.now()}`,
      `https://tiktok.com/@user/video/${Date.now()}`,
      { mock: true, simulated: true }
    );

    return this.buildDryRunResult(request, validation, simulatedResponse);
  }

  /**
   * Health check
   */
  async healthCheck(_options?: { timeoutMs?: number }): Promise<PublisherAdapterHealthResult> {
    const startTime = Date.now();

    // In mock mode, always healthy
    if (this.mockMode) {
      return {
        healthy: true,
        channel: this.channel,
        latencyMs: Date.now() - startTime,
        metadata: { mode: 'mock' },
      };
    }

    // In production, would check:
    // - API authentication
    // - Rate limits
    // - Service availability

    try {
      // Simulate health check
      await new Promise(resolve => setTimeout(resolve, 10));

      return {
        healthy: true,
        channel: this.channel,
        latencyMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        healthy: false,
        channel: this.channel,
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if adapter supports a feature
   */
  supports(feature: string): boolean {
    const baseSupport = super.supports(feature);

    // Extended features in production mode
    if (!this.mockMode) {
      return baseSupport || ['mediaUpload', 'scheduling'].includes(feature);
    }

    return baseSupport;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Actual execution logic
   */
  private async doExecute(
    request: PublisherAdapterRequest,
    _options?: PublisherAdapterExecuteOptions
  ): Promise<PublisherAdapterResponse> {
    const { payload } = request;

    if (this.mockMode) {
      // Mock execution - simulate successful publish
      info('[TikTokAdapter] Mock execution', {
        jobId: request.jobId,
        productId: request.productId,
        title: payload.title,
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Return mock success
      return this.buildSuccessResponse(
        `mock_tiktok_${Date.now()}`,
        `https://tiktok.com/@affiliate/video/${Date.now()}`,
        {
          mock: true,
          caption: payload.caption,
          hashtags: payload.hashtags,
        }
      );
    }

    // Production implementation would go here:
    // 1. Upload media (video/image)
    // 2. Create TikTok post with caption
    // 3. Return post ID and URL

    // For now, throw error to indicate production not implemented
    throw new Error('TikTok production adapter not implemented');
  }

  /**
   * Validate TikTok-specific payload
   */
  protected validatePayloadByChannel(payload: Record<string, unknown>): {
    errors: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // TikTok-specific requirements
    const caption = payload.caption as string | undefined;
    const hashtags = payload.hashtags as string[] | undefined;

    // Caption validation
    if (!caption) {
      errors.push('TikTok requires a caption');
    } else if (caption.length > 2200) {
      errors.push('TikTok caption exceeds 2200 characters');
    } else if (caption.length < 20) {
      warnings.push('TikTok captions perform better with 80+ characters');
    }

    // Hashtag validation
    if (hashtags && hashtags.length > 10) {
      warnings.push('TikTok recommends 3-5 hashtags, not more than 10');
    }

    // Check for required product URL
    const productUrl = payload.productUrl as string | undefined;
    if (!productUrl) {
      errors.push('TikTok posts require a product URL');
    }

    // Validate URL format
    if (productUrl && !this.isValidUrl(productUrl)) {
      errors.push('Invalid product URL format');
    }

    return { errors, warnings: warnings.length > 0 ? warnings : undefined };
  }

  /**
   * Simple URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// ============================================
// Factory
// ============================================

/**
 * Create TikTok adapter instance
 */
export function createTikTokAdapter(options?: {
  mockMode?: boolean;
  credentials?: Record<string, string>;
}): PublisherAdapter {
  return new TikTokPublisherAdapter(options);
}

export default TikTokPublisherAdapter;
