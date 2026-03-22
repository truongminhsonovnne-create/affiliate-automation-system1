/**
 * Platform Gate Evaluation Service
 *
 * Service for evaluating platform resolution gates,
 * determining support states, and making routing decisions.
 */

import {
  PLATFORMS,
  SUPPORT_STATES,
  ENABLEMENT_PHASES,
  GATE_THRESHOLDS,
  ROUTE_DECISIONS,
  DEFAULT_PLATFORM_STATES,
  DEFAULT_GATE_CONFIGS,
  canUseProduction,
  canUseSandbox,
  canResolve,
  getRecommendedRoute,
} from '../constants.js';
import { platformResolutionGateRepository } from '../repository/platformResolutionGateRepository.js';
import type {
  GateEvaluationResult,
  GateConfig,
  PlatformGateRecord,
  PlatformSupportState,
  PlatformEnablementPhase,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Platform readiness checks
 */
export interface PlatformReadiness {
  domain: {
    ready: boolean;
    score: number;
    details: string;
  };
  dataFoundation: {
    ready: boolean;
    score: number;
    details: string;
  };
  acquisition: {
    ready: boolean;
    score: number;
    details: string;
  };
  resolution: {
    ready: boolean;
    score: number;
    details: string;
  };
  governance: {
    ready: boolean;
    score: number;
    details: string;
  };
}

/**
 * Platform Gate Evaluation Service
 */
export class PlatformGateEvaluationService {
  /**
   * Evaluate gates for a platform
   */
  async evaluatePlatformGates(platform: string): Promise<GateEvaluationResult> {
    logger.info({ msg: 'Evaluating platform gates', platform });

    const gate = await platformResolutionGateRepository.getGate(platform);
    const readiness = await this.checkPlatformReadiness(platform);

    // Determine support state based on readiness
    const supportState = this.determineSupportState(readiness, gate);
    const enablementPhase = this.determineEnablementPhase(supportState, gate);

    // Evaluate gates
    const canUseProd = canUseProduction(supportState);
    const canUseSandboxMode = canUseSandbox(supportState);
    const canResolveResult = canResolve(supportState);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(readiness);

    // Get gate config
    const gateConfig = this.buildGateConfig(platform, gate);

    const result: GateEvaluationResult = {
      platform,
      supportState,
      enablementPhase,
      domainReady: readiness.domain.ready,
      dataFoundationReady: readiness.dataFoundation.ready,
      acquisitionReady: readiness.acquisition.ready,
      resolutionReady: readiness.resolution.ready,
      governanceApproved: readiness.governance.ready,
      canResolve: canResolveResult,
      canUseSandbox: canUseSandboxMode,
      canUseProduction: canUseProd,
      shouldBlock: !canResolveResult,
      qualityScore,
      gateConfig,
      evaluatedAt: new Date(),
    };

    logger.info({
      msg: 'Gate evaluation complete',
      platform,
      supportState,
      enablementPhase,
      canResolve: result.canResolve,
      canUseSandbox: result.canUseSandbox,
      canUseProduction: result.canUseProduction,
    });

    return result;
  }

  /**
   * Check platform readiness across all dimensions
   */
  async checkPlatformReadiness(platform: string): Promise<PlatformReadiness> {
    // Domain readiness - platform identified and domain understood
    const domain = await this.checkDomainReadiness(platform);

    // Data foundation readiness - data models and storage ready
    const dataFoundation = await this.checkDataFoundationReadiness(platform);

    // Acquisition readiness - data acquisition pipeline ready
    const acquisition = await this.checkAcquisitionReadiness(platform);

    // Resolution readiness - resolution service ready
    const resolution = await this.checkResolutionReadiness(platform);

    // Governance readiness - governance review approved
    const governance = await this.checkGovernanceReadiness(platform);

    return { domain, dataFoundation, acquisition, resolution, governance };
  }

  /**
   * Check domain readiness
   */
  private async checkDomainReadiness(platform: string): Promise<PlatformReadiness['domain']> {
    // Check if platform domain is understood
    // In production, this would check actual domain knowledge
    const knownPlatforms = [PLATFORMS.SHOPEE, PLATFORMS.TIKTOK_SHOP];
    const isKnown = knownPlatforms.includes(platform as typeof PLATFORMS.SHOPEE);

    if (!isKnown) {
      return { ready: false, score: 0, details: 'Platform not recognized' };
    }

    // Check domain-specific data
    const hasDomainData = await this.hasDomainKnowledge(platform);

    return {
      ready: hasDomainData,
      score: hasDomainData ? 80 : 30,
      details: hasDomainData ? 'Domain knowledge available' : 'Limited domain knowledge',
    };
  }

  /**
   * Check data foundation readiness
   */
  private async checkDataFoundationReadiness(
    platform: string
  ): Promise<PlatformReadiness['dataFoundation']> {
    // Check if data models exist for platform
    const hasDataModels = await this.hasDataModels(platform);

    // Check if storage is configured
    const hasStorage = await this.hasStorageConfigured(platform);

    const ready = hasDataModels && hasStorage;
    const score = ready ? 75 : 25;

    return {
      ready,
      score,
      details: ready
        ? 'Data foundation ready'
        : `Missing: ${!hasDataModels ? 'data models' : ''} ${!hasStorage ? 'storage' : ''}`,
    };
  }

  /**
   * Check acquisition readiness
   */
  private async checkAcquisitionReadiness(
    platform: string
  ): Promise<PlatformReadiness['acquisition']> {
    // Check if acquisition pipeline exists
    const hasAcquisitionPipeline = await this.hasAcquisitionPipeline(platform);

    // Check if acquisition is healthy
    const acquisitionHealth = await this.getAcquisitionHealth(platform);

    const ready = hasAcquisitionPipeline && acquisitionHealth.isHealthy;
    const score = ready ? acquisitionHealth.score : 20;

    return {
      ready,
      score,
      details: acquisitionHealth.details,
    };
  }

  /**
   * Check resolution readiness
   */
  private async checkResolutionReadiness(
    platform: string
  ): Promise<PlatformReadiness['resolution']> {
    // Check if resolution service exists
    const hasResolutionService = await this.hasResolutionService(platform);

    // Check if resolution is configured
    const isConfigured = await this.isResolutionConfigured(platform);

    const ready = hasResolutionService && isConfigured;

    return {
      ready,
      score: ready ? 70 : 20,
      details: ready ? 'Resolution service available' : 'Resolution not configured',
    };
  }

  /**
   * Check governance readiness
   */
  private async checkGovernanceReadiness(
    platform: string
  ): Promise<PlatformReadiness['governance']> {
    // Check if governance approval exists
    const hasApproval = await this.hasGovernanceApproval(platform);

    // Check if compliance requirements met
    const complianceMet = await this.checkCompliance(platform);

    const ready = hasApproval;

    return {
      ready,
      score: ready ? 100 : 0,
      details: ready
        ? 'Governance approved'
        : complianceMet
          ? 'Pending governance approval'
          : 'Compliance requirements not met',
    };
  }

  /**
   * Determine support state from readiness
   */
  private determineSupportState(
    readiness: PlatformReadiness,
    gate: PlatformGateRecord | null
  ): PlatformSupportState {
    // If governance not ready, cannot proceed
    if (!readiness.governance.ready) {
      return SUPPORT_STATES.NOT_READY;
    }

    // If domain not ready, not ready
    if (!readiness.domain.ready) {
      return SUPPORT_STATES.NOT_READY;
    }

    // Count ready dimensions
    const readyCount = [
      readiness.domain.ready,
      readiness.dataFoundation.ready,
      readiness.acquisition.ready,
      readiness.resolution.ready,
      readiness.governance.ready,
    ].filter(Boolean).length;

    // If only domain and governance ready - sandbox only
    if (readyCount <= 2 && readiness.domain.ready && readiness.governance.ready) {
      return SUPPORT_STATES.SANDBOX_ONLY;
    }

    // If data foundation and acquisition ready - gated
    if (readyCount >= 3 && readyCount < 5) {
      return SUPPORT_STATES.GATED;
    }

    // If all ready but not full production - partially supported
    if (readyCount >= 4) {
      return SUPPORT_STATES.PARTIALLY_SUPPORTED;
    }

    // Default
    return SUPPORT_STATES.NOT_READY;
  }

  /**
   * Determine enablement phase from support state
   */
  private determineEnablementPhase(
    supportState: PlatformSupportState,
    gate: PlatformGateRecord | null
  ): PlatformEnablementPhase {
    switch (supportState) {
      case SUPPORT_STATES.UNSUPPORTED:
        return ENABLEMENT_PHASES.DISABLED;
      case SUPPORT_STATES.NOT_READY:
        return ENABLEMENT_PHASES.DISABLED;
      case SUPPORT_STATES.SANDBOX_ONLY:
        return ENABLEMENT_PHASES.SANDBOX_PREVIEW;
      case SUPPORT_STATES.GATED:
        return ENABLEMENT_PHASES.LIMITED_PUBLIC_PREVIEW;
      case SUPPORT_STATES.PARTIALLY_SUPPORTED:
        return ENABLEMENT_PHASES.PRODUCTION_CANDIDATE;
      case SUPPORT_STATES.SUPPORTED:
      case SUPPORT_STATES.PRODUCTION_ENABLED:
        return ENABLEMENT_PHASES.PRODUCTION_ENABLED;
      default:
        return ENABLEMENT_PHASES.DISABLED;
    }
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(readiness: PlatformReadiness): number {
    const weights = {
      domain: 0.15,
      dataFoundation: 0.2,
      acquisition: 0.25,
      resolution: 0.25,
      governance: 0.15,
    };

    const score =
      readiness.domain.score * weights.domain +
      readiness.dataFoundation.score * weights.dataFoundation +
      readiness.acquisition.score * weights.acquisition +
      readiness.resolution.score * weights.resolution +
      readiness.governance.score * weights.governance;

    return Math.round(score);
  }

  /**
   * Build gate configuration
   */
  private buildGateConfig(platform: string, gate: PlatformGateRecord | null): GateConfig {
    const defaults = DEFAULT_GATE_CONFIGS[platform] || DEFAULT_GATE_CONFIGS[PLATFORMS.TIKTOK_SHOP];

    return {
      sandboxEnabled: gate?.sandboxEnabled ?? true,
      sandboxMaxRequestsPerHour: gate?.sandboxMaxRequestsPerHour ?? defaults.sandboxMaxRequestsPerHour,
      sandboxMaxRequestsPerDay: gate?.sandboxMaxRequestsPerDay ?? defaults.sandboxMaxRequestsPerDay,
      productionEnabled: gate?.productionEnabled ?? false,
      productionMaxRequestsPerHour:
        gate?.productionMaxRequestsPerHour ?? defaults.productionMaxRequestsPerHour,
      productionMaxRequestsPerDay:
        gate?.productionMaxRequestsPerDay ?? defaults.productionMaxRequestsPerDay,
      allowPublicResolution: gate?.allowPublicResolution ?? false,
      allowSandboxResolution: gate?.allowSandboxResolution ?? true,
      allowGatedResolution: gate?.allowGatedResolution ?? false,
      promotionResolutionEnabled: gate?.gateConfig?.['promotionResolutionEnabled'] ?? false,
      productResolutionEnabled: gate?.gateConfig?.['productResolutionEnabled'] ?? false,
      sellerResolutionEnabled: gate?.gateConfig?.['sellerResolutionEnabled'] ?? false,
      attributionEnabled: gate?.gateConfig?.['attributionEnabled'] ?? false,
    };
  }

  /**
   * Check if platform has domain knowledge
   */
  private async hasDomainKnowledge(platform: string): Promise<boolean> {
    // In production, check actual domain knowledge storage
    return platform === PLATFORMS.SHOPEE || platform === PLATFORMS.TIKTOK_SHOP;
  }

  /**
   * Check if platform has data models
   */
  private async hasDataModels(platform: string): Promise<boolean> {
    // In production, check actual data models
    return platform === PLATFORMS.SHOPEE || platform === PLATFORMS.TIKTOK_SHOP;
  }

  /**
   * Check if storage is configured
   */
  private async hasStorageConfigured(platform: string): Promise<boolean> {
    // In production, check actual storage config
    return true;
  }

  /**
   * Check if acquisition pipeline exists
   */
  private async hasAcquisitionPipeline(platform: string): Promise<boolean> {
    // In production, check actual acquisition pipeline
    return platform === PLATFORMS.SHOPEE || platform === PLATFORMS.TIKTOK_SHOP;
  }

  /**
   * Get acquisition health
   */
  private async getAcquisitionHealth(
    platform: string
  ): Promise<{ isHealthy: boolean; score: number; details: string }> {
    // In production, check actual acquisition health
    if (platform === PLATFORMS.SHOPEE) {
      return { isHealthy: true, score: 80, details: 'Shopee acquisition healthy' };
    }
    if (platform === PLATFORMS.TIKTOK_SHOP) {
      return { isHealthy: true, score: 65, details: 'TikTok Shop acquisition operational' };
    }
    return { isHealthy: false, score: 0, details: 'No acquisition pipeline' };
  }

  /**
   * Check if resolution service exists
   */
  private async hasResolutionService(platform: string): Promise<boolean> {
    // In production, check actual resolution service
    return platform === PLATFORMS.SHOPEE;
  }

  /**
   * Check if resolution is configured
   */
  private async isResolutionConfigured(platform: string): Promise<boolean> {
    // In production, check actual resolution config
    return platform === PLATFORMS.SHOPEE;
  }

  /**
   * Check if governance approval exists
   */
  private async hasGovernanceApproval(platform: string): Promise<boolean> {
    // In production, check actual governance status
    const defaults = DEFAULT_PLATFORM_STATES[platform];
    return defaults?.governanceApproved ?? false;
  }

  /**
   * Check compliance requirements
   */
  private async checkCompliance(platform: string): Promise<boolean> {
    // In production, check actual compliance
    return true;
  }

  /**
   * Get recommended route for platform
   */
  async getRecommendedRoute(platform: string): Promise<string> {
    const evaluation = await this.evaluatePlatformGates(platform);
    return getRecommendedRoute(evaluation.supportState);
  }

  /**
   * Get all platform evaluations
   */
  async evaluateAllPlatforms(): Promise<Record<string, GateEvaluationResult>> {
    const platforms = Object.values(PLATFORMS);
    const results: Record<string, GateEvaluationResult> = {};

    for (const platform of platforms) {
      results[platform] = await this.evaluatePlatformGates(platform);
    }

    return results;
  }
}

/**
 * Service singleton
 */
export const platformGateEvaluationService = new PlatformGateEvaluationService();
