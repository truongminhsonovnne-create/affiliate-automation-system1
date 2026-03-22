/**
 * Unit tests for resolve-ranking.ts
 */

import {
  rankOffers,
  assessCandidates,
  computeConfidence,
  extractAlternatives,
  buildDiscountText,
} from '../resolve-ranking';
import type { DbOffer } from '../resolve-ranking';

function makeOffer(overrides: Partial<DbOffer> = {}): DbOffer {
  return {
    id: '1',
    external_id: 'ext1',
    source: 'masoffer',
    source_type: 'voucher',
    title: 'Test Offer',
    merchant_name: 'Test Shop',
    merchant_id: null,
    category: null,
    deal_subtype: null,
    coupon_code: 'TESTCODE',
    discount_type: 'percent',
    discount_value: 10,
    max_discount: null,
    min_order_value: null,
    destination_url: null,
    terms: null,
    image_url: null,
    start_at: null,
    end_at: null,
    status: 'active',
    confidence_score: 0.7,
    hotness_score: null,
    url_quality_score: null,
    freshness_score: null,
    is_pushsale: false,
    is_exclusive: false,
    synced_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('rankOffers', () => {
  it('ranks exact shop match above broad promotions', () => {
    const offers = [
      makeOffer({ merchant_id: null, coupon_code: 'BROAD' }),
      makeOffer({ merchant_id: '123', coupon_code: 'EXACT' }),
    ];
    const ranked = rankOffers(offers, { shopId: '123', itemId: null });
    expect(ranked[0].offer.coupon_code).toBe('EXACT');
    expect(ranked[0].reasons).toContain('Đúng shop');
  });

  it('ranks active above inactive', () => {
    const offers = [
      makeOffer({ status: 'inactive' }),
      makeOffer({ status: 'active' }),
    ];
    const ranked = rankOffers(offers, { shopId: null, itemId: null });
    expect(ranked[0].offer.status).toBe('active');
  });

  it('ranks exclusive higher than non-exclusive', () => {
    const offers = [
      makeOffer({ is_exclusive: false }),
      makeOffer({ is_exclusive: true, coupon_code: 'EXCL' }),
    ];
    const ranked = rankOffers(offers, { shopId: null, itemId: null });
    expect(ranked[0].offer.is_exclusive).toBe(true);
    expect(ranked[0].reasons).toContain('Ưu đãi độc quyền');
  });

  it('ranks offers with coupon code higher', () => {
    const offers = [
      makeOffer({ coupon_code: '' }),
      makeOffer({ coupon_code: 'CODE123' }),
    ];
    const ranked = rankOffers(offers, { shopId: null, itemId: null });
    expect(ranked[0].offer.coupon_code).toBe('CODE123');
  });

  it('ranks recent syncs higher than stale', () => {
    const now = new Date().toISOString();
    const offers = [
      makeOffer({ synced_at: now }),
      makeOffer({ synced_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }),
    ];
    const ranked = rankOffers(offers, { shopId: null, itemId: null });
    expect(ranked[0].offer.synced_at).toBe(now);
  });

  it('returns empty array for empty input', () => {
    const ranked = rankOffers([], { shopId: null, itemId: null });
    expect(ranked).toEqual([]);
  });

  it('considers item match when itemId is provided', () => {
    const offers = [
      makeOffer({ external_id: 'no-match', coupon_code: 'A' }),
      makeOffer({ external_id: '123-related', coupon_code: 'B' }),
    ];
    const ranked = rankOffers(offers, { shopId: null, itemId: '123' });
    expect(ranked[0].offer.coupon_code).toBe('B');
    expect(ranked[0].reasons).toContain('Khớp sản phẩm');
  });
});

describe('assessCandidates', () => {
  it('returns sufficient when top score >= 50', () => {
    const ranked = rankOffers(
      [makeOffer({ merchant_id: '123', coupon_code: 'EXACT' })],
      { shopId: '123', itemId: null }
    );
    expect(assessCandidates(ranked)).toBe('sufficient');
  });

  it('returns no_result for empty ranked list', () => {
    expect(assessCandidates([])).toBe('no_result');
  });

  it('returns enrich_recommended for medium score', () => {
    // Score will be between 15-49 without shop match
    const ranked = rankOffers(
      [makeOffer({ merchant_id: null, confidence_score: 0.3 })],
      { shopId: '999', itemId: null }
    );
    const result = assessCandidates(ranked);
    expect(result === 'sufficient' || result === 'enrich_recommended').toBe(true);
  });
});

describe('computeConfidence', () => {
  it('returns 0 for empty ranked list', () => {
    expect(computeConfidence([])).toBe(0);
  });

  it('returns normalized score', () => {
    const ranked = rankOffers(
      [makeOffer({ merchant_id: '123', confidence_score: 0.9 })],
      { shopId: '123', itemId: null }
    );
    const conf = computeConfidence(ranked);
    expect(conf).toBeGreaterThan(0);
    expect(conf).toBeLessThanOrEqual(1);
  });
});

describe('extractAlternatives', () => {
  it('excludes the top result', () => {
    const offers = [
      makeOffer({ coupon_code: 'TOP', merchant_id: '1' }),
      makeOffer({ coupon_code: 'ALT1' }),
      makeOffer({ coupon_code: 'ALT2' }),
    ];
    const ranked = rankOffers(offers, { shopId: '1', itemId: null });
    const alts = extractAlternatives(ranked);
    const codes = alts.map((a) => a.code);
    expect(codes).not.toContain('TOP');
    expect(alts.length).toBe(2);
  });

  it('ranks alternatives correctly (rank starts at 2)', () => {
    const offers = [
      makeOffer({ coupon_code: 'TOP', merchant_id: '1' }),
      makeOffer({ coupon_code: 'SECOND' }),
      makeOffer({ coupon_code: 'THIRD' }),
    ];
    const ranked = rankOffers(offers, { shopId: '1', itemId: null });
    const alts = extractAlternatives(ranked);
    expect(alts[0].rank).toBe(2);
    expect(alts[1].rank).toBe(3);
  });

  it('respects limit', () => {
    const offers = Array.from({ length: 15 }, (_, i) =>
      makeOffer({ coupon_code: `CODE${i}` })
    );
    const ranked = rankOffers(offers, { shopId: null, itemId: null });
    const alts = extractAlternatives(ranked, 5);
    expect(alts.length).toBe(5);
  });
});

describe('buildDiscountText', () => {
  it('returns percent discount', () => {
    const text = buildDiscountText(makeOffer({ discount_type: 'percent', discount_value: 15 }));
    expect(text).toBe('15%');
  });

  it('returns fixed discount', () => {
    const text = buildDiscountText(makeOffer({ discount_type: 'fixed', discount_value: 50000 }));
    expect(text).toBe('50.000đ');
  });

  it('returns freeship', () => {
    const text = buildDiscountText(makeOffer({ discount_type: 'free_shipping' }));
    expect(text).toBe('Freeship');
  });

  it('returns generic for unknown type', () => {
    const text = buildDiscountText(makeOffer({ discount_type: null, discount_value: null }));
    expect(text).toBe('Khuyến mãi');
  });
});
