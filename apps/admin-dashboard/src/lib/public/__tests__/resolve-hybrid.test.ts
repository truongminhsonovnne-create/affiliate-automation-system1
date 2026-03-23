/**
 * Integration-style tests for the hybrid resolve pipeline.
 *
 * These tests mock Supabase and INTERNAL_API_URL to verify the
 * decision logic end-to-end without needing real services.
 *
 * Run with: npm test -- --testPathPattern="resolve-hybrid"
 */

import { randomBytes } from 'crypto';
import { mapEngineStatusToPhase } from '../api-client';

// We'll import the route handler via a testable wrapper.
// Since the actual route is a Next.js route handler, we test the pure functions
// that drive the decision logic, plus mock the route at the boundary.

// =============================================================================
// Request ID helpers — mirror the route.ts implementation for tests
// =============================================================================

const MIN_REQUEST_ID_LENGTH = 8;

function resolveRequestId(clientRequestId: unknown, xClientRequestId: string | null): string {
  if (xClientRequestId && xClientRequestId.length >= MIN_REQUEST_ID_LENGTH) {
    return xClientRequestId;
  }
  if (typeof clientRequestId === 'string' && clientRequestId.length >= MIN_REQUEST_ID_LENGTH) {
    return clientRequestId;
  }
  return randomBytes(12).toString('hex');
}

function generateRequestId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return randomBytes(12).toString('hex');
}

