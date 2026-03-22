/**
 * Multi-Platform Public Flow Gating Service
 *
 * Service for routing public flow requests based on platform support states.
 * Handles multi-platform routing with honest UX representation.
 */

import { v4 as uuidv4 } from 'uuid';
import { platformResolutionGateRepository } from '../repository/platformResolutionGateRepository.js';
import { platformGateEvaluationService } from './platformGateEvaluationService.js';
import {
  PLATFORMS,
  SUPPORT_STATES,
  ENABLEMENT_PHASES,
  ROUTE_DECISIONS,
  SUPPORT_LEVEL_TEXT,
} from '../constants.js';
import type {
  PublicFlowRequest,
  PublicFlowResponse,
  HonestRepresentation,
  PlatformSupportState,
  PlatformEnablementPhase,
  GateEvaluationResult,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Multi-Platform Public Flow Gating Service
 */
export class MultiPlatformPublicFlowService {
  /**
   * Process public flow request with gating
   */
  async processPublicFlowRequest(
    request: PublicFlowRequest
  ): Promise<PublicFlowResponse> {
    const startTime = Date.now();
    const requestId = request.requestId || uuidv4();

    logger.info({
      msg: 'Processing public flow request',
      requestId,
      platform: request.platform,
      inputType: request.inputType,
    });

    try {
      // 1. Evaluate platform gates
      const evaluation = await platformGateEvaluationService.evaluatePlatformGates(
        request.platform
      );

      // 2. Determine route based on support state
      const routeDecision = this.determineRoute(evaluation);

      // 3. Build honest representation
      const representation = this.buildHonestRepresentation(
        evaluation.supportState,
        evaluation.enablementPhase,
        routeDecision
      );

      // 4. Route to appropriate handler
      let resolutionResult: {
        success: boolean;
        data?: Record<string, unknown>;
        qualityScore: number | null;
        errorCode?: string;
        errorMessage?: string;
        userFacingMessage?: string;
      };

      switch (routeDecision) {
        case ROUTE_DECISIONS.PRODUCTION:
          resolutionResult = await this.handleProductionFlow(request, evaluation);
          break;
        case ROUTE_DECISIONS.SANDBOX:
          resolutionResult = await this.handleSandboxFlow(request, evaluation);
          break;
        case ROUTE_DECISIONS.GATED:
          resolutionResult = await this.handleGatedFlow(request, evaluation);
          break;
        case ROUTE_DECISIONS.BLOCKED:
        default:
          resolutionResult = {
            success: false,
            data: null,
            qualityScore: null,
            errorCode: 'PLATFORM_BLOCKED',
            errorMessage: representation.supportLevelText,
            userFacingMessage: representation.supportLevelText,
          };
          break;
      }

      // 5. Build response
      const response = this.buildResponse(
        request,
        requestId,
        evaluation,
        routeDecision,
        representation,
        resolutionResult,
        startTime
      );

      // 6. Audit the request
      await this.auditPublicFlow(request, requestId, evaluation, routeDecision, response);

      logger.info({
        msg: 'Public flow request processed',
        requestId,
        platform: request.platform,
        routeDecision,
        supportState: evaluation.supportState,
        success: resolutionResult.success,
      });

      return response;
    } catch (error) {
      logger.error({
        msg: 'Public flow request failed',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.buildErrorResponse(request, requestId, error, startTime);
    }
  }

  /**
   * Determine route based on evaluation
   */
  private determineRoute(evaluation: GateEvaluationResult): string {
    const { supportState, enablementPhase, canUseProduction, canUseSandbox } = evaluation;

    // Block if not ready
    if (supportState === SUPPORT_STATES.UNSUPPORTED) {
      return ROUTE_DECISIONS.BLOCKED;
    }

    // Block if disabled
    if (enablementPhase === ENABLEMENT_PHASES.DISABLED) {
      return ROUTE_DECISIONS.BLOCKED;
    }

    // Production if fully enabled
    if (canUseProduction && enablementPhase === ENABLEMENT_PHASES.PRODUCTION_ENABLED) {
      return ROUTE_DECISIONS.PRODUCTION;
    }

    // Gated if limited preview or production candidate
    if (
      enablementPhase === ENABLEMENT_PHASES.LIMITED_PUBLIC_PREVIEW ||
      enablementPhase === ENABLEMENT_PHASES.PRODUCTION_CANDIDATE
    ) {
      return ROUTE_DECISIONS.GATED;
    }

    // Sandbox if sandbox preview
    if (
      enablementPhase === ENABLEMENT_PHASES.SANDBOX_PREVIEW ||
      enablementPhase === ENABLEMENT_PHASES.INTERNAL_ONLY
    ) {
      return ROUTE_DECISIONS.SANDBOX;
    }

    // Default to sandbox if available
    if (canUseSandbox) {
      return ROUTE_DECISIONS.SANDBOX;
    }

    return ROUTE_DECISIONS.BLOCKED;
  }

  /**
   * Build honest representation
   */
  private buildHonestRepresentation(
    supportState: PlatformSupportState,
    enablementPhase: PlatformEnablementPhase,
    routeDecision: string
  ): HonestRepresentation {
    const isSupported = [SUPPORT_STATES.SUPPORTED, SUPPORT_STATES.PRODUCTION_ENABLED].includes(
      supportState
    );
    const isInSandbox = supportState === SUPPORT_STATES.SANDBOX_ONLY;
    const isGated = supportState === SUPPORT_STATES.GATED;
    const isLimited = supportState === SUPPORT_STATES.PARTIALLY_SUPPORTED;

    const supportLevelText = SUPPORT_LEVEL_TEXT[supportState] || 'Unknown support state';

    const featureAvailability: Record<string, boolean> = {
      promotion_resolution: [SUPPORT_STATES.SUPPORTED, SUPPORT_STATES.PRODUCTION_ENABLED].includes(
        supportState
      ),
      product_resolution: [SUPPORT_STATES.PARTIALLY_SUPPORTED, SUPPORT_STATES.SUPPORTED, SUPPORT_STATES.PRODUCTION_ENABLED].includes(supportState),
      seller_resolution: [SUPPORT_STATES.PARTIALLY_SUPPORTED, SUPPORT_STATES.SUPPORTED, SUPPORT_STATES.PRODUCTION_ENABLED].includes(supportState),
      attribution: supportState === SUPPORT_STATES.PRODUCTION_ENABLED,
    };

    const limitations: string[] = [];
    const nextSteps: string[] = [];

    if (isInSandbox) {
      limitations.push('Results are from sandbox environment');
      limitations.push('May not reflect actual product prices');
      nextSteps.push('Production support coming soon');
      nextSteps.push('Join waitlist for production access');
    }

    if (isGated) {
      limitations.push('Limited access - approval required');
      nextSteps.push('Request access through governance process');
    }

    if (isLimited) {
      limitations.push('Partial feature support');
      nextSteps.push('Full feature support planned');
    }

    if (!isSupported) {
      limitations.push('Platform not supported');
      nextSteps.push('Check documentation for supported platforms');
    }

    return {
      isSupported,
      isInSandbox,
      isGated,
      isLimited,
      supportLevelText,
      featureAvailability,
      limitations,
      nextSteps,
    };
  }

  /**
   * Handle production flow
   */
  private async handleProductionFlow(
    request: PublicFlowRequest,
    evaluation: GateEvaluationResult
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    qualityScore: number | null;
    errorCode?: string;
    errorMessage?: string;
    userFacingMessage?: string;
  }> {
    // In production, this would call the actual platform resolution service
    // For now, return mock production data
    logger.info({
      msg: 'Handling production flow',
      platform: request.platform,
      resolutionType: request.resolutionType,
    });

    if (request.platform === PLATFORMS.SHOPEE) {
      // Shopee production resolution
      return {
        success: true,
        data: {
          environment: 'production',
          platform: request.platform,
          resolutionType: request.resolutionType,
          result: {
            // Mock Shopee resolution result
            promotions: [
              { code: 'SHOPEE10', discount: '10%', status: 'active' },
            ],
          },
        },
        qualityScore: 90,
      };
    }

    return {
      success: true,
      data: {
        environment: 'production',
        platform: request.platform,
        resolutionType: request.resolutionType,
      },
      qualityScore: 85,
    };
  }

  /**
   * Handle sandbox flow
   */
  private async handleSandboxFlow(
    request: PublicFlowRequest,
    evaluation: GateEvaluationResult
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    qualityScore: number | null;
    errorCode?: string;
    errorMessage?: string;
    userFacingMessage?: string;
  }> {
    // Route to TikTok Shop sandbox service
    logger.info({
      msg: 'Handling sandbox flow',
      platform: request.platform,
      resolutionType: request.resolutionType,
    });

    // In production, import and call the actual sandbox service
    // For now, return sandbox response
    return {
      success: true,
      data: {
        environment: 'sandbox',
        platform: request.platform,
        resolutionType: request.resolutionType,
        note: 'Results from sandbox environment',
        sandboxWarning: 'This is a sandbox environment. Results may differ from production.',
      },
      qualityScore: 65,
      userFacingMessage: 'Running in sandbox mode. Results are for testing purposes.',
    };
  }

  /**
   * Handle gated flow
   */
  private async handleGatedFlow(
    request: PublicFlowRequest,
    evaluation: GateEvaluationResult
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    qualityScore: number | null;
    errorCode?: string;
    errorMessage?: string;
    userFacingMessage?: string;
  }> {
    logger.info({
      msg: 'Handling gated flow',
      platform: request.platform,
      resolutionType: request.resolutionType,
    });

    return {
      success: false,
      data: null,
      qualityScore: null,
      errorCode: 'GATED_ACCESS',
      errorMessage: 'Platform requires approval for access',
      userFacingMessage:
        'This platform requires approval. Please submit a request through the governance process.',
    };
  }

  /**
   * Build response
   */
  private buildResponse(
    request: PublicFlowRequest,
    requestId: string,
    evaluation: GateEvaluationResult,
    routeDecision: string,
    representation: HonestRepresentation,
    resolutionResult: {
      success: boolean;
      data?: Record<string, unknown>;
      qualityScore: number | null;
      errorCode?: string;
      errorMessage?: string;
      userFacingMessage?: string;
    },
    startTime: number
  ): PublicFlowResponse {
    const resolutionStatus = resolutionResult.success
      ? 'success'
      : resolutionResult.errorCode === 'QUOTA_EXCEEDED'
        ? 'throttled'
        : 'failed';

    return {
      requestId,
      platform: request.platform,
      inputType: request.inputType,
      inputValue: request.inputValue,
      routeDecision: routeDecision as 'production' | 'sandbox' | 'gated' | 'blocked',
      supportState: evaluation.supportState,
      enablementPhase: evaluation.enablementPhase,
      resolutionStatus,
      resolvedData: resolutionResult.data || null,
      qualityScore: resolutionResult.qualityScore,
      representation,
      resolvedAt: new Date(),
      resolutionDurationMs: Date.now() - startTime,
      errorCode: resolutionResult.errorCode || null,
      errorMessage: resolutionResult.errorMessage || null,
      userFacingMessage: resolutionResult.userFacingMessage || representation.supportLevelText,
      docsUrl: this.getDocsUrl(request.platform),
      statusPageUrl: this.getStatusPageUrl(),
    };
  }

  /**
   * Build error response
   */
  private buildErrorResponse(
    request: PublicFlowRequest,
    requestId: string,
    error: unknown,
    startTime: number
  ): PublicFlowResponse {
    return {
      requestId,
      platform: request.platform,
      inputType: request.inputType,
      inputValue: request.inputValue,
      routeDecision: 'blocked',
      supportState: SUPPORT_STATES.UNSUPPORTED,
      enablementPhase: ENABLEMENT_PHASES.DISABLED,
      resolutionStatus: 'failed',
      resolvedData: null,
      qualityScore: null,
      representation: {
        isSupported: false,
        isInSandbox: false,
        isGated: false,
        isLimited: false,
        supportLevelText: 'An error occurred processing your request',
        featureAvailability: {},
        limitations: ['An error occurred'],
        nextSteps: ['Try again later', 'Contact support'],
      },
      resolvedAt: new Date(),
      resolutionDurationMs: Date.now() - startTime,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userFacingMessage: 'An error occurred. Please try again later.',
    };
  }

  /**
   * Audit public flow request
   */
  private async auditPublicFlow(
    request: PublicFlowRequest,
    requestId: string,
    evaluation: GateEvaluationResult,
    routeDecision: string,
    response: PublicFlowResponse
  ): Promise<void> {
    try {
      await platformResolutionGateRepository.createPublicFlowAudit({
        auditId: uuidv4(),
        platform: request.platform,
        flowType: 'resolution',
        inputType: request.inputType,
        inputValue: request.inputValue,
        userAgent: request.userAgent,
        requestId,
        routeDecision,
        supportState: evaluation.supportState,
        enablementPhase: evaluation.enablementPhase,
        gateEvaluation: {
          canResolve: evaluation.canResolve,
          canUseSandbox: evaluation.canUseSandbox,
          canUseProduction: evaluation.canUseProduction,
          qualityScore: evaluation.qualityScore,
        },
        responseStatus: response.resolutionStatus === 'success' ? 'success' : 'error',
        responsePayload: response.resolvedData || {},
        qualityScore: response.qualityScore,
        honestRepresentation: response.representation.isSupported || response.representation.isInSandbox,
        misleadingFlags: this.checkMisleadingFlags(response),
      });
    } catch (error) {
      logger.error({
        msg: 'Failed to audit public flow',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * Check for misleading flags
   */
  private checkMisleadingFlags(response: PublicFlowResponse): string[] {
    const flags: string[] = [];

    // Check if claiming full support when in sandbox
    if (response.representation.isInSandbox && response.routeDecision === 'production') {
      flags.push('misleading_environment');
    }

    // Check if not disclosing limitations
    if (response.representation.isLimited && response.representation.limitations.length === 0) {
      flags.push('missing_limitations_disclosure');
    }

    return flags;
  }

  /**
   * Get docs URL for platform
   */
  private getDocsUrl(platform: string): string {
    const baseUrl = process.env.PUBLIC_DOCS_URL || 'https://docs.affiliate.example.com';
    return `${baseUrl}/platforms/${platform}`;
  }

  /**
   * Get status page URL
   */
  private getStatusPageUrl(): string {
    return process.env.STATUS_PAGE_URL || 'https://status.affiliate.example.com';
  }

  /**
   * Get platform support status
   */
  async getPlatformSupportStatus(platform: string): Promise<{
    platform: string;
    supportState: PlatformSupportState;
    enablementPhase: PlatformEnablementPhase;
    representation: HonestRepresentation;
  }> {
    const evaluation = await platformGateEvaluationService.evaluatePlatformGates(platform);
    const routeDecision = this.determineRoute(evaluation);
    const representation = this.buildHonestRepresentation(
      evaluation.supportState,
      evaluation.enablementPhase,
      routeDecision
    );

    return {
      platform,
      supportState: evaluation.supportState,
      enablementPhase: evaluation.enablementPhase,
      representation,
    };
  }

  /**
   * Get all platform support statuses
   */
  async getAllPlatformSupportStatuses(): Promise<
    Record<
      string,
      {
        supportState: PlatformSupportState;
        enablementPhase: PlatformEnablementPhase;
        representation: HonestRepresentation;
      }
    >
  > {
    const evaluations = await platformGateEvaluationService.evaluateAllPlatforms();
    const result: Record<string, unknown> = {};

    for (const [platform, evaluation] of Object.entries(evaluations)) {
      const routeDecision = this.determineRoute(evaluation);
      const representation = this.buildHonestRepresentation(
        evaluation.supportState,
        evaluation.enablementPhase,
        routeDecision
      );

      result[platform] = {
        supportState: evaluation.supportState,
        enablementPhase: evaluation.enablementPhase,
        representation,
      };
    }

    return result as Record<
      string,
      {
        supportState: PlatformSupportState;
        enablementPhase: PlatformEnablementPhase;
        representation: HonestRepresentation;
      }
    >;
  }
}

/**
 * Service singleton
 */
export const multiPlatformPublicFlowService = new MultiPlatformPublicFlowService();
