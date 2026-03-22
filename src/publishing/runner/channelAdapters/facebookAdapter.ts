/**
 * Facebook Publisher Adapter
 *
 * Production-ready adapter abstraction for Facebook publishing
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
import { info } from '../../../utils/logger.js';

// ============================================
// Facebook Adapter Implementation
// ============================================

/**
 * Facebook Publisher Adapter
 *
 * Design for production:
 * - Replace execute() with real Facebook Graph API
 * - Supports mock mode for testing
 */
export class FacebookPublisherAdapter extends BasePublisherAdapter {
  readonly channel = 'facebook' as const;

  private readonly mockMode: boolean;
  private readonly credentials?: Record<string, string>;

  constructor(options?: {
    mockMode?: boolean;
    credentials?: Record<string, string>;
  }) {
    super();
    this.mockMode = options?.mockMode ?? true;
    this.credentials = options?.credentials;
  }

  /**
   * Execute publishing to Facebook
   *
   * In production, this would:
   * 1. Authenticate with Facebook Graph API
   * 2. Create post on page/group
   * 3. Return post ID and URL
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
      const response = await this.withTimeout(
        this.doExecute(request, options),
        timeout,
        `Facebook publish timeout after ${timeout}ms`
      );

      const durationMs = Date.now() - startTime;

      return this.buildExecuteResult(request, response, durationMs, false);
    } catch (err) {
      const durationMs = Date.now() - startTime;

      this.logError('execute', err, { jobId: request.jobId });

      return this.buildExecuteResult(
        request,
        this.buildErrorResponse(err as Error, 'external'),
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
      `mock_fb_post_${Date.now()}`,
      `https://facebook.com/story.php?story_fbid=${Date.now()}`,
      { mock: true, simulated: true }
    );

    return this.buildDryRunResult(request, validation, simulatedResponse);
  }

  /**
   * Health check
   */
  async healthCheck(_options?: { timeoutMs?: number }): Promise<PublisherAdapterHealthResult> {
    const startTime = Date.now();

    if (this.mockMode) {
      return {
        healthy: true,
        channel: this.channel,
        latencyMs: Date.now() - startTime,
        metadata: { mode: 'mock' },
      };
    }

    try {
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
      info('[FacebookAdapter] Mock execution', {
        jobId: request.jobId,
        productId: request.productId,
        title: payload.title,
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return this.buildSuccessResponse(
        `mock_fb_${Date.now()}`,
        `https://facebook.com/affiliate/post/${Date.now()}`,
        {
          mock: true,
          caption: payload.caption,
          hashtags: payload.hashtags,
        }
      );
    }

    // Production implementation would go here
    throw new Error('Facebook production adapter not implemented');
  }

  /**
   * Validate Facebook-specific payload
   */
  protected validatePayloadByChannel(payload: Record<string, unknown>): {
    errors: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const caption = payload.caption as string | undefined;
    const hashtags = payload.hashtags as string[] | undefined;

    // Caption validation
    if (!caption) {
      errors.push('Facebook posts require a caption');
    } else if (caption.length > 63206) {
      errors.push('Facebook caption exceeds 63206 characters');
    } else if (caption.length < 20) {
      warnings.push('Facebook posts with 80+ characters get better reach');
    }

    // Hashtag validation
    if (hashtags && hashtags.length > 30) {
      warnings.push('Facebook recommends 2-5 hashtags');
    }

    // Product URL
    const productUrl = payload.productUrl as string | undefined;
    if (!productUrl) {
      errors.push('Facebook posts require a product URL');
    }

    return { errors, warnings: warnings.length > 0 ? warnings : undefined };
  }
}

// ============================================
// Factory
// ============================================

/**
 * Create Facebook adapter instance
 */
export function createFacebookAdapter(options?: {
  mockMode?: boolean;
  credentials?: Record<string, string>;
}): PublisherAdapter {
  return new FacebookPublisherAdapter(options);
}

export default FacebookPublisherAdapter;
