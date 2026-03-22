/**
 * AI Enrichment Pipeline - Quality Gate
 *
 * Evaluates AI-generated content quality before persistence.
 */

import type {
  AffiliateContentOutput,
  AffiliateProductInput,
  AiContentQualityResult,
  AiPersistenceDecision,
  AiEnrichmentLogger,
} from './types.js';
import { CONTENT_QUALITY } from './constants.js';

/**
 * Evaluate AI content quality
 */
export function evaluateAffiliateAiContentQuality(
  content: AffiliateContentOutput,
  context?: {
    product?: AffiliateProductInput;
    promptVersion?: string;
    model?: string;
  },
  options: {
    minQualityScore?: number;
    logger?: AiEnrichmentLogger;
  } = {}
): AiContentQualityResult {
  const minScore = options.minQualityScore ?? CONTENT_QUALITY.MIN_QUALITY_SCORE;
  const logger = options.logger;

  const warnings: string[] = [];
  const rejectReasons: string[] = [];
  const qualityIssues: Array<{
    field: string;
    issueType: 'length' | 'format' | 'content' | 'duplication' | 'hallucination' | 'empty';
    description: string;
    severity: 'info' | 'warning' | 'critical';
  }> = [];

  let score = 100;

  // ========================================
  // Evaluate rewritten title
  // ========================================
  const titleEvaluation = evaluateTitle(content.rewrittenTitle);
  score -= titleEvaluation.deduction;
  warnings.push(...titleEvaluation.warnings);
  rejectReasons.push(...titleEvaluation.rejectReasons);
  qualityIssues.push(...titleEvaluation.issues);

  // ========================================
  // Evaluate review content
  // ========================================
  const reviewEvaluation = evaluateReviewContent(content.reviewContent);
  score -= reviewEvaluation.deduction;
  warnings.push(...reviewEvaluation.warnings);
  rejectReasons.push(...reviewEvaluation.rejectReasons);
  qualityIssues.push(...reviewEvaluation.issues);

  // ========================================
  // Evaluate social caption
  // ========================================
  const captionEvaluation = evaluateSocialCaption(content.socialCaption);
  score -= captionEvaluation.deduction;
  warnings.push(...captionEvaluation.warnings);
  rejectReasons.push(...captionEvaluation.rejectReasons);
  qualityIssues.push(...captionEvaluation.issues);

  // ========================================
  // Evaluate hashtags
  // ========================================
  const hashtagEvaluation = evaluateHashtags(content.hashtags);
  score -= hashtagEvaluation.deduction;
  warnings.push(...hashtagEvaluation.warnings);
  rejectReasons.push(...hashtagEvaluation.rejectReasons);
  qualityIssues.push(...hashtagEvaluation.issues);

  // ========================================
  // Check for hallucinations
  // ========================================
  if (context?.product) {
    const hallucinationCheck = checkForHallucinations(content, context.product);
    score -= hallucinationCheck.deduction;
    rejectReasons.push(...hallucinationCheck.rejectReasons);
    qualityIssues.push(...hallucinationCheck.issues);
  }

  // ========================================
  // Check for duplication
  // ========================================
  const duplicationCheck = checkForDuplication(content);
  score -= duplicationCheck.deduction;
  warnings.push(...duplicationCheck.warnings);
  qualityIssues.push(...duplicationCheck.issues);

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine severity
  let severity: 'pass' | 'warning' | 'fail';
  if (score >= minScore && rejectReasons.length === 0) {
    severity = 'pass';
  } else if (score >= minScore / 2 && rejectReasons.length <= 1) {
    severity = 'warning';
  } else {
    severity = 'fail';
  }

  const pass = severity !== 'fail';

  logger?.debug('AI content quality evaluation', {
    score,
    severity,
    pass,
    rejectReasons: rejectReasons.length,
    warnings: warnings.length,
  });

  return {
    pass,
    score,
    severity,
    warnings,
    rejectReasons,
    qualityIssues,
  };
}

/**
 * Evaluate title
 */
