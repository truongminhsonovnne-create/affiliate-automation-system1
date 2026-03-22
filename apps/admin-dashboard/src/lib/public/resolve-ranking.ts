/**
 * Ranking & Confidence — resolve-ranking.ts
 *
 * Rule-based ranking of DB candidates.
 * Computes confidence score from multiple quality signals.
 *
 * Ranking rules (in priority order):
 * 1. exact shop_id match > null shop_id (broad)
 * 2. item-level match > no item match
 * 3. active > expired
 * 4. fresh data > stale
 * 5. higher confidence_score from source
 * 6. is_exclusive > not exclusive
 * 7. is_pushsale (flash sale) can be boosted
 * 8. has coupon code > no code (usually more actionable)
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface RankedOffer {
  /** DB row */
  offer: DbOffer;
  /** Composite score used for ranking (0-100) */
  score: number;
  confidenceLevel: ConfidenceLevel;
  /** Why this offer was ranked here */
  reasons: string[];
}

export interface DbOffer {
  id: string;
  external_id: string;
  source: string;
  source_type: string;
  title: string;
  merchant_name: string;
  merchant_id: string | null;
  category: string | null;
  deal_subtype: string | null;
  coupon_code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  max_discount: number | null;
  min_order_value: number | null;
  destination_url: string | null;
  terms: string | null;
  image_url: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
  confidence_score: number;
  hotness_score: number | null;
  url_quality_score: number | null;
  freshness_score: number | null;
  is_pushsale: boolean | null;
  is_exclusive: boolean | null;
  synced_at: string | null;
}

// ── Scoring weights ────────────────────────────────────────────────────────────

const WEIGHTS = {
  EXACT_SHOP_MATCH: 25,
  ITEM_MATCH: 10,
  ACTIVE_STATUS: 15,
  EXCLUSIVE: 8,
  PUSHSALE: 5,
  HAS_CODE: 5,
  RECENCY_24H: 12,
  RECENCY_72H: 6,
  SOURCE_CONF_80: 10,
  SOURCE_CONF_50: 5,
  HAS_TERMS: 4,
} as const;

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Rank a set of DB offers for a given normalized input.
 * Returns offers sorted by composite score descending.
 */
export function rankOffers(
  offers: DbOffer[],
  queryKey: { shopId: string | null; itemId: string | null }
): RankedOffer[] {
  if (offers.length === 0) return [];

  const now = Date.now();
  const scored = offers.map((offer) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Exact shop match
    if (queryKey.shopId && offer.merchant_id === queryKey.shopId) {
      score += WEIGHTS.EXACT_SHOP_MATCH;
      reasons.push('Đúng shop');
    }

    // 2. Item-level match
    if (queryKey.itemId) {
      const offerKey = `${offer.external_id}${offer.category ?? ''}`.toLowerCase();
      if (offerKey.includes(queryKey.itemId)) {
        score += WEIGHTS.ITEM_MATCH;
        reasons.push('Khớp sản phẩm');
      }
    }

    // 3. Active status
    if (offer.status === 'active') {
      score += WEIGHTS.ACTIVE_STATUS;
    } else {
      reasons.push('⚠️ Đã hết hạn hoặc không hoạt động');
    }

    // 4. Exclusive
    if (offer.is_exclusive) {
      score += WEIGHTS.EXCLUSIVE;
      reasons.push('Ưu đãi độc quyền');
    }

    // 5. Pushsale / flash sale
    if (offer.is_pushsale) {
      score += WEIGHTS.PUSHSALE;
      reasons.push('Flash sale');
    }

    // 6. Has coupon code
    if (offer.coupon_code && offer.coupon_code.trim().length > 0) {
      score += WEIGHTS.HAS_CODE;
    }

    // 7. Recency
    if (offer.synced_at) {
      const ageMs = now - new Date(offer.synced_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours < 24) {
        score += WEIGHTS.RECENCY_24H;
      } else if (ageHours < 72) {
        score += WEIGHTS.RECENCY_72H;
      }
    }

    // 8. Source confidence
    if (offer.confidence_score >= 0.8) {
      score += WEIGHTS.SOURCE_CONF_80;
    } else if (offer.confidence_score >= 0.5) {
      score += WEIGHTS.SOURCE_CONF_50;
    }

    // 9. Has terms/conditions
    if (offer.terms && offer.terms.trim().length > 20) {
      score += WEIGHTS.HAS_TERMS;
    }

    // 10. Hotness score bonus
    if (offer.hotness_score != null && offer.hotness_score > 0) {
      score += Math.min(offer.hotness_score, 5);
    }

    // Determine confidence level
    const confidenceLevel: ConfidenceLevel =
      score >= 50 ? 'high'
      : score >= 25 ? 'medium'
      : 'low';

    return { offer, score, confidenceLevel, reasons };
  });

  // Sort by composite score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

