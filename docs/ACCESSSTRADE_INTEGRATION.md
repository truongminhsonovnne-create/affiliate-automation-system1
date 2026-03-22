# AccessTrade Integration — Manual Verification Guide

## Prerequisites

1. **Set environment variables** (in `d:/Affiliate/.env`):

```bash
# Required
ACCESSTRADE_API_KEY=your_real_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional (defaults work fine for most setups)
ACCESSTRADE_BASE_URL=https://api.accesstrade.vn
ACCESSTRADE_TIMEOUT_MS=15000
ACCESSTRADE_MAX_RETRIES=3
```

2. **Run the migration** to create offer tables:

```bash
# Option A: via Supabase dashboard
# Paste the contents of: migrations/002_create_offer_tables.sql
# into the Supabase SQL Editor

# Option B: via CLI
npx supabase db push
```

---

## Step 1 — Health Check

```bash
# From the root (d:/Affiliate)
npm run accesstrade:health
```

Expected output (success):
```
══════════════════════════════════════
  AccessTrade — Connection Health Check
══════════════════════════════════════

✓ API key is configured (masked: true)
✓ API connection: SUCCESS
  Response time : 182ms
  Campaign count: 42
  Tested at     : 2026-03-21T...
```

Expected output (API key wrong):
```
✗ API connection: FAILED
  Error: Request failed with status code 401
```

---

## Step 2 — Dry Run (Fetch Only, No DB Writes)

```bash
npm run accesstrade:sync:dry
```

This will:
- Fetch deals from `/v1/deals` (up to 20 pages = 2000 records)
- Print counts without writing to Supabase

---

## Step 3 — Live Sync

```bash
# Sync deals + vouchers
npm run accesstrade:sync:deals

# Sync campaigns
npm run accesstrade:sync:campaigns

# Full sync (both)
npm run accesstrade:sync
```

Expected output:
```
[AccessTrade][SyncDeals] Starting fetch (status=active, type=all, maxPages=20)
[AccessTrade][SyncDeals] Page 1: fetched 100 deals (total so far: 100, total in API: 500)
[AccessTrade][SyncDeals] Page 2: fetched 100 deals ...
...
[AccessTrade][SyncDeals] Fetch complete: 500 deals in 5 batches
[AccessTrade][SyncDeals] Batch upsert: +480 inserted, ~15 updated, 5 skipped
[AccessTrade][SyncDeals] Done. Fetched=500 Inserted=480 Updated=15 Skipped=5 Errors=0 Duration=2340ms
```

---

## Step 4 — Verify Data in Supabase

```sql
-- Check offer counts by source
SELECT source, source_type, status, COUNT(*) as count
FROM public.offers
GROUP BY source, source_type, status
ORDER BY source, source_type;

-- Check most recent offers
SELECT title, merchant_name, coupon_code, discount_value, status, synced_at
FROM public.offers
WHERE source = 'accesstrade'
ORDER BY synced_at DESC
LIMIT 10;

-- Check sync run history
SELECT job_name, status, records_inserted, records_updated, started_at, finished_at, error_summary
FROM public.sync_runs
WHERE source = 'accesstrade'
ORDER BY started_at DESC
LIMIT 10;

-- Check recent sync errors
SELECT external_id, stage, error_message, created_at
FROM public.sync_errors
ORDER BY created_at DESC
LIMIT 20;
```

---

## Running Tests

```bash
# Unit tests (always run — no network needed)
npm run test:unit

# Integration tests (requires real API key)
RUN_ACCESSSTRADE_INTEGRATION=true npm run test:integration
```

---

## Architecture

```
AccessTrade Publisher API
    ↓
src/integrations/accesstrade/
  ├── client.ts          — HTTP client with Token auth, retry, safe logging
  ├── types.ts           — Raw API types + domain types
  ├── mapper.ts          — Normalise AccessTrade → NormalisedOffer
  ├── supabase.ts        — DB repository (upsert, snapshots, sync runs)
  └── syncService.ts     — Orchestration (fetch → normalize → upsert)

Supabase
  ├── offer_sources       — Source registry
  ├── offers              — Canonical offer records
  ├── offer_snapshots     — Payload change history
  ├── sync_runs           — Job execution log
  └── sync_errors         — Per-record error log
```

---

## Adding More Sources (Future)

The `offers` table and `NormalisedOffer` type are source-agnostic. To add Shopee, Ecomobi, or a manual feed:

1. Add the source key to `offer_sources` (seed or migration)
2. Create a new integration module at `src/integrations/{source}/`
3. Implement the same normaliser that maps to `NormalisedOffer`
4. Use the same `upsertOfferBatch` + `sync_runs` pattern
5. The deduplication key is `(source, external_id)` — no conflicts between sources
