# Ecomobi Integration Scaffold

> **Status: SCAFFOLD ONLY — NOT PRODUCTION READY**
>
> This document describes the current state of the Ecomobi integration scaffold
> and what remains to be completed once Ecomobi API documentation and/or account
> access is available.

---

## Overview

Ecomobi is the third affiliate source in the VoucherFinder multi-source pipeline.
The scaffold follows the exact same architecture as MasOffer and AccessTrade,
so activating it requires minimal changes.

---

## File Map

```
src/integrations/ecomobi/
├── types.ts      ✅ Scaffolded — pending real API types
├── client.ts     ✅ Scaffolded — pending real endpoint paths
├── mapper.ts     ✅ Scaffolded — pending real field names
├── supabase.ts   ✅ Scaffolded — uses shared upsertOfferBatch
└── sync.ts       ✅ Scaffolded — pending real pagination logic

src/sync/orchestrator/registry.ts    ✅ Ecomobi adapter registered (enabled: false)

src/app/admin/integrations/ecomobi/
└── page.tsx     ✅ Placeholder admin page (pending real data)

src/app/api/admin/ecomobi/
└── health/route.ts   ✅ Health check endpoint (pending real API call)

.env.example     ✅ ECOMOBI_API_KEY, ECOMOBI_PUBLISHER_ID, ECOMOBI_BASE_URL placeholders
```

---

## What Is Ready

| Component | Status | Notes |
|---|---|---|
| Source registry entry | ✅ Done | `enabled: false` until credentials available |
| Typed client skeleton | ✅ Done | Bearer auth, retry, timeout, env validation |
| Mapper scaffold | ✅ Done | All field extractions marked `// TODO: TBD` |
| Supabase upsert | ✅ Done | Reuses shared `upsertOfferBatch` |
| Sync job scaffold | ✅ Done | Paginated loop wired; endpoint paths marked `// TODO` |
| Admin health route | ✅ Done | Returns `apiKeyConfigured` + scaffold error message |
| Admin integration page | ✅ Done | Shows scaffold notice; wire to real health data |
| Nav entry | ✅ Done | Under "Tích hợp" section |
| Env placeholders | ✅ Done | In `.env.example` |

---

## What Is Pending Ecomobi API Docs / Account Access

### 1. API Base URL
- Expected: `https://api.ecomobi.com` (unconfirmed)
- Set via `ECOMOBI_BASE_URL` env var
- **Action:** Verify from Ecomobi onboarding docs or support

### 2. Authentication
- Expected: Bearer token (same pattern as MasOffer/AccessTrade)
- Token stored in `ECOMOBI_API_KEY`
- **Action:** Obtain token from Ecomobi dashboard

### 3. API Endpoint Paths
In `client.ts` — replace `// TODO` comments with real paths:

| Method | Current placeholder | Expected real path |
|---|---|---|
| `getOffers` | `/v1/offers` | TBD from Ecomobi docs |
| `getCampaigns` | `/v1/campaigns` | TBD from Ecomobi docs |
| `healthCheck` | `/v1/me` | TBD from Ecomobi docs |

### 4. Response Field Names
In `types.ts` and `mapper.ts` — all raw DTOs are marked `@ts-expect-error PENDING`.
Replace placeholder fields with real names:

| Expected field | Purpose | MasOffer equivalent |
|---|---|---|
| `id` | Unique offer ID | `id` |
| `title` | Offer title | `title` |
| `description` | Offer description | `description` |
| `code` | Coupon/voucher code | `code` |
| `discount` | Discount value (e.g. "10%") | `discount_value` |
| `discount_type` | `percent`, `fixed`, `free_shipping` | `discount_type` |
| `min_purchase` | Minimum order value | `min_purchase` |
| `max_discount` | Maximum discount cap | `max_discount` |
| `start_date` | Offer start date | `start_date` |
| `end_date` | Offer expiry date | `end_date` |
| `link` | Offer URL / tracking URL | `link` |
| `image_url` | Offer image | `image_url` |
| `merchant_name` | Advertiser/merchant name | `campaign_name` |
| `merchant_id` | Advertiser/merchant ID | `campaign_id` |
| `category` | Offer category | `category` |
| `status` | `active`, `inactive`, `expired` | `status` |
| `exclusive` | Exclusive offer flag | `exclusive` |
| `verified` | Verified offer flag | `verified` |

### 5. Pagination Shape
In `client.ts` — confirm the real response shape:

```ts
// Current scaffold expects:
interface EcomobiPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
```

### 6. Source Registry Enable Flag
In `src/sync/orchestrator/registry.ts`:

```ts
return {
  key: 'ecomobi',
  name: 'Ecomobi',
  enabled: false, // ← Change to true once credentials are configured
  // ...
};
```

### 7. `sync_source_state` Table Entry
Ensure `ecomobi` exists in the `sync_source_state` table (via migration/seed):

```sql
INSERT INTO sync_source_state (source, is_enabled, max_retries)
VALUES ('ecomobi', false, 3)
ON CONFLICT (source) DO NOTHING;
```

---

## Activation Checklist

Once Ecomobi API docs and/or account access is available:

- [ ] Confirm API base URL
- [ ] Obtain and set `ECOMOBI_API_KEY` in production env
- [ ] Obtain and set `ECOMOBI_PUBLISHER_ID` in production env
- [ ] Fill in real endpoint paths in `client.ts`
- [ ] Fill in real response types in `types.ts` (remove `@ts-expect-error PENDING` comments)
- [ ] Verify field extractions in `mapper.ts`
- [ ] Confirm pagination shape and update `client.ts`
- [ ] Wire real health check in `src/app/api/admin/ecomobi/health/route.ts`
- [ ] Set `enabled: true` in registry adapter
- [ ] Insert `ecomobi` row into `sync_source_state`
- [ ] Run first dry-run sync: `npm run sync:dry -- --source=ecomobi`

---

## Architecture Notes

- **Auth:** Bearer token — same pattern as MasOffer (`MASOFFER_API_TOKEN`) and
  AccessTrade (`ACCESSTRADE_API_KEY`).
- **Upsert:** Uses the shared `upsertOfferBatch` in `supabase-write.ts`. No custom
  Supabase client needed.
- **Error handling:** Retry with exponential backoff for 408/429/5xx status codes.
- **Logging:** Uses `console.info/warn/error` with `[Ecomobi]` prefix — same as other
  integrations.
- **Confidence scoring:** Placeholder heuristic in `mapper.ts`. Adjust once real
  Ecomobi data quality is known.