/**
 * Decide if DB candidates are sufficient without enrich.
 * Returns 'sufficient' | 'enrich_recommended' | 'no_result'
 */
export function assessCandidates(
  ranked: RankedOffer[],
  threshold = 25
): 'sufficient' | 'enrich_recommended' | 'no_result' {
  if (ranked.length === 0) return 'no_result';
  const top = ranked[0];
  if (top.score >= threshold) return 'sufficient';
  if (top.score >= 15) return 'enrich_recommended';
  return 'no_result';
}

/**
 * Compute final confidence from ranked result.
 */
export function computeConfidence(ranked: RankedOffer[]): number {
  if (ranked.length === 0) return 0;
  const top = ranked[0];
  // Normalize composite score to 0-1
  const normalized = Math.min(top.score / 100, 1);
  // Blend with source confidence
  const sourceConf = top.offer.confidence_score ?? 0.5;
  return Math.round(Math.max(normalized, sourceConf) * 100) / 100;
}

/**
 * Extract top N alternatives (not the best match).
 */
export function extractAlternatives(
  ranked: RankedOffer[],
  limit = 9
): Array<{
  voucherId: string;
  code: string;
  discountText: string;
  rank: number;
  reason: string;
}> {
  return ranked.slice(1, 1 + limit).map((r, i) => ({
    voucherId: r.offer.external_id,
    code: r.offer.coupon_code ?? '',
    discountText: buildDiscountText(r.offer),
    rank: i + 2,
    reason: r.reasons.join(' · '),
  }));
}

// ── Discount helpers ────────────────────────────────────────────────────────────

export function buildDiscountText(offer: DbOffer): string {
  if (!offer.discount_type && offer.discount_value == null) return 'Khuyến mãi';
  switch (offer.discount_type) {
    case 'percent':
      return `${offer.discount_value}%`;
    case 'fixed':
      return `${(offer.discount_value ?? 0).toLocaleString('vi-VN')}đ`;
    case 'free_shipping':
      return 'Freeship';
    case 'buy_x_get_y':
      return 'Mua X tặng Y';
    default:
      return offer.discount_value != null ? `${offer.discount_value}%` : 'Khuyến mãi';
  }
}

export function buildMinSpend(minOrderValue: number | null): string | null {
  if (minOrderValue == null) return null;
  return `${minOrderValue.toLocaleString('vi-VN')}đ`;
}

export function buildHeadline(offer: DbOffer): string {
  const parts: string[] = [];
  if (offer.discount_type === 'free_shipping') {
    parts.push('Miễn phí vận chuyển');
  } else if (offer.discount_value != null) {
    if (offer.discount_type === 'percent') {
      parts.push(`Giảm ${offer.discount_value}%`);
    } else {
      parts.push(`Giảm ${offer.discount_value.toLocaleString('vi-VN')}đ`);
    }
  }
  if (offer.coupon_code) parts.push(`Mã: ${offer.coupon_code}`);
  if (offer.merchant_name) parts.push(`từ ${offer.merchant_name}`);
  return parts.join(' · ') || 'Ưu đãi hấp dẫn';
}

export function buildBestMatch(
  ranked: RankedOffer[]
): {
  voucherId: string;
  code: string;
  discountType: string;
  discountValue: string;
  minSpend: string | null;
  maxDiscount: string | null;
  validUntil: string;
  headline: string;
  applicableCategories: string[];
} | null {
  if (ranked.length === 0) return null;
  const top = ranked[0].offer;
  const DISCOUNT_TYPE_MAP: Record<string, string> = {
    percent: 'percentage',
    percentage: 'percentage',
    fixed: 'fixed_amount',
    fixed_amount: 'fixed_amount',
    free_shipping: 'free_shipping',
    buy_x_get_y: 'buy_x_get_y',
  };
  return {
    voucherId: top.external_id,
    code: top.coupon_code ?? '',
    discountType: DISCOUNT_TYPE_MAP[top.discount_type ?? ''] ?? 'percentage',
    discountValue: top.discount_value != null ? `${top.discount_value}%` : '',
    minSpend: buildMinSpend(top.min_order_value),
    maxDiscount: top.max_discount != null
      ? `${top.max_discount.toLocaleString('vi-VN')}đ`
      : null,
    validUntil: top.end_at
      ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    headline: buildHeadline(top),
    applicableCategories: top.category ? [top.category] : [],
  };
}
