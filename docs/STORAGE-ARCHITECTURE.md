# Storage Architecture — Affiliate Automation System

> Production-grade persistence strategy. All in-memory stores have been replaced
> with durable or Redis-backed alternatives. This document is the single source
> of truth for where data lives and how it is managed.

---

## Quick Reference

| Concern | Storage Tier | TTL | Restart-safe |
|---|---|---|---|
| Rate limiting counters | Redis → In-memory fallback | 60 s | ✅ (Redis) |
| Internal session hot path | Redis | token TTL + 5 min | ✅ |
| Internal session audit trail | Supabase | 90-day retention | ✅ |
| Security events (append-only) | Supabase | 365-day retention | ✅ |
| Voucher resolution requests | Supabase | 7–30 days | ✅ |
| Voucher resolution results | Redis → Supabase summary | 30 min → 30 days | ✅ |
| Voucher catalog cache | Redis → In-memory fallback | 5 min | ✅ (Redis) |
| Circuit breaker state | In-memory | process lifetime | ❌ (ephemeral) |
| Metrics | In-memory (Prometheus flush) | 60 s | ❌ (metrics sink) |
| Audit log (application) | In-memory + console | 10k events | ❌ (logs sink) |

---

## Layer Definitions

### Durable (Supabase / PostgreSQL)
Source of truth for all business state, audit records, and long-lived data.
Use when: data must survive process restarts, cross-instance reads, or legal retention.

### Ephemeral-Shared (Redis)
High-throughput, TTL-managed storage for hot paths, caches, and tokens.
Use when: data is short-lived (< 24 h) and can be reconstructed or re-fetched.

### Ephemeral-Local (In-Memory)
Process-local state only. Never shared across instances.
Use when: no cross-instance sharing is needed, data is stateless (e.g., circuit breakers),
or a shared store is unavailable and graceful degradation is acceptable.

---

## Detailed Inventory

### 1. Rate Limiting
**File:** `src/publicApi/rateLimit/store.ts`

| Store | Backend | Atomic | Production-ready |
|---|---|---|---|
| `InMemoryRateLimitStore` | `Map` + `setTimeout` timers | ✅ (JS mutex) | ❌ (dev only) |
| `RedisRateLimitStore` | Redis Lua script | ✅ (server-side atomic) | ✅ |

**Key format:** `ratelimit:{clientKey}`
**Lua script:** fixed-window counter with atomic `GET → decode → increment → SETEX`.
Previous `multi()/exec()` approach was **not atomic** — replaced.

**Env var:** `USE_REDIS_RATE_LIMIT=true` selects Redis; defaults to in-memory.

---

### 2. Internal Session Store
**Files:**
- `src/security/auth/redisSessionStore.ts` — Redis hot path
- `src/security/repositories/internalSessionRepository.ts` — Supabase cold path
- `src/security/auth/internalTokenAuth.ts` — token generation / validation

**Write path:**
```
issueInternalSession()
  1. encodeToken(payload, secret) → raw JWT
  2. hashToken(raw) → SHA-256
  3. insertInternalSession({ tokenHash }) → Supabase (fire-and-forget)
  4. storeSessionWithToken(raw, session) → Redis (synchronous)
```

**Read path:**
```
validateInternalSession(token)
  1. decode + verify signature (stateless)
  2. validateSession(jti) → Redis GET (fast path)
  3. If Redis miss → getInternalSessionFromSupabase() (slow fallback)
  4. If token hash on revocation list → reject
  5. touchSession() → refresh Redis TTL (async)
```

**Key format:** `security:session:{sessionId}`
**Revocation key:** `security:revoked:{tokenHash}` (TTL = 24 h after revocation)
**Env var:** `VOUCHER_REDIS_URL` or `REDIS_URL` for Redis connection.

**Supabase table:** `internal_sessions`
- `token_hash` column is indexed `WHERE status = 'active'`
- Unique constraint prevents duplicate active tokens

---

### 3. Security Events (Audit Log)
**File:** `src/security/repositories/securityEventRepository.ts`
**Facade:** `src/security/audit/securityAuditLogger.ts`

**Table:** `security_events` (append-only)

