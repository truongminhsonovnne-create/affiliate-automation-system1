/**
 * Case Presentation Builder
 *
 * Maps backend case data to presentation models
 */

import type {
  ProductOpsCaseRowModel,
  ProductOpsCaseDetailModel,
  ProductOpsEvidencePanelModel,
  ProductOpsRecommendationModel,
  ProductOpsCaseSeverity,
  ProductOpsCaseStatus,
  ProductOpsCaseType,
} from '../types';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '../constants';
import { STALE_THRESHOLDS } from '../constants';

// ============================================================================
// Row Model Builder
// ============================================================================

/**
 * Build case row model from backend data
 */
export function buildProductOpsCaseRowModel(
  data: Record<string, unknown>
): ProductOpsCaseRowModel {
  const createdAt = new Date(data.createdAt as string);
  const updatedAt = new Date(data.updatedAt as string);
  const now = new Date();
  const daysInQueue = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const severity = (data.severity as ProductOpsCaseSeverity) || ProductOpsCaseSeverity.MEDIUM;
  const status = (data.status as ProductOpsCaseStatus) || ProductOpsCaseStatus.OPEN;

  return {
    id: data.id as string,
    caseKey: data.caseKey as string,
    title: data.title as string,
    caseType: (data.caseType as ProductOpsCaseType) || ProductOpsCaseType.MANUAL_REVIEW,
    severity,
    status,
    assigneeId: data.assigneeId as string | undefined,
    assigneeName: data.assigneeName as string | undefined,
    createdAt,
    updatedAt,
    dueAt: data.dueAt ? new Date(data.dueAt as string) : undefined,
    isStale: calculateIsStale(severity, createdAt),
    daysInQueue,
    evidenceCount: (data.evidenceCount as number) || 0,
    hasRecommendation: !!data.recommendation,
  };
}

/**
 * Calculate if a case is stale based on severity
 */
function calculateIsStale(severity: ProductOpsCaseSeverity, createdAt: Date): boolean {
  const hoursInQueue = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  switch (severity) {
    case ProductOpsCaseSeverity.CRITICAL:
      return hoursInQueue > STALE_THRESHOLDS.CRITICAL_HOURS;
    case ProductOpsCaseSeverity.HIGH:
      return hoursInQueue > STALE_THRESHOLDS.HIGH_HOURS;
    case ProductOpsCaseSeverity.MEDIUM:
      return hoursInQueue > STALE_THRESHOLDS.MEDIUM_HOURS;
    case ProductOpsCaseSeverity.LOW:
      return hoursInQueue > STALE_THRESHOLDS.LOW_HOURS;
    default:
      return hoursInQueue > STALE_THRESHOLDS.DEFAULT_HOURS;
  }
}

// ============================================================================
// Detail Model Builder
// ============================================================================

/**
 * Build full case detail model from backend data
 */
export function buildProductOpsCaseDetailModel(
  data: Record<string, unknown>
): ProductOpsCaseDetailModel {
  return {
    id: data.id as string,
    caseKey: data.caseKey as string,
    title: data.title as string,
    description: data.description as string || '',
    caseType: (data.caseType as ProductOpsCaseType) || ProductOpsCaseType.MANUAL_REVIEW,
    severity: (data.severity as ProductOpsCaseSeverity) || ProductOpsCaseSeverity.MEDIUM,
    status: (data.status as ProductOpsCaseStatus) || ProductOpsCaseStatus.OPEN,
    priority: (data.priority as number) || 50,

    // Assignment
    assigneeId: data.assigneeId as string | undefined,
    assigneeName: data.assigneeName as string | undefined,
    assignedAt: data.assignedAt ? new Date(data.assignedAt as string) : undefined,
    assignedBy: data.assignedBy as string | undefined,

    // Timestamps
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
    dueAt: data.dueAt ? new Date(data.dueAt as string) : undefined,
    resolvedAt: data.resolvedAt ? new Date(data.resolvedAt as string) : undefined,

    // Content
    evidence: buildEvidencePanelModel(data.evidence as Record<string, unknown> | undefined),
    recommendation: data.recommendation
      ? buildRecommendationModel(data.recommendation as Record<string, unknown>)
      : undefined,
    snapshots: buildSnapshotModels(data.snapshots as Array<Record<string, unknown>> | undefined),
    linkedEntities: buildLinkedEntityModels(
      data.linkedEntities as Array<Record<string, unknown>> | undefined
    ),

    // History
    history: buildHistoryModels(data.history as Array<Record<string, unknown>> | undefined),

    // Remediation
    linkedRemediationId: data.linkedRemediationId as string | undefined,

    // Metadata
    isStale: calculateIsStale(
      (data.severity as ProductOpsCaseSeverity) || ProductOpsCaseSeverity.MEDIUM,
      new Date(data.createdAt as string)
    ),
    canBeAssigned: canBeAssigned(data.status as ProductOpsCaseStatus),
    canBeReviewed: canBeReviewed(data.status as ProductOpsCaseStatus),
    version: (data.version as number) || 1,
  };
}

