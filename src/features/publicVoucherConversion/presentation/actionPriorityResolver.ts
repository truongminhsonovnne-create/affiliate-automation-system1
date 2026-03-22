// =============================================================================
// Action Priority Resolver
// Production-grade resolver for voucher action prioritization
// =============================================================================

import { VoucherBestPresentation, VoucherCandidatePresentation, VoucherActionEligibility } from '../types';
import { CTA_PRIORITY } from '../constants';

/**
 * Resolve primary voucher action
 */
export function resolvePrimaryVoucherAction(
  voucher: VoucherBestPresentation
): 'copy' | 'open_shopee' {
  // Copy is always primary for best voucher
  return CTA_PRIORITY.PRIMARY_COPY;
}

/**
 * Resolve secondary voucher actions
 */
export function resolveSecondaryVoucherActions(
  voucher: VoucherBestPresentation
): Array<{ type: 'copy' | 'open_shopee'; priority: 'primary' | 'secondary' }> {
  return [
    {
      type: 'open_shopee',
      priority: 'secondary',
    },
  ];
}

/**
 * Evaluate action eligibility
 */
export function evaluateVoucherActionEligibility(
  voucher: VoucherBestPresentation | null,
  options?: {
    canCopy?: boolean;
    canOpenShopee?: boolean;
  }
): VoucherActionEligibility {
  // Default eligibility
  const canCopy = options?.canCopy ?? true;
  const canOpenShopee = options?.canOpenShopee ?? true;

  // Check if we have a valid voucher
  if (!voucher) {
    return {
      canCopy: false,
      canOpenShopee: false,
      canSelectCandidate: false,
      disabledReason: 'No voucher available',
    };
  }

  // Build eligibility
  return {
    canCopy,
    canOpenShopee,
    canSelectCandidate: true,
    disabledReason: !canCopy && !canOpenShopee ? 'Actions disabled' : undefined,
  };
}

/**
 * Determine if copy should be primary action
 */
export function isCopyPrimaryAction(voucher: VoucherBestPresentation): boolean {
  return true; // Always make copy primary for best voucher
}

/**
 * Determine if open shopee should be secondary action
 */
export function isOpenShopeeSecondaryAction(voucher: VoucherBestPresentation): boolean {
  return true; // Always make open shopee secondary
}

/**
 * Resolve action hierarchy for candidates
 */
export function resolveCandidateActionHierarchy(
  candidates: VoucherCandidatePresentation[]
): Array<{
  candidate: VoucherCandidatePresentation;
  isPrimary: boolean;
}> {
  return candidates.map((candidate, index) => ({
    candidate,
    isPrimary: index === 0, // First candidate is primary
  }));
}
