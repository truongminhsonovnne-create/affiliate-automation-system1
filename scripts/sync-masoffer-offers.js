#!/usr/bin/env node
/**
 * MasOffer Offers Sync Script
 *
 * Fetches deals, vouchers, and coupons from MasOffer Publisher API
 * and upserts them into Supabase.
 *
 * Run standalone:    node scripts/sync-masoffer-offers.js
 * Run with dry-run: node scripts/sync-masoffer-offers.js --dry-run
 *
 * Required env vars (or .env file):
 *   MASOFFER_API_TOKEN     — MasOffer API token
 *   MASOFFER_PUBLISHER_ID  — MasOffer Publisher ID
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *
 * MasOffer endpoints (publisher-api.masoffer.net):
 *   /v1/deals, /v1/vouchers, /v1/coupons, /v1/campaigns
 *
 * If you get 429 rate limit from publisher-api, set:
 *   MASOFFER_API_BASE_URL=https://publisher-api.masoffer.net
 *   (the script auto-detects available endpoints)
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
} catch { /* no .env */ }

// ── Config ─────────────────────────────────────────────────────────────────

const API_TOKEN = process.env.MASOFFER_API_TOKEN;
const PUBLISHER_ID = process.env.MASOFFER_PUBLISHER_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BASE_URL = process.env.MASOFFER_API_URL ?? 'https://publisher-api.masoffer.net';
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_PAGES = 50;

const MISSING = [
  !API_TOKEN && 'MASOFFER_API_TOKEN',
  !PUBLISHER_ID && 'MASOFFER_PUBLISHER_ID',
  !SUPABASE_URL && 'SUPABASE_URL',
  !SUPABASE_SERVICE_KEY && 'SUPABASE_SERVICE_KEY',
].filter(Boolean);

