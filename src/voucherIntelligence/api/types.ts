/**
 * Voucher Intelligence API Types
 */

// ============================================================================
// DTOs
// ============================================================================

export interface VoucherOptimizationReportDto {
  id: string;
  generatedAt: string;
  timeWindow: {
    start: string;
    end: string;
  };
  summary: {
    totalResolutions: number;
    totalSignals: number;
    copySuccessRate: number;
    openShopeeClickRate: number;
    bestVoucherSelectionRate: number;
    noMatchRate: number;
    insightsGenerated: number;
  };
  topIssues: VoucherInsightDto[];
  rankingAdvice: RankingAdviceDto | null;
}

export interface VoucherInsightDto {
  id: string;
  insightType: string;
  severity: string;
  status: string;
  priorityScore: number;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface VoucherOutcomeSummaryDto {
  voucherId: string;
  platform: string;
  viewCount: number;
  copyCount: number;
  copySuccessRate: number;
  openShopeeClickCount: number;
  openShopeeClickRate: number;
  bestVsCandidateDivergence: number;
  noMatchCount: number;
}

export interface VoucherRankingFeedbackDto {
  voucherId: string;
  feedbackType: string;
  feedbackScore: number;
  confidence: string;
  signals: Array<{
    type: string;
    weight: number;
    contribution: number;
  }>;
  warnings: string[];
}

export interface RankingAdviceDto {
  weightAdjustments: Array<{
    weightKey: string;
    currentValue: number;
    suggestedValue: number;
    adjustmentDirection: string;
    confidence: number;
    rationale: string;
  }>;
  overallConfidence: number;
  summary: string;
}

export interface NoMatchAnalysisDto {
  urlPattern: string;
  rootCause: string;
  occurrenceCount: number;
  confidenceScore: number;
  suggestedAction: string | null;
}

// ============================================================================
// Request Types
// ============================================================================

export interface AnalyzeRequestDto {
  timeWindowStart?: string;
  timeWindowEnd?: string;
  platform?: string;
  minSampleSize?: number;
  maxInsights?: number;
}

export interface InsightsQueryDto {
  status?: string;
  severity?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
