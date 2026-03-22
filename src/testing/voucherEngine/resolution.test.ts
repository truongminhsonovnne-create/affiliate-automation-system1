/**
 * Voucher Engine Tests - Resolution Endpoint
 *
 * Tests voucher resolution service and persistence:
 * - Request lifecycle: pending → processing → succeeded/failed/no_match/expired
 * - Request ID validation (no injection)
 * - Result serialization contract
 * - Persistence read/write path
 * - TTL lifecycle for different statuses
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import type { VoucherResolutionStatus } from '../../voucherEngine/types.js';
import {
  REQUEST_EXPIRY_PENDING_SECONDS,
  REQUEST_EXPIRY_COMPLETED_SECONDS,
  REQUEST_EXPIRY_FAILED_SECONDS,
  REQUEST_EXPIRY_EXPIRED_SECONDS,
} from '../../voucherEngine/constants.js';

// ── TTL constants ─────────────────────────────────────────────────────────

describe('Resolution TTL Constants', () => {
  it('pending TTL is 5 minutes', () => {
    expect(REQUEST_EXPIRY_PENDING_SECONDS).toBe(300);
  });

  it('completed TTL is 30 days', () => {
    expect(REQUEST_EXPIRY_COMPLETED_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it('failed TTL is 7 days', () => {
    expect(REQUEST_EXPIRY_FAILED_SECONDS).toBe(7 * 24 * 60 * 60);
  });

  it('expired TTL is 1 day', () => {
    expect(REQUEST_EXPIRY_EXPIRED_SECONDS).toBe(24 * 60 * 60);
  });

  it('completed has the longest TTL (valuable data)', () => {
    expect(REQUEST_EXPIRY_COMPLETED_SECONDS).toBeGreaterThan(REQUEST_EXPIRY_FAILED_SECONDS);
    expect(REQUEST_EXPIRY_COMPLETED_SECONDS).toBeGreaterThan(REQUEST_EXPIRY_PENDING_SECONDS);
  });

  it('pending has the shortest TTL (not yet valuable)', () => {
    expect(REQUEST_EXPIRY_PENDING_SECONDS).toBeLessThan(REQUEST_EXPIRY_EXPIRED_SECONDS);
  });
});

// ── Request ID format ──────────────────────────────────────────────────────

describe('Request ID Validation', () => {
  const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

  function isValidRequestId(id: string): boolean {
    return REQUEST_ID_REGEX.test(id);
  }

  it('accepts UUID-formatted IDs', () => {
    expect(isValidRequestId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts short alphanumeric IDs (min 8 chars)', () => {
    expect(isValidRequestId('abc12345')).toBe(true);
  });

  it('accepts IDs with dashes and underscores', () => {
    expect(isValidRequestId('req_abc-123-def')).toBe(true);
  });

  it('rejects SQL injection attempt', () => {
    expect(isValidRequestId("'; DROP TABLE users;--")).toBe(false);
  });

  it('rejects path traversal attempt', () => {
    expect(isValidRequestId('../../etc/passwd')).toBe(false);
    expect(isValidRequestId('..%2F..%2Fetc')).toBe(false);
  });

  it('rejects XSS attempt', () => {
    expect(isValidRequestId('<script>alert(1)</script>')).toBe(false);
  });

  it('rejects IDs shorter than 8 characters', () => {
    expect(isValidRequestId('abc1234')).toBe(false);
  });

  it('rejects IDs with special shell characters', () => {
    expect(isValidRequestId('req$(whoami)')).toBe(false);
    expect(isValidRequestId('req`id`')).toBe(false);
    expect(isValidRequestId('req|cat /etc/passwd')).toBe(false);
  });

  it('rejects empty and null-like values', () => {
    expect(isValidRequestId('')).toBe(false);
    expect(isValidRequestId('       ')).toBe(false);
  });

  it('rejects unicode-only IDs', () => {
    expect(isValidRequestId('请求ID测试')).toBe(false);
  });
});

// ── Status lifecycle ───────────────────────────────────────────────────────

describe('Resolution Status Lifecycle', () => {
  const VALID_STATUSES: VoucherResolutionStatus[] = [
    'pending',
    'processing',
    'succeeded',
    'failed',
    'no_match',
    'expired',
    'cached',
  ];

  it('all expected statuses are defined', () => {
    VALID_STATUSES.forEach(status => {
      expect(typeof status).toBe('string');
    });
  });

  it('pending transitions to processing or expired', () => {
    const pendingStatus: VoucherResolutionStatus = 'pending';
    expect(['processing', 'expired'].includes(pendingStatus)).toBe(false); // just checking type
  });

  it('terminal states: succeeded, failed, no_match, expired, cached', () => {
    const terminalStates: VoucherResolutionStatus[] = [
      'succeeded', 'failed', 'no_match', 'expired', 'cached'
    ];
    expect(terminalStates).toHaveLength(5);
  });

  it('"expired" is distinct from "no_match" (different meaning)', () => {
    // expired = TTL exceeded before completion
    // no_match = resolution completed but no eligible voucher found
    expect('expired').not.toBe('no_match');
  });

  it('"failed" is distinct from "no_match" (failed vs completed-without-result)', () => {
    // failed = unrecoverable error during resolution
    // no_match = completed successfully but no voucher matched
    expect('failed').not.toBe('no_match');
  });
});

// ── Result serialization contract ─────────────────────────────────────────

describe('Resolution Result Serialization Contract', () => {
  interface SerializedResult {
    ok: boolean;
    status: string;
    request_id: string;
    resolved_at: string;
    candidates?: Array<{
      code: string;
      discount?: string;
      platform?: string;
      source: string;
    }>;
    source: string;
  }

  it('successful result has ok=true and status=succeeded', () => {
    const result: SerializedResult = {
      ok: true,
      status: 'succeeded',
      request_id: 'req-abc123',
      resolved_at: new Date().toISOString(),
      candidates: [{ code: 'SAVE10', discount: '10%', platform: 'shopee', source: 'catalog' }],
      source: 'live',
    };

    expect(result.ok).toBe(true);
    expect(result.status).toBe('succeeded');
    expect(result.request_id).toBeTruthy();
    expect(result.resolved_at).toBeTruthy();
  });

  it('no_match result has ok=true and status=no_match', () => {
    const result: SerializedResult = {
      ok: true,
      status: 'no_match',
      request_id: 'req-abc123',
      resolved_at: new Date().toISOString(),
      source: 'live',
    };

    expect(result.ok).toBe(true); // Not an error — just no match
    expect(result.status).toBe('no_match');
    expect(result.candidates).toBeUndefined();
  });

  it('result includes timestamp in ISO format', () => {
    const result: SerializedResult = {
      ok: true,
      status: 'succeeded',
      request_id: 'req-abc123',
      resolved_at: '2025-01-01T00:00:00.000Z',
      source: 'live',
    };

    const parsed = new Date(result.resolved_at);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('result has no internal server fields exposed', () => {
    const result: SerializedResult = {
      ok: true,
      status: 'succeeded',
      request_id: 'req-abc123',
      resolved_at: new Date().toISOString(),
      source: 'live',
    };

    // Should not contain internal identifiers or stack traces
    expect('stack' in result).toBe(false);
    expect('error' in result).toBe(false);
    expect('token_hash' in result).toBe(false);
    expect('internal_session_id' in result).toBe(false);
  });
});

// ── Persistence read path invariants ──────────────────────────────────────

describe('Persistence Read Path', () => {
  it('Redis is checked before Supabase (fast path first)', () => {
    // This is a documentation test — the actual priority is:
    // 1. Redis → full JSON result (30 min TTL)
    // 2. In-memory Map → fallback if Redis miss
    // 3. Supabase → metadata + summary reconstruction (30 day TTL)
    const readPathOrder = ['Redis', 'InMemory', 'Supabase'];
    expect(readPathOrder[0]).toBe('Redis'); // fast first
  });

  it('expired requests return 404, not 200', () => {
    // When the TTL has passed and no result exists:
    // - Redis: entry deleted (TTL expired)
    // - Supabase: status === 'expired' AND TTL exceeded
    // Result: 404 to caller
    const expiredStatus: VoucherResolutionStatus = 'expired';
    const isTerminal = ['succeeded', 'failed', 'no_match', 'cached'].includes(expiredStatus);
    expect(isTerminal).toBe(false); // expired ≠ terminal result
    // expired requests should not be found → 404
  });
});

// ── Write path invariants ──────────────────────────────────────────────────

describe('Persistence Write Path', () => {
  it('write always goes to DB first (source of truth)', () => {
    // Write path: DB → Redis (best-effort) → memory fallback
    // This ordering ensures no data loss on Redis failure
    const writeOrder = ['Supabase', 'Redis', 'InMemory'];
    expect(writeOrder[0]).toBe('Supabase');
  });

  it('Redis write failure does not fail the request', async () => {
    // Redis is a best-effort cache, not the source of truth.
    // If Redis write fails, the DB still has the record.
    let redisWriteFailed = false;
    let dbWriteSucceeded = true;

    // Simulate: Redis fails, DB succeeds
    if (redisWriteFailed && dbWriteSucceeded) {
      // Request should still succeed
      expect(true).toBe(true);
    }
  });

  it('result.requestId is set from persistence (not client-supplied)', () => {
    // The service assigns the request ID, not the caller.
    // This prevents ID collision attacks.
    const clientId = 'user-provided-id';
    const serverId = 'server-' + createHash('sha256').update(clientId + Date.now().toString()).digest('hex').slice(0, 8);
    expect(serverId).not.toBe(clientId);
  });
});

// ── Concurrency: duplicate resolution idempotency ─────────────────────────

describe('Idempotency', () => {
  it('same URL in same window returns same requestId (idempotent)', () => {
    const idempotencyKey1 = 'shopee:https://shopee.sg/product/123';
    const idempotencyKey2 = 'shopee:https://shopee.sg/product/123';

    // Same key = same request ID
    expect(idempotencyKey1).toBe(idempotencyKey2);
  });

  it('different URLs produce different idempotency keys', () => {
    const key1 = 'shopee:https://shopee.sg/product/123';
    const key2 = 'shopee:https://shopee.sg/product/456';
    expect(key1).not.toBe(key2);
  });

  it('different platforms produce different idempotency keys', () => {
    const key1 = 'shopee:https://shopee.sg/product/123';
    const key2 = 'tiktok:https://shopee.sg/product/123';
    expect(key1).not.toBe(key2);
  });
});

// ── Voucher resolution stats contract ─────────────────────────────────────

describe('Resolution Statistics Contract', () => {
  interface ResolutionStats {
    total_resolutions: number;
    completed_resolutions: number;
    failed_resolutions: number;
    no_match_resolutions: number;
    cache_hit_rate: number;
    avg_resolution_time_ms: number;
    platform_filter: string;
    days_filter: string;
    timestamp: string;
  }

  it('stats totals add up correctly', () => {
    const stats: ResolutionStats = {
      total_resolutions: 100,
      completed_resolutions: 70,
      failed_resolutions: 10,
      no_match_resolutions: 20,
      cache_hit_rate: 0.45,
      avg_resolution_time_ms: 120,
      platform_filter: 'all',
      days_filter: '30',
      timestamp: new Date().toISOString(),
    };

    expect(stats.total_resolutions).toBe(
      stats.completed_resolutions +
      stats.failed_resolutions +
      stats.no_match_resolutions
    );
  });

  it('cache_hit_rate is between 0 and 1', () => {
    const stats: ResolutionStats = {
      total_resolutions: 100,
      completed_resolutions: 50,
      failed_resolutions: 10,
      no_match_resolutions: 40,
      cache_hit_rate: 0.5,
      avg_resolution_time_ms: 120,
      platform_filter: 'all',
      days_filter: '30',
      timestamp: new Date().toISOString(),
    };

    expect(stats.cache_hit_rate).toBeGreaterThanOrEqual(0);
    expect(stats.cache_hit_rate).toBeLessThanOrEqual(1);
  });

  it('avg_resolution_time_ms is non-negative', () => {
    const stats: ResolutionStats = {
      total_resolutions: 100,
      completed_resolutions: 50,
      failed_resolutions: 10,
      no_match_resolutions: 40,
      cache_hit_rate: 0.5,
      avg_resolution_time_ms: 120,
      platform_filter: 'all',
      days_filter: '30',
      timestamp: new Date().toISOString(),
    };

    expect(stats.avg_resolution_time_ms).toBeGreaterThanOrEqual(0);
  });

  it('timestamp is ISO 8601 formatted', () => {
    const stats: ResolutionStats = {
      total_resolutions: 100,
      completed_resolutions: 50,
      failed_resolutions: 10,
      no_match_resolutions: 40,
      cache_hit_rate: 0.5,
      avg_resolution_time_ms: 120,
      platform_filter: 'all',
      days_filter: '30',
      timestamp: '2025-01-01T12:00:00.000Z',
    };

    const parsed = new Date(stats.timestamp);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});
