// =============================================================================
// Public Interaction Policy
// Policy for user interactions in public product
// =============================================================================

/**
 * Get interaction policy
 */
export function getPublicInteractionPolicy() {
  return {
    // Allow copy button
    allowCopyButton: true,
    // Allow open shopee button
    allowOpenShopeeButton: true,
    // Allow candidates panel
    allowCandidatesPanel: true,
    // Max CTAs on result page
    maxCtas: 2,
    // Allow animations
    allowAnimations: true,
    // Animation duration limit (ms)
    maxAnimationDuration: 300,
  };
}

/**
 * Check if interaction pattern is allowed
 */
export function isInteractionPatternAllowed(pattern: string): boolean {
  const policy = getPublicInteractionPolicy();

  const allowedPatterns: Record<string, boolean> = {
    'copy-button': policy.allowCopyButton,
    'open-shopee-button': policy.allowOpenShopeeButton,
    'candidates-panel': policy.allowCandidatesPanel,
    'explanation-toggle': true,
    'retry-button': true,
  };

  return allowedPatterns[pattern] ?? false;
}

/**
 * Validate conversion flow compliance
 */
export function validateConversionFlowCompliance(flow: {
  hasCopyButton: boolean;
  hasOpenShopeeButton: boolean;
  hasCandidatesPanel: boolean;
}): {
  compliant: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const policy = getPublicInteractionPolicy();

  // Check CTAs
  let ctaCount = 0;
  if (flow.hasCopyButton) ctaCount++;
  if (flow.hasOpenShopeeButton) ctaCount++;

  if (ctaCount > policy.maxCtas) {
    violations.push(`Too many CTAs: ${ctaCount} > ${policy.maxCtas}`);
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}
