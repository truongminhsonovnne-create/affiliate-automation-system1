/**
 * Voucher Intelligence Service
 *
 * Main orchestrator service for voucher intelligence analysis
 */

import {
  TimeWindow,
  Platform,
  VoucherOutcomeSignal,
  VoucherOptimizationInsight,
} from '../types/index.js';
import { INTELLIGENCE_WINDOWS } from '../constants/index.js';

// Import repositories (simulated)
import * as outcomeRepo from '../repositories/voucherOutcomeRepository.js';
import * as eventRepo from '../repositories/voucherOutcomeEventRepository.js';
import * as insightRepo from '../repositories/voucherOptimizationInsightRepository.js';
import * as snapshotRepo from '../repositories/voucherRankingSnapshotRepository.js';

// Import analysis modules
import { aggregateVoucherOutcomeSignals } from '../aggregation/outcomeAggregationService.js';
import { analyzeVoucherSelectionBehavior, detectBestVoucherUnderperformance, detectNoMatchOpportunityPatterns } from '../aggregation/behaviorPatternAnalyzer.js';
import { buildRankingFeedbackFromOutcome, buildVoucherFeedbackRecords } from '../ranking/rankingFeedbackBuilder.js';
import { analyzeRankingOptimizationNeeds } from '../ranking/rankingOptimizationAnalyzer.js';
import { buildWeightAdjustmentCandidates, buildRankingTuningAdvice } from '../ranking/weightTuningAdvisor.js';
import { analyzeNoMatchCases, suggestNoMatchImprovements } from '../noMatch/noMatchImprovementAnalyzer.js';
import { analyzeExplanationEffectiveness } from '../explainability/explainabilityOutcomeAnalyzer.js';
import { buildInsightsFromAnalysis } from '../insights/optimizationInsightBuilder.js';
import { prioritizeOptimizationInsights } from '../insights/insightPrioritizer.js';

// ============================================================================
// Types
// ============================================================================

export interface VoucherIntelligenceOptions {
  timeWindow?: TimeWindow;
  platform?: Platform;
  minSampleSize?: number;
  maxInsights?: number;
}

export interface IntelligenceAnalysisResult {
  success: boolean;
  timeWindow: TimeWindow;
  summary: AnalysisSummary;
  aggregates: any[];
  insights: VoucherOptimizationInsight[];
  rankingAdvice: any;
  errors?: string[];
}

export interface AnalysisSummary {
  totalResolutions: number;
  totalSignals: number;
  copySuccessRate: number;
  openShopeeClickRate: number;
  bestVoucherSelectionRate: number;
  noMatchRate: number;
  insightsGenerated: number;
}

// ============================================================================
// Main Service
// ============================================================================

/**
 * Run voucher intelligence analysis for a time window
 */