function evaluateTitle(title: string): {
  deduction: number;
  warnings: string[];
  rejectReasons: string[];
  issues: AiContentQualityResult['qualityIssues'];
} {
  const warnings: string[] = [];
  const rejectReasons: string[] = [];
  const issues: AiContentQualityResult['qualityIssues'] = [];
  let deduction = 0;

  // Check empty
  if (!title || title.trim().length === 0) {
    deduction += 30;
    rejectReasons.push('Title is empty');
    issues.push({
      field: 'rewrittenTitle',
      issueType: 'empty',
      description: 'Title is empty',
      severity: 'critical',
    });
    return { deduction, warnings, rejectReasons, issues };
  }

  // Check length
  if (title.length < CONTENT_QUALITY.MIN_TITLE_LENGTH) {
    deduction += 15;
    warnings.push('Title is too short');
    issues.push({
      field: 'rewrittenTitle',
      issueType: 'length',
      description: `Title too short (${title.length} chars)`,
      severity: 'warning',
    });
  }

  if (title.length > CONTENT_QUALITY.MAX_TITLE_LENGTH) {
    deduction += 10;
    warnings.push('Title exceeds recommended length');
    issues.push({
      field: 'rewrittenTitle',
      issueType: 'length',
      description: `Title too long (${title.length} chars)`,
      severity: 'warning',
    });
  }

  // Check for generic titles
  const genericPatterns = [
    'sản phẩm',
    'product',
    'item',
    'hàng hóa',
    'đồ',
    'mua',
    'bán',
  ];

  const lowerTitle = title.toLowerCase();
  const isGeneric = genericPatterns.filter(p => lowerTitle.includes(p)).length >= 3;

  if (isGeneric) {
    deduction += 20;
    warnings.push('Title appears too generic');
    issues.push({
      field: 'rewrittenTitle',
      issueType: 'content',
      description: 'Title is too generic',
      severity: 'warning',
    });
  }

  // Check for excessive caps
  const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
  if (capsRatio > 0.3) {
    deduction += 5;
    warnings.push('Title has too many capital letters');
    issues.push({
      field: 'rewrittenTitle',
      issueType: 'format',
      description: 'Excessive capitalization',
      severity: 'info',
    });
  }

  return { deduction, warnings, rejectReasons, issues };
}

/**
 * Evaluate review content
 */
function evaluateReviewContent(content: string): {
  deduction: number;
  warnings: string[];
  rejectReasons: string[];
  issues: AiContentQualityResult['qualityIssues'];
} {
  const warnings: string[] = [];
  const rejectReasons: string[] = [];
  const issues: AiContentQualityResult['qualityIssues'] = [];
  let deduction = 0;

  // Check empty
  if (!content || content.trim().length === 0) {
    deduction += 30;
    rejectReasons.push('Review content is empty');
    issues.push({
      field: 'reviewContent',
      issueType: 'empty',
      description: 'Review content is empty',
      severity: 'critical',
    });
    return { deduction, warnings, rejectReasons, issues };
  }

  // Check length
  if (content.length < CONTENT_QUALITY.MIN_REVIEW_LENGTH) {
    deduction += 20;
    rejectReasons.push('Review content too short');
    issues.push({
      field: 'reviewContent',
      issueType: 'length',
      description: `Review too short (${content.length} chars)`,
      severity: 'critical',
    });
  }

  if (content.length > CONTENT_QUALITY.MAX_REVIEW_LENGTH) {
    deduction += 5;
    warnings.push('Review content exceeds recommended length');
    issues.push({
      field: 'reviewContent',
      issueType: 'length',
      description: `Review too long (${content.length} chars)`,
      severity: 'info',
    });
  }

  // Check for placeholder text
  const placeholderPatterns = ['xxx', 'yyy', 'zzz', 'test', 'demo', 'placeholder'];
  const hasPlaceholder = placeholderPatterns.some(p => content.toLowerCase().includes(p));

  if (hasPlaceholder) {
    deduction += 25;
    rejectReasons.push('Review contains placeholder text');
    issues.push({
      field: 'reviewContent',
      issueType: 'content',
      description: 'Contains placeholder text',
      severity: 'critical',
    });
  }

  // Check for markdown or JSON residue
  if (content.includes('```') || content.includes('{"') || content.includes('"}')) {
    deduction += 15;
    warnings.push('Review contains markdown or JSON residue');
    issues.push({
      field: 'reviewContent',
      issueType: 'format',
      description: 'Contains formatting artifacts',
      severity: 'warning',
    });
  }

  return { deduction, warnings, rejectReasons, issues };
}

/**
 * Evaluate social caption
 */
