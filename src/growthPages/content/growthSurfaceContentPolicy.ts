/**
 * Growth Surface Content Policy
 *
 * Enforces the core philosophy: "NOT a coupon-site"
 * - No clutter
 * - No ad-like layout
 * - No fake urgency
 * - No giant list spam
 * - Primary CTA always leads to paste-link tool
 */

import {
  GrowthSurfaceType,
  GrowthSurfaceSummary,
  GrowthSurfaceCtaModel,
  SurfaceCtaType,
} from '../types/index.js';
import {
  CONTENT_POLICY,
  CONTENT_DENSITY_LIMITS,
  GROWTH_SURFACE_LIMITS,
  CTA_LIMITS,
  ERROR_MESSAGES,
} from '../constants/index.js';

// ============================================================================
// Policy Result Types
// ============================================================================

export interface ContentPolicyResult {
  isValid: boolean;
  violations: ContentPolicyViolation[];
  warnings: ContentPolicyWarning[];
}

export interface ContentPolicyViolation {
  code: string;
  message: string;
  severity: 'error';
}

export interface ContentPolicyWarning {
  code: string;
  message: string;
  severity: 'warning';
  suggestion?: string;
}

// ============================================================================
// Content Policy
// ============================================================================

/**
 * Get the content policy rules
 */
export function getGrowthSurfaceContentPolicy(): {
  maxSections: number;
  maxCtas: number;
  allowedCtaTypes: SurfaceCtaType[];
  disallowedKeywords: readonly string[];
  clutterThreshold: number;
} {
  return {
    maxSections: CONTENT_POLICY.CLUTTER_THRESHOLD,
    maxCtas: CTA_LIMITS.MAX_TOTAL_CTA,
    allowedCtaTypes: [
      SurfaceCtaType.PASTE_LINK,
      SurfaceCtaType.RESOLVE_VOUCHER,
      SurfaceCtaType.COPY_VOUCHER,
      SurfaceCtaType.OPEN_SHOPEE,
      SurfaceCtaType.BROWSE_CATEGORY,
      SurfaceCtaType.VIEW_SHOP,
    ],
    disallowedKeywords: [...CONTENT_POLICY.DISALLOWED_KEYWORDS],
    clutterThreshold: CONTENT_POLICY.CLUTTER_THRESHOLD,
  };
}

// ============================================================================
// Content Density Validation
// ============================================================================

/**
 * Validate content density for a growth surface
 */