export async function runVoucherIntelligenceAnalysis(
  options: VoucherIntelligenceOptions = {}
): Promise<IntelligenceAnalysisResult> {
  const errors: string[] = [];

  // Set default time window (last 24 hours)
  const timeWindow = options.timeWindow || {
    start: new Date(Date.now() - INTELLIGENCE_WINDOWS.SHORT_HOURS * 60 * 60 * 1000),
    end: new Date(),
  };

  try {
    // 1. Load outcome signals in window
    const signals = await loadSignalsInWindow(timeWindow, options.platform);

    if (signals.length === 0) {
      return {
        success: true,
        timeWindow,
        summary: {
          totalResolutions: 0,
          totalSignals: 0,
          copySuccessRate: 0,
          openShopeeClickRate: 0,
          bestVoucherSelectionRate: 0,
          noMatchRate: 0,
          insightsGenerated: 0,
        },
        aggregates: [],
        insights: [],
        rankingAdvice: null,
      };
    }

    // 2. Aggregate signals
    const aggregateResult = await aggregateVoucherOutcomeSignals(signals, {
      platform: options.platform,
      timeWindow,
      minSampleSize: options.minSampleSize || 30,
    });

    // 3. Build ranking feedback
    const feedbackRecords = buildRankingFeedbackFromOutcome(aggregateResult.aggregates);

    // 4. Analyze ranking problems
    const currentWeights = await getCurrentRankingWeights();
    const rankingAnalysis = analyzeRankingOptimizationNeeds(
      aggregateResult.aggregates,
      currentWeights,
      []
    );

    // 5. Build tuning advice
    const tuningCandidates = buildWeightAdjustmentCandidates(currentWeights, {
      exactMatchProblem: rankingAnalysis.suggestions.some(s => s.type === 'weight_adjustment'),
    });
    const rankingAdvice = buildRankingTuningAdvice(tuningCandidates, []);

    // 6. Analyze behavior patterns
    const underperformingVouchers = detectBestVoucherUnderperformance(aggregateResult.aggregates);

    // 7. Analyze no-match patterns
    const noMatchAnalysis = await analyzeNoMatchCases(signals);
    const noMatchSuggestions = suggestNoMatchImprovements(noMatchAnalysis);

    // 8. Analyze explanation effectiveness
    const explanationAnalysis = analyzeExplanationEffectiveness(aggregateResult.aggregates);

    // 9. Build insights
    const insights = buildInsightsFromAnalysis({
      underperformingVouchers: underperformingVouchers.map(v => ({
        voucherId: v.voucherId,
        selectionRate: v.selectionRate,
        sampleSize: v.sampleSize,
      })),
      noMatchPatterns: noMatchAnalysis.map(n => ({
        urlPattern: n.normalizedUrl,
        occurrenceCount: 1,
        rootCause: n.rootCause,
      })),
    });

    // 10. Prioritize insights
    const prioritizedInsights = prioritizeOptimizationInsights(insights, {
      maxInsights: options.maxInsights || 50,
    });

    // 11. Persist insights
    for (const insight of prioritizedInsights) {
      await insightRepo.createInsight({
        insightType: insight.insightType,
        severity: insight.severity,
        insightPayload: insight.insightPayload,
        status: insight.status,
        priorityScore: insight.priorityScore,
      });
    }

    // Build summary
    const summary: AnalysisSummary = {
      totalResolutions: aggregateResult.summary.totalResolutions,
      totalSignals: signals.length,
      copySuccessRate: aggregateResult.summary.avgCopySuccessRate,
      openShopeeClickRate: aggregateResult.summary.avgOpenShopeeClickRate,
      bestVoucherSelectionRate: aggregateResult.summary.avgBestSelectionRate,
      noMatchRate: aggregateResult.summary.noMatchRate,
      insightsGenerated: prioritizedInsights.length,
    };

    return {
      success: true,
      timeWindow,
      summary,
      aggregates: aggregateResult.aggregates,
      insights: prioritizedInsights,
      rankingAdvice,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error) {
    console.error('[VoucherIntelligence] Analysis failed:', error);
    return {
      success: false,
      timeWindow,
      summary: {
        totalResolutions: 0,
        totalSignals: 0,
        copySuccessRate: 0,
        openShopeeClickRate: 0,
        bestVoucherSelectionRate: 0,
        noMatchRate: 0,
        insightsGenerated: 0,
      },
      aggregates: [],
      insights: [],
      rankingAdvice: null,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Analyze voucher performance for a specific window
 */
export async function analyzeVoucherPerformanceForWindow(
  windowStart: Date,
  windowEnd: Date,
  platform?: Platform
): Promise<any> {
  const result = await runVoucherIntelligenceAnalysis({
    timeWindow: { start: windowStart, end: windowEnd },
    platform,
  });

  return result;
}

/**
 * Build voucher optimization report
 */
export async function buildVoucherOptimizationReport(
  options: VoucherIntelligenceOptions = {}
): Promise<any> {
  const analysis = await runVoucherIntelligenceAnalysis(options);

  return {
    generatedAt: new Date(),
    timeWindow: analysis.timeWindow,
    summary: analysis.summary,
    topIssues: analysis.insights.slice(0, 10),
    rankingAdvice: analysis.rankingAdvice,
  };
}

/**
 * Generate voucher improvement signals
 */
export async function generateVoucherImprovementSignals(
  platform?: Platform
): Promise<{
  voucherSignals: any[];
  catalogGaps: any[];
  rankingSignals: any[];
}> {
  const analysis = await runVoucherIntelligenceAnalysis({ platform });

  return {
    voucherSignals: analysis.aggregates,
    catalogGaps: analysis.insights.filter(i => i.insightType === 'no_match_coverage_gap'),
    rankingSignals: analysis.rankingAdvice?.weightAdjustments || [],
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function loadSignalsInWindow(
  timeWindow: TimeWindow,
  platform?: Platform
): Promise<VoucherOutcomeSignal[]> {
  // In production, this would query the database
  // For now, return from event repository
  return eventRepo.getEventsInTimeRange(timeWindow.start, timeWindow.end);
}

async function getCurrentRankingWeights(): Promise<any> {
  const latest = await snapshotRepo.getLatestSnapshot();
  return latest?.scoringWeights || getDefaultWeights();
}

function getDefaultWeights() {
  return {
    exactMatch: 0.3,
    discountAmount: 0.2,
    discountPercentage: 0.15,
    minSpend: 0.1,
    freeShipping: 0.1,
    categoryRelevance: 0.05,
    shopRelevance: 0.03,
    confidence: 0.05,
    recency: 0.02,
  };
}
