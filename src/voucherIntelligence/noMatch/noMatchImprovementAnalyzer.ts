/**
 * No-Match Improvement Analyzer
 *
 * Analyzes no-match cases to identify improvement opportunities
 */

import {
  NoMatchAnalysisResult,
  NoMatchImprovementSuggestion,
  NoMatchRootCause,
  VoucherOutcomeSignal,
  VoucherOptimizationSeverity,
} from '../types/index.js';
import { NO_MATCH_THRESHOLDS, NO_MATCH_ROOT_CAUSE_CONFIG } from '../constants/index.js';

// ============================================================================
// Types
// ============================================================================

export interface NoMatchAnalysisOptions {
  minOccurrences?: number;
  includeResolved?: boolean;
}

export interface NoMatchAnalysisSummary {
  totalNoMatches: number;
  byRootCause: Record<NoMatchRootCause, number>;
  actionableInsights: NoMatchImprovementSuggestion[];
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze no-match cases
 */
export async function analyzeNoMatchCases(
  signals: VoucherOutcomeSignal[],
  options: NoMatchAnalysisOptions = {}
): Promise<NoMatchAnalysisResult[]> {
  const minOccurrences = options.minOccurrences || NO_MATCH_THRESHOLDS.MIN_OCCURRENCES;

  // Filter no-match events
  const noMatchSignals = signals.filter(
    s => s.eventType === 'no_match_viewed'
  );

  if (noMatchSignals.length < minOccurrences) {
    return [];
  }

  // Group by URL pattern
  const urlPatternMap = new Map<string, VoucherOutcomeSignal[]>();

  for (const signal of noMatchSignals) {
    const urlPattern = extractUrlPattern(signal);
    if (!urlPatternMap.has(urlPattern)) {
      urlPatternMap.set(urlPattern, []);
    }
    urlPatternMap.get(urlPattern)!.push(signal);
  }

  // Analyze each pattern
  const results: NoMatchAnalysisResult[] = [];

  for (const [urlPattern, patternSignals] of urlPatternMap) {
    if (patternSignals.length < minOccurrences) continue;

    const rootCause = classifyNoMatchRootCause(patternSignals);

    results.push({
      outcomeId: patternSignals[0].outcomeId,
      normalizedUrl: urlPattern,
      rootCause: rootCause.category,
      rootCauseDetail: rootCause.detail,
      suggestedAction: rootCause.suggestedAction,
      confidenceScore: rootCause.confidence,
    });
  }

  return results;
}

/**
 * Classify no-match root cause
 */
export function classifyNoMatchRootCause(
  signals: VoucherOutcomeSignal[]
): {
  category: NoMatchRootCause;
  detail?: string;
  suggestedAction?: string;
  confidence: number;
} {
  // Analyze patterns to determine root cause
  const urls = signals.map(s => {
    const payload = s.eventPayload as Record<string, unknown> | undefined;
    return payload?.normalizedUrl as string || '';
  });

  // Check for invalid URLs
  const invalidUrls = urls.filter(u => !isValidUrl(u));
  if (invalidUrls.length > urls.length * 0.5) {
    return {
      category: NoMatchRootCause.INVALID_URL,
      detail: 'URLs appear to be invalid or unrecognized format',
      suggestedAction: 'Improve URL validation or parser coverage',
      confidence: 0.8,
    };
  }

  // Check for parser issues (unusual patterns)
  const parserFailures = urls.filter(u => containsUnusualPatterns(u));
  if (parserFailures.length > urls.length * 0.3) {
    return {
      category: NoMatchRootCause.PARSER_WEAKNESS,
      detail: 'Parser unable to extract product information',
      suggestedAction: 'Improve parser for this URL pattern',
      confidence: 0.6,
    };
  }

  // Check for context weakness (generic URLs without product info)
  const contextWeak = urls.filter(u => isGenericUrl(u));
  if (contextWeak.length > urls.length * 0.5) {
    return {
      category: NoMatchRootCause.CONTEXT_WEAKNESS,
      detail: 'URLs lack sufficient product context',
      suggestedAction: 'Consider broader matching or fallback strategies',
      confidence: 0.5,
    };
  }

  // Default to catalog coverage
  return {
    category: NoMatchRootCause.CATALOG_COVERAGE,
    detail: 'No matching vouchers found in catalog',
    suggestedAction: 'Expand voucher catalog coverage for this category',
    confidence: 0.4,
  };
}

/**
 * Suggest no-match improvements
 */
export function suggestNoMatchImprovements(
  analysisResults: NoMatchAnalysisResult[]
): NoMatchImprovementSuggestion[] {
  const suggestions: NoMatchImprovementSuggestion[] = [];

  // Group by root cause category
  const byCategory = new Map<NoMatchRootCause, NoMatchAnalysisResult[]>();

  for (const result of analysisResults) {
    if (!byCategory.has(result.rootCause)) {
      byCategory.set(result.rootCause, []);
    }
    byCategory.get(result.rootCause)!.push(result);
  }

  // Generate suggestions for each category
  for (const [category, results] of byCategory) {
    const config = NO_MATCH_ROOT_CAUSE_CONFIG[category];
    const totalOccurrences = results.length;

    let priority = VoucherOptimizationSeverity.LOW;
    if (totalOccurrences > 100) priority = VoucherOptimizationSeverity.HIGH;
    else if (totalOccurrences > 30) priority = VoucherOptimizationSeverity.MEDIUM;

    suggestions.push({
      category,
      description: config?.description || 'Unknown issue',
      priority,
      actionItems: generateActionItems(category, results),
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder: Record<VoucherOptimizationSeverity, number> = {
      [VoucherOptimizationSeverity.CRITICAL]: 0,
      [VoucherOptimizationSeverity.HIGH]: 1,
      [VoucherOptimizationSeverity.MEDIUM]: 2,
      [VoucherOptimizationSeverity.LOW]: 3,
    };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract URL pattern
 */
function extractUrlPattern(signal: VoucherOutcomeSignal): string {
  const payload = signal.eventPayload as Record<string, unknown> | undefined;
  const url = payload?.normalizedUrl as string || '';

  try {
    const parsed = new URL(url);
    // Extract first 2 path segments as pattern
    const segments = parsed.pathname.split('/').filter(s => s);
    if (segments.length >= 2) {
      return `/${segments.slice(0, 2).join('/')}/*`;
    }
    return parsed.pathname || parsed.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Check if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for unusual patterns
 */
function containsUnusualPatterns(url: string): boolean {
  const unusualPatterns = [
    /\/shopee\.com\.vn\/[a-z]{2,3}\//, // International locale
    /\/product\/[0-9]+\/[0-9]+$/, // Short product ID
    /\?.*ref=/, // Has referrer
  ];

  return unusualPatterns.some(p => p.test(url));
}

/**
 * Check if URL is generic (lacks product info)
 */
function isGenericUrl(url: string): boolean {
  const genericPatterns = [
    /\/shop\/\d+$/, // Shop only, no product
    /\/cart$/, // Cart page
    /\/checkout$/, // Checkout page
    /\/user\//, // User pages
  ];

  return genericPatterns.some(p => p.test(url));
}

/**
 * Generate action items for root cause
 */
function generateActionItems(
  category: NoMatchRootCause,
  results: NoMatchAnalysisResult[]
): string[] {
  switch (category) {
    case NoMatchRootCause.INVALID_URL:
      return [
        'Review URL validation logic',
        'Add support for more URL formats',
        'Consider adding user feedback for invalid URLs',
      ];
    case NoMatchRootCause.PARSER_WEAKNESS:
      return [
        'Analyze failed URL patterns',
        'Improve parser for edge cases',
        'Add fallback parsing strategies',
      ];
    case NoMatchRootCause.CONTEXT_WEAKNESS:
      return [
        'Implement broader category matching',
        'Consider content-based matching',
        'Improve fallback ranking',
      ];
    case NoMatchRootCause.CATALOG_COVERAGE:
      return [
        'Identify categories with gaps',
        'Prioritize voucher acquisition',
        'Consider expanding sources',
      ];
    case NoMatchRootCause.RULE_TOO_STRICT:
      return [
        'Review matching rules',
        'Relax overly restrictive conditions',
        'Add more fallback options',
      ];
    case NoMatchRootCause.RANKING_FALLBACK_POOR:
      return [
        'Analyze fallback selection patterns',
        'Improve fallback ranking algorithm',
        'Consider user preference signals',
      ];
    default:
      return [
        'Investigate root cause',
        'Collect more data',
      ];
  }
}

/**
 * Calculate no-match rate
 */
export function calculateNoMatchRate(
  noMatchCount: number,
  totalResolutions: number
): number {
  return totalResolutions > 0 ? noMatchCount / totalResolutions : 0;
}

/**
 * Check if no-match rate needs escalation
 */
export function needsNoMatchEscalation(
  noMatchRate: number,
  threshold: number = NO_MATCH_THRESHOLDS.ESCALATION_RATE
): boolean {
  return noMatchRate > threshold;
}
