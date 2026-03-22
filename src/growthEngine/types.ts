/**
 * Growth Engine Types
 *
 * Core type definitions for Production Growth Engine + Programmatic SEO Governance
 */

// ============================================================================
// Enums
// ============================================================================

export enum GrowthSurfaceType {
  SHOP_PAGE = 'shop_page',
  CATEGORY_PAGE = 'category_page',
  INTENT_PAGE = 'intent_page',
  TOOL_ENTRY = 'tool_entry',
  DISCOVERY_PAGE = 'discovery_page',
  RANKING_PAGE = 'ranking_page',
  GUIDE_PAGE = 'guide_page',
}

export enum GrowthSurfaceStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  ACTIVE = 'active',
  STALE = 'stale',
  BLOCKED = 'blocked',
  DEINDEXED = 'deindexed',
}

export enum GrowthSurfaceIndexabilityStatus {
  PENDING = 'pending',
  INDEXABLE = 'indexable',
  NOINDEX = 'noindex',
  CANONICAL_MISMATCH = 'canonical_mismatch',
}

export enum GrowthSurfaceFreshnessStatus {
  FRESH = 'fresh',
  STALE = 'stale',
  NEEDS_REFRESH = 'needs_refresh',
}

export enum GrowthSurfaceGenerationStrategy {
  MANUAL = 'manual',
  PROGRAMMATIC = 'programmatic',
  CURATED = 'curated',
  DYNAMIC = 'dynamic',
}

export enum GrowthSurfaceLinkType {
  CONTEXTUAL = 'contextual',
  NAVIGATION = 'navigation',
  CTA = 'cta',
  RELATED = 'related',
  BREADCRUMB = 'breadcrumb',
}

export enum GrowthGovernanceActionType {
  BLOCK = 'block',
  DEINDEX = 'deindex',
  MARK_REVIEW = 'mark_review',
  APPROVE_SCALING = 'approve_scaling',
  REFRESH = 'refresh',
  ARCHIVE = 'archive',
}

export enum GrowthGovernanceActionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum GrowthQualityReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  REJECTED = 'rejected',
}

export enum GrowthGenerationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================================================
// Core Domain Types
// ============================================================================

export interface GrowthSurfaceInventoryRecord {
  id: string;
  surfaceType: GrowthSurfaceType;
  routeKey: string;
  routePath: string;
  slug: string;
  platform: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  pageStatus: GrowthSurfaceStatus;
  indexabilityStatus: GrowthSurfaceIndexabilityStatus;
  freshnessStatus: GrowthSurfaceFreshnessStatus;
  qualityScore: number | null;
  usefulnessScore: number | null;
  generationStrategy: GrowthSurfaceGenerationStrategy;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  lastGeneratedAt: Date | null;
  lastEvaluatedAt: Date | null;
}