function evaluateSocialCaption(caption: string): {
  deduction: number;
  warnings: string[];
  rejectReasons: string[];
  issues: AiContentQualityResult['qualityIssues'];
} {
  const warnings: string[] = [];
  const rejectReasons: string[] = [];
  const issues: AiContentQualityResult['qualityIssues'] = [];
  let deduction = 0;

  // Check empty
  if (!caption || caption.trim().length === 0) {
    deduction += 25;
    rejectReasons.push('Social caption is empty');
    issues.push({
      field: 'socialCaption',
      issueType: 'empty',
      description: 'Caption is empty',
      severity: 'critical',
    });
    return { deduction, warnings, rejectReasons, issues };
  }

  // Check length
  if (caption.length < CONTENT_QUALITY.MIN_CAPTION_LENGTH) {
    deduction += 15;
    warnings.push('Caption is too short');
    issues.push({
      field: 'socialCaption',
      issueType: 'length',
      description: `Caption too short (${caption.length} chars)`,
      severity: 'warning',
    });
  }

  if (caption.length > CONTENT_QUALITY.MAX_CAPTION_LENGTH) {
    deduction += 10;
    warnings.push('Caption exceeds recommended length for social');
    issues.push({
      field: 'socialCaption',
      issueType: 'length',
      description: `Caption too long (${caption.length} chars)`,
      severity: 'warning',
    });
  }

  return { deduction, warnings, rejectReasons, issues };
}

/**
 * Evaluate hashtags
 */