export function validateGrowthSurfaceContentDensity(
  surfaceType: GrowthSurfaceType,
  summary: GrowthSurfaceSummary,
  sections: { title: string; content: string }[]
): ContentPolicyResult {
  const violations: ContentPolicyViolation[] = [];
  const warnings: ContentPolicyWarning[] = [];

  // Check section count
  if (sections.length > CONTENT_POLICY.CLUTTER_THRESHOLD) {
    violations.push({
      code: 'TOO_MANY_SECTIONS',
      message: `Page has ${sections.length} sections, maximum allowed is ${CONTENT_POLICY.CLUTTER_THRESHOLD}`,
      severity: 'error',
    });
  }

  // Check description length
  if (summary.description.length < CONTENT_DENSITY_LIMITS.MIN_DESCRIPTION_LENGTH) {
    violations.push({
      code: 'DESCRIPTION_TOO_SHORT',
      message: `Description must be at least ${CONTENT_DENSITY_LIMITS.MIN_DESCRIPTION_LENGTH} characters`,
      severity: 'error',
    });
  }

  if (summary.description.length > CONTENT_DENSITY_LIMITS.MAX_DESCRIPTION_LENGTH) {
    warnings.push({
      code: 'DESCRIPTION_TOO_LONG',
      message: `Description exceeds ${CONTENT_DENSITY_LIMITS.MAX_DESCRIPTION_LENGTH} characters`,
      severity: 'warning',
      suggestion: 'Consider shortening the description for better readability',
    });
  }

  // Check highlights count
  if (summary.highlights.length > GROWTH_SURFACE_LIMITS.MAX_HIGHLIGHTS) {
    warnings.push({
      code: 'TOO_MANY_HIGHLIGHTS',
      message: `Page has ${summary.highlights.length} highlights, maximum recommended is ${GROWTH_SURFACE_LIMITS.MAX_HIGHLIGHTS}`,
      severity: 'warning',
      suggestion: 'Reduce highlights to maintain a clean layout',
    });
  }

  // Check for thin content
  const totalContentLength = summary.description.length + sections.reduce(
    (acc, s) => acc + s.content.length,
    0
  );

  if (totalContentLength < CONTENT_POLICY.MIN_UNIQUE_CONTENT_WORDS * 5) {
    // Rough estimate: 5 chars per word
    violations.push({
      code: 'THIN_CONTENT',
      message: ERROR_MESSAGES.CONTENT_TOO_THIN,
      severity: 'error',
    });
  }

  // Check for spam patterns in content
  const contentText = `${summary.description} ${summary.title} ${summary.highlights.join(' ')}`.toLowerCase();

  for (const keyword of CONTENT_POLICY.DISALLOWED_KEYWORDS) {
    if (contentText.includes(keyword.toLowerCase())) {
      violations.push({
        code: 'DISALLOWED_KEYWORD',
        message: `Content contains disallowed keyword: "${keyword}"`,
        severity: 'error',
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
  };
}

// ============================================================================
// CTA Discipline Validation
// ============================================================================

/**
 * Validate CTA discipline - ensures primary CTA always leads to tool
 */
export function validateGrowthSurfaceCtaDiscipline(
  cta: GrowthSurfaceCtaModel,
  surfaceType: GrowthSurfaceType
): ContentPolicyResult {
  const violations: ContentPolicyViolation[] = [];
  const warnings: ContentPolicyWarning[] = [];

  // Check CTA count
  const totalCtas = 1 + cta.secondary.length;
  if (totalCtas > CTA_LIMITS.MAX_TOTAL_CTA) {
    violations.push({
      code: 'TOO_MANY_CTAS',
      message: `Page has ${totalCtas} CTAs, maximum allowed is ${CTA_LIMITS.MAX_TOTAL_CTA}`,
      severity: 'error',
    });
  }

  // Check primary CTA exists
  if (!cta.primary) {
    violations.push({
      code: 'MISSING_PRIMARY_CTA',
      message: ERROR_MESSAGES.CTA_MISSING,
      severity: 'error',
    });
  } else {
    // Primary CTA should lead to paste-link tool for most surfaces
    const allowedPrimaryCtas = [
      SurfaceCtaType.PASTE_LINK,
      SurfaceCtaType.RESOLVE_VOUCHER,
    ];

    if (!allowedPrimaryCtas.includes(cta.primary.type)) {
      warnings.push({
        code: 'UNEXPECTED_PRIMARY_CTA',
        message: `Primary CTA should lead to paste-link tool`,
        severity: 'warning',
        suggestion: 'Consider using PASTE_LINK or RESOLVE_VOUCHER as primary CTA',
      });
    }
  }

  // Check for fake urgency CTAs
  const urgencyKeywords = ['ngay', 'hôm nay', 'sắp hết', 'chỉ còn', 'limited', 'urgent'];
  const allCtaLabels = [
    cta.primary?.label || '',
    ...cta.secondary.map((c) => c.label),
  ];

  for (const label of allCtaLabels) {
    const labelLower = label.toLowerCase();
    for (const keyword of urgencyKeywords) {
      if (labelLower.includes(keyword)) {
        warnings.push({
          code: 'URGENCY_CTA',
          message: `CTA "${label}" contains urgency language`,
          severity: 'warning',
          suggestion: 'Avoid fake urgency in CTAs',
        });
      }
    }
  }

  // Check for clickbait patterns
  for (const label of allCtaLabels) {
    const clickbaitPatterns = [
      /click here/i,
      /click now/i,
      /nhấn vào đây/i,
    ];

    for (const pattern of clickbaitPatterns) {
      if (pattern.test(label)) {
        violations.push({
          code: 'CLICKBAIT_CTA',
          message: `CTA "${label}" appears to be clickbait`,
          severity: 'error',
        });
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
  };
}

// ============================================================================
// Pattern Validation
// ============================================================================

/**
 * Check if a content pattern is allowed
 */
export function isGrowthContentPatternAllowed(
  pattern: string,
  context: {
    surfaceType: GrowthSurfaceType;
    location: 'title' | 'description' | 'cta' | 'highlight';
  }
): { allowed: boolean; reason?: string } {
  // Check for spam keywords
  for (const keyword of CONTENT_POLICY.DISALLOWED_KEYWORDS) {
    if (pattern.toLowerCase().includes(keyword.toLowerCase())) {
      return {
        allowed: false,
        reason: `Pattern contains disallowed keyword: "${keyword}"`,
      };
    }
  }

  // Check for excessive punctuation (spam indicator)
  const punctuationCount = (pattern.match(/[!?.]{2,}/g) || []).length;
  if (punctuationCount > 0) {
    return {
      allowed: false,
      reason: 'Pattern contains excessive punctuation',
    };
  }

  // Check for ALL CAPS (spam indicator)
  const words = pattern.split(/\s+/);
  const allCapsWords = words.filter((w) => w.length > 3 && w === w.toUpperCase());
  if (allCapsWords.length > 2) {
    return {
      allowed: false,
      reason: 'Pattern contains excessive ALL CAPS words',
    };
  }

  // Check for excessive links in content (link spam)
  const linkCount = (pattern.match(/https?:\/\//g) || []).length;
  if (linkCount > CONTENT_POLICY.SPAM_LINK_DENSITY_THRESHOLD * pattern.length / 20) {
    // Rough estimate
    return {
      allowed: false,
      reason: 'Pattern contains too many links',
    };
  }

  return { allowed: true };
}

// ============================================================================
// Layout Validation
// ============================================================================

/**
 * Validate layout for clutter and ad-like patterns
 */
export function validateGrowthSurfaceLayout(
  layout: {
    bannerCount: number;
    popupCount: number;
    stickyCtaCount: number;
    sectionCount: number;
  }
): ContentPolicyResult {
  const violations: ContentPolicyViolation[] = [];
  const warnings: ContentPolicyWarning[] = [];

  // Check for banners (not allowed)
  if (layout.bannerCount > CONTENT_POLICY.BANNER_COUNT_MAX) {
    violations.push({
      code: 'TOO_MANY_BANNERS',
      message: `Page has ${layout.bannerCount} banners, none allowed`,
      severity: 'error',
    });
  }

  // Check for popups (not allowed)
  if (layout.popupCount > 0) {
    violations.push({
      code: 'POPUP_DETECTED',
      message: 'Popups are not allowed on growth surfaces',
      severity: 'error',
    });
  }

  // Check for sticky CTAs (limited)
  if (layout.stickyCtaCount > CONTENT_POLICY.STICKY_CTA_COUNT_MAX) {
    warnings.push({
      code: 'TOO_MANY_STICKY_CTAS',
      message: `Page has ${layout.stickyCtaCount} sticky CTAs, maximum is ${CONTENT_POLICY.STICKY_CTA_COUNT_MAX}`,
      severity: 'warning',
    });
  }

  // Check for clutter
  if (layout.sectionCount > CONTENT_POLICY.CLUTTER_THRESHOLD) {
    violations.push({
      code: 'CLUTTERED_LAYOUT',
      message: `Page has ${layout.sectionCount} sections, which exceeds clutter threshold of ${CONTENT_POLICY.CLUTTER_THRESHOLD}`,
      severity: 'error',
    });
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
  };
}

// ============================================================================
// Surface-Specific Validation
// ============================================================================

/**
 * Validate shop page content
 */
export function validateShopPageContent(
  data: {
    summary: GrowthSurfaceSummary;
    cta: GrowthSurfaceCtaModel;
    voucherHintCount: number;
  }
): ContentPolicyResult {
  const violations: ContentPolicyViolation[] = [];
  const warnings: ContentPolicyWarning[] = [];

  // Check voucher hint count (limited)
  if (data.voucherHintCount > GROWTH_SURFACE_LIMITS.MAX_VOUCHER_HINTS) {
    warnings.push({
      code: 'TOO_MANY_VOUCHER_HINTS',
      message: `Page shows ${data.voucherHintCount} voucher hints, maximum recommended is ${GROWTH_SURFACE_LIMITS.MAX_VOUCHER_HINTS}`,
      severity: 'warning',
      suggestion: 'Show fewer voucher hints to maintain focus on paste-link tool',
    });
  }

  // Check summary doesn't promise too much
  if (data.summary.highlights.length > 3) {
    warnings.push({
      code: 'TOO_MANY_HIGHLIGHTS',
      message: 'Shop page has too many highlights',
      severity: 'warning',
    });
  }

  // Run base validations
  const contentDensityResult = validateGrowthSurfaceContentDensity(
    GrowthSurfaceType.SHOP,
    data.summary,
    []
  );

  const ctaResult = validateGrowthSurfaceCtaDiscipline(data.cta, GrowthSurfaceType.SHOP);

  return {
    isValid: violations.length === 0 && contentDensityResult.isValid && ctaResult.isValid,
    violations: [...violations, ...contentDensityResult.violations, ...ctaResult.violations],
    warnings: [...warnings, ...contentDensityResult.warnings, ...ctaResult.warnings],
  };
}

/**
 * Validate category page content
 */
export function validateCategoryPageContent(
  data: {
    summary: GrowthSurfaceSummary;
    cta: GrowthSurfaceCtaModel;
    voucherPatternCount: number;
  }
): ContentPolicyResult {
  const violations: ContentPolicyViolation[] = [];
  const warnings: ContentPolicyWarning[] = [];

  // Check voucher pattern count (limited)
  if (data.voucherPatternCount > GROWTH_SURFACE_LIMITS.MAX_VOUCHER_PATTERNS) {
    warnings.push({
      code: 'TOO_MANY_VOUCHER_PATTERNS',
      message: `Page shows ${data.voucherPatternCount} voucher patterns, maximum recommended is ${GROWTH_SURFACE_LIMITS.MAX_VOUCHER_PATTERNS}`,
      severity: 'warning',
    });
  }

  // Run base validations
  const contentDensityResult = validateGrowthSurfaceContentDensity(
    GrowthSurfaceType.CATEGORY,
    data.summary,
    []
  );

  const ctaResult = validateGrowthSurfaceCtaDiscipline(data.cta, GrowthSurfaceType.CATEGORY);

  return {
    isValid: violations.length === 0 && contentDensityResult.isValid && ctaResult.isValid,
    violations: [...violations, ...contentDensityResult.violations, ...ctaResult.violations],
    warnings: [...warnings, ...contentDensityResult.warnings, ...ctaResult.warnings],
  };
}

/**
 * Validate tool explainer page content
 */
export function validateToolExplainerContent(
  data: {
    summary: GrowthSurfaceSummary;
    cta: GrowthSurfaceCtaModel;
    stepCount: number;
  }
): ContentPolicyResult {
  const violations: ContentPolicyViolation[] = [];
  const warnings: ContentPolicyWarning[] = [];

  // Check step count
  if (data.stepCount > GROWTH_SURFACE_LIMITS.MAX_TOOL_STEPS) {
    warnings.push({
      code: 'TOO_MANY_STEPS',
      message: `Tool explainer has ${data.stepCount} steps, maximum is ${GROWTH_SURFACE_LIMITS.MAX_TOOL_STEPS}`,
      severity: 'warning',
    });
  }

  // Run base validations
  const contentDensityResult = validateGrowthSurfaceContentDensity(
    GrowthSurfaceType.TOOL_EXPLAINER,
    data.summary,
    []
  );

  const ctaResult = validateGrowthSurfaceCtaDiscipline(data.cta, GrowthSurfaceType.TOOL_EXPLAINER);

  return {
    isValid: violations.length === 0 && contentDensityResult.isValid && ctaResult.isValid,
    violations: [...violations, ...contentDensityResult.violations, ...ctaResult.violations],
    warnings: [...warnings, ...contentDensityResult.warnings, ...ctaResult.warnings],
  };
}
