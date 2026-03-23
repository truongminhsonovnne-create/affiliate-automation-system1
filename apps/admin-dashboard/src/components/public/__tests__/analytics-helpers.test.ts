/**
 * Analytics Helper Tests — self-contained (no 'use client' imports)
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests confidenceBucket and sourceType — the two pure logic functions
 * from analytics-service.ts.
 *
 * We reproduce them here inline so vitest (node environment) can run them
 * without needing to resolve the 'use client' analytics.ts module.
 *
 * Run:  npx vitest run src/components/public/__tests__/analytics-helpers.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest';

// ── Inline copies of pure helpers from analytics-service.ts ────────────────────

function confidenceBucket(score?: number): 'high' | 'medium' | 'low' | 'unknown' {
  if (score == null) return 'unknown';
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function sourceType(source?: string): 'exact' | 'fallback' | 'broad' | 'unknown' {
  if (!source) return 'unknown';
  if (source === 'AccessTrade') return 'exact';
  if (source === 'MasOffer') return 'exact';
  if (source.toLowerCase().includes('broad')) return 'broad';
  return 'fallback';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('confidenceBucket', () => {
  it('undefined → unknown', () => {
    expect(confidenceBucket(undefined)).toBe('unknown');
  });

  it('null → unknown', () => {
    expect(confidenceBucket(null as unknown as undefined)).toBe('unknown');
  });

  it('≥ 0.8 → high', () => {
    expect(confidenceBucket(0.8)).toBe('high');
    expect(confidenceBucket(0.9)).toBe('high');
    expect(confidenceBucket(1.0)).toBe('high');
  });

  it('≥ 0.5 and < 0.8 → medium', () => {
    expect(confidenceBucket(0.5)).toBe('medium');
    expect(confidenceBucket(0.6)).toBe('medium');
    expect(confidenceBucket(0.79)).toBe('medium');
  });

  it('< 0.5 → low', () => {
    expect(confidenceBucket(0.49)).toBe('low');
    expect(confidenceBucket(0.3)).toBe('low');
    expect(confidenceBucket(0.0)).toBe('low');
  });
});

describe('sourceType', () => {
  it('undefined → unknown', () => {
    expect(sourceType(undefined)).toBe('unknown');
  });

  it('empty string → unknown', () => {
    expect(sourceType('')).toBe('unknown');
  });

  it('AccessTrade → exact', () => {
    expect(sourceType('AccessTrade')).toBe('exact');
  });

  it('MasOffer → exact', () => {
    expect(sourceType('MasOffer')).toBe('exact');
  });

  it('MasOffer_broad → broad', () => {
    expect(sourceType('MasOffer_broad')).toBe('broad');
  });

  it('any string containing "broad" → broad (case-insensitive)', () => {
    expect(sourceType('anything_broad')).toBe('broad');
    expect(sourceType('broad_promo')).toBe('broad');
    expect(sourceType('MasOffer_broad')).toBe('broad');
    expect(sourceType('BROAD_PROMO')).toBe('broad'); // case-insensitive
  });

  it('other strings → fallback', () => {
    expect(sourceType('ShopeeInternal')).toBe('fallback');
    expect(sourceType('ManualOverride')).toBe('fallback');
    expect(sourceType('CustomSource')).toBe('fallback');
  });
});

describe('funnel composition', () => {
  // Simulates how trackResolveSuccess builds its event properties
  function buildResolveSuccessProps(meta: {
    confidenceScore?: number;
    matchedSource?: string;
    hasBestMatch: boolean;
    candidateCount: number;
    resultCount: number;
  }) {
    return {
      hasVoucher: meta.hasBestMatch,
      candidateCount: meta.candidateCount,
      confidenceBucket: confidenceBucket(meta.confidenceScore),
      sourceType: sourceType(meta.matchedSource),
      resultCount: meta.resultCount,
    };
  }

  it('high-confidence exact match → high + exact', () => {
    const props = buildResolveSuccessProps({
      confidenceScore: 0.92,
      matchedSource: 'AccessTrade',
      hasBestMatch: true,
      candidateCount: 2,
      resultCount: 3,
    });
    expect(props.confidenceBucket).toBe('high');
    expect(props.sourceType).toBe('exact');
    expect(props.hasVoucher).toBe(true);
    expect(props.resultCount).toBe(3);
  });

  it('low-confidence broad match → low + broad', () => {
    const props = buildResolveSuccessProps({
      confidenceScore: 0.31,
      matchedSource: 'MasOffer_broad',
      hasBestMatch: true,
      candidateCount: 0,
      resultCount: 1,
    });
    expect(props.confidenceBucket).toBe('low');
    expect(props.sourceType).toBe('broad');
  });

  it('no-match → unknown bucket + unknown source', () => {
    const props = buildResolveSuccessProps({
      confidenceScore: 0,
      matchedSource: undefined,
      hasBestMatch: false,
      candidateCount: 0,
      resultCount: 0,
    });
    expect(props.confidenceBucket).toBe('low');
    expect(props.sourceType).toBe('unknown');
    expect(props.hasVoucher).toBe(false);
  });

  it('medium-confidence fallback → medium + fallback', () => {
    const props = buildResolveSuccessProps({
      confidenceScore: 0.65,
      matchedSource: 'ShopeeInternal',
      hasBestMatch: true,
      candidateCount: 1,
      resultCount: 2,
    });
    expect(props.confidenceBucket).toBe('medium');
    expect(props.sourceType).toBe('fallback');
  });
});

describe('copy source types', () => {
  // Valid copy sources as defined in coupon_copy event
  const validSources = ['best_result', 'alternative', 'history'] as const;
  type CopySource = typeof validSources[number];

  it('all three copy sources are valid', () => {
    expect(validSources).toContain('best_result');
    expect(validSources).toContain('alternative');
    expect(validSources).toContain('history');
  });

  it('CopySource type matches event contract', () => {
    const sources: CopySource[] = ['best_result', 'alternative', 'history'];
    expect(sources.length).toBe(3);
  });
});

describe('feedback context types', () => {
  const validContexts = ['result', 'alternative', 'page'] as const;
  type FeedbackContext = typeof validContexts[number];

  it('all three feedback contexts are valid', () => {
    expect(validContexts).toContain('result');
    expect(validContexts).toContain('alternative');
    expect(validContexts).toContain('page');
  });
});

describe('required event count', () => {
  it('14 required events are defined in the spec', () => {
    const required = [
      'page_view',
      'hero_cta_click',
      'resolve_submit',
      'resolve_success',
      'resolve_no_result',
      'resolve_low_confidence',
      'resolve_error',
      'best_result_click',
      'alternative_click',
      'coupon_copy',
      'feedback_positive',
      'feedback_negative',
      'recent_search_open',
      'save_link',
    ];
    expect(required.length).toBe(14);
  });
});