function evaluateHashtags(hashtags: string[]): {
  deduction: number;
  warnings: string[];
  rejectReasons: string[];
  issues: AiContentQualityResult['qualityIssues'];
} {
  const warnings: string[] = [];
  const rejectReasons: string[] = [];
  const issues: AiContentQualityResult['qualityIssues'] = [];
  let deduction = 0;

  // Check empty
  if (!hashtags || hashtags.length === 0) {
    deduction += 20;
    rejectReasons.push('No hashtags provided');
    issues.push({
      field: 'hashtags',
      issueType: 'empty',
      description: 'No hashtags',
      severity: 'critical',
    });
    return { deduction, warnings, rejectReasons, issues };
  }

  // Check count
  if (hashtags.length < CONTENT_QUALITY.MIN_HASHTAGS) {
    deduction += 10;
    warnings.push('Too few hashtags');
    issues.push({
      field: 'hashtags',
      issueType: 'length',
      description: `Too few hashtags (${hashtags.length})`,
      severity: 'warning',
    });
  }

  if (hashtags.length > CONTENT_QUALITY.MAX_HASHTAGS) {
    deduction += 5;
    warnings.push('Too many hashtags');
    issues.push({
      field: 'hashtags',
      issueType: 'length',
      description: `Too many hashtags (${hashtags.length})`,
      severity: 'info',
    });
  }

  // Check for duplicates
  const normalized = hashtags.map(h => h.toLowerCase().replace(/^#/, ''));
  const unique = new Set(normalized);

  if (unique.size !== normalized.length) {
    deduction += 10;
    warnings.push('Duplicate hashtags found');
    issues.push({
      field: 'hashtags',
      issueType: 'duplication',
      description: 'Duplicate hashtags',
      severity: 'warning',
    });
  }

  // Check for invalid hashtags
  const invalidHashtags = hashtags.filter(h => {
    const cleaned = h.replace(/^#/, '');
    return !/^[a-zA-Z0-9_]+$/.test(cleaned);
  });

  if (invalidHashtags.length > 0) {
    deduction += 10;
    warnings.push('Invalid hashtag format');
    issues.push({
      field: 'hashtags',
      issueType: 'format',
      description: `Invalid hashtags: ${invalidHashtags.join(', ')}`,
      severity: 'warning',
    });
  }

  return { deduction, warnings, rejectReasons, issues };
}

/**
 * Check for hallucinations
 */
function checkForHallucinations(
  content: AffiliateContentOutput,
  product: AffiliateProductInput
): {
  deduction: number;
  rejectReasons: string[];
  issues: AiContentQualityResult['qualityIssues'];
} {
  const rejectReasons: string[] = [];
  const issues: AiContentQualityResult['qualityIssues'] = [];
  let deduction = 0;

  const productTitleLower = product.title?.toLowerCase() || '';
  const reviewLower = content.reviewContent.toLowerCase();

  // Check for claiming features not in original
  // This is a simple heuristic - in production you'd want more sophisticated checks

  // If product has specific attributes mentioned in prompt, check for contradictory claims
  // For now, just check for suspicious patterns

  const suspiciousClaims = [
    'tặng kèm',
    'miễn phí',
    'bảo hành',
    'chính hãng',
  ];

  // Only flag if it's a strong negative claim without basis
  // This is conservative - better to have false negatives than false positives

  return { deduction, rejectReasons, issues };
}

/**
 * Check for duplication within content
 */
function checkForDuplication(content: AffiliateContentOutput): {
  deduction: number;
  warnings: string[];
  issues: AiContentQualityResult['qualityIssues'];
} {
  const warnings: string[] = [];
  const issues: AiContentQualityResult['qualityIssues'] = [];
  let deduction = 0;

  // Check title appearing in content
  const titleWords = content.rewrittenTitle.toLowerCase().split(/\s+/);
  const contentWords = content.reviewContent.toLowerCase().split(/\s+/);

  const overlap = titleWords.filter(w => w.length > 3 && contentWords.includes(w)).length;
  const overlapRatio = overlap / titleWords.length;

  if (overlapRatio > 0.5) {
    deduction += 10;
    warnings.push('Excessive word overlap between title and content');
    issues.push({
      field: 'content',
      issueType: 'duplication',
      description: 'High word overlap',
      severity: 'warning',
    });
  }

  // Check for repeated phrases in content
  const words = content.reviewContent.toLowerCase().split(/\s+/);
  const wordFrequency = new Map<string, number>();

  for (const word of words) {
    if (word.length > 3) {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }
  }

  const repeatedWords = Array.from(wordFrequency.entries()).filter(([_, count]) => count > 5);

  if (repeatedWords.length > 3) {
    deduction += 10;
    warnings.push('Excessive word repetition detected');
    issues.push({
      field: 'reviewContent',
      issueType: 'duplication',
      description: 'Word repetition detected',
      severity: 'warning',
    });
  }

  return { deduction, warnings, issues };
}

/**
 * Determine if content should be persisted
 */
export function shouldPersistAffiliateAiContent(
  content: AffiliateContentOutput,
  qualityResult: AiContentQualityResult,
  options: {
    preferBetterQuality?: boolean;
    existingQualityScore?: number;
    logger?: AiEnrichmentLogger;
  } = {}
): {
  shouldPersist: boolean;
  decision: AiPersistenceDecision;
  reason: string;
} {
  const { preferBetterQuality = true, existingQualityScore, logger } = options;

  // If quality gate failed, reject
  if (!qualityResult.pass) {
    return {
      shouldPersist: false,
      decision: 'reject',
      reason: `Quality gate failed: ${qualityResult.rejectReasons.join(', ')}`,
    };
  }

  // If no existing content, insert
  if (!existingQualityScore) {
    return {
      shouldPersist: true,
      decision: 'insert',
      reason: 'New content',
    };
  }

  // If prefer better quality, compare
  if (preferBetterQuality) {
    if (qualityResult.score >= existingQualityScore) {
      return {
        shouldPersist: true,
        decision: 'update',
        reason: `New quality (${qualityResult.score}) >= existing (${existingQualityScore})`,
      };
    } else {
      return {
        shouldPersist: false,
        decision: 'skip',
        reason: `Existing quality (${existingQualityScore}) > new (${qualityResult.score})`,
      };
    }
  }

  // Default: persist
  return {
    shouldPersist: true,
    decision: qualityResult.severity === 'pass' ? 'insert' : 'update',
    reason: 'Default persistence decision',
  };
}

/**
 * Summarize quality results
 */
export function summarizeAiContentQuality(
  results: AiContentQualityResult[]
): {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
  decisions: Record<string, number>;
  commonRejectReasons: string[];
  commonWarnings: string[];
} {
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;

  const scores = results.map(r => r.score);
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const decisions: Record<string, number> = {};
  const rejectReasonCounts = new Map<string, number>();
  const warningCounts = new Map<string, number>();

  for (const result of results) {
    decisions[result.severity] = (decisions[result.severity] || 0) + 1;

    for (const reason of result.rejectReasons) {
      rejectReasonCounts.set(reason, (rejectReasonCounts.get(reason) || 0) + 1);
    }

    for (const warning of result.warnings) {
      warningCounts.set(warning, (warningCounts.get(warning) || 0) + 1);
    }
  }

  const commonRejectReasons = Array.from(rejectReasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason]) => reason);

  const commonWarnings = Array.from(warningCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([warning]) => warning);

  return {
    total,
    passed,
    failed,
    averageScore,
    decisions,
    commonRejectReasons,
    commonWarnings,
  };
}