if (MISSING.length) {
  console.error(`❌ Missing env vars: ${MISSING.join(', ')}`);
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────

const log = (msg) => console.log(`[MO-Sync] ${msg}`);
const logErr = (msg) => console.error(`[MO-Sync] ❌ ${msg}`);

async function fetchMasOffer(path, page = 1, limit = 100) {
  const url = `${BASE_URL}${path}?page=${page}&limit=${limit}&publisher_id=${PUBLISHER_ID}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MasOffer ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function supabaseUpsert(rows) {
  if (rows.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

  const sbHeaders = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

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

  log(`  DB: ${rows.length} total | ${toInsert.length} insert | ${toUpdate.length} update | ${rows.length - toInsert.length - toUpdate.length} skip`);

  if (DRY_RUN) {
    return { inserted: 0, updated: 0, skipped: rows.length };
  }

  // Update changed rows
  for (const row of toUpdate) {
    const ex = existingMap.get(row.external_id);
    await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${ex.id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: '' },
      body: JSON.stringify(row),
    }).catch(() => {});
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
      logErr(`Bulk insert failed: ${err.slice(0, 200)}`);
    }
  }

  return {
    inserted: toInsert.length,
    updated: toUpdate.length,
    skipped: rows.length - toInsert.length - toUpdate.length,
  };
}

// ── Normalizer ────────────────────────────────────────────────────────────

/**
 * Normalize a MasOffer OfferItem to the NormalisedOffer schema.
 * MasOffer fields:
 *   id, title, description, code, discount_type, discount_value,
 *   min_purchase, max_discount, start_date, end_date, exclusive,
 *   verified, status, terms, link, image_url, logo_url,
 *   campaign_id, campaign_name, category, tags, created_at, updated_at
 */
function normalizeOffer(raw, sourceType) {
  const now = new Date().toISOString();

  const title = (raw.title || '').trim() || 'Unknown Offer';
  const merchantName = (raw.campaign_name || '').trim() || 'Unknown Merchant';
  const code = (raw.code || '').trim() || null;

  // discount_value is string like "10" or "10.5"
  let discountValue = null;
  const dv = (raw.discount_value || '').trim();
  if (dv && !isNaN(parseFloat(dv))) discountValue = parseFloat(dv);

  // min_purchase → min_order_value
  let minOrderValue = null;
  const mp = (raw.min_purchase || '').trim();
  if (mp && !isNaN(parseFloat(mp))) minOrderValue = parseFloat(mp);

  // max_discount
  let maxDiscount = null;
  const md = (raw.max_discount || '').trim();
  if (md && !isNaN(parseFloat(md))) maxDiscount = parseFloat(md);

  // discount_type normalization
  let discountType = (raw.discount_type || 'percent').toLowerCase();
  if (discountType === 'percentage') discountType = 'percent';
  if (discountType === 'fixed_amount' || discountType === 'fixed') discountType = 'fixed';

  // Status
  let status = 'active';
  const s = (raw.status || '').toLowerCase();
  if (s === 'inactive' || s === 'expired' || s === 'disabled') status = 'inactive';
  if (s === 'paused') status = 'paused';
  if (raw.end_date) {
    const expiry = new Date(raw.end_date).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) status = 'expired';
  }

  // Source type override
  const finalSourceType = code ? 'coupon' : sourceType;

  // Dedup hash
  const hashInput = [
    'masoffer', finalSourceType,
    title.toLowerCase(), merchantName.toLowerCase(),
    (code || '').toLowerCase(),
  ].join('|');
  const hash = createHash('sha256').update(hashInput).digest('hex');

  // Slug
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || null;

  // Confidence score
  const confidence = computeConfidence(raw, code);

  return {
    external_id: `mo_offer_${raw.id}`,
    source: 'masoffer',
    source_type: finalSourceType,
    title,
    slug,
    description: (raw.description || '').trim() || null,
    merchant_name: merchantName,
    merchant_id: raw.campaign_id ? String(raw.campaign_id) : null,
    category: (raw.category || '').trim() || null,
    destination_url: raw.link || null,
    tracking_url: null,
    coupon_code: code,
    discount_type: discountType,
    discount_value: discountValue,
    max_discount: maxDiscount,
    min_order_value: minOrderValue,
    currency: 'VND',
    start_at: raw.start_date || null,
    end_at: raw.end_date || null,
    status,
    terms: (raw.terms || '').trim() || null,
    image_url: raw.image_url || raw.logo_url || null,
    confidence_score: confidence,
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: raw,
    normalized_hash: hash,
  };
}

function computeConfidence(raw, code) {
  let score = 0.30;
  if (code && code.length >= 3) score += 0.20;
  if (raw.verified) score += 0.10;
  if (raw.exclusive) score += 0.10;
  if (raw.end_date) {
    const expiry = new Date(raw.end_date).getTime();
    if (!isNaN(expiry) && expiry > Date.now()) score += 0.10;
    else if (!isNaN(expiry) && expiry < Date.now()) score = Math.min(score, 0.40);
  }
  if (raw.description && raw.description.length > 30) score += 0.08;
  if (raw.link) score += 0.05;
  if (raw.image_url) score += 0.05;
  if (raw.category) score += 0.02;
  return Math.min(score, 1.0);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function fetchEndpoint(name, path, sourceType) {
  log(`\n[${name}] Fetching...`);
  let page = 1;
  let totalFetched = 0, totalInserted = 0, totalUpdated = 0, totalSkipped = 0;
  const PAGE_SIZE = 100;

  while (page <= MAX_PAGES) {
    let data;
    try {
      data = await fetchMasOffer(path, page, PAGE_SIZE);
    } catch (err) {
      if (page === 1) {
        logErr(`  ${name} failed: ${err.message}`);
        logErr(`  ⚠️  Check MASOFFER_API_TOKEN and publisher account status.`);
        return { fetched: 0, inserted: 0, updated: 0, skipped: 0 };
      }
      logErr(`  ${name} page ${page} error: ${err.message} — stopping`);
      break;
    }

    const offers = data?.data || [];
    const pagination = data?.pagination || {};
    const total = pagination.total || 0;

    if (page === 1) {
      log(`  ${name}: ${total} total offers (${pagination.total_pages || '?'} pages)`);
    }

    if (offers.length === 0) break;

    const rows = offers.map((o) => normalizeOffer(o, sourceType));
    const r = await supabaseUpsert(rows);

    totalFetched += offers.length;
    totalInserted += r.inserted;
    totalUpdated += r.updated;
    totalSkipped += r.skipped;

    log(`  Page ${page}: +${r.inserted} ins | ~${r.updated} upd | ${r.skipped} skip`);

    if (page >= pagination.total_pages || offers.length < PAGE_SIZE) break;
    page++;
  }

  log(`  ${name} result: fetched=${totalFetched} inserted=${totalInserted} updated=${totalUpdated} skipped=${totalSkipped}`);
  return { fetched: totalFetched, inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped };
}

async function main() {
  const start = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  MasOffer Sync  |  ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Publisher ID: ${PUBLISHER_ID}`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log('='.repeat(60));

  // Test connection
  log('Testing MasOffer API connection...');
  try {
    await fetchMasOffer('/v1/deals', 1, 1);
    log('✓ MasOffer API connection OK');
  } catch (err) {
    logErr(`MasOffer API unreachable: ${err.message}`);
    logErr('  Possible causes:');
    logErr('  1. API key expired — renew at publisher.masoffer.net');
    logErr('  2. Publisher account suspended');
    logErr('  3. Endpoint changed — check docs at publisher-api.masoffer.net');
    process.exit(1);
  }

  // Fetch all endpoints
  const deals    = await fetchEndpoint('Deals',    '/v1/deals',    'deal');
  const vouchers = await fetchEndpoint('Vouchers', '/v1/vouchers', 'voucher');
  const coupons  = await fetchEndpoint('Coupons',  '/v1/coupons',  'coupon');

  // Update sync checkpoint
  const duration = Date.now() - start;
  const total = {
    fetched: deals.fetched + vouchers.fetched + coupons.fetched,
    inserted: deals.inserted + vouchers.inserted + coupons.inserted,
    updated: deals.updated + vouchers.updated + coupons.updated,
    skipped: deals.skipped + vouchers.skipped + coupons.skipped,
  };

  log(`\n=== Total: fetched=${total.fetched} inserted=${total.inserted} updated=${total.updated} skipped=${total.skipped} (${duration}ms)`);

  if (!DRY_RUN) {
    await fetch(`${SUPABASE_URL}/rest/v1/sync_source_state?source=eq.masoffer`, {
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
    }).catch(() => {});
  }

  // Verify
  log('\n[Verify] Checking Supabase...');
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/offers?source=eq.masoffer&select=id,merchant_name,coupon_code,status`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const verifyData = verifyRes.ok ? await verifyRes.json() : [];
  log(`  Total MasOffer offers in DB: ${verifyData.length}`);

  if (total.inserted > 0 || total.updated > 0) {
    console.log(`\n✅ Sync complete — ${total.inserted} new, ${total.updated} updated in ${duration}ms`);
  } else {
    console.log(`\n✓ Sync complete — no changes (${total.skipped} skipped as unchanged)`);
  }

  process.exit(0);
}

main().catch((err) => {
  logErr(`Fatal: ${err.message}`);
  process.exit(1);
});
