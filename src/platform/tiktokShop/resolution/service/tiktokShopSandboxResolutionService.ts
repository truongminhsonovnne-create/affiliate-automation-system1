/**
 * TikTok Shop Sandbox Resolution Service
 *
 * Service for resolving TikTok Shop promotions/products in sandbox mode.
 * Provides isolated resolution with full context loading and promotion compatibility.
 */

import { v4 as uuidv4 } from 'uuid';
import { platformResolutionGateRepository } from '../../shared/resolution/repository/platformResolutionGateRepository.js';
import { platformGateEvaluationService } from '../../shared/resolution/service/platformGateEvaluationService.js';
import { SUPPORT_STATES, ROUTE_DECISIONS } from '../../shared/resolution/constants.js';
import type {
  SandboxResolutionRequest,
  SandboxResolutionResult,
  PlatformSupportState,
} from '../../shared/resolution/types.js';
import { logger } from '../../../utils/logger.js';

/**
 * TikTok Shop Sandbox Resolution Service
 */
export class TikTokShopSandboxResolutionService {
  /**
   * Resolve TikTok Shop promotion in sandbox mode
   */
  async resolvePromotion(
    request: SandboxResolutionRequest
  ): Promise<SandboxResolutionResult> {
    const startTime = Date.now();
    const requestId = uuidv4();
    const runId = uuidv4();

    logger.info({
      msg: 'Starting TikTok Shop sandbox promotion resolution',
      requestId,
      runId,
      inputValue: request.inputValue,
    });

    try {
      // 1. Validate platform support
      const evaluation = await platformGateEvaluationService.evaluatePlatformGates(
        request.platform
      );

      if (!evaluation.canUseSandbox) {
        return this.buildErrorResult(
          request,
          requestId,
          runId,
          'gated',
          'PLATFORM_NOT_SUPPORTED',
          'TikTok Shop is not available for sandbox resolution',
          startTime
        );
      }

      // 2. Check quota
      const quotaCheck = await this.checkSandboxQuota(request.platform);
      if (!quotaCheck.allowed) {
        return this.buildErrorResult(
          request,
          requestId,
          runId,
          'throttled',
          'QUOTA_EXCEEDED',
          quotaCheck.reason || 'Sandbox quota exceeded',
          startTime
        );
      }

      // 3. Parse and normalize input
      const parsed = await this.parseInput(request);
      if (!parsed.valid) {
        return this.buildErrorResult(
          request,
          requestId,
          runId,
          'failed',
          'INVALID_INPUT',
          parsed.error || 'Invalid input',
          startTime
        );
      }

      // 4. Load context
      const context = await this.loadContext(request, parsed);
      if (!context.available) {
        return this.buildErrorResult(
          request,
          requestId,
          runId,
          'failed',
          'CONTEXT_UNAVAILABLE',
          context.error || 'Context unavailable',
          startTime
        );
      }

      // 5. Run promotion compatibility
      const promotionResult = await this.runPromotionCompatibility(context);

      // 6. Increment usage
      await platformResolutionGateRepository.incrementSandboxUsage(
        request.platform,
        'hourly',
        evaluation.gateConfig.sandboxMaxRequestsPerHour,
        100,
        !promotionResult.success
      );

      // 7. Build result
      const result: SandboxResolutionResult = {
        requestId,
        runId,
        platform: request.platform,
        inputType: request.inputType,
        inputValue: request.inputValue,
        resolutionStatus: promotionResult.success ? 'success' : 'failed',
        supportState: SUPPORT_STATES.SANDBOX_ONLY,
        responseData: promotionResult.data,
        responseQualityScore: promotionResult.qualityScore,
        resolvedAt: new Date(),
        resolutionDurationMs: Date.now() - startTime,
        errorCode: promotionResult.errorCode || null,
        errorMessage: promotionResult.errorMessage || null,
        contextSnapshotId: context.snapshotId,
      };

      logger.info({
        msg: 'TikTok Shop sandbox promotion resolution complete',
        requestId,
        runId,
        status: result.resolutionStatus,
        qualityScore: result.responseQualityScore,
        duration: result.resolutionDurationMs,
      });

      return result;
    } catch (error) {
      logger.error({
        msg: 'TikTok Shop sandbox promotion resolution failed',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.buildErrorResult(
        request,
        requestId,
        runId,
        'failed',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  /**
   * Resolve TikTok Shop product in sandbox mode
   */
  async resolveProduct(
    request: SandboxResolutionRequest
  ): Promise<SandboxResolutionResult> {
    const startTime = Date.now();
    const requestId = uuidv4();
    const runId = uuidv4();

    logger.info({
      msg: 'Starting TikTok Shop sandbox product resolution',
      requestId,
      runId,
      inputValue: request.inputValue,
    });

    try {
      // Validate platform support
      const evaluation = await platformGateEvaluationService.evaluatePlatformGates(
        request.platform
      );

      if (!evaluation.canUseSandbox) {
        return this.buildErrorResult(
          request,
          requestId,
          runId,
          'gated',
          'PLATFORM_NOT_SUPPORTED',
          'TikTok Shop is not available for sandbox resolution',
          startTime
        );
      }

      // Check quota
      const quotaCheck = await this.checkSandboxQuota(request.platform);
      if (!quotaCheck.allowed) {
        return this.buildErrorResult(
          request,
          requestId,
          runId,
          'throttled',
          'QUOTA_EXCEEDED',
          quotaCheck.reason || 'Sandbox quota exceeded',
          startTime
        );
      }

      // Parse input
      const parsed = await this.parseInput(request);
      if (!parsed.valid) {
        return this.buildErrorResult(
          request,
          requestId,
          runId,
          'failed',
          'INVALID_INPUT',
          parsed.error || 'Invalid input',
          startTime
        );
      }

      // Load context
      const context = await this.loadContext(request, parsed);
      if (!context.available) {
        return this.buildErrorResult(
          request,
          requestId,
          runId,
          'failed',
          'CONTEXT_UNAVAILABLE',
          context.error || 'Context unavailable',
          startTime
        );
      }

      // Resolve product
      const productResult = await this.resolveProductDetails(context);

      // Increment usage
      await platformResolutionGateRepository.incrementSandboxUsage(
        request.platform,
        'hourly',
        evaluation.gateConfig.sandboxMaxRequestsPerHour,
        100,
        !productResult.success
      );

      const result: SandboxResolutionResult = {
        requestId,
        runId,
        platform: request.platform,
        inputType: request.inputType,
        inputValue: request.inputValue,
        resolutionStatus: productResult.success ? 'success' : 'failed',
        supportState: SUPPORT_STATES.SANDBOX_ONLY,
        responseData: productResult.data,
        responseQualityScore: productResult.qualityScore,
        resolvedAt: new Date(),
        resolutionDurationMs: Date.now() - startTime,
        errorCode: productResult.errorCode || null,
        errorMessage: productResult.errorMessage || null,
        contextSnapshotId: context.snapshotId,
      };

      return result;
    } catch (error) {
      logger.error({
        msg: 'TikTok Shop sandbox product resolution failed',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.buildErrorResult(
        request,
        requestId,
        runId,
        'failed',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  /**
   * Check sandbox quota availability
   */
  private async checkSandboxQuota(
    platform: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const gate = await platformResolutionGateRepository.getGate(platform);
      if (!gate) {
        return { allowed: false, reason: 'Platform not configured' };
      }

      if (!gate.sandboxEnabled) {
        return { allowed: false, reason: 'Sandbox disabled' };
      }

      // Check hourly quota
      const hourlyQuota = await platformResolutionGateRepository.getSandboxUsageQuota(
        platform,
        'hourly'
      );

      if (hourlyQuota) {
        const requestsRemaining =
          gate.sandboxMaxRequestsPerHour - hourlyQuota.requestsUsed;
        if (requestsRemaining <= 0) {
          return { allowed: false, reason: 'Hourly quota exceeded' };
        }

        // Check if throttled
        if (hourlyQuota.throttledUntil && new Date() < hourlyQuota.throttledUntil) {
          return { allowed: false, reason: 'Currently throttled' };
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error({
        msg: 'Error checking sandbox quota',
        platform,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return { allowed: true }; // Allow on error
    }
  }

  /**
   * Parse and normalize input
   */
  private async parseInput(
    request: SandboxResolutionRequest
  ): Promise<{ valid: boolean; normalized?: string; error?: string }> {
    const { inputType, inputValue } = request;

    switch (inputType) {
      case 'url':
        // Validate URL format
        try {
          const url = new URL(inputValue);
          if (!url.hostname.includes('tiktok.com') && !url.hostname.includes('shop.tiktok.com')) {
            return { valid: false, error: 'Invalid TikTok Shop URL' };
          }
          return { valid: true, normalized: inputValue };
        } catch {
          return { valid: false, error: 'Invalid URL format' };
        }

      case 'reference_key':
        // Validate reference key format
        if (!inputValue.startsWith('tiktok-')) {
          return { valid: false, error: 'Invalid TikTok Shop reference key format' };
        }
        return { valid: true, normalized: inputValue };

      case 'product_id':
        // Validate product ID
        if (inputValue.length < 5) {
          return { valid: false, error: 'Invalid product ID' };
        }
        return { valid: true, normalized: inputValue };

      case 'promotion_code':
        // Validate promotion code
        if (inputValue.length < 3 || inputValue.length > 50) {
          return { valid: false, error: 'Invalid promotion code' };
        }
        return { valid: true, normalized: inputValue.toUpperCase() };

      default:
        return { valid: false, error: 'Unknown input type' };
    }
  }

  /**
   * Load context for resolution
   */
  private async loadContext(
    request: SandboxResolutionRequest,
    parsed: { valid: boolean; normalized?: string }
  ): Promise<{
    available: boolean;
    error?: string;
    data?: Record<string, unknown>;
    snapshotId?: string;
  }> {
    try {
      // In production, this would load actual context from:
      // - TikTok Shop data foundation
      // - Acquisition snapshots
      // - Domain knowledge

      // Mock context for sandbox
      const contextData = {
        platform: 'tiktok_shop',
        inputType: request.inputType,
        inputValue: parsed.normalized || request.inputValue,
        loadedAt: new Date().toISOString(),
        dataSources: ['acquisition', 'domain', 'foundation'],
        // Sample data that would be loaded in production
        sampleProducts: [
          { id: 'tiktok-product-001', title: 'Sample Product 1', price: 29.99 },
          { id: 'tiktok-product-002', title: 'Sample Product 2', price: 49.99 },
        ],
        samplePromotions: [
          { code: 'SAVE10', discount: '10%', minPurchase: 50 },
          { code: 'SAVE20', discount: '20%', minPurchase: 100 },
        ],
      };

      // Create snapshot for audit
      const snapshotId = crypto.randomUUID();
      await platformResolutionGateRepository.createSupportStateSnapshot({
        platform: request.platform,
        supportState: SUPPORT_STATES.SANDBOX_ONLY,
        enablementPhase: 'sandbox_preview',
        domainReady: true,
        dataFoundationReady: true,
        acquisitionReady: true,
        resolutionReady: false,
        governanceApproved: false,
        snapshotReason: 'sandbox_resolution',
        triggerEvent: `resolution_${request.resolutionType}`,
      });

      return {
        available: true,
        data: contextData,
        snapshotId,
      };
    } catch (error) {
      logger.error({
        msg: 'Error loading context',
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Failed to load context',
      };
    }
  }

  /**
   * Run promotion compatibility check
   */
  private async runPromotionCompatibility(context: {
    data?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    qualityScore: number;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      // In production, this would:
      // 1. Check promotion validity
      // 2. Check product compatibility
      // 3. Calculate discounts
      // 4. Validate terms

      // Mock promotion compatibility result
      const promotionData = context.data?.['samplePromotions'] as Array<{
        code: string;
        discount: string;
        minPurchase: number;
      }>;

      const promotions = promotionData?.map((p) => ({
        code: p.code,
        discount: p.discount,
        minPurchase: p.minPurchase,
        status: 'valid',
        applicability: 'partial',
        note: 'Sandbox environment - actual values may differ',
      })) || [];

      return {
        success: true,
        data: {
          resolutionType: 'promotion',
          environment: 'sandbox',
          promotions,
          compatibilityScore: 65,
          note: 'Results are from sandbox resolution. For production use, enable TikTok Shop production support.',
        },
        qualityScore: 65,
      };
    } catch (error) {
      return {
        success: false,
        qualityScore: 0,
        errorCode: 'PROMOTION_CHECK_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Promotion check failed',
      };
    }
  }

  /**
   * Resolve product details
   */
  private async resolveProductDetails(context: {
    data?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    qualityScore: number;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      // In production, this would resolve actual product details
      const products = context.data?.['sampleProducts'] as Array<{
        id: string;
        title: string;
        price: number;
      }>;

      return {
        success: true,
        data: {
          resolutionType: 'product',
          environment: 'sandbox',
          products: products || [],
          note: 'Results are from sandbox resolution. For production use, enable TikTok Shop production support.',
        },
        qualityScore: 60,
      };
    } catch (error) {
      return {
        success: false,
        qualityScore: 0,
        errorCode: 'PRODUCT_RESOLUTION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Product resolution failed',
      };
    }
  }

  /**
   * Build error result
   */
  private buildErrorResult(
    request: SandboxResolutionRequest,
    requestId: string,
    runId: string,
    status: 'failed' | 'throttled' | 'gated',
    errorCode: string,
    errorMessage: string,
    startTime: number
  ): SandboxResolutionResult {
    return {
      requestId,
      runId,
      platform: request.platform,
      inputType: request.inputType,
      inputValue: request.inputValue,
      resolutionStatus: status,
      supportState: SUPPORT_STATES.SANDBOX_ONLY,
      responseData: {},
      responseQualityScore: null,
      resolvedAt: new Date(),
      resolutionDurationMs: Date.now() - startTime,
      errorCode,
      errorMessage,
      contextSnapshotId: null,
    };
  }
}

/**
 * Service singleton
 */
export const tiktokShopSandboxResolutionService = new TikTokShopSandboxResolutionService();
