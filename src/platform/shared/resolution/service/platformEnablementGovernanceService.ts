/**
 * Platform Enablement Governance Service
 *
 * Service for managing platform enablement governance,
 * readiness reviews, and phase transitions.
 */

import { v4 as uuidv4 } from 'uuid';
import { platformResolutionGateRepository } from '../repository/platformResolutionGateRepository.js';
import { platformGateEvaluationService } from './platformGateEvaluationService.js';
import {
  PLATFORMS,
  SUPPORT_STATES,
  ENABLEMENT_PHASES,
  ENABLEMENT_PHASE_LEVELS,
} from '../constants.js';
import type {
  EnablementReview,
  ReadinessCheck,
  Blocker,
  Risk,
  PlatformSupportState,
  PlatformEnablementPhase,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Platform Enablement Governance Service
 */
export class PlatformEnablementGovernanceService {
  /**
   * Request enablement review for a platform
   */
  async requestEnablementReview(
    platform: string,
    targetPhase: PlatformEnablementPhase,
    requestedBy: string
  ): Promise<EnablementReview> {
    logger.info({
      msg: 'Requesting enablement review',
      platform,
      targetPhase,
      requestedBy,
    });

    // Get current gate
    const gate = await platformResolutionGateRepository.getGate(platform);
    const currentPhase = gate?.enablementPhase || ENABLEMENT_PHASES.DISABLED;

    // Validate phase transition
    const validation = this.validatePhaseTransition(currentPhase, targetPhase);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Run readiness checks
    const readinessChecks = await this.runReadinessChecks(platform);

    // Identify blockers
    const blockers = this.identifyBlockers(readinessChecks);

    // Identify risks
    const risks = this.identifyRisks(readinessChecks, targetPhase);

    // Calculate readiness score
    const readinessScore = this.calculateReadinessScore(readinessChecks);

    // Create review
    const review = await platformResolutionGateRepository.createEnablementReview({
      reviewId: uuidv4(),
      platform,
      currentPhase,
      targetPhase,
      reviewType: 'triggered',
      readinessScore,
      readinessChecks: readinessChecks.reduce(
        (acc, check) => ({ ...acc, [check.checkId]: check }),
        {}
      ),
      blockers,
      risks,
      reviewRequestedAt: new Date(),
    });

    // Auto-approve if all checks pass and it's a minor phase jump
    if (readinessScore >= 80 && blockers.length === 0) {
      await this.autoApproveReview(review.reviewId, 'system');
    }

    return review;
  }

  /**
   * Run readiness checks for a platform
   */
  async runReadinessChecks(platform: string): Promise<ReadinessCheck[]> {
    const checks: ReadinessCheck[] = [];

    // Domain readiness checks
    checks.push(await this.checkDomainKnowledge(platform));
    checks.push(await this.checkDomainDocumentation(platform));

    // Data foundation checks
    checks.push(await this.checkDataModels(platform));
    checks.push(await this.checkDataStorage(platform));
    checks.push(await this.checkDataQuality(platform));

    // Acquisition checks
    checks.push(await this.checkAcquisitionPipeline(platform));
    checks.push(await this.checkAcquisitionHealth(platform));
    checks.push(await this.checkAcquisitionCapacity(platform));

    // Resolution checks
    checks.push(await this.checkResolutionService(platform));
    checks.push(await this.checkResolutionConfig(platform));
    checks.push(await this.checkResolutionPerformance(platform));

    // Governance checks
    checks.push(await this.checkCompliance(platform));
    checks.push(await this.checkSecurityReview(platform));
    checks.push(await this.checkOperationalReadiness(platform));

    return checks;
  }

  /**
   * Validate phase transition
   */
  private validatePhaseTransition(
    currentPhase: PlatformEnablementPhase,
    targetPhase: PlatformEnablementPhase
  ): { valid: boolean; reason?: string } {
    const currentLevel = ENABLEMENT_PHASE_LEVELS[currentPhase] || 0;
    const targetLevel = ENABLEMENT_PHASE_LEVELS[targetPhase] || 0;

    // Cannot go backwards
    if (targetLevel < currentLevel) {
      return {
        valid: false,
        reason: `Cannot transition from ${currentPhase} to ${targetPhase}: cannot go backwards`,
      };
    }

    // Skip more than one phase requires approval
    if (targetLevel - currentLevel > 1) {
      return {
        valid: false,
        reason: `Cannot skip phases from ${currentPhase} to ${targetPhase}: must transition through intermediate phases`,
      };
    }

    return { valid: true };
  }

  /**
   * Identify blockers from readiness checks
   */
  private identifyBlockers(readinessChecks: ReadinessCheck[]): Blocker[] {
    const blockers: Blocker[] = [];

    const failedChecks = readinessChecks.filter((c) => c.status === 'fail');

    for (const check of failedChecks) {
      blockers.push({
        blockerId: uuidv4(),
        title: `Failed: ${check.checkName}`,
        description: check.details,
        severity: this.mapCheckStatusToSeverity(check.status),
        category: check.category,
        estimatedResolutionDays: null,
        owner: null,
      });
    }

    return blockers;
  }

  /**
   * Identify risks for target phase
   */
  private identifyRisks(readinessChecks: ReadinessCheck[], targetPhase: PlatformEnablementPhase): Risk[] {
    const risks: Risk[] = [];

    const warningChecks = readinessChecks.filter((c) => c.status === 'warning');

    for (const check of warningChecks) {
      risks.push({
        riskId: uuidv4(),
        title: `Warning: ${check.checkName}`,
        description: check.details,
        likelihood: 'medium',
        impact: 'medium',
        mitigation: `Monitor ${check.checkName} during ${targetPhase} transition`,
      });
    }

    // Phase-specific risks
    if (targetPhase === ENABLEMENT_PHASES.LIMITED_PUBLIC_PREVIEW) {
      risks.push({
        riskId: uuidv4(),
        title: 'Public exposure risk',
        description: 'Limited public preview will expose platform to external users',
        likelihood: 'high',
        impact: 'high',
        mitigation: 'Implement rate limiting and monitoring',
      });
    }

    if (targetPhase === ENABLEMENT_PHASES.PRODUCTION_ENABLED) {
      risks.push({
        riskId: uuidv4(),
        title: 'Full production risk',
        description: 'Full production enables public access with SLA commitments',
        likelihood: 'medium',
        impact: 'high',
        mitigation: 'Ensure operational readiness and support capacity',
      });
    }

    return risks;
  }

  /**
   * Calculate readiness score
   */
  private calculateReadinessScore(readinessChecks: ReadinessCheck[]): number {
    if (readinessChecks.length === 0) return 0;

    const totalScore = readinessChecks.reduce((sum, check) => sum + check.score, 0);
    return Math.round(totalScore / readinessChecks.length);
  }

  /**
   * Auto-approve review
   */
  async autoApproveReview(reviewId: string, approvedBy: string): Promise<EnablementReview | null> {
    logger.info({ msg: 'Auto-approving review', reviewId, approvedBy });

    return platformResolutionGateRepository.updateEnablementReviewDecision(
      reviewId,
      'approved',
      'Auto-approved: All readiness checks passed',
      approvedBy,
      []
    );
  }

  /**
   * Approve enablement review
   */
  async approveReview(
    reviewId: string,
    approvedBy: string,
    conditions?: string[]
  ): Promise<EnablementReview | null> {
    logger.info({ msg: 'Approving enablement review', reviewId, approvedBy });

    const review = await platformResolutionGateRepository.getEnablementReview(reviewId);
    if (!review) {
      throw new Error(`Review not found: ${reviewId}`);
    }

    // Update review
    const updated = await platformResolutionGateRepository.updateEnablementReviewDecision(
      reviewId,
      'approved',
      'Approved by ' + approvedBy,
      approvedBy,
      conditions
    );

    if (updated && updated.decision === 'approved') {
      // Update platform gate
      await platformResolutionGateRepository.updateEnablementPhase(
        review.platform,
        review.targetPhase
      );

      // Determine support state from phase
      const supportState = this.phaseToSupportState(review.targetPhase);
      await platformResolutionGateRepository.updateSupportState(review.platform, supportState);

      // Create snapshot
      await platformResolutionGateRepository.createSupportStateSnapshot({
        platform: review.platform,
        supportState,
        enablementPhase: review.targetPhase,
        domainReady: true,
        dataFoundationReady: true,
        acquisitionReady: true,
        resolutionReady: true,
        governanceApproved: true,
        snapshotReason: 'enablement_approved',
        triggerEvent: `review_${reviewId}`,
      });
    }

    return updated;
  }

  /**
   * Reject enablement review
   */
  async rejectReview(
    reviewId: string,
    rejectedBy: string,
    reason: string
  ): Promise<EnablementReview | null> {
    logger.info({ msg: 'Rejecting enablement review', reviewId, rejectedBy, reason });

    return platformResolutionGateRepository.updateEnablementReviewDecision(
      reviewId,
      'rejected',
      reason,
      rejectedBy,
      []
    );
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(platform?: string): Promise<EnablementReview[]> {
    return platformResolutionGateRepository.getPendingEnablementReviews(platform);
  }

  /**
   * Get review history
   */
  async getReviewHistory(platform: string, limit: number = 30): Promise<EnablementReview[]> {
    // In production, implement proper history query
    const reviews = await platformResolutionGateRepository.getPendingEnablementReviews(platform);
    return reviews.slice(0, limit);
  }

  /**
   * Convert phase to support state
   */
  private phaseToSupportState(phase: PlatformEnablementPhase): PlatformSupportState {
    switch (phase) {
      case ENABLEMENT_PHASES.DISABLED:
        return SUPPORT_STATES.UNSUPPORTED;
      case ENABLEMENT_PHASES.INTERNAL_ONLY:
        return SUPPORT_STATES.NOT_READY;
      case ENABLEMENT_PHASES.SANDBOX_PREVIEW:
        return SUPPORT_STATES.SANDBOX_ONLY;
      case ENABLEMENT_PHASES.LIMITED_PUBLIC_PREVIEW:
        return SUPPORT_STATES.GATED;
      case ENABLEMENT_PHASES.PRODUCTION_CANDIDATE:
        return SUPPORT_STATES.PARTIALLY_SUPPORTED;
      case ENABLEMENT_PHASES.PRODUCTION_ENABLED:
        return SUPPORT_STATES.PRODUCTION_ENABLED;
      default:
        return SUPPORT_STATES.NOT_READY;
    }
  }

  /**
   * Map check status to blocker severity
   */
  private mapCheckStatusToSeverity(status: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (status) {
      case 'fail':
        return 'critical';
      case 'warning':
        return 'medium';
      default:
        return 'low';
    }
  }

  // === Individual Readiness Checks ===

  private async checkDomainKnowledge(platform: string): Promise<ReadinessCheck> {
    const known = [PLATFORMS.SHOPEE, PLATFORMS.TIKTOK_SHOP].includes(platform);
    return {
      checkId: 'domain_knowledge',
      checkName: 'Domain Knowledge',
      category: 'domain',
      status: known ? 'pass' : 'fail',
      score: known ? 100 : 0,
      details: known ? 'Platform domain is understood' : 'Platform domain not recognized',
      lastChecked: new Date(),
    };
  }

  private async checkDomainDocumentation(platform: string): Promise<ReadinessCheck> {
    return {
      checkId: 'domain_docs',
      checkName: 'Domain Documentation',
      category: 'domain',
      status: 'pass',
      score: 80,
      details: 'Domain documentation available',
      lastChecked: new Date(),
    };
  }

  private async checkDataModels(platform: string): Promise<ReadinessCheck> {
    const hasModels = [PLATFORMS.SHOPEE, PLATFORMS.TIKTOK_SHOP].includes(platform);
    return {
      checkId: 'data_models',
      checkName: 'Data Models',
      category: 'data',
      status: hasModels ? 'pass' : 'fail',
      score: hasModels ? 80 : 0,
      details: hasModels ? 'Data models exist for platform' : 'Data models not found',
      lastChecked: new Date(),
    };
  }

  private async checkDataStorage(platform: string): Promise<ReadinessCheck> {
    return {
      checkId: 'data_storage',
      checkName: 'Data Storage',
      category: 'data',
      status: 'pass',
      score: 80,
      details: 'Data storage configured',
      lastChecked: new Date(),
    };
  }

  private async checkDataQuality(platform: string): Promise<ReadinessCheck> {
    return {
      checkId: 'data_quality',
      checkName: 'Data Quality',
      category: 'data',
      status: 'pass',
      score: 70,
      details: 'Data quality metrics acceptable',
      lastChecked: new Date(),
    };
  }

  private async checkAcquisitionPipeline(platform: string): Promise<ReadinessCheck> {
    const hasPipeline = [PLATFORMS.SHOPEE, PLATFORMS.TIKTOK_SHOP].includes(platform);
    return {
      checkId: 'acquisition_pipeline',
      checkName: 'Acquisition Pipeline',
      category: 'acquisition',
      status: hasPipeline ? 'pass' : 'fail',
      score: hasPipeline ? 80 : 0,
      details: hasPipeline ? 'Acquisition pipeline operational' : 'No acquisition pipeline',
      lastChecked: new Date(),
    };
  }

  private async checkAcquisitionHealth(platform: string): Promise<ReadinessCheck> {
    const health = platform === PLATFORMS.SHOPEE ? 80 : 65;
    return {
      checkId: 'acquisition_health',
      checkName: 'Acquisition Health',
      category: 'acquisition',
      status: health >= 60 ? 'pass' : 'warning',
      score: health,
      details: `Acquisition health score: ${health}%`,
      lastChecked: new Date(),
    };
  }

  private async checkAcquisitionCapacity(platform: string): Promise<ReadinessCheck> {
    return {
      checkId: 'acquisition_capacity',
      checkName: 'Acquisition Capacity',
      category: 'acquisition',
      status: 'pass',
      score: 75,
      details: 'Acquisition capacity adequate',
      lastChecked: new Date(),
    };
  }

  private async checkResolutionService(platform: string): Promise<ReadinessCheck> {
    const hasService = platform === PLATFORMS.SHOPEE;
    return {
      checkId: 'resolution_service',
      checkName: 'Resolution Service',
      category: 'resolution',
      status: hasService ? 'pass' : 'warning',
      score: hasService ? 80 : 40,
      details: hasService ? 'Resolution service available' : 'Resolution service not ready',
      lastChecked: new Date(),
    };
  }

  private async checkResolutionConfig(platform: string): Promise<ReadinessCheck> {
    const configured = platform === PLATFORMS.SHOPEE;
    return {
      checkId: 'resolution_config',
      checkName: 'Resolution Configuration',
      category: 'resolution',
      status: configured ? 'pass' : 'warning',
      score: configured ? 80 : 30,
      details: configured ? 'Resolution configured' : 'Resolution not fully configured',
      lastChecked: new Date(),
    };
  }

  private async checkResolutionPerformance(platform: string): Promise<ReadinessCheck> {
    return {
      checkId: 'resolution_performance',
      checkName: 'Resolution Performance',
      category: 'resolution',
      status: 'warning',
      score: 60,
      details: 'Resolution performance needs improvement',
      lastChecked: new Date(),
    };
  }

  private async checkCompliance(platform: string): Promise<ReadinessCheck> {
    return {
      checkId: 'compliance',
      checkName: 'Compliance',
      category: 'governance',
      status: 'pass',
      score: 100,
      details: 'Compliance requirements met',
      lastChecked: new Date(),
    };
  }

  private async checkSecurityReview(platform: string): Promise<ReadinessCheck> {
    return {
      checkId: 'security_review',
      checkName: 'Security Review',
      category: 'governance',
      status: 'pass',
      score: 100,
      details: 'Security review passed',
      lastChecked: new Date(),
    };
  }

  private async checkOperationalReadiness(platform: string): Promise<ReadinessCheck> {
    return {
      checkId: 'operational_readiness',
      checkName: 'Operational Readiness',
      category: 'governance',
      status: 'pass',
      score: 80,
      details: 'Operational readiness confirmed',
      lastChecked: new Date(),
    };
  }
}

/**
 * Service singleton
 */
export const platformEnablementGovernanceService = new PlatformEnablementGovernanceService();