export interface GrowthSurfaceGenerationRecord {
  id: string;
  surfaceInventoryId: string;
  generationStatus: GrowthGenerationStatus;
  generationReason: string | null;
  generationPayload: Record<string, unknown> | null;
  renderSummary: Record<string, unknown> | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface GrowthSurfaceQualityReview {
  id: string;
  surfaceInventoryId: string;
  reviewStatus: GrowthQualityReviewStatus;
  qualityScore: number | null;
  usefulnessScore: number | null;
  thinContentRisk: number | null;
  duplicationRisk: number | null;
  clutterRisk: number | null;
  reviewPayload: Record<string, unknown>;
  createdAt: Date;
}

export interface GrowthSurfaceLinkGraph {
  id: string;
  fromSurfaceId: string;
  toSurfaceId: string;
  linkType: GrowthSurfaceLinkType;
  linkPriority: number;
  isActive: boolean;
  createdAt: Date;
}

export interface GrowthSurfaceMetricAggregate {
  id: string;
  surfaceInventoryId: string;
  metricWindowStart: Date;
  metricWindowEnd: Date;
  pageViews: number;
  toolCtaClicks: number;
  toolEntryConversions: number;
  weakEngagementSignals: number;
  createdAt: Date;
}

export interface GrowthSurfaceGovernanceAction {
  id: string;
  surfaceInventoryId: string | null;
  actionType: GrowthGovernanceActionType;
  actionStatus: GrowthGovernanceActionStatus;
  actionPayload: Record<string, unknown>;
  actorId: string | null;
  actorRole: string | null;
  rationale: string | null;
  createdAt: Date;
  executedAt: Date | null;
}

// ============================================================================
// Score Types
// ============================================================================

export interface GrowthSurfaceQualityScore {
  overall: number;
  usefulness: number;
  clarity: number;
  ctaDiscipline: number;
  freshness: number;
  seoCleanliness: number;
  conversionRelevance: number;
}

export interface GrowthSurfaceUsefulnessScore {
  overall: number;
  toolConversion: number;
  engagementQuality: number;
  bounceRisk: number;
  valueDelivery: number;
}

// ============================================================================
// Decision Types
// ============================================================================

export interface GrowthSurfaceEligibilityDecision {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  conditions?: string[];
}

export interface GrowthSurfaceGenerationDecision {
  canGenerate: boolean;
  strategy: GrowthSurfaceGenerationStrategy;
  reasons: string[];
  warnings: string[];
  batchPriority?: number;
}

export interface GrowthSurfaceSeoDecision {
  indexable: boolean;
  canonicalRequired: boolean;
  noindexReasons: string[];
  structuredDataAllowed: boolean;
}

export interface GrowthSurfaceLinkDecision {
  links: GrowthSurfaceLinkGraph[];
  warnings: string[];
  limitReached: boolean;
}

export interface GrowthSurfaceContentDensityDecision {
  isTooThin: boolean;
  isTooCluttered: boolean;
  densityScore: number;
  recommendations: string[];
}

export interface GrowthSurfaceToolAlignmentDecision {
  aligned: boolean;
  ctaPreserved: boolean;
  toolEmphasis: number;
  wanderRisk: number;
  recommendations: string[];
}

export interface GrowthSurfaceFreshnessDecision {
  isFresh: boolean;
  needsRefresh: boolean;
  daysSinceUpdate: number;
  refreshRecommended: boolean;
}

// ============================================================================
// Governance Types
// ============================================================================

export interface GrowthSurfaceWarning {
  type: 'thin_content' | 'duplicate_content' | 'low_usefulness' | 'stale' | 'clutter' | 'wander_risk';
  message: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface GrowthSurfaceError {
  type: 'validation_error' | 'generation_error' | 'governance_error' | 'quality_error' | 'internal_error';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Portfolio Types
// ============================================================================

export interface GrowthSurfacePortfolioSummary {
  totalSurfaces: number;
  activeSurfaces: number;
  blockedSurfaces: number;
  deindexedSurfaces: number;
  staleSurfaces: number;
  indexableSurfaces: number;
  byType: Record<string, number>;
  averageQualityScore: number;
  averageUsefulnessScore: number;
}

export interface GrowthScalingReadinessReport {
  ready: boolean;
  risks: string[];
  recommendations: string[];
  blockedSurfaces: number;
  lowValueSurfaces: number;
  staleSurfaces: number;
  qualityIssues: number;
}

// ============================================================================
// API DTOs
// ============================================================================

export interface GrowthSurfaceInventoryDto {
  id: string;
  surfaceType: GrowthSurfaceType;
  routeKey: string;
  routePath: string;
  slug: string;
  platform: string | null;
  pageStatus: GrowthSurfaceStatus;
  indexabilityStatus: GrowthSurfaceIndexabilityStatus;
  freshnessStatus: GrowthSurfaceFreshnessStatus;
  qualityScore: number | null;
  usefulnessScore: number | null;
  generationStrategy: GrowthSurfaceGenerationStrategy;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthSurfaceQualityReviewDto {
  id: string;
  surfaceInventoryId: string;
  reviewStatus: GrowthQualityReviewStatus;
  qualityScore: number | null;
  usefulnessScore: number | null;
  thinContentRisk: number | null;
  duplicationRisk: number | null;
  clutterRisk: number | null;
  createdAt: string;
}

export interface GrowthSurfaceGovernanceActionDto {
  id: string;
  surfaceInventoryId: string | null;
  actionType: GrowthGovernanceActionType;
  actionStatus: GrowthGovernanceActionStatus;
  actorId: string | null;
  rationale: string | null;
  createdAt: string;
  executedAt: string | null;
}

export interface GrowthSurfacePortfolioSummaryDto {
  totalSurfaces: number;
  activeSurfaces: number;
  blockedSurfaces: number;
  deindexedSurfaces: number;
  staleSurfaces: number;
  indexableSurfaces: number;
  byType: Record<string, number>;
  averageQualityScore: number;
  averageUsefulnessScore: number;
}

export interface GrowthScalingReadinessReportDto {
  ready: boolean;
  risks: string[];
  recommendations: string[];
  blockedSurfaces: number;
  lowValueSurfaces: number;
  staleSurfaces: number;
  qualityIssues: number;
}

// ============================================================================
// Context Types
// ============================================================================

export interface GrowthEngineContext {
  userId: string;
  userName: string;
  userRole: string;
  permissions: GrowthEnginePermissions;
}

export interface GrowthEnginePermissions {
  canGenerateSurfaces: boolean;
  canManageGovernance: boolean;
  canApproveScaling: boolean;
  canViewAnalytics: boolean;
}
