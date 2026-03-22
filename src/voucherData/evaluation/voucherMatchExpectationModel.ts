// =============================================================================
// Voucher Match Expectation Model
// Production-grade model for expected matching outcomes
// =============================================================================

import { VoucherRankingExpectation, VoucherMatchRequestInput } from '../types.js';

export interface VoucherMatchExpectation {
  request: VoucherMatchRequestInput;
  expectedVouchers: ExpectedVoucher[];
  metadata: ExpectationMetadata;
}

export interface ExpectedVoucher {
  voucherId: string;
  expectedRank: number;
  mustMatch: boolean;
  expectedDiscount?: number;
  notes?: string;
}

export interface ExpectationMetadata {
  createdAt: Date;
  createdBy: string;
  source: 'manual' | 'inferred' | 'historical';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Build a voucher match expectation from input
 */
export function buildVoucherMatchExpectation(
  request: VoucherMatchRequestInput,
  expectedVouchers: ExpectedVoucher[],
  metadata: Partial<ExpectationMetadata> = {}
): VoucherMatchExpectation {
  // Validate expected vouchers
  if (expectedVouchers.length === 0) {
    throw new Error('At least one expected voucher is required');
  }

  // Validate ranks are unique
  const ranks = expectedVouchers.map((v) => v.expectedRank);
  if (new Set(ranks).size !== ranks.length) {
    throw new Error('Expected ranks must be unique');
  }

  // Sort by rank
  const sortedVouchers = [...expectedVouchers].sort((a, b) => a.expectedRank - b.expectedRank);

  return {
    request,
    expectedVouchers: sortedVouchers,
    metadata: {
      createdAt: new Date(),
      createdBy: metadata.createdBy || 'system',
      source: metadata.source || 'manual',
      confidence: metadata.confidence || 'medium',
    },
  };
}

/**
 * Validate a voucher match expectation
 */
export function validateVoucherMatchExpectation(expectation: VoucherMatchExpectation): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate request
  if (!expectation.request) {
    errors.push('Request is required');
  }

  // Validate expected vouchers
  if (!expectation.expectedVouchers || expectation.expectedVouchers.length === 0) {
    errors.push('At least one expected voucher is required');
  }

  // Validate ranks
  const ranks = expectation.expectedVouchers.map((v) => v.expectedRank);
  if (new Set(ranks).size !== ranks.length) {
    errors.push('Expected ranks must be unique');
  }

  // Validate rank values are positive
  if (ranks.some((r) => r < 1)) {
    errors.push('Ranks must be positive integers');
  }

  // Validate metadata
  if (!expectation.metadata) {
    errors.push('Metadata is required');
  } else {
    if (!expectation.metadata.createdBy) {
      errors.push('CreatedBy is required in metadata');
    }

    if (!['manual', 'inferred', 'historical'].includes(expectation.metadata.source)) {
      errors.push('Invalid source in metadata');
    }

    if (!['high', 'medium', 'low'].includes(expectation.metadata.confidence)) {
      errors.push('Invalid confidence in metadata');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create an expectation from historical data
 */
export function createExpectationFromHistorical(
  request: VoucherMatchRequestInput,
  historicalVoucherIds: string[]
): VoucherMatchExpectation {
  const expectedVouchers: ExpectedVoucher[] = historicalVoucherIds.map((voucherId, index) => ({
    voucherId,
    expectedRank: index + 1,
    mustMatch: index === 0, // Only first one must match
  }));

  return buildVoucherMatchExpectation(request, expectedVouchers, {
    source: 'historical',
    confidence: 'medium',
    createdBy: 'system',
  });
}

/**
 * Create a simple expectation with top voucher
 */
export function createSimpleExpectation(
  request: VoucherMatchRequestInput,
  expectedVoucherId: string,
  confidence: 'high' | 'medium' | 'low' = 'medium'
): VoucherMatchExpectation {
  return buildVoucherMatchExpectation(
    request,
    [
      {
        voucherId: expectedVoucherId,
        expectedRank: 1,
        mustMatch: true,
      },
    ],
    {
      source: 'manual',
      confidence,
      createdBy: 'operator',
    }
  );
}