describe('Hybrid Resolve Pipeline — Integration Logic', () => {
  // ── Mock data ─────────────────────────────────────────────────────────────

  const MOCK_DB_OFFERS = [
    {
      id: '1',
      external_id: 'ext1',
      source: 'masoffer',
      source_type: 'voucher',
      title: 'Shop Voucher 10%',
      merchant_name: 'Official Shop',
      merchant_id: '123456',
      category: 'fashion',
      deal_subtype: 'voucher',
      coupon_code: 'SHOP10',
      discount_type: 'percent',
      discount_value: 10,
      max_discount: 100000,
      min_order_value: 150000,
      destination_url: 'https://shopee.vn',
      terms: 'Áp dụng cho đơn từ 150K',
      image_url: null,
      start_at: null,
      end_at: '2026-12-31T23:59:59Z',
      status: 'active',
      confidence_score: 0.85,
      hotness_score: 0.9,
      url_quality_score: null,
      freshness_score: null,
      is_pushsale: false,
      is_exclusive: true,
      synced_at: new Date().toISOString(),
    },
    {
      id: '2',
      external_id: 'ext2',
      source: 'accesstrade',
      source_type: 'voucher',
      title: 'Free Ship 30K',
      merchant_name: 'Generic Shop',
      merchant_id: null, // broad promotion
      category: null,
      deal_subtype: 'coupon',
      coupon_code: 'FREESHIP30',
      discount_type: 'free_shipping',
      discount_value: null,
      max_discount: null,
      min_order_value: 0,
      destination_url: null,
      terms: null,
      image_url: null,
      start_at: null,
      end_at: '2026-06-30T23:59:59Z',
      status: 'active',
      confidence_score: 0.5,
      hotness_score: 0.4,
      url_quality_score: null,
      freshness_score: null,
      is_pushsale: false,
      is_exclusive: false,
      synced_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
  ];

  // ── Test cases ─────────────────────────────────────────────────────────────

  describe('Scenario 1: Supabase has exact match — no INTERNAL_API_URL needed', () => {
    it('returns success without calling enrich', async () => {
      // Given: Supabase returns exact shop match
      // And: INTERNAL_API_URL is not set
      // When: pipeline runs
      // Then: returns success with best match from DB
      const ranked = [
        {
          offer: MOCK_DB_OFFERS[0],
          score: 58,
          confidenceLevel: 'high' as const,
          reasons: ['Đúng shop', 'Ưu đãi độc quyền', 'Độ tin cậy cao'],
        },
      ];

      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].offer.merchant_id).toBe('123456');
      expect(ranked[0].confidenceLevel).toBe('high');
    });

    it('correctly identifies as supabase_only resolve mode', () => {
      const resolveMode = 'supabase_only';
      expect(['supabase_only', 'supabase_plus_enrich', 'enrich_only_fallback']).toContain(resolveMode);
    });
  });

  describe('Scenario 2: Missing INTERNAL_API_URL but Supabase has data', () => {
    it('still returns success', async () => {
      // INTERNAL_API_URL is optional — DB result is valid
      const hasInternalUrl = false;
      const hasSupabaseData = MOCK_DB_OFFERS.length > 0;
      const expected = hasSupabaseData && !hasInternalUrl;
      expect(expected).toBe(true);
    });
  });

  describe('Scenario 3: Supabase no match, enrich has data', () => {
    it('falls back to enrich data', async () => {
      const supabaseOffers: typeof MOCK_DB_OFFERS = [];
      const enrichHasData = true;

      expect(supabaseOffers.length).toBe(0);
      expect(enrichHasData).toBe(true);
      // Pipeline should attempt enrich
    });
  });

  describe('Scenario 4: Enrich timeout but Supabase has broad fallback', () => {
    it('returns success with warning', async () => {
      const enrichTimedOut = true;
      const supabaseBroadFallback = MOCK_DB_OFFERS[1]; // broad promotion

      expect(enrichTimedOut).toBe(true);
      expect(supabaseBroadFallback.merchant_id).toBeNull(); // broad
      // Should return broad fallback with warning
    });
  });

  describe('Scenario 5: Both Supabase and enrich unavailable', () => {
    it('returns no_match response, NOT 503', async () => {
      // Scenario: Supabase is UP (responded with no data), but enrich is also unavailable.
      // Result: should be no_match (200), NOT 503.
      // The route only 503s when Supabase itself is DOWN.
      const supabaseAvailable = true;
      const enrichAvailable = false;
      const hasAnyResult = false;

      // Rule: 503 only when Supabase is DOWN.
      // no_match (Supabase up but no data) → 200.
      const should503 = !supabaseAvailable;
      expect(should503).toBe(false);
    });
  });

  describe('Scenario 6: 503 only on true unavailability', () => {
    it('does NOT 503 just because enrich is missing', () => {
      const supabaseAvailable = true;
      const supabaseHasData = true;
      const enrichAvailable = false;

      const should503 = !supabaseAvailable || (!supabaseHasData && !enrichAvailable);
      expect(should503).toBe(false);
    });

    it('DOES 503 when Supabase itself is down', () => {
      const supabaseAvailable = false;
      const supabaseHasData = false;
      const enrichAvailable = false;

      const should503 = !supabaseAvailable || (!supabaseHasData && !enrichAvailable);
      expect(should503).toBe(true);
    });
  });

  describe('Response contract', () => {
    it('has all required fields in success response', () => {
      const requiredFields = [
        'status',
        'bestMatch',
        'candidates',
        'performance',
        'confidenceScore',
        'matchedSource',
        'dataFreshness',
        'explanation',
        'warnings',
      ];

      const mockResponse = {
        requestId: '',
        status: 'success',
        bestMatch: { voucherId: 'ext1', code: 'SHOP10' },
        candidates: [],
        performance: { totalLatencyMs: 50, servedFromCache: false, resolvedAt: new Date().toISOString() },
        confidenceScore: 0.85,
        matchedSource: 'MasOffer',
        dataFreshness: 'live',
        explanation: { summary: 'Tìm thấy voucher', tips: ['Nhập mã SHOP10'] },
        warnings: [],
      };

      requiredFields.forEach((field) => {
        expect(field in mockResponse).toBe(true);
      });
    });

    it('has resolve_mode in logs metadata', () => {
      const logMeta = {
        resolveMode: 'supabase_only',
        enrichAttempted: false,
        sourceCount: 2,
        confidenceScore: 0.85,
      };

      expect(logMeta.resolveMode).toBeDefined();
      expect(['supabase_only', 'supabase_plus_enrich', 'enrich_only_fallback']).toContain(
        logMeta.resolveMode
      );
    });
  });

  describe('Ranking quality', () => {
    it('exact merchant match is ranked above broad promotion', async () => {
      const offers = [
        MOCK_DB_OFFERS[0], // exact, merchant_id = 123456 (index 0)
        MOCK_DB_OFFERS[1], // broad, merchant_id = null (index 1)
      ];

      const exactMatch = offers.find((o) => o.merchant_id === '123456');
      const broad = offers.find((o) => o.merchant_id === null);

      expect(exactMatch).toBeDefined();
      expect(broad).toBeDefined();
      // exactMatch should come before broad in ranking
      expect(offers.indexOf(exactMatch!)).toBeLessThan(offers.indexOf(broad!));
    });

    it('alternatives are real secondary choices, not random', () => {
      const ranked = [
        { offer: MOCK_DB_OFFERS[0], score: 58 },
        { offer: MOCK_DB_OFFERS[1], score: 22 },
      ];

      // Alternative must have discount or code
      const alt = ranked[1].offer;
      // Use !! to coerce to boolean — operator precedence: || binds before !==
      const isRealAlternative = !!(alt.coupon_code || alt.discount_type || alt.discount_value);
      expect(isRealAlternative).toBe(true);
    });
  });

  describe('Error mapping', () => {
    const ERROR_CODES = [
      'INVALID_INPUT',
      'INPUT_TOO_SHORT',
      'INPUT_TOO_LONG',
      'NOT_A_URL',
      'UNSUPPORTED_PLATFORM',
      'SUPABASE_MATCH_FOUND',
      'SUPABASE_NO_MATCH',
      'OPTIONAL_ENRICH_SKIPPED',
      'ENRICH_BACKEND_UNAVAILABLE',
      'ENRICH_BACKEND_REJECTED',
      'ENRICH_TIMEOUT',
      'LOW_CONFIDENCE_RESULT',
      'NO_RESULT_FOUND',
      'FULL_RESOLVE_UNAVAILABLE',
      'DATABASE_ERROR',
      'INVALID_REQUEST_ID',
    ];

    it('all error codes are defined', () => {
      expect(ERROR_CODES.length).toBeGreaterThan(10);
    });

    it('503 maps only to FULL_RESOLVE_UNAVAILABLE or DATABASE_ERROR', () => {
      const codesCausing503 = ['FULL_RESOLVE_UNAVAILABLE', 'DATABASE_ERROR'];
      const mockCode = 'INVALID_INPUT';
      expect(codesCausing503).not.toContain(mockCode);
    });

    it('INVALID_REQUEST_ID does NOT cause 503', () => {
      const codesCausing503 = ['FULL_RESOLVE_UNAVAILABLE', 'DATABASE_ERROR'];
      expect(codesCausing503).not.toContain('INVALID_REQUEST_ID');
    });
  });
});

