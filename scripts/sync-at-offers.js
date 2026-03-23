#!/usr/bin/env node
/**
 * AccessTrade Offers Sync Script
 *
 * Fetches all active offers from AccessTrade API and upserts them into Supabase.
 * Run standalone:    node scripts/sync-at-offers.js
 * Run with dry-run:  node scripts/sync-at-offers.js --dry-run
 *
 * For GitHub Actions / cron, set these env vars:
 *   ACCESSTRADE_API_KEY   — your AccessTrade API token
 *   SUPABASE_URL          — e.g. https://xxx.supabase.co
 *   SUPABASE_SERVICE_KEY  — service role key (write access)
 *
 * Or use a .env file (see .env.example for required vars).
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';

// ── Load .env if present ──────────────────────────────────────────────────

try {
  const envFile = readFileSync(new URL('.env', import.meta.url), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch { /* no .env file — fine */ }

// ── Config ─────────────────────────────────────────────────────────────────

const API_KEY = process.env.ACCESSTRADE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_PAGES = 50;

if (!API_KEY) { console.error('❌ ACCESSTRADE_API_KEY not set'); process.exit(1); }
if (!SUPABASE_URL) { console.error('❌ SUPABASE_URL not set'); process.exit(1); }
if (!SUPABASE_SERVICE_KEY) { console.error('❌ SUPABASE_SERVICE_KEY not set'); process.exit(1); }

// ── Helpers ────────────────────────────────────────────────────────────────

const log = (msg) => console.log(`[AT-Sync] ${msg}`);
const logErr = (msg) => console.error(`[AT-Sync] ❌ ${msg}`);

async function fetchOffers(page, limit) {
  const url = `https://api.accesstrade.vn/v1/offers_informations?limit=${limit}&status=1&page=${page}`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${API_KEY}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AT API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function supabaseUpsert(rows) {
  if (rows.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

  // Build ON CONFLICT external_id upsert using RPC or direct insert
  const sbHeaders = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  // Fetch existing hashes for dedup
  const ids = rows.map((r) => r.external_id);
  const idsParam = ids.map((id) => `"${id}"`).join(',');

  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/offers?external_id=in.(${idsParam})&select=id,external_id,normalized_hash`,
    { headers: sbHeaders }
  );
  const existing = existingRes.ok ? await existingRes.json() : [];
  const existingMap = new Map(existing.map((r) => [r.external_id, r]));

  const toInsert = rows.filter((r) => !existingMap.has(r.external_id));
  const toUpdate = rows.filter((r) => {
    const ex = existingMap.get(r.external_id);
    return ex && ex.normalized_hash !== r.normalized_hash;
  });

  // Upsert: insert with ON CONFLICT update
  const allRows = [...toUpdate.map((r) => ({ ...r, id: existingMap.get(r.external_id).id })), ...toInsert];

  if (DRY_RUN) {
    log(`DRY RUN: would insert ${toInsert.length}, update ${toUpdate.length}, skip ${rows.length - toInsert.length - toUpdate.length}`);
    return { inserted: toInsert.length, updated: toUpdate.length, skipped: rows.length - toInsert.length - toUpdate.length };
  }

  // Update changed rows one by one
  for (const row of toUpdate) {
    const ex = existingMap.get(row.external_id);
    await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${ex.id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': '' },
      body: JSON.stringify(row),
    }).catch(() => {/* non-critical */});
  }

  // Bulk insert new rows
  if (toInsert.length > 0) {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/offers`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify(toInsert),
    });
    if (!insertRes.ok) {
      const err = await insertRes.text();
      logErr(`Bulk insert failed: ${err.slice(0, 300)}`);
    }
  }

  return {
    inserted: toInsert.length,
    updated: toUpdate.length,
    skipped: rows.length - toInsert.length - toUpdate.length,
  };
}

// ── Normalizer ────────────────────────────────────────────────────────────

function normalizeOffer(raw) {
  const now = new Date().toISOString();

  // coupons is Array<{coupon_code, coupon_desc}>
  let couponCode = null;
  if (Array.isArray(raw.coupons) && raw.coupons.length > 0) {
    const first = raw.coupons[0];
    if (first && typeof first === 'object' && 'coupon_code' in first) {
      const code = (first).coupon_code;
      if (typeof code === 'string' && code.trim()) couponCode = code.trim();
    }
  }

  // categories is Array<{category_name, category_name_show}>
  const categories = Array.isArray(raw.categories)
    ? raw.categories
        .filter((c) => c && typeof c === 'object' && 'category_name' in c)
        .map((c) => c.category_name)
        .filter(Boolean)
    : [];

  const title = (raw.name || '').trim() || 'Unknown Offer';
  const merchantName = (raw.merchant || '').trim() || 'Unknown Merchant';
  const sourceType = couponCode ? 'coupon' : 'voucher';

  // Content-based discount_type
  const contentLower = (raw.content || '').toLowerCase();
  let discountType = 'percent';
  if (contentLower.includes('free ship') || contentLower.includes('freeshipping') || contentLower.includes('miễn phí vận chuyển')) {
    discountType = 'free_shipping';
  } else if (contentLower.includes('cashback') || contentLower.includes('hoàn tiền')) {
    discountType = 'cashback';
  }

  // Dedup hash
  const hashInput = [
    'accesstrade', sourceType,
    title.toLowerCase(), merchantName.toLowerCase(),
    (couponCode || '').toLowerCase(),
  ].join('|');
  const hash = createHash('sha256').update(hashInput).digest('hex');

  // Status from end_time
  let status = 'active';
  if (raw.end_time) {
    const expiry = new Date(raw.end_time).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) status = 'expired';
  }

  // Slug
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || null;

  return {
    external_id: `at_offer_${raw.id}`,
    source: 'accesstrade',
    source_type: sourceType,
    title,
    slug,
    description: (raw.content || '').trim() || null,
    merchant_name: merchantName,
    merchant_id: null,
    category: categories.length > 0 ? categories.join(', ') : null,
    destination_url: raw.link || null,
    tracking_url: raw.aff_link || null,
    coupon_code: couponCode,
    discount_type: discountType,
    discount_value: null,
    max_discount: null,
    min_order_value: null,
    currency: 'VND',
    start_at: raw.start_time || null,
    end_at: raw.end_time || null,
    status,
    terms: (raw.content || '').trim() || null,
    image_url: raw.image || null,
    confidence_score: computeConfidence(couponCode, raw),
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: raw,
    normalized_hash: hash,
  };
}