// ============================================================================
// Evidence Panel Builder
// ============================================================================

/**
 * Build evidence panel model
 */
export function buildEvidencePanelModel(
  evidence?: Record<string, unknown>
): ProductOpsEvidencePanelModel {
  if (!evidence) {
    return {
      summary: 'No evidence available',
      sections: [],
      keyFindings: [],
    };
  }

  const sections = buildEvidenceSections(evidence.sections as Array<Record<string, unknown>> | undefined);

  return {
    summary: (evidence.summary as string) || 'Evidence summary not available',
    sections,
    keyFindings: (evidence.keyFindings as string[]) || [],
    rawEvidence: evidence.raw as Record<string, unknown>,
  };
}

/**
 * Build evidence sections
 */
function buildEvidenceSections(
  sections?: Array<Record<string, unknown>>
): ProductOpsEvidencePanelModel['sections'] {
  if (!sections) return [];

  return sections.map((section) => ({
    title: section.title as string,
    content: section.content as string,
    type: (section.type as 'text' | 'table' | 'code' | 'list') || 'text',
    data: section.data as Record<string, unknown>[] | undefined,
  }));
}

// ============================================================================
// Recommendation Builder
// ============================================================================

/**
 * Build recommendation model
 */
export function buildRecommendationModel(
  recommendation: Record<string, unknown>
): ProductOpsRecommendationModel {
  return {
    recommendation: recommendation.recommendation as string,
    confidence: (recommendation.confidence as number) || 0.5,
    priority: (recommendation.priority as 'critical' | 'high' | 'medium' | 'low') || 'medium',
    suggestedActions: (recommendation.suggestedActions as string[]) || [],
    riskAssessment: recommendation.riskAssessment as string | undefined,
    alternatives: recommendation.alternatives as string[] | undefined,
  };
}

/**
 * Build recommendation presentation
 */
export function buildRecommendationPresentation(
  recommendation?: ProductOpsRecommendationModel
): {
  displayRecommendation: string;
  confidenceLabel: string;
  priorityLabel: string;
  priorityColor: string;
  hasHighConfidence: boolean;
  hasRiskAssessment: boolean;
} {
  if (!recommendation) {
    return {
      displayRecommendation: 'No recommendation available',
      confidenceLabel: 'Unknown',
      priorityLabel: 'Unknown',
      priorityColor: '#6b7280',
      hasHighConfidence: false,
      hasRiskAssessment: false,
    };
  }

  let confidenceLabel: string;
  if (recommendation.confidence >= 0.8) {
    confidenceLabel = 'High';
  } else if (recommendation.confidence >= 0.5) {
    confidenceLabel = 'Medium';
  } else {
    confidenceLabel = 'Low';
  }

  const priorityLabel =
    SEVERITY_CONFIG.LABELS[recommendation.priority] || 'Medium';
  const priorityColor =
    SEVERITY_CONFIG.COLORS[recommendation.priority] || '#6b7280';

  return {
    displayRecommendation: recommendation.recommendation,
    confidenceLabel,
    priorityLabel,
    priorityColor,
    hasHighConfidence: recommendation.confidence >= 0.7,
    hasRiskAssessment: !!recommendation.riskAssessment,
  };
}

