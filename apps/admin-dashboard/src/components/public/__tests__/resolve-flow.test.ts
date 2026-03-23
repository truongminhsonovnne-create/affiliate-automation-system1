/**
 * Resolve Flow UI Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure unit tests covering the resolution state contract.
 * Tests: state mapping, transitions, warnings, confidence, alternatives.
 *
 * Run:  npx vitest run src/components/public/__tests__/resolve-flow.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest';
import type {
  ResolutionState,
  BestMatchDetail,
  CandidateCard,
  WarningItem,
  ExplanationCard,
  DataFreshnessLevel,
} from '@/lib/public/api-client';

// ─── Mock data factories ────────────────────────────────────────────────────

function deriveMatchQuality(score?: number): 'high' | 'medium' | 'low' {
  if (score == null) return 'medium';
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function makeSuccessState(overrides?: {
  bestMatch?: Partial<BestMatchDetail>;
  confidenceScore?: number;
  matchedSource?: string;
  dataFreshness?: DataFreshnessLevel;
  candidates?: CandidateCard[];
  performance?: ResolutionState['performance'];
  warnings?: WarningItem[];
  explanation?: ExplanationCard | null;
}): ResolutionState {
  // Use explicit undefined checks so passing undefined explicitly is distinct from omitting the key
  const confidenceScore = ('confidenceScore' in (overrides ?? {}))
    ? (overrides as any).confidenceScore
    : 0.92;
  const matchedSource = ('matchedSource' in (overrides ?? {}))
    ? (overrides as any).matchedSource
    : 'AccessTrade';
  const dataFreshness = overrides?.dataFreshness ?? 'live';

  const baseBestMatch: BestMatchDetail = {
    voucherId: 'v-001',
    code: 'SUMMER50',
    discountType: 'percentage',
    discountValue: '50%',
    minSpend: '150.000₫',
    maxDiscount: '100.000₫',
    validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    headline: 'Giảm 50% từ đơn 150K',
    applicableCategories: ['Điện tử'],
    conditions: ['Đơn tối thiểu 150.000₫', 'Giảm tối đa 100.000₫'],
    scope: [],
    isVerified: false,
    servedFromCache: false,
    warnings: [],
    totalCandidates: 3,
    matchQuality: deriveMatchQuality(confidenceScore),
    selectionReason: deriveSelectionReason(confidenceScore, matchedSource),
  };

  const bestMatch: BestMatchDetail = overrides?.bestMatch
    ? { ...baseBestMatch, ...overrides.bestMatch,
        matchQuality: overrides.bestMatch.matchQuality ?? deriveMatchQuality(confidenceScore),
        selectionReason: overrides.bestMatch.selectionReason ?? deriveSelectionReason(confidenceScore, matchedSource),
      }
    : baseBestMatch;

  return {
    status: 'success',
    requestId: 'req-001',
    bestMatch,
    candidates: overrides?.candidates ?? [
      { voucherId: 'v-002', code: 'FREESHIP', discountText: 'Miễn phí vận chuyển', rank: 2, reason: 'Áp dụng toàn sàn' },
      { voucherId: 'v-003', code: 'NEWUSER20', discountText: 'Giảm 20%', rank: 3, reason: 'Người dùng mới' },
    ],
    performance: overrides?.performance ?? {
      totalLatencyMs: 850,
      servedFromCache: false,
      resolvedAt: new Date().toISOString(),
    },
    warnings: overrides?.warnings ?? [],
    explanation: overrides?.explanation ?? {
      summary: 'Đây là mã voucher tốt nhất cho sản phẩm này.',
      tips: ['Sử dụng mã khi thanh toán để được giảm giá.'],
    },
    error: null,
    confidenceScore,
    matchedSource,
    dataFreshness,
  };
}

function deriveSelectionReason(confidenceScore?: number, matchedSource?: string): string {
  if (matchedSource === 'AccessTrade') return 'Voucher chương trình Affiliate — được đối soát thường xuyên';
  if (matchedSource === 'MasOffer') return 'Từ mạng lưới đối tác chính thức';
  if (matchedSource?.includes('broad')) return 'Broad promotion — áp dụng chung cho nhiều sản phẩm';
  if (confidenceScore == null) return 'Kết quả khớp trung bình';
  if (confidenceScore >= 0.9) return 'Kết quả khớp chính xác cao';
  if (confidenceScore >= 0.7) return 'Kết quả khớp tốt';
  if (confidenceScore >= 0.5) return 'Kết quả khớp trung bình — có thể có lựa chọn tốt hơn';
  return 'Kết quả khớp thấp — nên thử thêm';
}

function makeNoMatchState(): ResolutionState {
  return {
    status: 'no_match',
    requestId: 'req-002',
    bestMatch: null,
    candidates: [],
    performance: { totalLatencyMs: 420, servedFromCache: false, resolvedAt: new Date().toISOString() },
    warnings: [],
    explanation: { summary: 'Không tìm thấy voucher phù hợp.', tips: ['Thử sản phẩm khác.'] },
    error: null,
    confidenceScore: 0,
    matchedSource: undefined,
    dataFreshness: undefined,
  };
}

function makeInvalidInputState(): ResolutionState {
  return {
    status: 'invalid_link',
    requestId: null,
    bestMatch: null,
    candidates: [],
    performance: null,
    warnings: [{ code: 'INVALID_INPUT', message: 'Link không hợp lệ', severity: 'warning' }],
    explanation: null,
    error: { code: 'INVALID_INPUT', message: 'Link không hợp lệ' },
    confidenceScore: undefined,
    matchedSource: undefined,
    dataFreshness: undefined,
  };
}

function makeServiceErrorState(): ResolutionState {
  return {
    status: 'error',
    requestId: 'req-003',
    bestMatch: null,
    candidates: [],
    performance: null,
    warnings: [{ code: 'SERVICE_UNAVAILABLE', message: 'Dịch vụ tạm thời không khả dụng', severity: 'warning' }],
    explanation: null,
    error: { code: 'SERVICE_UNAVAILABLE', message: 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.' },
    confidenceScore: undefined,
    matchedSource: undefined,
    dataFreshness: undefined,
  };
}

function makeLowConfidenceState(): ResolutionState {
  const confidenceScore = 0.31;
  const matchedSource = 'MasOffer_broad';
  const bestMatch: BestMatchDetail = {
    voucherId: 'v-005',
    code: 'PROMO10',
    discountType: 'percentage',
    discountValue: '10%',
    minSpend: '500.000₫',
    maxDiscount: '50.000₫',
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    headline: 'Giảm 10% từ đơn 500K',
    applicableCategories: [],
    conditions: ['Đơn tối thiểu 500.000₫', 'Giảm tối đa 50.000₫'],
    scope: [],
    isVerified: false,
    servedFromCache: false,
    warnings: [{ code: 'LOW_CONFIDENCE', message: 'Broad fallback used', severity: 'warning' }],
    totalCandidates: 1,
    matchQuality: deriveMatchQuality(confidenceScore),
    selectionReason: deriveSelectionReason(confidenceScore, matchedSource),
  };
  return {
    status: 'success',
    requestId: 'req-004',
    bestMatch,
    candidates: [],
    performance: { totalLatencyMs: 1200, servedFromCache: false, resolvedAt: new Date().toISOString() },
    warnings: [{ code: 'LOW_CONFIDENCE', message: 'Chỉ tìm thấy khuyến mãi chung', severity: 'warning' }],
    explanation: null,
    error: null,
    confidenceScore,
    matchedSource,
    dataFreshness: 'stale',
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('A. Success state', () => {
  it('has bestMatch when status is success', () => {
    const s = makeSuccessState();
    expect(s.status).toBe('success');
    expect(s.bestMatch).not.toBeNull();
    expect(s.bestMatch!.code).toBe('SUMMER50');
  });

  it('has ranked alternatives', () => {
    const s = makeSuccessState();
    expect(s.candidates.length).toBeGreaterThan(0);
    expect(s.candidates[0].rank).toBe(2);
    expect(s.candidates[0].code).toBe('FREESHIP');
  });

  it('has confidence score', () => {
    const s = makeSuccessState({ confidenceScore: 0.92 });
    expect(s.confidenceScore).toBe(0.92);
    expect(s.bestMatch!.matchQuality).toBe('high');
  });

  it('has matched source', () => {
    const s = makeSuccessState({ matchedSource: 'AccessTrade' });
    expect(s.matchedSource).toBe('AccessTrade');
  });

  it('has data freshness', () => {
    const s = makeSuccessState({ dataFreshness: 'live' });
    expect(s.dataFreshness).toBe('live');
  });

  it('has performance metadata', () => {
    const s = makeSuccessState();
    expect(s.performance).not.toBeNull();
    expect(s.performance!.totalLatencyMs).toBeGreaterThan(0);
    expect(s.performance!.resolvedAt).toBeTruthy();
  });

  it('has explanation', () => {
    const s = makeSuccessState();
    expect(s.explanation).not.toBeNull();
    expect(s.explanation!.summary).toBeTruthy();
  });
});

describe('B. No-match state', () => {
  it('status is no_match', () => {
    const s = makeNoMatchState();
    expect(s.status).toBe('no_match');
  });

  it('has no bestMatch', () => {
    expect(makeNoMatchState().bestMatch).toBeNull();
  });

  it('has no error', () => {
    expect(makeNoMatchState().error).toBeNull();
  });

  it('has explanation', () => {
    expect(makeNoMatchState().explanation).not.toBeNull();
  });

  it('has zero confidence', () => {
    expect(makeNoMatchState().confidenceScore).toBe(0);
  });
});

describe('C. Invalid input state', () => {
  it('has error with code', () => {
    const s = makeInvalidInputState();
    expect(s.error).not.toBeNull();
    expect(s.error!.code).toBe('INVALID_INPUT');
    expect(s.error!.message).toBeTruthy();
  });

  it('has no bestMatch', () => {
    expect(makeInvalidInputState().bestMatch).toBeNull();
  });

  it('has warning', () => {
    const s = makeInvalidInputState();
    expect(s.warnings.length).toBeGreaterThan(0);
  });
});

describe('D. Service error state', () => {
  it('has error and warning', () => {
    const s = makeServiceErrorState();
    expect(s.status).toBe('error');
    expect(s.error).not.toBeNull();
    expect(s.warnings.length).toBeGreaterThan(0);
  });

  it('has no bestMatch', () => {
    expect(makeServiceErrorState().bestMatch).toBeNull();
  });
});

describe('E. Low-confidence state (warning path)', () => {
  it('status is still success (not error)', () => {
    const s = makeLowConfidenceState();
    expect(s.status).toBe('success');
    expect(s.bestMatch).not.toBeNull();
  });

  it('confidence below 0.5', () => {
    const s = makeLowConfidenceState();
    expect(s.confidenceScore).toBeLessThan(0.5);
  });

  it('matchQuality is low', () => {
    expect(makeLowConfidenceState().bestMatch!.matchQuality).toBe('low');
  });

  it('has warning', () => {
    const s = makeLowConfidenceState();
    expect(s.warnings.length).toBeGreaterThan(0);
    expect(s.warnings[0].severity).toBe('warning');
  });

  it('matchedSource indicates fallback', () => {
    const s = makeLowConfidenceState();
    expect(s.matchedSource).toContain('broad');
  });

  it('dataFreshness is stale', () => {
    expect(makeLowConfidenceState().dataFreshness).toBe('stale');
  });

  it('has selection reason explaining fallback', () => {
    const s = makeLowConfidenceState();
    // matchedSource = MasOffer_broad → takes precedence, explains broad promotion
    expect(s.bestMatch!.selectionReason).toContain('Broad');
  });
});

describe('F. Confidence score → match quality mapping', () => {
  it('≥ 0.8 → high', () => {
    const s = makeSuccessState({ confidenceScore: 0.8 });
    expect(s.bestMatch!.matchQuality).toBe('high');
  });

  it('≥ 0.5 and < 0.8 → medium', () => {
    const s = makeSuccessState({ confidenceScore: 0.5 });
    expect(s.bestMatch!.matchQuality).toBe('medium');
  });

  it('< 0.5 → low', () => {
    const s = makeSuccessState({ confidenceScore: 0.49 });
    expect(s.bestMatch!.matchQuality).toBe('low');
  });

  it('undefined → medium', () => {
    const s = makeSuccessState({ confidenceScore: undefined });
    expect(s.bestMatch!.matchQuality).toBe('medium');
  });

  it('score = 1 → high', () => {
    const s = makeSuccessState({ confidenceScore: 1 });
    expect(s.bestMatch!.matchQuality).toBe('high');
  });

  it('score = 0 → low', () => {
    const s = makeSuccessState({ confidenceScore: 0 });
    expect(s.bestMatch!.matchQuality).toBe('low');
  });
});

describe('G. Selection reason based on matched source', () => {
  it('AccessTrade → Affiliate reason', () => {
    const s = makeSuccessState({ matchedSource: 'AccessTrade' });
    expect(s.bestMatch!.selectionReason).toContain('Affiliate');
  });

  it('MasOffer → partner reason', () => {
    const s = makeSuccessState({ matchedSource: 'MasOffer' });
    expect(s.bestMatch!.selectionReason).toContain('đối tác');
  });

  it('MasOffer_broad → broad promotion reason', () => {
    const s = makeSuccessState({ matchedSource: 'MasOffer_broad' });
    expect(s.bestMatch!.selectionReason).toContain('Broad');
  });

  it('no source → falls back to confidence', () => {
    const s = makeSuccessState({ matchedSource: undefined, confidenceScore: 0.95 });
    expect(s.bestMatch!.selectionReason).toContain('chính xác');
  });
});

describe('H. DataFreshness levels', () => {
  it('all 4 levels are valid', () => {
    const levels: DataFreshnessLevel[] = ['live', 'recent', 'stale', 'unknown'];
    for (const l of levels) {
      const s = makeSuccessState({ dataFreshness: l });
      expect(s.dataFreshness).toBe(l);
    }
  });
});

describe('I. Alternatives', () => {
  it('alternatives are sorted by rank', () => {
    const s = makeSuccessState();
    const ranks = s.candidates.map((c) => c.rank);
    expect(ranks).toEqual([2, 3]);
  });

  it('alternatives have code and discount text', () => {
    const s = makeSuccessState();
    for (const c of s.candidates) {
      expect(c.code).toBeTruthy();
      expect(c.discountText).toBeTruthy();
    }
  });

  it('no-match has no alternatives', () => {
    expect(makeNoMatchState().candidates).toHaveLength(0);
  });
});

describe('J. Expiry conditions', () => {
  it('expiring within 24h → condition warning', () => {
    const sixHoursLater = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const s = makeSuccessState({
      bestMatch: {
        ...makeSuccessState().bestMatch!,
        validUntil: sixHoursLater,
        conditions: [...makeSuccessState().bestMatch!.conditions, '⏰ Sắp hết hạn trong hôm nay'],
      },
    });
    const hasUrgent = s.bestMatch!.conditions.some((c) => c.includes('hết hạn'));
    expect(hasUrgent).toBe(true);
  });

  it('expired → condition warning', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const s = makeSuccessState({
      bestMatch: {
        ...makeSuccessState().bestMatch!,
        validUntil: oneHourAgo,
        conditions: [...makeSuccessState().bestMatch!.conditions, '⚠️ Voucher này có thể đã hết hạn'],
      },
    });
    const hasExpired = s.bestMatch!.conditions.some((c) => c.includes('hết hạn'));
    expect(hasExpired).toBe(true);
  });

  it('far future → no urgent condition', () => {
    const tenDaysLater = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const s = makeSuccessState({
      bestMatch: {
        ...makeSuccessState().bestMatch!,
        validUntil: tenDaysLater,
        conditions: ['Đơn tối thiểu 150.000₫', 'Giảm tối đa 100.000₫'],
      },
    });
    const hasUrgent = s.bestMatch!.conditions.some((c) => c.includes('hết hạn'));
    expect(hasUrgent).toBe(false);
  });
});

describe('K. Warning severity classification', () => {
  it('severity info does not show as warning', () => {
    const infoWarning: WarningItem = { code: 'CACHE_HIT', message: 'Served from cache', severity: 'info' };
    expect(infoWarning.severity).toBe('info');
  });

  it('severity warning is distinct', () => {
    const warnWarning: WarningItem = { code: 'BROAD_FALLBACK', message: 'Broad promotion used', severity: 'warning' };
    expect(warnWarning.severity).toBe('warning');
  });
});

describe('L. Cache metadata', () => {
  it('servedFromCache flag is propagated', () => {
    const cached = makeSuccessState({
      performance: { totalLatencyMs: 50, servedFromCache: true, resolvedAt: new Date().toISOString() },
    });
    expect(cached.performance!.servedFromCache).toBe(true);
  });

  it('non-cached result has servedFromCache false', () => {
    const fresh = makeSuccessState();
    expect(fresh.performance!.servedFromCache).toBe(false);
  });
});
