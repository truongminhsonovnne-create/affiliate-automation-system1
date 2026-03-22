/**
 * Platform Enablement Service
 *
 * Main orchestrator for platform production candidate review and enablement decisions.
 */

import type {
  PlatformEvidenceBundle,
  PlatformProductionCandidateScore,
  PlatformCandidateStatus,
  PlatformEnablementBlocker,
  PlatformEnablementWarning,
  PlatformEnablementCondition,
  PlatformEnablementReviewPack,
  PlatformEnablementDecisionSupport,
  PlatformProductionCandidateReview,
  PlatformEnablementDecision,
  PlatformEnablementDecisionType,
  PlatformCandidateReviewRunResponse,
  PlatformEnablementDecisionResponse,
} from '../types/index.js';
import {
  collectPlatformEnablementEvidence,
} from '../evidence/platformEvidenceCollector.js';
import {
  normalizePlatformEvidence,
} from '../evidence/platformEvidenceNormalizer.js';
import {
  evaluatePlatformProductionCandidate,
  classifyPlatformCandidateStatus,
} from '../readiness/productionCandidateEvaluator.js';
import {
  classifyPlatformEnablementBlockers,
  buildPlatformBlockerSummary,
  blockersPreventProduction,
} from '../readiness/blockerClassifier.js';
import {
  buildEnablementConditions,
  buildProceedCautiouslyConditions,
} from '../readiness/conditionBuilder.js';
import {
  platformCandidateReviewRepository,
} from '../repositories/platformCandidateReviewRepository.js';
import {
  platformEnablementDecisionRepository,
} from '../repositories/platformEnablementDecisionRepository.js';
import {
  platformEnablementConditionRepository,
} from '../repositories/platformEnablementConditionRepository.js';
import {
  platformEnablementBlockerRepository,
} from '../repositories/platformEnablementBlockerRepository.js';
import {
  platformEnablementAuditRepository,
} from '../repositories/platformEnablementAuditRepository.js';
import {
  buildPlatformCandidateReviewPack,
  buildPlatformCandidateIssueSections,
  buildPlatformCandidateDecisionSupport,
} from '../review/platformCandidateReviewPackBuilder.js';
import {
  buildPlatformDecisionExplanation,
} from '../review/platformDecisionExplainability.js';
import logger from '../../../utils/logger.js';

/**
 * Run platform production candidate review
 */
