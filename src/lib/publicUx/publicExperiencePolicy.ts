// =============================================================================
// Public Experience Policy
// Clean UX enforcement for public consumer product
// =============================================================================

/**
 * Policy to enforce clean, minimal, ad-free experience
 */
export const publicExperiencePolicy = {
  /**
   * Whether to show ads
   */
  showAds: () => false,

  /**
   * Whether to show promotional banners
   */
  showPromotionalBanners: () => false,

  /**
   * Whether to show newsletter popups
   */
  showNewsletterPopups: () => false,

  /**
   * Whether to show cookie banners
   */
  showCookieBanners: () => false,

  /**
   * Maximum number of vouchers to show
   */
  maxVouchersToShow: () => 5,

  /**
   * Whether to show social proof sections
   */
  showSocialProof: () => false,

  /**
   * Whether to show trust badges
   */
  showTrustBadges: () => false,

  /**
   * Whether to show testimonials
   */
  showTestimonials: () => false,

  /**
   * Whether to show blog/content sections
   */
  showContentSections: () => false,

  /**
   * Whether to show FAQ sections
   */
  showFaqSection: () => false,

  /**
   * Whether to show footer links
   */
  showFooterLinks: () => true, // Minimal footer is okay

  /**
   * Whether to show header navigation
   */
  showHeaderNavigation: () => false, // Single page tool

  /**
   * Primary flow focus
   */
  primaryFlow: () => 'paste-link -> resolve -> copy -> shopee',

  /**
   * Maximum number of CTAs per page
   */
  maxCtasPerPage: () => 2,

  /**
   * Allowed page sections
   */
  allowedSections: () => [
    'paste-input',
    'result-display',
    'copy-button',
    'open-shopee-button',
    'minimal-footer',
  ],
} as const;

/**
 * Check if a UI element is allowed by policy
 */
export function isPublicUiElementAllowed(element: string): boolean {
  const allowed = publicExperiencePolicy.allowedSections();
  return allowed.includes(element);
}

/**
 * Validate minimal flow compliance
 */
export function validateMinimalFlowCompliance(flow: string[]): {
  compliant: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Must have paste input
  if (!flow.includes('paste-input')) {
    violations.push('Missing paste-input section');
  }

  // Must have result display
  if (!flow.includes('result-display')) {
    violations.push('Missing result-display section');
  }

  // Must have copy button
  if (!flow.includes('copy-button')) {
    violations.push('Missing copy-button section');
  }

  // Must have open shopee button
  if (!flow.includes('open-shopee-button')) {
    violations.push('Missing open-shopee-button section');
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}
