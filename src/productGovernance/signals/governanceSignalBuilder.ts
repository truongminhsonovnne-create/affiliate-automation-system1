/**
 * Governance Signal Builder
 *
 * Normalizes signals from multiple sources into standardized governance signals.
 */

import {
  ProductGovernanceSignal,
  ProductGovernanceSignalType,
  ProductGovernanceSeverity,
  ProductOpsCaseSignalPayload,
  ExperimentGuardrailSignalPayload,
  NoMatchSpikeSignalPayload,
  QaRegressionSignalPayload,
  OperationalIssueSignalPayload,
} from '../types';

/**
 * Build governance signal from Product Ops case
 */
export function buildGovernanceSignalFromProductOpsCase(
  caseData: {
    id: string;
    caseKey: string;
    caseType: string;
    severity: string;
    status: string;
    isStale: boolean;
    daysInQueue: number;
    hasRecommendation: boolean;
  },
  source: string = 'product_ops_workbench'
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> {
  // Map case severity to governance severity
  const severity = mapCaseSeverityToGovernance(caseData.severity, caseData.isStale);

  const payload: ProductOpsCaseSignalPayload = {
    caseId: caseData.id,
    caseKey: caseData.caseKey,
    caseType: caseData.caseType,
    severity: caseData.severity,
    status: caseData.status,
    isStale: caseData.isStale,
    daysInQueue: caseData.daysInQueue,
    hasRecommendation: caseData.hasRecommendation,
  };

  return {
    signalType: ProductGovernanceSignalType.PRODUCT_OPS_CASE,
    signalSource: source,
    severity,
    targetEntityType: 'product_ops_case',
    targetEntityId: caseData.id,
    payload,
    isActive: isCaseActiveForGovernance(caseData.status),
  };
}

/**
 * Build governance signal from experiment guardrail breach
 */
export function buildGovernanceSignalFromExperimentGuardrail(
  breachData: {
    experimentId: string;
    experimentName: string;
    guardrailType: string;
    breachSeverity: string;
    affectedUsers: number;
    metric: string;
    currentValue: number;
    threshold: number;
  },
  source: string = 'experimentation_framework'
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> {
  const severity = mapGuardrailSeverityToGovernance(breachData.breachSeverity);

  const payload: ExperimentGuardrailSignalPayload = {
    experimentId: breachData.experimentId,
    experimentName: breachData.experimentName,
    guardrailType: breachData.guardrailType,
    breachSeverity: breachData.breachSeverity,
    affectedUsers: breachData.affectedUsers,
    metric: breachData.metric,
    currentValue: breachData.currentValue,
    threshold: breachData.threshold,
  };

  return {
    signalType: ProductGovernanceSignalType.EXPERIMENT_GUARDRAIL,
    signalSource: source,
    severity,
    targetEntityType: 'experiment',
    targetEntityId: breachData.experimentId,
    payload,
    isActive: true,
  };
}

/**
 * Build governance signal from no-match spike
 */
export function buildGovernanceSignalFromNoMatchSpike(
  spikeData: {
    metric: string;
    currentValue: number;
    baselineValue: number;
    spikePercentage: number;
    affectedVouchers: number;
    timeWindow: string;
  },
  source: string = 'voucher_intelligence'
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> {
  const severity = calculateNoMatchSeverity(spikeData);

  const payload: NoMatchSpikeSignalPayload = {
    metric: spikeData.metric,
    currentValue: spikeData.currentValue,
    baselineValue: spikeData.baselineValue,
    spikePercentage: spikeData.spikePercentage,
    affectedVouchers: spikeData.affectedVouchers,
    timeWindow: spikeData.timeWindow,
  };

  return {
    signalType: ProductGovernanceSignalType.NO_MATCH_SPIKE,
    signalSource: source,
    severity,
    targetEntityType: 'voucher_intelligence',
    targetEntityId: `no_match_${spikeData.timeWindow}`,
    payload,
    isActive: severity === ProductGovernanceSeverity.CRITICAL || severity === ProductGovernanceSeverity.HIGH,
  };
}

/**
 * Build governance signal from QA regression
 */
export function buildGovernanceSignalFromQaRegression(
  regressionData: {
    testSuiteId: string;
    testName: string;
    regressionSeverity: string;
    failureRate: number;
    firstFailedAt: Date;
    affectedFeatures: string[];
  },
  source: string = 'qa_framework'
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> {
  const severity = mapRegressionSeverityToGovernance(regressionData.regressionSeverity);

  const payload: QaRegressionSignalPayload = {
    testSuiteId: regressionData.testSuiteId,
    testName: regressionData.testName,
    regressionSeverity: regressionData.regressionSeverity,
    failureRate: regressionData.failureRate,
    firstFailedAt: regressionData.firstFailedAt,
    affectedFeatures: regressionData.affectedFeatures,
  };

  return {
    signalType: ProductGovernanceSignalType.QA_REGRESSION,
    signalSource: source,
    severity,
    targetEntityType: 'qa_test',
    targetEntityId: regressionData.testSuiteId,
    payload,
    isActive: true,
  };
}

/**
 * Build governance signal from operational issue
 */
export function buildGovernanceSignalFromOperationalIssue(
  issueData: {
    issueId: string;
    issueType: string;
    severity: string;
    errorRate?: number;
    latencyP99?: number;
    affectedEndpoints: string[];
    detectedAt: Date;
  },
  source: string = 'observability'
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> {
  const severity = mapOperationalSeverityToGovernance(issueData);

  const payload: OperationalIssueSignalPayload = {
    issueId: issueData.issueId,
    issueType: issueData.issueType,
    severity: issueData.severity,
    errorRate: issueData.errorRate,
    latencyP99: issueData.latencyP99,
    affectedEndpoints: issueData.affectedEndpoints,
    detectedAt: issueData.detectedAt,
  };

  return {
    signalType: ProductGovernanceSignalType.OPERATIONAL_ISSUE,
    signalSource: source,
    severity,
    targetEntityType: 'operational_issue',
    targetEntityId: issueData.issueId,
    payload,
    isActive: true,
  };
}

/**
 * Build governance signal from staging verification failure
 */
export function buildGovernanceSignalFromStagingFailure(
  failureData: {
    deploymentId: string;
    environment: string;
    failureType: string;
    failureSeverity: string;
    failedChecks: string[];
  },
  source: string = 'release_pipeline'
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> {
  const severity = mapStagingSeverityToGovernance(failureData.failureSeverity);

  return {
    signalType: ProductGovernanceSignalType.STAGING_FAILURE,
    signalSource: source,
    severity,
    targetEntityType: 'deployment',
    targetEntityId: failureData.deploymentId,
    payload: failureData,
    isActive: severity === ProductGovernanceSeverity.CRITICAL || severity === ProductGovernanceSeverity.HIGH,
  };
}

/**
 * Build governance signal from tuning change
 */
export function buildGovernanceSignalFromTuningChange(
  tuningData: {
    tuningId: string;
    tuningName: string;
    changeType: string;
    riskLevel: string;
    affectedSystems: string[];
  },
  source: string = 'tuning_controls'
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> {
  const severity = mapTuningRiskToGovernance(tuningData.riskLevel);

  return {
    signalType: ProductGovernanceSignalType.TUNING_CHANGE,
    signalSource: source,
    severity,
    targetEntityType: 'tuning',
    targetEntityId: tuningData.tuningId,
    payload: tuningData,
    isActive: severity === ProductGovernanceSeverity.CRITICAL || severity === ProductGovernanceSeverity.HIGH,
  };
}

/**
 * Build governance signal from ranking quality degradation
 */
export function buildGovernanceSignalFromRankingQuality(
  qualityData: {
    metric: string;
    currentValue: number;
    baselineValue: number;
    degradationPercentage: number;
    affectedSearchTerms: number;
  },
  source: string = 'ranking_intelligence'
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> {
  const severity = calculateRankingSeverity(qualityData.degradationPercentage);

  return {
    signalType: ProductGovernanceSignalType.RANKING_QUALITY,
    signalSource: source,
    severity,
    targetEntityType: 'ranking_quality',
    targetEntityId: `ranking_${qualityData.metric}`,
    payload: qualityData,
    isActive: severity === ProductGovernanceSeverity.CRITICAL || severity === ProductGovernanceSeverity.HIGH,
  };
}

/**
 * Normalize a raw signal into standard governance format
 */
export function normalizeGovernanceSignal(
  rawSignal: Record<string, unknown>,
  source: string
): Omit<ProductGovernanceSignal, 'id' | 'createdAt'> | null {
  const signalType = rawSignal.signalType as string;

  switch (signalType) {
    case 'product_ops_case':
      return buildGovernanceSignalFromProductOpsCase(
        rawSignal as unknown as Parameters<typeof buildGovernanceSignalFromProductOpsCase>[0],
        source
      );
    case 'experiment_guardrail':
      return buildGovernanceSignalFromExperimentGuardrail(
        rawSignal as unknown as Parameters<typeof buildGovernanceSignalFromExperimentGuardrail>[0],
        source
      );
    case 'no_match_spike':
      return buildGovernanceSignalFromNoMatchSpike(
        rawSignal as unknown as Parameters<typeof buildGovernanceSignalFromNoMatchSpike>[0],
        source
      );
    case 'qa_regression':
      return buildGovernanceSignalFromQaRegression(
        rawSignal as unknown as Parameters<typeof buildGovernanceSignalFromQaRegression>[0],
        source
      );
    case 'operational_issue':
      return buildGovernanceSignalFromOperationalIssue(
        rawSignal as unknown as Parameters<typeof buildGovernanceSignalFromOperationalIssue>[0],
        source
      );
    default:
      return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapCaseSeverityToGovernance(
  caseSeverity: string,
  isStale: boolean
): ProductGovernanceSeverity {
  // Critical case or stale critical case = critical
  if (caseSeverity === 'critical' || (caseSeverity === 'high' && isStale)) {
    return ProductGovernanceSeverity.CRITICAL;
  }

  // High severity
  if (caseSeverity === 'high') {
    return ProductGovernanceSeverity.HIGH;
  }

  // Medium severity
  if (caseSeverity === 'medium') {
    return ProductGovernanceSeverity.MEDIUM;
  }

  // Low/default
  return ProductGovernanceSeverity.LOW;
}

function mapGuardrailSeverityToGovernance(breachSeverity: string): ProductGovernanceSeverity {
  switch (breachSeverity.toLowerCase()) {
    case 'critical':
    case 'critical_breach':
      return ProductGovernanceSeverity.CRITICAL;
    case 'high':
    case 'high_breach':
      return ProductGovernanceSeverity.HIGH;
    case 'medium':
    case 'medium_breach':
      return ProductGovernanceSeverity.MEDIUM;
    default:
      return ProductGovernanceSeverity.LOW;
  }
}

function calculateNoMatchSeverity(spike: {
  spikePercentage: number;
  currentValue: number;
}): ProductGovernanceSeverity {
  if (spike.spikePercentage >= 200 || spike.currentValue >= 50) {
    return ProductGovernanceSeverity.CRITICAL;
  }
  if (spike.spikePercentage >= 100 || spike.currentValue >= 30) {
    return ProductGovernanceSeverity.HIGH;
  }
  if (spike.spikePercentage >= 50 || spike.currentValue >= 20) {
    return ProductGovernanceSeverity.MEDIUM;
  }
  return ProductGovernanceSeverity.LOW;
}

function mapRegressionSeverityToGovernance(regressionSeverity: string): ProductGovernanceSeverity {
  switch (regressionSeverity.toLowerCase()) {
    case 'critical':
      return ProductGovernanceSeverity.CRITICAL;
    case 'high':
      return ProductGovernanceSeverity.HIGH;
    case 'medium':
      return ProductGovernanceSeverity.MEDIUM;
    default:
      return ProductGovernanceSeverity.LOW;
  }
}

function mapOperationalSeverityToGovernance(issue: {
  severity: string;
  errorRate?: number;
  latencyP99?: number;
}): ProductGovernanceSeverity {
  // Check explicit severity first
  if (issue.severity === 'critical') {
    return ProductGovernanceSeverity.CRITICAL;
  }

  // Check error rate thresholds
  if (issue.errorRate !== undefined) {
    if (issue.errorRate >= 5) return ProductGovernanceSeverity.CRITICAL;
    if (issue.errorRate >= 2) return ProductGovernanceSeverity.HIGH;
    if (issue.errorRate >= 1) return ProductGovernanceSeverity.MEDIUM;
  }

  // Check latency thresholds
  if (issue.latencyP99 !== undefined) {
    if (issue.latencyP99 >= 2000) return ProductGovernanceSeverity.CRITICAL;
    if (issue.latencyP99 >= 1000) return ProductGovernanceSeverity.HIGH;
    if (issue.latencyP99 >= 500) return ProductGovernanceSeverity.MEDIUM;
  }

  return ProductGovernanceSeverity.LOW;
}

function mapStagingSeverityToGovernance(failureSeverity: string): ProductGovernanceSeverity {
  switch (failureSeverity.toLowerCase()) {
    case 'critical':
      return ProductGovernanceSeverity.CRITICAL;
    case 'high':
      return ProductGovernanceSeverity.HIGH;
    case 'medium':
      return ProductGovernanceSeverity.MEDIUM;
    default:
      return ProductGovernanceSeverity.LOW;
  }
}

function mapTuningRiskToGovernance(riskLevel: string): ProductGovernanceSeverity {
  switch (riskLevel.toLowerCase()) {
    case 'critical':
    case 'high_risk':
      return ProductGovernanceSeverity.CRITICAL;
    case 'medium_risk':
      return ProductGovernanceSeverity.HIGH;
    case 'low_risk':
      return ProductGovernanceSeverity.MEDIUM;
    default:
      return ProductGovernanceSeverity.LOW;
  }
}

function calculateRankingSeverity(degradationPercentage: number): ProductGovernanceSeverity {
  if (degradationPercentage >= 50) {
    return ProductGovernanceSeverity.CRITICAL;
  }
  if (degradationPercentage >= 25) {
    return ProductGovernanceSeverity.HIGH;
  }
  if (degradationPercentage >= 10) {
    return ProductGovernanceSeverity.MEDIUM;
  }
  return ProductGovernanceSeverity.LOW;
}

function isCaseActiveForGovernance(status: string): boolean {
  const inactiveStatuses = ['closed', 'accepted', 'rejected'];
  return !inactiveStatuses.includes(status.toLowerCase());
}