// ============================================================================
// Status Presentation Builder
// ============================================================================

/**
 * Build case status presentation
 */
export function buildCaseStatusPresentation(
  status: ProductOpsCaseStatus
): {
  label: string;
  color: string;
  isTerminal: boolean;
  isActionable: boolean;
} {
  const label = STATUS_CONFIG.LABELS[status] || status;
  const color = STATUS_CONFIG.COLORS[status] || '#6b7280';
  const terminalStatuses = [
    ProductOpsCaseStatus.ACCEPTED,
    ProductOpsCaseStatus.REJECTED,
    ProductOpsCaseStatus.CLOSED,
  ];
  const actionableStatuses = [
    ProductOpsCaseStatus.OPEN,
    ProductOpsCaseStatus.IN_REVIEW,
    ProductOpsCaseStatus.PENDING_DECISION,
    ProductOpsCaseStatus.DEFERRED,
    ProductOpsCaseStatus.NEEDS_MORE_EVIDENCE,
  ];

  return {
    label,
    color,
    isTerminal: terminalStatuses.includes(status),
    isActionable: actionableStatuses.includes(status),
  };
}

// ============================================================================
// Snapshot Builder
// ============================================================================

/**
 * Build snapshot models
 */
function buildSnapshotModels(
  snapshots?: Array<Record<string, unknown>>
): ProductOpsCaseDetailModel['snapshots'] {
  if (!snapshots) return [];

  return snapshots.map((snapshot) => ({
    id: snapshot.id as string,
    snapshotType: snapshot.snapshotType as string,
    title: snapshot.title as string,
    createdAt: new Date(snapshot.createdAt as string),
    data: snapshot.data as Record<string, unknown>,
    summary: snapshot.summary as string,
  }));
}

// ============================================================================
// Linked Entity Builder
// ============================================================================

/**
 * Build linked entity models
 */
function buildLinkedEntityModels(
  entities?: Array<Record<string, unknown>>
): ProductOpsCaseDetailModel['linkedEntities'] {
  if (!entities) return [];

  return entities.map((entity) => ({
    entityType: entity.entityType as string,
    entityId: entity.entityId as string,
    entityKey: entity.entityKey as string,
    relation: entity.relation as string,
  }));
}

// ============================================================================
// History Builder
// ============================================================================

/**
 * Build history models
 */
function buildHistoryModels(
  history?: Array<Record<string, unknown>>
): ProductOpsCaseDetailModel['history'] {
  if (!history) return [];

  return history.map((entry) => ({
    id: entry.id as string,
    action: entry.action as string,
    actorId: entry.actorId as string,
    actorName: entry.actorName as string,
    timestamp: new Date(entry.timestamp as string),
    details: entry.details as string | undefined,
    metadata: entry.metadata as Record<string, unknown> | undefined,
  }));
}

// ============================================================================
// Status Helpers
// ============================================================================

function canBeAssigned(status?: ProductOpsCaseStatus): boolean {
  if (!status) return true;
  const assignableStatuses: ProductOpsCaseStatus[] = [
    ProductOpsCaseStatus.OPEN,
    ProductOpsCaseStatus.IN_REVIEW,
    ProductOpsCaseStatus.PENDING_DECISION,
    ProductOpsCaseStatus.DEFERRED,
    ProductOpsCaseStatus.NEEDS_MORE_EVIDENCE,
  ];
  return assignableStatuses.includes(status);
}

function canBeReviewed(status?: ProductOpsCaseStatus): boolean {
  if (!status) return true;
  const reviewableStatuses: ProductOpsCaseStatus[] = [
    ProductOpsCaseStatus.OPEN,
    ProductOpsCaseStatus.IN_REVIEW,
    ProductOpsCaseStatus.PENDING_DECISION,
    ProductOpsCaseStatus.DEFERRED,
    ProductOpsCaseStatus.NEEDS_MORE_EVIDENCE,
  ];
  return reviewableStatuses.includes(status);
}
