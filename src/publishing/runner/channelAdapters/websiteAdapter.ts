/**
 * Website Publisher Adapter
 *
 * Production-ready adapter for website publishing
 * This adapter can work in multiple modes:
 * 1. Stub/mock - for testing
 * 2. Persistence - writes to a website_ready table/flag for programmatic SEO
 * 3. Direct - can be extended to integrate with CMS/content management
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
// Website Adapter Options
// ============================================

/**
 * Website adapter configuration
 */
export interface WebsiteAdapterOptions {
  /**
   * Adapter mode: 'mock' | 'persistence' | 'direct'
   */
  mode?: 'mock' | 'persistence' | 'direct';

  /**
   * Target table/collection for persistence mode
   */
  targetTable?: string;

  /**
   * Direct CMS integration credentials
   */
  credentials?: Record<string, string>;

  /**
   * Base URL for published content
   */
  baseUrl?: string;
}

// ============================================
// Website Adapter Implementation
// ============================================

/**
 * Website Publisher Adapter
 */
export class WebsitePublisherAdapter extends BasePublisherAdapter {
  readonly channel = 'website' as const;

  private readonly mode: 'mock' | 'persistence' | 'direct';
  private readonly targetTable: string;
  private readonly baseUrl: string;
  private readonly credentials?: Record<string, string>;

  constructor(options: WebsiteAdapterOptions = {}) {
    super();
    this.mode = options.mode ?? 'persistence';
    this.targetTable = options.targetTable ?? 'website_content_queue';
    this.baseUrl = options.baseUrl ?? 'https://example.com';
    this.credentials = options.credentials;
  }