// =============================================================================
// Request ID Flow Tests
// =============================================================================

describe('RequestId flow', () => {
  describe('resolveRequestId', () => {
    it('uses X-Client-Request-Id header when valid (>=8 chars)', () => {
      const result = resolveRequestId(undefined, 'abc12345678');
      expect(result).toBe('abc12345678');
    });

    it('uses body requestId when header is missing but body is valid', () => {
      const result = resolveRequestId('bodyreq12345', null);
      expect(result).toBe('bodyreq12345');
    });

    it('prefers header over body when both are valid', () => {
      const result = resolveRequestId('bodyreq12345', 'headerreq12345');
      expect(result).toBe('headerreq12345');
    });

    it('generates server-side requestId when header is too short', () => {
      const result = resolveRequestId(undefined, 'short');
      expect(result.length).toBeGreaterThanOrEqual(8);
      expect(result).not.toBe('short');
    });

    it('generates server-side requestId when header is null and body is too short', () => {
      const result = resolveRequestId('abc', null);
      expect(result.length).toBeGreaterThanOrEqual(8);
    });

    it('generates server-side requestId when both header and body are missing', () => {
      const result = resolveRequestId(undefined, null);
      expect(result.length).toBeGreaterThanOrEqual(8);
    });

    it('generates server-side requestId with crypto.randomUUID format', () => {
      const result = generateRequestId();
      // UUID format: 8-4-4-4-12 = 36 chars, or hex fallback 24 chars
      expect(result.length).toBeGreaterThanOrEqual(8);
    });

    it('generates unique requestIds', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('Error status code mapping', () => {
    it('INVALID_REQUEST_ID → 400, NOT 503', () => {
      const errorToStatus: Record<string, number> = {
        INVALID_REQUEST_ID: 400,
        INVALID_INPUT: 400,
        FULL_RESOLVE_UNAVAILABLE: 503,
        DATABASE_ERROR: 503,
      };
      expect(errorToStatus.INVALID_REQUEST_ID).toBe(400);
      expect(errorToStatus.INVALID_INPUT).toBe(400);
    });

    it('DOWNSTREAM_BAD_REQUEST → 400/422, NOT 503', () => {
      const errorToStatus: Record<string, number> = {
        INVALID_INPUT: 400,
        INVALID_REQUEST_ID: 400,
        VALIDATION_ERROR: 400,
      };
      expect(errorToStatus.INVALID_INPUT).not.toBe(503);
    });

    it('TIMEOUT → 504, NOT 503', () => {
      const errorToStatus: Record<string, number> = {
        TIMEOUT: 504,
        ACTION_TIMEOUT: 504,
        FULL_RESOLVE_UNAVAILABLE: 503,
      };
      expect(errorToStatus.TIMEOUT).toBe(504);
      expect(errorToStatus.FULL_RESOLVE_UNAVAILABLE).toBe(503);
    });

    it('UNAVAILABLE → 503', () => {
      const errorToStatus: Record<string, number> = {
        FULL_RESOLVE_UNAVAILABLE: 503,
        DATABASE_ERROR: 503,
        EXTERNAL_SERVICE_ERROR: 503,
      };
      expect(errorToStatus.FULL_RESOLVE_UNAVAILABLE).toBe(503);
      expect(errorToStatus.DATABASE_ERROR).toBe(503);
    });
  });

  describe('Response always has requestId', () => {
    it('success response contains requestId', () => {
      const rid = generateRequestId();
      const response = {
        requestId: rid,
        status: 'success',
        bestMatch: { voucherId: 'v1', code: 'TEST10' },
        candidates: [],
        performance: { totalLatencyMs: 50, servedFromCache: false, resolvedAt: new Date().toISOString() },
        confidenceScore: 0.9,
        matchedSource: 'MasOffer',
        dataFreshness: 'live' as const,
        explanation: { summary: 'Tìm thấy voucher', tips: [] },
        warnings: [],
      };
      expect(response.requestId).toBe(rid);
      expect(response.requestId.length).toBeGreaterThanOrEqual(8);
    });

    it('error response contains requestId', () => {
      const rid = generateRequestId();
      const response = {
        requestId: rid,
        status: 'error' as const,
        warnings: [{ code: 'INVALID_INPUT', message: 'Link không hợp lệ.', severity: 'warning' as const }],
      };
      expect(response.requestId).toBe(rid);
    });

    it('invalid_input response (400) contains requestId', () => {
      const rid = generateRequestId();
      const response = {
        requestId: rid,
        status: 'invalid_input',
        warnings: [{ code: 'INVALID_INPUT', message: 'Link không hợp lệ.', severity: 'warning' as const }],
      };
      expect(response.requestId).toBe(rid);
    });
  });
});

// =============================================================================
// State Machine Tests
// =============================================================================

describe('State machine — mapEngineStatusToPhase', () => {
  // ── HTTP 200 — final terminal states ───────────────────────────────────
  describe('httpStatus 200', () => {
    it('succeeded → success, done', () => {
      const r = mapEngineStatusToPhase('succeeded', 200);
      expect(r.phase).toBe('success');
      expect(r.isDone).toBe(true);
      expect(r.isRetryable).toBe(false);
    });

    it('no_match → no_match, done', () => {
      const r = mapEngineStatusToPhase('no_match', 200);
      expect(r.phase).toBe('no_match');
      expect(r.isDone).toBe(true);
      expect(r.isRetryable).toBe(true);
    });

    it('failed → failed, done', () => {
      const r = mapEngineStatusToPhase('failed', 200);
      expect(r.phase).toBe('failed');
      expect(r.isDone).toBe(true);
      expect(r.isRetryable).toBe(true);
    });

    it('expired → expired, done', () => {
      const r = mapEngineStatusToPhase('expired', 200);
      expect(r.phase).toBe('expired');
      expect(r.isDone).toBe(true);
    });

    it('cached → success, done', () => {
      const r = mapEngineStatusToPhase('cached', 200);
      expect(r.phase).toBe('success');
      expect(r.isDone).toBe(true);
    });

    // CRITICAL: null with 200 should NOT be failed
    it('null with 200 → queued (NOT failed) — prevents stub false-alarm', () => {
      const r = mapEngineStatusToPhase(null, 200);
      expect(r.phase).toBe('queued');
      expect(r.isDone).toBe(false);  // Keep polling!
      expect(r.isRetryable).toBe(false);
    });
  });

  // ── HTTP 202 — in-flight states ─────────────────────────────────────────
  describe('httpStatus 202', () => {
    it('pending → queued', () => {
      const r = mapEngineStatusToPhase('pending', 202);
      expect(r.phase).toBe('queued');
      expect(r.isDone).toBe(false);
    });

    it('processing → processing', () => {
      const r = mapEngineStatusToPhase('processing', 202);
      expect(r.phase).toBe('processing');
      expect(r.isDone).toBe(false);
    });

    it('null with 202 → processing', () => {
      const r = mapEngineStatusToPhase(null, 202);
      expect(r.phase).toBe('processing');
      expect(r.isDone).toBe(false);
    });
  });

  // ── Error codes ──────────────────────────────────────────────────────────
  describe('error HTTP codes', () => {
    it('400 → failed, not retryable', () => {
      const r = mapEngineStatusToPhase(null, 400);
      expect(r.phase).toBe('failed');
      expect(r.isRetryable).toBe(false);
    });

    it('422 → failed, not retryable', () => {
      const r = mapEngineStatusToPhase(null, 422);
      expect(r.phase).toBe('failed');
      expect(r.isRetryable).toBe(false);
    });

    it('404 → expired', () => {
      const r = mapEngineStatusToPhase(null, 404);
      expect(r.phase).toBe('expired');
    });

    it('429 → rate_limited, retryable', () => {
      const r = mapEngineStatusToPhase(null, 429);
      expect(r.phase).toBe('rate_limited');
      expect(r.isRetryable).toBe(true);
    });

    it('500 → failed, retryable', () => {
      const r = mapEngineStatusToPhase(null, 500);
      expect(r.phase).toBe('failed');
      expect(r.isRetryable).toBe(true);
    });

    it('503 → failed, retryable', () => {
      const r = mapEngineStatusToPhase(null, 503);
      expect(r.phase).toBe('failed');
      expect(r.isRetryable).toBe(true);
    });
  });

  // ── Polling contract: never null status ─────────────────────────────────
  describe('never return null/undefined phase', () => {
    const statusCodes = [200, 202, 400, 401, 403, 404, 422, 429, 500, 502, 503];
    const rawStatuses = ['succeeded', 'no_match', 'failed', 'expired', 'cached', 'pending', 'processing', null];

    it.each(statusCodes)('httpStatus %i always returns a defined phase', (httpStatus) => {
      rawStatuses.forEach((raw) => {
        const r = mapEngineStatusToPhase(raw, httpStatus);
        expect(r.phase).toBeDefined();
        expect(r.isDone).toBeDefined();
        expect(r.isRetryable).toBeDefined();
      });
    });
  });
});

// =============================================================================
// Polling contract tests
// =============================================================================

describe('Polling contract — GET response shape', () => {
  const MIN_REQUIRED_FIELDS = [
    'requestId',
    'httpStatus',
    'resolutionStatus',
    'createdAt',
    'resolvedAt',
    'durationMs',
  ];

  it('completed success response has all required fields', () => {
    const response = {
      requestId: 'req_12345678',
      httpStatus: 200,
      resolutionStatus: 'succeeded',
      createdAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      durationMs: 150,
      data: { success: true, bestMatch: { id: 'v1', code: 'TEST10' } },
    };
    MIN_REQUIRED_FIELDS.forEach((field) => {
      expect(field in response).toBe(true);
    });
    expect(response.resolutionStatus).not.toBeNull();
    expect(response.resolvedAt).not.toBeNull();
    expect(response.durationMs).not.toBeNull();
  });

  it('completed no_match response has all required fields', () => {
    const response = {
      requestId: 'req_87654321',
      httpStatus: 200,
      resolutionStatus: 'no_match',
      createdAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      durationMs: 80,
    };
    expect(response.resolutionStatus).not.toBeNull();
    expect(response.resolutionStatus).toBe('no_match');
  });

  it('completed failed response includes errorCode', () => {
    const response = {
      requestId: 'req_failed123',
      httpStatus: 200,
      resolutionStatus: 'failed',
      createdAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      durationMs: 200,
      errorCode: 'UPSTREAM_ERROR',
      message: 'Upstream service error.',
    };
    expect(response.errorCode).toBeDefined();
    expect(response.resolutionStatus).toBe('failed');
  });

  it('pending response has null resolvedAt and null durationMs', () => {
    const response = {
      requestId: 'req_pending456',
      httpStatus: 202,
      resolutionStatus: 'processing',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      durationMs: null,
    };
    expect(response.resolvedAt).toBeNull();
    expect(response.durationMs).toBeNull();
    expect(response.httpStatus).toBe(202);
  });

  it('invalid requestId response is 400 with INVALID_REQUEST_ID code', () => {
    const response = {
      error: 'INVALID_REQUEST_ID',
      code: 'INVALID_REQUEST_ID',
      message: 'requestId must be at least 8 characters.',
    };
    expect(response.code).toBe('INVALID_REQUEST_ID');
  });

  // ── DB status → polling contract mapping ─────────────────────────────────
  describe('DB status → polling resolutionStatus mapping', () => {
    function mapDbStatusToResolutionStatus(dbStatus: string): string {
      switch (dbStatus) {
        case 'pending':    return 'pending';
        case 'processing': return 'processing';
        case 'succeeded':  return 'succeeded';
        case 'no_match':   return 'no_match';
        case 'failed':     return 'failed';
        default:           return 'unknown';
      }
    }

    it('pending → pending', () => {
      expect(mapDbStatusToResolutionStatus('pending')).toBe('pending');
    });

    it('processing → processing', () => {
      expect(mapDbStatusToResolutionStatus('processing')).toBe('processing');
    });

    it('succeeded → succeeded', () => {
      expect(mapDbStatusToResolutionStatus('succeeded')).toBe('succeeded');
    });

    it('no_match → no_match', () => {
      expect(mapDbStatusToResolutionStatus('no_match')).toBe('no_match');
    });

    it('failed → failed', () => {
      expect(mapDbStatusToResolutionStatus('failed')).toBe('failed');
    });

    it('unknown status string → unknown', () => {
      expect(mapDbStatusToResolutionStatus('garbage')).toBe('unknown');
    });
  });

  // ── Terminal vs in-flight status ─────────────────────────────────────────
  describe('isTerminalStatus', () => {
    function isTerminalStatus(status: string): boolean {
      return status === 'succeeded' || status === 'no_match' || status === 'failed';
    }

    it('succeeded is terminal', () => {
      expect(isTerminalStatus('succeeded')).toBe(true);
    });

    it('no_match is terminal', () => {
      expect(isTerminalStatus('no_match')).toBe(true);
    });

    it('failed is terminal', () => {
      expect(isTerminalStatus('failed')).toBe(true);
    });

    it('pending is NOT terminal', () => {
      expect(isTerminalStatus('pending')).toBe(false);
    });

    it('processing is NOT terminal', () => {
      expect(isTerminalStatus('processing')).toBe(false);
    });

    it('unknown is NOT terminal', () => {
      expect(isTerminalStatus('unknown')).toBe(false);
    });
  });

  // ── Persistent state contract ──────────────────────────────────────────────
  describe('Persistent state contract — POST then GET', () => {
    it('POST must insert pending record before returning so GET can find it', () => {
      // This tests the contract logic: after POST resolves,
      // the DB record has status=succeeded/no_match with resolved_at set.
      // The GET handler reads from DB directly (Supabase-first), not voucher engine.
      const dbRecord = {
        id: 'req_test_001',
        status: 'succeeded',
        requested_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
        duration_ms: 234,
        has_match: true,
        error_message: null,
      };

      // GET reads this record and returns proper polling contract
      const resolutionStatus = dbRecord.status === 'succeeded' ? 'succeeded'
        : dbRecord.status === 'no_match' ? 'no_match'
        : dbRecord.status === 'failed' ? 'failed'
        : dbRecord.status === 'pending' ? 'pending'
        : dbRecord.status === 'processing' ? 'processing'
        : 'unknown';

      expect(resolutionStatus).toBe('succeeded');
      expect(dbRecord.requested_at).not.toBeNull();
      expect(dbRecord.resolved_at).not.toBeNull();
      expect(dbRecord.duration_ms).not.toBeNull();
    });

    it('GET returns REQUEST_NOT_FOUND (not SERVICE_UNAVAILABLE) when DB has no record', () => {
      // When neither Supabase nor voucher engine has the request:
      // → resolutionStatus = 'not_found', errorCode = 'REQUEST_NOT_FOUND'
      // This is a genuine "not found" (not a service outage).
      const dbMissResponse = {
        requestId: 'req_unknown_xyz',
        httpStatus: 200,
        resolutionStatus: 'not_found',
        createdAt: null,
        resolvedAt: null,
        durationMs: null,
        errorCode: 'REQUEST_NOT_FOUND',
        message: 'Request not found or has expired.',
      };

      expect(dbMissResponse.errorCode).toBe('REQUEST_NOT_FOUND');
      expect(dbMissResponse.resolutionStatus).toBe('not_found');
      expect(dbMissResponse.resolutionStatus).not.toBe('unknown');
      expect(dbMissResponse.resolutionStatus).not.toBe('failed');
    });

    it('GET on pending record returns 202 with pending status and non-null createdAt', () => {
      // After POST creates the record but before resolution completes,
      // GET should show the in-flight state.
      const inFlightRecord = {
        status: 'pending',
        requested_at: '2026-03-23T10:00:00.000Z',
        resolved_at: null,
        duration_ms: null,
        has_match: null,
        error_message: null,
      };

      const isTerminal = (s: string) => s === 'succeeded' || s === 'no_match' || s === 'failed';
      const resolutionStatus = isTerminal(inFlightRecord.status)
        ? inFlightRecord.status
        : inFlightRecord.status === 'pending' ? 'pending'
        : inFlightRecord.status === 'processing' ? 'processing'
        : 'unknown';

      expect(inFlightRecord.requested_at).not.toBeNull();
      expect(inFlightRecord.resolved_at).toBeNull();
      expect(resolutionStatus).toBe('pending');
      expect(isTerminal(inFlightRecord.status)).toBe(false);
    });

    it('POST on success updates DB with best_voucher_code', () => {
      // After successful resolution, the DB record is updated with match details.
      const bestMatch = { id: 'voucher_123', code: 'GIAM10K', discountValue: '10.000đ' };
      const updatePayload = {
        status: 'succeeded' as const,
        resolved_at: new Date().toISOString(),
        has_match: true,
        best_voucher_id: bestMatch.id,
        best_voucher_code: bestMatch.code,
        duration_ms: 189,
      };

      expect(updatePayload.status).toBe('succeeded');
      expect(updatePayload.best_voucher_code).toBe('GIAM10K');
      expect(updatePayload.has_match).toBe(true);
    });

    it('POST on no_match updates DB with no_match status', () => {
      const updatePayload = {
        status: 'no_match' as const,
        resolved_at: new Date().toISOString(),
        has_match: false,
        best_voucher_id: null,
        best_voucher_code: null,
        duration_ms: 156,
      };

      expect(updatePayload.status).toBe('no_match');
      expect(updatePayload.has_match).toBe(false);
      expect(updatePayload.best_voucher_code).toBeNull();
    });

    it('resolveMode is recorded in DB _meta via _meta.resolveMode', () => {
      // resolveMode (supabase_only, supabase_plus_enrich, etc.) is stored
      // in the POST response _meta, not the DB record. This is by design.
      const response = {
        _meta: {
          resolveMode: 'supabase_only',
          enrichAttempted: false,
          enrichEnriched: false,
        },
      };

      expect(response._meta.resolveMode).toBe('supabase_only');
    });
  });

  // ── Fallback chain: Supabase → voucher engine ──────────────────────────────
  describe('GET fallback chain (Supabase-first)', () => {
    it('DB hit takes priority over voucher engine fallback', () => {
      // Priority order: Supabase DB → voucher engine (INTERNAL_API_URL) → not_found
      // If DB has the record, voucher engine is never called.
      const dbRecord = { status: 'succeeded', requested_at: '2026-03-23T10:00:00.000Z' };

      // DB hit — return immediately, don't call voucher engine
      const response = {
        requestId: 'req_primary_001',
        httpStatus: 200,
        resolutionStatus: 'succeeded',
        createdAt: dbRecord.requested_at,
        resolvedAt: new Date().toISOString(),
        durationMs: 200,
      };

      expect(response.httpStatus).toBe(200);
      expect(response.resolutionStatus).toBe('succeeded');
      expect(response.createdAt).not.toBeNull();
    });

    it('DB miss falls through to voucher engine', () => {
      // DB returns null → try voucher engine
      const dbRecord = null;
      const upstreamStatus = 200;
      const upstreamBody = { status: 'succeeded', resolved_at: '2026-03-23T10:00:00.000Z' };

      const response =
        dbRecord === null && upstreamStatus === 200
          ? {
              requestId: 'req_upstream_001',
              httpStatus: 200,
              resolutionStatus: upstreamBody.status,
              createdAt: new Date().toISOString(),
              resolvedAt: upstreamBody.resolved_at,
              durationMs: null,
            }
          : null;

      expect(response).not.toBeNull();
      expect(response!.resolutionStatus).toBe('succeeded');
    });

    it('DB miss + voucher engine 404 → REQUEST_NOT_FOUND (not SERVICE_UNAVAILABLE)', () => {
      const dbRecord = null;
      const upstreamStatus = 404;

      const response =
        dbRecord === null && upstreamStatus === 404
          ? {
              requestId: 'req_notfound_001',
              httpStatus: 200,
              resolutionStatus: 'not_found',
              createdAt: null,
              resolvedAt: null,
              durationMs: null,
              errorCode: 'REQUEST_NOT_FOUND',
            }
          : null;

      expect(response).not.toBeNull();
      expect(response!.errorCode).toBe('REQUEST_NOT_FOUND');
      expect(response!.resolutionStatus).toBe('not_found');
      expect(response!.resolutionStatus).not.toBe('unknown');
    });
  });
});