function computeConfidence(code, raw) {
  let score = 0.30;
  if (code && code.length >= 3) score += 0.15;
  if (raw.end_time) {
    const expiry = new Date(raw.end_time).getTime();
    if (!isNaN(expiry) && expiry > Date.now()) score += 0.12;
    else if (!isNaN(expiry) && expiry < Date.now()) score = Math.min(score, 0.45);
  }
  if (raw.aff_link) score += 0.10;
  if (raw.content && raw.content.length > 20) score += 0.08;
  if (raw.merchant) score += 0.08;
  if (Array.isArray(raw.coupons) && raw.coupons.length > 1) score += 0.05;
  if (Array.isArray(raw.categories) && raw.categories.length > 0) score += 0.05;
  return Math.min(score, 1.0);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  AccessTrade Sync  |  ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  AT API Key: ${API_KEY.slice(0, 8)}...`);
  console.log('='.repeat(60));

  // ── 1. Test connection ────────────────────────────────────────────
  log('Testing AT API connection...');
  try {
    const test = await fetchOffers(1, 1);
    log(`✓ API OK — first page returned ${test.data?.length ?? 0} offers`);
  } catch (err) {
    logErr(`AT API connection failed: ${err.message}`);
    process.exit(1);
  }

  // ── 2. Fetch all pages ─────────────────────────────────────────────
  log(`Fetching up to ${MAX_PAGES} pages...`);
  let totalFetched = 0, totalInserted = 0, totalUpdated = 0, totalSkipped = 0;
  const PAGE_SIZE = 100;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchOffers(page, PAGE_SIZE);
    const offers = data.data || [];

    if (offers.length === 0) {
      log(`Page ${page}: empty → done`);
      break;
    }

    const rows = offers.map(normalizeOffer);
    const r = await supabaseUpsert(rows);

    totalFetched += offers.length;
    totalInserted += r.inserted;
    totalUpdated += r.updated;
    totalSkipped += r.skipped;

    const bar = '█'.repeat(Math.min(offers.length, 50));
    log(`Page ${page.toString().padStart(2)} | ${offers.length.toString().padStart(3)} offers | +${r.inserted} ins | ~${r.updated} upd | ${r.skipped} skip | ${bar}`);

    if (offers.length < PAGE_SIZE) {
      log('Last page reached.');
      break;
    }
  }

  // ── 3. Update sync checkpoint ──────────────────────────────────────
  const duration = Date.now() - start;
  log(`Total: fetched=${totalFetched} inserted=${totalInserted} updated=${totalUpdated} skipped=${totalSkipped} (${duration}ms)`);

  if (!DRY_RUN) {
    await fetch(`${SUPABASE_URL}/rest/v1/sync_source_state?source=eq.accesstrade`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: '',
      },
      body: JSON.stringify({
        last_status: 'completed',
        last_synced_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error: null,
        retry_count: 0,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => {/* non-critical */});
  }

  // ── 4. Verify ──────────────────────────────────────────────────────
  log('Verifying in Supabase...');
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/offers?source=eq.accesstrade&select=id,merchant_name,coupon_code,status`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const verifyData = verifyRes.ok ? await verifyRes.json() : [];
  log(`Total AccessTrade offers in DB: ${verifyData.length}`);

  // Show top merchants
  const byMerchant = {};
  for (const o of verifyData) {
    byMerchant[o.merchant_name] = (byMerchant[o.merchant_name] || 0) + 1;
  }
  const topMerchants = Object.entries(byMerchant).sort((a, b) => b[1] - a[1]).slice(0, 5);
  log('Top merchants: ' + topMerchants.map(([k, v]) => `${k}(${v})`).join(', '));

  if (totalInserted > 0 || totalUpdated > 0) {
    console.log(`\n✅ Sync complete — ${totalInserted} new, ${totalUpdated} updated in ${duration}ms`);
  } else {
    console.log(`\n✓ Sync complete — no changes (${totalSkipped} skipped as unchanged)`);
  }

  process.exit(0);
}

main().catch((err) => {
  logErr(`Fatal: ${err.message}`);
  process.exit(1);
});
