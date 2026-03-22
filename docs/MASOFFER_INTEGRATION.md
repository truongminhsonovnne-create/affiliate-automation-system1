# MasOffer Integration — Verification Guide

## Overview

MasOffer Publisher API is integrated as a secondary voucher/deal data source, sharing the same Supabase schema as AccessTrade.

## API Details

| Property | Value |
|---|---|
| Base URL | `https://publisher-api.masoffer.net` |
| Auth | `Authorization: Bearer <token>` header + `publisher_id` query param |
| Endpoints | `/v1/campaigns`, `/v1/deals`, `/v1/vouchers`, `/v1/coupons` |
| Docs | `https://publisher-api.masoffer.net/docs` |

## Auth Credentials

## Auth Credentials

Get your credentials from the **MasOffer Publisher Dashboard** → API Settings.

- **Publisher ID**: `YOUR_REAL_MASOFFER_PUBLISHER_ID`
- **Token**: `YOUR_REAL_MASOFFER_API_TOKEN`

> **Note**: The token ends with `==` (base64 padding). It must NOT be URL-encoded. The client sends it as-is in the `Authorization: Bearer` header.

## Environment Variables

Add to `.env` (root project):

```bash
MASOFFER_PUBLISHER_ID=YOUR_REAL_MASOFFER_PUBLISHER_ID
MASOFFER_API_TOKEN=YOUR_REAL_MASOFFER_API_TOKEN
MASOFFER_BASE_URL=https://publisher-api.masoffer.net
# MASOFFER_TIMEOUT_MS=15000
# MASOFFER_MAX_RETRIES=3
```

## Verification Checklist

### 1. Unit Tests

```bash
npx vitest run src/integrations/masoffer
# Expected: 66 passed, 8 skipped (integration tests)
```

### 2. Health Check (CLI)

```bash
npx masoffer:health
# Expected: ✓ API reachable, Response time: <5s
```

### 3. Dry-Run Sync

```bash
npx masoffer:sync:dry
# Simulates sync without writing to DB
# Verifies: auth works, pagination works, normalization works
```

### 4. Live Sync (requires Supabase)

```bash
npx masoffer:sync:offers
npx masoffer:sync:campaigns
```

Check Supabase:
```sql
SELECT source, COUNT(*) FROM offers WHERE source = 'masoffer' GROUP BY source;
SELECT * FROM sync_runs WHERE source = 'masoffer' ORDER BY started_at DESC LIMIT 1;
```

### 5. Admin Dashboard

Visit `/admin/integrations/masoffer` and verify:
- API Credentials: ✓ Configured
- API Reachability: ✓ Reachable
- Supabase: ✓ Connected (offer count shown)

## Rate Limiting

The MasOffer API may return HTTP 429 (rate limited). The client implements exponential backoff with jitter and retries automatically (default 3 attempts). Set `MASOFFER_MAX_RETRIES=5` for environments with stricter rate limits.

## Files

```
src/integrations/masoffer/
  masoffer.types.ts         — Raw DTOs + domain types
  MasOfferApiClient.ts     — HTTP client with Bearer auth
  masoffer.mapper.ts       — Normalizer + dedupe hash + confidence score
  masoffer.supabase.ts     — Supabase repository (delegates to AccessTrade)
  masoffer.sync.ts         — Sync job (fetch → normalize → upsert → log)

src/controlPlane/http/routes/
  masofferRoutes.ts        — GET /health, POST /sync (admin auth required)

src/scripts/
  runMasOfferSync.ts       — CLI: --health, --offers, --campaigns, --full, --dry-run

src/integrations/masoffer/__tests__/
  mapper.test.ts            — 58 unit tests (date, status, dedupe, normalize)
  client.test.ts           — 8 unit + 8 skipped integration tests
```

## npm Scripts

```bash
npm run masoffer:sync          # Full sync (offers + campaigns)
npm run masoffer:sync:offers  # Offers only
npm run masoffer:sync:campaigns # Campaigns only
npm run masoffer:sync:dry     # Dry-run
npm run masoffer:health       # Health check
```