| Severity | Write mode | Rationale |
|---|---|---|
| `critical`, `error` | Synchronous | Must not be lost — security incidents |
| `warning`, `info`, `debug` | Fire-and-forget | Non-blocking, high volume |

**IP handling:** Raw IPs are never stored. They are SHA-256 hashed (first 16 hex chars)
before insert: `ip_hash TEXT` column.

**Retention:** 365 days (production). Auto-cleanup via cron:
```sql
DELETE FROM security_events
WHERE created_at < NOW() - INTERVAL '365 days'
  AND severity NOT IN ('critical');  -- critical events: manual review required
```

**Indexes:**
- `idx_se_created_at` — time-series queries
- `idx_se_severity_created` — error triage (error + critical only)
- `idx_se_actor_id` — actor forensics
- `idx_se_correlation_id` — full request trace reconstruction

---

### 4. Voucher Resolution Persistence
**File:** `src/voucherEngine/persistence/voucherResolutionPersistence.ts`

| Data | Primary | Fallback | TTL |
|---|---|---|---|
| Request metadata | Supabase | In-memory | pending: 5 min / succeeded: 30 d / failed: 7 d |
| Full result JSON | Redis | In-memory | 30 min |
| Result summary | Supabase columns | — | 30 days |

**Read path (full result):**
```
1. Redis GET ve:result:{requestId}     → full JSON (primary)
2. resultStorage Map (in-memory)        → fallback if Redis miss
3. Supabase select → reconstructResultFromRow() → partial summary
```

**Status lifecycle:**
```
pending → processing → succeeded | failed | no_match | expired | cached
```

**Table:** `voucher_resolution_requests`

**Migration:** `024_create_voucher_resolution_requests.sql`

---

### 5. Voucher Catalog Cache
**File:** `src/voucherEngine/repositories/voucherCacheRepository.ts`

| Store | Backend | TTL | Production-ready |
|---|---|---|---|
| `InMemoryCacheRepository` | `Map` | manual expiry | ❌ (dev only) |
| `RedisCacheRepository` | Redis `SETEX` | automatic via TTL | ✅ |

**Key format:** `ve:cache:{key}`
**Default TTL:** 300 s (5 minutes)

**Factory:** `createCacheRepository()` — selects Redis if `VOUCHER_REDIS_URL` is set,
falls back to in-memory otherwise.

---

### 6. Ephemeral-Local (No Changes Needed)

| Component | File | Rationale |
|---|---|---|
| Circuit breaker state | `src/observability/safeguards/circuitBreaker.ts` | Per-instance, stateless — trip/reset is best-effort |
| In-memory metrics | `src/observability/metrics/inMemoryMetrics.ts` | Pre-aggregation; flushed to Prometheus regularly |
| Rate limit store (dev) | `src/publicApi/rateLimit/store.ts` | Dev-only flag, documented |

---

## Migration Checklist (New Environments)

```bash
# 1. Run Supabase migrations
npx supabase db push
# or apply manually:
#   migration 024: voucher_resolution_requests table
#   migration 025: security_events + internal_sessions tables

# 2. Configure Redis
echo "VOUCHER_REDIS_URL=redis://localhost:6379" >> .env
echo "USE_REDIS_RATE_LIMIT=true" >> .env

# 3. Generate INTERNAL_AUTH_SECRET (for token signing)
openssl rand -hex 32

# 4. Verify startup
npm run check:startup
```

---

## Retention / Cleanup Cron

Run daily:

```sql
-- Mark expired internal sessions
UPDATE internal_sessions
SET    status = 'expired'
WHERE  status = 'active' AND expires_at < NOW();

-- Delete old expired sessions (keep 90-day history)
DELETE FROM internal_sessions
WHERE  status = 'expired'
  AND  updated_at < NOW() - INTERVAL '90 days';

-- Archive old security events (keep 365 days, never auto-delete critical)
DELETE FROM security_events
WHERE  created_at < NOW() - INTERVAL '365 days'
  AND  severity NOT IN ('critical');

-- Vacuum to reclaim space
VACUUM ANALYZE security_events;
VACUUM ANALYZE internal_sessions;
VACUUM ANALYZE voucher_resolution_requests;
```