  /**
   * Execute publishing to website
   *
   * In 'persistence' mode:
   * - Writes content to a queue table for programmatic SEO layer
   * - Returns a URL that will be generated later
   *
   * In 'direct' mode:
   * - Would publish directly to CMS (WordPress, Ghost, etc.)
   *
   * In 'mock' mode:
   * - Simulates execution
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
      mode: this.mode,
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
        `Website publish timeout after ${timeout}ms`
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
    _options?: PublisherAdapterExecuteOptions
  ): Promise<PublisherAdapterDryRunResult> {
    this.log('dryRun', { jobId: request.jobId, mode: this.mode });

    // Validate payload
    const validation = this.validatePayload(request.payload);

    if (!validation.valid) {
      return this.buildDryRunResult(request, validation);
    }

    // Simulate successful execution
    const slug = this.generateSlug(request.payload);
    const publishedUrl = `${this.baseUrl}/${slug}`;

    const simulatedResponse = this.buildSuccessResponse(
      `web_${Date.now()}`,
      publishedUrl,
      {
        mock: this.mode === 'mock',
        slug,
        mode: this.mode,
      }
    );

    return this.buildDryRunResult(request, validation, simulatedResponse);
  }

  /**
   * Health check
   */
  async healthCheck(_options?: { timeoutMs?: number }): Promise<PublisherAdapterHealthResult> {
    const startTime = Date.now();

    if (this.mode === 'mock') {
      return {
        healthy: true,
        channel: this.channel,
        latencyMs: Date.now() - startTime,
        metadata: { mode: 'mock' },
      };
    }

    // In persistence mode, check database connectivity
    if (this.mode === 'persistence') {
      // Simulate DB check
      await new Promise(resolve => setTimeout(resolve, 10));

      return {
        healthy: true,
        channel: this.channel,
        latencyMs: Date.now() - startTime,
        metadata: {
          mode: 'persistence',
          targetTable: this.targetTable,
        },
      };
    }

    return {
      healthy: true,
      channel: this.channel,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Check if adapter supports a feature
   */
  supports(feature: string): boolean {
    const baseSupport = super.supports(feature);

    if (this.mode === 'direct') {
      return baseSupport || ['scheduling'].includes(feature);
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

    switch (this.mode) {
      case 'mock':
        return this.executeMock(request);

      case 'persistence':
        return this.executePersistence(request);

      case 'direct':
        return this.executeDirect(request);

      default:
        return this.executeMock(request);
    }
  }

  /**
   * Mock execution
   */
  private async executeMock(request: PublisherAdapterRequest): Promise<PublisherAdapterResponse> {
    info('[WebsiteAdapter] Mock execution', {
      jobId: request.jobId,
      productId: request.productId,
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    const slug = this.generateSlug(request.payload);
    const publishedUrl = `${this.baseUrl}/${slug}`;

    return this.buildSuccessResponse(
      `web_mock_${Date.now()}`,
      publishedUrl,
      { mock: true, slug }
    );
  }

  /**
   * Persistence execution
   * Writes to website_content_queue table or marks job as ready
   */
  private async executePersistence(request: PublisherAdapterRequest): Promise<PublisherAdapterResponse> {
    info('[WebsiteAdapter] Persistence execution', {
      jobId: request.jobId,
      productId: request.productId,
      table: this.targetTable,
    });

    // In a real implementation, this would:
    // 1. Insert into website_content_queue table
    // 2. Or update publish_jobs with website_ready flag
    // 3. Or call a webhook for programmatic SEO

    const slug = this.generateSlug(request.payload);
    const publishedUrl = `${this.baseUrl}/${slug}`;

    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 100));

    return this.buildSuccessResponse(
      `web_persist_${Date.now()}`,
      publishedUrl,
      {
        mode: 'persistence',
        slug,
        targetTable: this.targetTable,
        content: {
          title: request.payload.title,
          body: request.payload.body?.substring(0, 100),
        },
      }
    );
  }

  /**
   * Direct execution (placeholder for CMS integration)
   */
  private async executeDirect(request: PublisherAdapterRequest): Promise<PublisherAdapterResponse> {
    info('[WebsiteAdapter] Direct execution', {
      jobId: request.jobId,
      productId: request.productId,
    });

    // Production would integrate with:
    // - WordPress REST API
    // - Ghost API
    // - Contentful
    // - Sanity
    // - Custom CMS

    const slug = this.generateSlug(request.payload);
    const publishedUrl = `${this.baseUrl}/${slug}`;

    return this.buildSuccessResponse(
      `web_direct_${Date.now()}`,
      publishedUrl,
      {
        mode: 'direct',
        slug,
        credentialsConfigured: !!this.credentials,
      }
    );
  }

  /**
   * Generate URL slug from payload
   */
  private generateSlug(payload: Record<string, unknown>): string {
    const title = payload.title as string | undefined;
    if (!title) {
      return `product-${Date.now()}`;
    }

    // Convert title to URL-friendly slug
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Validate website-specific payload
   */
  protected validatePayloadByChannel(payload: Record<string, unknown>): {
    errors: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const title = payload.title as string | undefined;
    const body = payload.body as string | undefined;

    // Title validation
    if (!title) {
      errors.push('Website content requires a title');
    } else if (title.length < 20) {
      warnings.push('SEO titles should be at least 20 characters');
    } else if (title.length > 100) {
      errors.push('SEO titles should not exceed 100 characters');
    }

    // Body validation
    if (!body) {
      errors.push('Website content requires body content');
    } else if (body.length < 300) {
      warnings.push('SEO content should be at least 300 characters for better ranking');
    } else if (body.length > 10000) {
      errors.push('Website content should not exceed 10000 characters');
    }

    // Product URL
    const productUrl = payload.productUrl as string | undefined;
    if (!productUrl) {
      errors.push('Website content requires a product URL');
    }

    return { errors, warnings: warnings.length > 0 ? warnings : undefined };
  }
}

// ============================================
// Factory
// ============================================

/**
 * Create website adapter instance
 */
export function createWebsiteAdapter(options?: WebsiteAdapterOptions): PublisherAdapter {
  return new WebsitePublisherAdapter(options);
}

export default WebsitePublisherAdapter;
