// =============================================================================
// Public Voucher Conversion Types
// Production-grade type definitions for conversion UX
// =============================================================================

// =============================================================================
// View States
// =============================================================================

export type VoucherConversionViewState =
  | 'loading'
  | 'success'
  | 'no_match'
  | 'invalid_input'
  | 'rate_limited'
  | 'failure';

export type VoucherPrimaryActionState =
  | 'idle'
  | 'copying'
  | 'copied'
  | 'opening'
  | 'opened'
  | 'error';

// =============================================================================
// Action Results
// =============================================================================

export interface VoucherCopyResult {
  success: boolean;
  code: string;
  error?: string;
}

export interface VoucherOpenShopeeResult {
  success: boolean;
  targetUrl?: string;
  error?: string;
}

// =============================================================================
// Presentation Models
// =============================================================================

export interface VoucherResultPresentationModel {
  /** Unique identifier */
  requestId: string;
  /** Current view state */
  viewState: VoucherConversionViewState;
  /** Best voucher to display prominently */
  bestVoucher: VoucherBestPresentation | null;
  /** Alternative candidates */
  candidates: VoucherCandidatePresentation[];
  /** Confidence information */
  confidence: VoucherConfidencePresentation | null;
  /** Explanation text */
  explanation: VoucherExplanationPresentation | null;
  /** Fallback options if no match */
  fallback: VoucherFallbackPresentation | null;
  /** Performance metadata */
  latencyMs: number;
  /** Whether served from cache */
  servedFromCache: boolean;
}

export interface VoucherBestPresentation {
  voucherId: string;
  code: string;
  discountText: string;
  discountValue: string;
  minSpend: string | null;
  maxDiscount: string | null;
  validUntil: string;
  headline: string;
  primaryAction: VoucherPrimaryActionConfig;
  secondaryAction: VoucherSecondaryActionConfig | null;
}

export interface VoucherCandidatePresentation {
  voucherId: string;
  code: string;
  discountText: string;
  rank: number;
  reason: string;
  action: VoucherCandidateActionConfig;
}

export interface VoucherConfidencePresentation {
  level: 'exact' | 'high' | 'medium' | 'low';
  badgeText: string;
  badgeVariant: 'success' | 'info' | 'warning';
}

export interface VoucherExplanationPresentation {
  summary: string;
  tips: string[];
}

export interface VoucherFallbackPresentation {
  hasFallback: boolean;
  message: string;
  suggestion?: string;
}

export interface VoucherPrimaryActionConfig {
  type: 'copy' | 'open_shopee';
  label: string;
  priority: 'primary' | 'secondary';
}

export interface VoucherSecondaryActionConfig {
  type: 'copy' | 'open_shopee';
  label: string;
  priority: 'primary' | 'secondary';
}

export interface VoucherCandidateActionConfig {
  type: 'select' | 'copy';
  label: string;
}

// =============================================================================
// No Match Presentation
// =============================================================================

export interface VoucherNoMatchPresentationModel {
  viewState: 'no_match';
  message: string;
  suggestion: string;
  fallback: VoucherFallbackPresentation;
  canRetry: boolean;
}

// =============================================================================
// Conversion Events
// =============================================================================

export type PublicConversionEvent =
  | 'best_voucher_viewed'
  | 'candidate_viewed'
  | 'copy_clicked'
  | 'copy_success'
  | 'copy_failure'
  | 'open_shopee_clicked'
  | 'open_shopee_success'
  | 'no_match_viewed'
  | 'fallback_interacted';

export interface PublicConversionStep {
  step: 'paste' | 'resolve_success' | 'best_shown' | 'copy_clicked' | 'copy_success' | 'open_clicked';
  timestamp: number;
}

// =============================================================================
// Interaction State
// =============================================================================

export interface PublicInteractionFeedbackState {
  copyFeedback: 'idle' | 'success' | 'error';
  openFeedback: 'idle' | 'success' | 'error';
  feedbackMessage?: string;
}

export type VoucherResultLayoutMode = 'hero' | 'list' | 'compact';

export type VoucherResultPriorityHint = 'exact' | 'recommendation' | 'fallback';

// =============================================================================
// Action Eligibility
// =============================================================================

export interface VoucherActionEligibility {
  canCopy: boolean;
  canOpenShopee: boolean;
  canSelectCandidate: boolean;
  disabledReason?: string;
}

// =============================================================================
// Errors & Warnings
// =============================================================================

export interface VoucherConversionWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning';
}

export interface VoucherConversionError {
  code: string;
  message: string;
  canRetry: boolean;
}