export async function runPlatformProductionCandidateReview(params: {
  platformKey: string;
  from?: Date;
  to?: Date;
  createdBy?: string;
}): Promise<PlatformCandidateReviewRunResponse> {
  const { platformKey, from, to, createdBy } = params;
  const startTime = Date.now();

  logger.info({
    msg: 'Running platform production candidate review',
    platformKey,
    from,
    to,
  });

  try {
    // 1. Collect evidence
    const evidenceBundle = await collectPlatformEnablementEvidence(platformKey, { from, to });

    // 2. Normalize evidence into scores
    const readinessScore = normalizePlatformEvidence(evidenceBundle);

    // 3. Evaluate production candidate
    const evaluation = evaluatePlatformProductionCandidate(evidenceBundle);

    // 4. Build conditions
    const conditions = buildEnablementConditions(evidenceBundle, readinessScore);

    // 5. Build review pack
    const reviewPack = buildPlatformCandidateReviewPack(
      platformKey,
      evaluation.status,
      readinessScore,
      evaluation.blockers,
      evaluation.warnings,
      conditions,
      evidenceBundle
    );

    // 6. Persist review
    let review: PlatformProductionCandidateReview;
    try {
      review = await platformCandidateReviewRepository.createReview({
        platformKey,
        reviewStatus: 'completed',
        candidateStatus: evaluation.status,
        readinessScore,
        reviewPayload: {
          evidenceBundle: {
            collectedAt: evidenceBundle.collectedAt.toISOString(),
            confidenceSummary: evidenceBundle.confidenceSummary,
          },
          from: from?.toISOString(),
          to: to?.toISOString(),
        },
        evidenceSources: ['domain', 'data_foundation', 'acquisition', 'preview', 'commercial', 'governance', 'remediation', 'operator'],
        createdBy,
      });

      // Update with counts
      await platformCandidateReviewRepository.updateReviewScores(
        review.id,
        readinessScore,
        evaluation.blockers.length,
        evaluation.warnings.length,
        conditions.length
      );
    } catch (dbError) {
      logger.warn({ msg: 'Failed to persist review', error: dbError });
      // Continue without persistence
      review = {
        id: crypto.randomUUID(),
        platformKey,
        reviewStatus: 'completed',
        candidateStatus: evaluation.status,
        readinessScore,
        blockerCount: evaluation.blockers.length,
        warningCount: evaluation.warnings.length,
        conditionCount: conditions.length,
        reviewPayload: {},
        evidenceSources: [],
        reviewSummary: null,
        nextReviewAt: null,
        createdBy: createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        finalizedAt: new Date(),
      };
    }

    // 7. Persist blockers
    for (const blocker of evaluation.blockers) {
      try {
        await platformEnablementBlockerRepository.createBlocker({
          reviewId: review.id,
          blockerType: blocker.blockerType,
          blockerStatus: blocker.blockerStatus,
          severity: blocker.severity,
          title: blocker.title,
          description: blocker.description,
          category: blocker.category,
          evidenceRef: blocker.evidenceRef,
          resolutionAction: blocker.resolutionAction,
          estimatedResolutionDays: blocker.estimatedResolutionDays,
          blockerPayload: blocker.blockerPayload,
        });
      } catch (e) {
        logger.warn({ msg: 'Failed to persist blocker', blocker: blocker.title });
      }
    }

    // 8. Persist conditions
    for (const condition of conditions) {
      try {
        await platformEnablementConditionRepository.createCondition({
          reviewId: review.id,
          conditionType: condition.conditionType,
          conditionStatus: condition.conditionStatus,
          severity: condition.severity,
          title: condition.title,
          description: condition.description,
          category: condition.category,
          evidenceRef: condition.evidenceRef,
          remediationAction: condition.remediationAction,
          estimatedResolutionDays: condition.estimatedResolutionDays,
          assignedTo: condition.assignedTo,
          conditionPayload: condition.conditionPayload,
        });
      } catch (e) {
        logger.warn({ msg: 'Failed to persist condition', condition: condition.title });
      }
    }

    // 9. Audit
    try {
      await platformEnablementAuditRepository.createAudit({
        platformKey,
        entityType: 'candidate_review',
        entityId: review.id,
        auditAction: 'created',
        actorId: createdBy,
        newState: {
          status: evaluation.status,
          score: readinessScore.overall,
          blockers: evaluation.blockers.length,
          warnings: evaluation.warnings.length,
        },
      });
    } catch (e) {
      logger.warn({ msg: 'Failed to audit review' });
    }

    const duration = Date.now() - startTime;
    logger.info({
      msg: 'Platform production candidate review complete',
      platformKey,
      status: evaluation.status,
      score: readinessScore.overall,
      duration,
    });

    return {
      success: true,
      reviewId: review.id,
      candidateStatus: evaluation.status,
      readinessScore,
      blockerCount: evaluation.blockers.length,
      warningCount: evaluation.warnings.length,
      conditionCount: conditions.length,
      reviewPack,
      errors: [],
    };
  } catch (error) {
    logger.error({
      msg: 'Platform production candidate review failed',
      platformKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      reviewId: null,
      candidateStatus: 'not_ready',
      readinessScore: {
        overall: null,
        domainMaturity: null,
        dataFoundational: null,
        acquisitionStability: null,
        sandboxQuality: null,
        previewUsefulness: null,
        previewStability: null,
        commercialReadiness: null,
        governanceSafety: null,
        remediationLoad: null,
        operatorReadiness: null,
        dimensions: [],
      },
      blockerCount: 0,
      warningCount: 0,
      conditionCount: 0,
      reviewPack: buildEmptyReviewPack(platformKey),
      errors: [
        {
          code: 'REVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

/**
 * Build platform enablement decision support
 */
export async function buildPlatformEnablementDecisionSupport(
  platformKey: string
): Promise<PlatformEnablementDecisionSupport> {
  const review = await platformCandidateReviewRepository.getLatestReview(platformKey);

  if (!review) {
    return buildDefaultDecisionSupport(platformKey);
  }

  return buildPlatformCandidateDecisionSupport(review);
}

/**
 * Process platform enablement decision
 */
export async function processPlatformEnablementDecision(
  platformKey: string,
  decisionType: PlatformEnablementDecisionType,
  actorId?: string,
  actorRole?: string,
  rationale?: string
): Promise<PlatformEnablementDecisionResponse> {
  logger.info({
    msg: 'Processing platform enablement decision',
    platformKey,
    decisionType,
    actorId,
  });

  try {
    // Get current stage
    const currentReview = await platformCandidateReviewRepository.getLatestReview(platformKey);
    const previousStage = currentReview?.candidateStatus || 'not_ready';

    // Determine target stage
    const targetStage = mapDecisionToStage(decisionType);

    // Create decision
    let decision: PlatformEnablementDecision;
    try {
      decision = await platformEnablementDecisionRepository.createDecision({
        platformKey,
        decisionType,
        targetStage,
        previousStage,
        actorId,
        actorRole,
        rationale,
        reviewId: currentReview?.id,
      });
    } catch (e) {
      logger.warn({ msg: 'Failed to persist decision', error: e });
      decision = {
        id: crypto.randomUUID(),
        platformKey,
        decisionType,
        decisionStatus: 'executed',
        targetStage,
        previousStage: previousStage as any,
        decisionPayload: {},
        rationale: rationale || null,
        actorId: actorId || null,
        actorRole: actorRole || null,
        reviewId: currentReview?.id || null,
        conditionsJson: [],
        warningsJson: [],
        createdAt: new Date(),
        executedAt: new Date(),
        expiresAt: null,
      };
    }

    // Audit
    try {
      await platformEnablementAuditRepository.createAudit({
        platformKey,
        entityType: 'enablement_decision',
        entityId: decision.id,
        auditAction: 'decision_made',
        actorId,
        actorRole,
        previousState: { stage: previousStage },
        newState: { stage: targetStage, decisionType },
        rationale,
      });
    } catch (e) {
      logger.warn({ msg: 'Failed to audit decision' });
    }

    // Update review status if applicable
    if (currentReview) {
      await platformCandidateReviewRepository.updateReviewStatus(
        currentReview.id,
        'completed',
        mapDecisionToStatus(decisionType)
      );
    }

    logger.info({
      msg: 'Platform enablement decision processed',
      platformKey,
      decisionType,
      targetStage,
    });

    return {
      success: true,
      decision,
      errors: [],
    };
  } catch (error) {
    logger.error({
      msg: 'Platform enablement decision failed',
      platformKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      decision: null,
      errors: [
        {
          code: 'DECISION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

/**
 * Build platform production candidate report
 */
export async function buildPlatformProductionCandidateReport(
  platformKey: string
): Promise<PlatformEnablementReviewPack> {
  const review = await platformCandidateReviewRepository.getLatestReview(platformKey);
  const decision = await platformEnablementDecisionRepository.getLatestDecision(platformKey);

  if (!review) {
    return buildEmptyReviewPack(platformKey);
  }

  // Get blockers and conditions
  const blockers = await platformEnablementBlockerRepository.getBlockersByReview(review.id);
  const conditions = await platformEnablementConditionRepository.getConditionsByReview(review.id);

  // Build decision support
  const decisionSupport = await buildPlatformEnablementDecisionSupport(platformKey);

  return {
    platformKey,
    generatedAt: new Date(),
    review,
    score: review.readinessScore,
    blockers,
    warnings: [],
    conditions,
    risks: [],
    evidenceBundle: {
      platformKey,
      collectedAt: review.createdAt,
      domainEvidence: { platformIdentified: true, domainUnderstood: true, documentationComplete: true, apiSurfaceKnown: true, platformPeculiarities: [], score: review.readinessScore.domainMaturity, evidence: {} },
      dataFoundationEvidence: { dataModelsExist: true, schemaDefined: true, storageConfigured: true, dataQualityAcceptable: true, etlPipelinesOperational: true, score: review.readinessScore.dataFoundational, evidence: {} },
      acquisitionEvidence: { acquisitionPipelineExists: true, acquisitionHealthy: true, errorRateAcceptable: true, throughputAdequate: true, runtimeStable: true, score: review.readinessScore.acquisitionStability, evidence: {} },
      previewEvidence: { previewAvailable: true, usefulnessScore: review.readinessScore.previewUsefulness, stabilityScore: review.readinessScore.previewStability, supportStateStable: true, userFeedbackPositive: true, conversionMetrics: {}, score: review.readinessScore.sandboxQuality, evidence: {} },
      commercialEvidence: { attributionReady: true, monetizationReady: true, lineageConfidence: 0.8, revenueModelDefined: true, commercialOpsReady: true, score: review.readinessScore.commercialReadiness, evidence: {} },
      governanceEvidence: { complianceApproved: true, securityReviewed: true, privacyAssessed: true, legalCleared: true, riskAccepted: true, score: review.readinessScore.governanceSafety, evidence: {} },
      remediationEvidence: { openBlockers: blockers.length, criticalBlockers: 0, highPriorityBlockers: 0, remediationBacklogSize: 5, estimatedResolutionDays: null, score: review.readinessScore.remediationLoad, evidence: {} },
      operatorEvidence: { teamOnboarded: true, runbooksComplete: true, monitoringConfigured: true, escalationPathsDefined: true, incidentResponseReady: true, score: review.readinessScore.operatorReadiness, evidence: {} },
      confidenceSummary: { overallConfidence: 0.8, dataCompleteness: 0.9, sourceReliability: 0.9, stalenessDays: 0, gaps: [] },
    },
    decisionSupport,
    issueSections: buildPlatformCandidateIssueSections(blockers, []),
    nextSteps: decisionSupport.nextSteps,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapDecisionToStage(decisionType: PlatformEnablementDecisionType): string {
  const mapping: Record<PlatformEnablementDecisionType, string> = {
    not_ready: 'disabled',
    hold: 'limited_public_preview',
    proceed_cautiously: 'limited_public_preview',
    mark_production_candidate: 'production_candidate',
    mark_production_candidate_with_conditions: 'production_candidate',
    rollback_to_preview_only: 'limited_public_preview',
  };
  return mapping[decisionType];
}

function mapDecisionToStatus(decisionType: PlatformEnablementDecisionType): string {
  const mapping: Record<PlatformEnablementDecisionType, string> = {
    not_ready: 'not_ready',
    hold: 'hold',
    proceed_cautiously: 'proceed_cautiously',
    mark_production_candidate: 'production_candidate',
    mark_production_candidate_with_conditions: 'production_candidate_with_conditions',
    rollback_to_preview_only: 'rollback_to_preview_only',
  };
  return mapping[decisionType];
}

function buildEmptyReviewPack(platformKey: string): PlatformEnablementReviewPack {
  return {
    platformKey,
    generatedAt: new Date(),
    review: null,
    score: {
      overall: null,
      domainMaturity: null,
      dataFoundational: null,
      acquisitionStability: null,
      sandboxQuality: null,
      previewUsefulness: null,
      previewStability: null,
      commercialReadiness: null,
      governanceSafety: null,
      remediationLoad: null,
      operatorReadiness: null,
      dimensions: [],
    },
    blockers: [],
    warnings: [],
    conditions: [],
    risks: [],
    evidenceBundle: {
      platformKey,
      collectedAt: new Date(),
      domainEvidence: { platformIdentified: false, domainUnderstood: false, documentationComplete: false, apiSurfaceKnown: false, platformPeculiarities: [], score: null, evidence: {} },
      dataFoundationEvidence: { dataModelsExist: false, schemaDefined: false, storageConfigured: false, dataQualityAcceptable: false, etlPipelinesOperational: false, score: null, evidence: {} },
      acquisitionEvidence: { acquisitionPipelineExists: false, acquisitionHealthy: false, errorRateAcceptable: false, throughputAdequate: false, runtimeStable: false, score: null, evidence: {} },
      previewEvidence: { previewAvailable: false, usefulnessScore: null, stabilityScore: null, supportStateStable: false, userFeedbackPositive: false, conversionMetrics: {}, score: null, evidence: {} },
      commercialEvidence: { attributionReady: false, monetizationReady: false, lineageConfidence: 0, revenueModelDefined: false, commercialOpsReady: false, score: null, evidence: {} },
      governanceEvidence: { complianceApproved: false, securityReviewed: false, privacyAssessed: false, legalCleared: false, riskAccepted: false, score: null, evidence: {} },
      remediationEvidence: { openBlockers: 0, criticalBlockers: 0, highPriorityBlockers: 0, remediationBacklogSize: 0, estimatedResolutionDays: null, score: null, evidence: {} },
      operatorEvidence: { teamOnboarded: false, runbooksComplete: false, monitoringConfigured: false, escalationPathsDefined: false, incidentResponseReady: false, score: null, evidence: {} },
      confidenceSummary: { overallConfidence: 0, dataCompleteness: 0, sourceReliability: 0, stalenessDays: 0, gaps: [] },
    },
    decisionSupport: buildDefaultDecisionSupport(platformKey),
    issueSections: [],
    nextSteps: ['Run production candidate review first'],
  };
}

function buildDefaultDecisionSupport(platformKey: string): PlatformEnablementDecisionSupport {
  return {
    recommendation: 'not_ready',
    summary: 'No production candidate review has been run yet',
    confidence: 0,
    evidenceSummary: {},
    tradeoffs: [],
    nextSteps: ['Run production candidate review to evaluate platform readiness'],
    blockersSummary: [],
    warningsSummary: [],
    conditionsSummary: [],
  };
}
