/**
 * Voucher Intelligence Types
 *
 * Shared type definitions for the voucher intelligence improvement loop
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export enum VoucherOutcomeEventType {
  RESOLUTION_VIEWED = 'resolution_viewed',
  BEST_VOUCHER_VIEWED = 'best_voucher_viewed',
  CANDIDATE_VIEWED = 'candidate_viewed',
  VOUCHER_COPIED = 'voucher_copied',
  VOUCHER_COPY_FAILED = 'voucher_copy_failed',
  OPEN_SHOPEE_CLICKED = 'open_shopee_clicked',
  NO_MATCH_VIEWED = 'no_match_viewed',
  FALLBACK_CLICKED = 'fallback_clicked',
  EXACT_MATCH_CONFIRMED = 'exact_match_confirmed',
}

export enum VoucherOptimizationInsightType {
  BEST_VOUCHER_UNDERPERFORMANCE = 'best_voucher_underperformance',
  CANDIDATE_OUTPERFORMING_BEST = 'candidate_outperforming_best',
  NO_MATCH_COVERAGE_GAP = 'no_match_coverage_gap',
  RANKING_DIVERGENCE = 'ranking_divergence',
  COPY_FAILURE_PATTERN = 'copy_failure_pattern',
  LOW_CONFIDENCE_RESOLUTION = 'low_confidence_resolution',
  EXPLANATION_WEAKNESS = 'explanation_weakness',
  FALLBACK_HANDLING = 'fallback_handling',
}

export enum VoucherOptimizationSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum InsightStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum FeedbackSource {
  USER_BEHAVIOR = 'user_behavior',
  MANUAL_REVIEW = 'manual_review',
  OPERATOR = 'operator',
  AUTOMATED = 'automated',
}

export enum FeedbackType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

export enum NoMatchRootCause {
  INVALID_URL = 'invalid_url',
  PARSER_WEAKNESS = 'parser_weakness',
  CONTEXT_WEAKNESS = 'context_weakness',
  CATALOG_COVERAGE = 'catalog_coverage',
  RULE_TOO_STRICT = 'rule_too_strict',
  RANKING_FALLBACK_POOR = 'ranking_fallback_poor',
  UNKNOWN = 'unknown',
}

export enum Platform {
  SHOPEE = 'shopee',
  TIKTOK = 'tiktok',
  LAZADA = 'lazada',
}

// ============================================================================
// Core Signal Types
// ============================================================================

export interface VoucherOutcomeSignal {
  id: string;
  outcomeId: string;
  eventType: VoucherOutcomeEventType;
  voucherId?: string;
  eventPayload?: Record<string, unknown>;
  eventOrder?: number;
  sessionId?: string;
  userId?: string;
  createdAt: Date;
}

export interface VoucherOutcomeSession {
  id: string;
  resolutionRequestId?: string;
  platform: Platform;
  normalizedUrl: string;
  productContext?: Record<string, unknown>;
  bestVoucherId?: string;
  shownVoucherIds: string[];
  growthSurfaceType?: string;
  attributionContext?: VoucherOutcomeAttributionContext;
  signals: VoucherOutcomeSignal[];
  createdAt: Date;
}

// ============================================================================
// Aggregate Types
// ============================================================================

export interface VoucherOutcomeAggregate {
  voucherId: string;
  platform: Platform;
  timeWindow: TimeWindow;

  // View metrics
  viewCount: number;
  bestVoucherShownCount: number;
  candidateShownCount: number;

  // Copy metrics
  copyCount: number;
  copySuccessCount: number;
  copyFailureCount: number;
  copySuccessRate: number;

  // Click metrics
  openShopeeClickCount: number;
  openShopeeClickRate: number;

  // Selection behavior
  bestSelectedCount: number;
  candidateSelectedCount: number;
  bestVsCandidateDivergence: number;

  // No-match
  noMatchViewedCount: number;
  fallbackClickedCount: number;
  fallbackClickRate: number;

  // Confidence
  avgConfidenceScore?: number;

  // Attribution
  growthSurfaceAttribution?: Record<string, number>;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

// ============================================================================
// Ranking Feedback Types
// ============================================================================

export interface VoucherRankingFeedbackRecord {
  id: string;
  platform: Platform;
  voucherId?: string;
  feedbackType: FeedbackType;
  feedbackScore?: number;
  feedbackContext: Record<string, unknown>;
  source: FeedbackSource;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface VoucherRankingSnapshot {
  id: string;
  rankingVersion: string;
  scoringWeights: RankingWeights;
  rankingRules?: Record<string, unknown>;
  policyMetadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
}

export interface RankingWeights {
  exactMatch: number;
  discountAmount: number;
  discountPercentage: number;
  minSpend: number;
  freeShipping: number;
  categoryRelevance: number;
  shopRelevance: number;
  confidence: number;
  recency: number;
  [key: string]: number;
}

// ============================================================================
// Optimization Insight Types
// ============================================================================

export interface VoucherOptimizationInsight {
  id: string;
  insightType: VoucherOptimizationInsightType;
  severity: VoucherOptimizationSeverity;
  insightPayload: Record<string, unknown>;
  status: InsightStatus;
  priorityScore?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface BestVoucherUnderperformancePayload {
  voucherId: string;
  bestSelectedRate: number;
  expectedMinRate: number;
  sampleSize: number;
  divergenceFromCandidates: number;
}

export interface CandidateOutperformingBestPayload {
  bestVoucherId: string;
  outperformingCandidates: Array<{
    voucherId: string;
    selectionRate: number;
    copyRate: number;
  }>;
  sampleSize: number;
}

export interface NoMatchCoverageGapPayload {
  urlPattern: string;
  occurrenceCount: number;
  rootCause: NoMatchRootCause;
  suggestedAction?: string;
}

export interface RankingDivergencePayload {
  positionGap: number;
  scoreGap: number;
  affectedVouchers: string[];
  sampleSize: number;
}

// ============================================================================
// Behavior Pattern Types
// ============================================================================

export interface VoucherSelectionBehavior {
  platform: Platform;
  bestVoucherId: string;
  candidateVoucherIds: string[];
  selectedVoucherId?: string;
  selectionReason?: string;
  confidence: number;
}

export interface VoucherCopyOutcome {
  voucherId: string;
  success: boolean;
  errorMessage?: string;
  userFeedback?: 'positive' | 'negative' | 'neutral';
}

export interface VoucherOpenOutcome {
  voucherId: string;
  clicked: boolean;
  purchaseMade?: boolean;
}

export interface NoMatchOutcomeSignal {
  outcomeId: string;
  normalizedUrl: string;
  rootCause?: NoMatchRootCause;
  userClickedFallback: boolean;
  fallbackOption?: string;
}

// ============================================================================
// Ranking Optimization Types
// ============================================================================

export interface RankingOptimizationInput {
  aggregates: VoucherOutcomeAggregate[];
  snapshots: VoucherRankingSnapshot[];
  currentWeights: RankingWeights;
}

export interface RankingOptimizationSuggestion {
  type: 'weight_adjustment' | 'rule_change' | 'coverage_improvement' | 'confidence_calibration';
  description: string;
  currentValue: number;
  suggestedValue: number;
  rationale: string;
  confidence: number;
  evidence: Record<string, unknown>;
}

export interface RankingWeightAdjustmentCandidate {
  weightKey: string;
  currentValue: number;
  suggestedValue: number;
  adjustmentDirection: 'increase' | 'decrease' | 'maintain';
  confidence: number;
  rationale: string;
  supportingEvidence: Array<{
    metric: string;
    value: number;
    interpretation: string;
  }>;
}

export interface VoucherFeedbackQualityResult {
  voucherId: string;
  qualityScore: number;
  confidence: 'high' | 'medium' | 'low';
  signals: Array<{
    type: string;
    weight: number;
    value: number;
    contribution: number;
  }>;
  warnings: string[];
}

// ============================================================================
// No-Match Analysis Types
// ============================================================================

export interface NoMatchAnalysisResult {
  outcomeId: string;
  normalizedUrl: string;
  rootCause: NoMatchRootCause;
  rootCauseDetail?: string;
  suggestedAction?: string;
  confidenceScore: number;
  metadata?: Record<string, unknown>;
}

export interface NoMatchImprovementSuggestion {
  category: NoMatchRootCause;
  description: string;
  priority: VoucherOptimizationSeverity;
  actionItems: string[];
}

// ============================================================================
// Attribution Types
// ============================================================================

export interface VoucherOutcomeAttributionContext {
  growthSurfaceType?: string;
  growthSurfaceSlug?: string;
  utmParams?: UTMParams;
  referrer?: string;
}

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

// ============================================================================
// Report Types
// ============================================================================

export interface VoucherIntelligenceReport {
  id: string;
  reportType: string;
  timeWindow: TimeWindow;
  summary: ReportSummary;
  details: ReportDetails;
  createdAt: Date;
}

export interface ReportSummary {
  totalResolutions: number;
  totalSignals: number;
  copySuccessRate: number;
  openShopeeClickRate: number;
  bestVoucherSelectionRate: number;
  noMatchRate: number;
  insightsGenerated: number;
}

export interface ReportDetails {
  topPerformingVouchers: VoucherOutcomeAggregate[];
  underperformingVouchers: VoucherOutcomeAggregate[];
  noMatchPatterns: NoMatchAnalysisResult[];
  optimizationSuggestions: RankingOptimizationSuggestion[];
}

// ============================================================================
// Warning & Error Types
// ============================================================================

export interface VoucherIntelligenceWarning {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface VoucherIntelligenceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Zod Schemas (for validation)
// ============================================================================

export const VoucherOutcomeSignalSchema = z.object({
  id: z.string().uuid(),
  outcomeId: z.string().uuid(),
  eventType: z.nativeEnum(VoucherOutcomeEventType),
  voucherId: z.string().uuid().optional(),
  eventPayload: z.record(z.unknown()).optional(),
  eventOrder: z.number().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.date(),
});

export const VoucherOutcomeSessionSchema = z.object({
  id: z.string().uuid(),
  resolutionRequestId: z.string().uuid().optional(),
  platform: z.nativeEnum(Platform),
  normalizedUrl: z.string().url(),
  productContext: z.record(z.unknown()).optional(),
  bestVoucherId: z.string().uuid().optional(),
  shownVoucherIds: z.array(z.string().uuid()),
  growthSurfaceType: z.string().optional(),
  attributionContext: z.object({
    growthSurfaceType: z.string().optional(),
    growthSurfaceSlug: z.string().optional(),
    utmParams: z.object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      content: z.string().optional(),
      term: z.string().optional(),
    }).optional(),
    referrer: z.string().optional(),
  }).optional(),
  signals: z.array(VoucherOutcomeSignalSchema),
  createdAt: z.date(),
});

export const VoucherOptimizationInsightSchema = z.object({
  id: z.string().uuid(),
  insightType: z.nativeEnum(VoucherOptimizationInsightType),
  severity: z.nativeEnum(VoucherOptimizationSeverity),
  insightPayload: z.record(z.unknown()),
  status: z.nativeEnum(InsightStatus),
  priorityScore: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().optional(),
  resolutionNotes: z.string().optional(),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isVoucherOutcomeEventType(value: string): value is VoucherOutcomeEventType {
  return Object.values(VoucherOutcomeEventType).includes(value as VoucherOutcomeEventType);
}

export function isVoucherOptimizationInsightType(value: string): value is VoucherOptimizationInsightType {
  return Object.values(VoucherOptimizationInsightType).includes(value as VoucherOptimizationInsightType);
}

export function isVoucherOptimizationSeverity(value: string): value is VoucherOptimizationSeverity {
  return Object.values(VoucherOptimizationSeverity).includes(value as VoucherOptimizationSeverity);
}
