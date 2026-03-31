/**
 * Input Normalization — resolve-normalize.ts
 *
 * Extracts structured identifiers from product URLs.
 * Produces a stable normalized form used for querying and caching.
 */

export type Platform = 'shopee' | 'lazada' | 'tiki' | 'tiktok' | 'unknown';

export interface NormalizedInput {
  platform: Platform;
  shopId: string | null;
  itemId: string | null;
  /** Stripped URL without tracking params */
  cleanUrl: string;
  /** Composite key used for DB queries and cache */
  queryKey: string;
  /** Original raw input */
  originalUrl: string;
}

// ── Public URL cleaners ─────────────────────────────────────────────────────────

// ── Short URL expander ─────────────────────────────────────────────────────────

/**
 * Resolve shope.ee / bit.ly style redirects to the final destination URL.
 * Only follows safe, known redirect domains.
 * Returns the original URL if the request fails or times out.
 */
export async function expandShortUrl(raw: string): Promise<string> {
  const shortDomains = ['shope.ee', 'shope.ll', 'shope.cc', 'bit.ly', 'tinyurl.com', 'goo.gl'];
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (!shortDomains.includes(url.hostname.toLowerCase())) {
      return raw;
    }
  } catch {
    return raw;
  }

  try {
    const controller = new AbortController();
    // 1.5s max — shope.ee redirects are instant; 3s is too generous
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(raw, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.url || raw;
  } catch {
    return raw;
  }
}

// ── Public URL cleaners ─────────────────────────────────────────────────────────

const TRACKING_PARAMS = new Set([
  'spm', 'scm', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid',
  'dti', 'share', 'share_id', 'task_id', 'ref',
]);

function stripTracking(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const clean = new URL(parsed.origin + parsed.pathname);
    parsed.searchParams.forEach((_, key) => {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        clean.searchParams.set(key, parsed.searchParams.get(key) ?? '');
      }
    });
    return clean.toString().replace(/\/+$/, '');
  } catch {
    return url.trim();
  }
}

// ── Platform-specific extractors ───────────────────────────────────────────────

function parseShopee(raw: string): { shopId: string | null; itemId: string | null } {
  const lower = raw.toLowerCase();
  const pathMatch = raw.match(/-i\.(\d+)\.(\d+)/);
  if (pathMatch) {
    return { shopId: pathMatch[1], itemId: pathMatch[2] };
  }
  const qsShop = raw.match(/[?&]shopid=(\d+)/i);
  const qsItem = raw.match(/[?&]itemid=(\d+)/i);
  if (qsShop || qsItem) {
    return { shopId: qsShop?.[1] ?? null, itemId: qsItem?.[1] ?? null };
  }
  // Fallback: try path pattern without i. prefix
  const altPath = raw.match(/\.(\d+)\/.*?(\d+)\.html/i);
  if (altPath) {
    return { shopId: altPath[1], itemId: altPath[2] };
  }
  return { shopId: null, itemId: null };
}

function parseLazada(raw: string): { shopId: string | null; itemId: string | null } {
  const skuMatch = raw.match(/\/products\/.*?(\d+)\.html/i)
    ?? raw.match(/(\d+)\.html/i);
  const shopMatch = raw.match(/[?&]shop(?:_id|Id)=(\d+)/i);
  return {
    shopId: shopMatch?.[1] ?? null,
    itemId: skuMatch?.[1] ?? null,
  };
}

function parseTiki(raw: string): { shopId: string | null; itemId: string | null } {
  const pMatch = raw.match(/\/p(\d+)/);
  return { shopId: null, itemId: pMatch?.[1] ?? null };
}

function parseTiktok(raw: string): { shopId: string | null; itemId: string | null } {
  const itemMatch = raw.match(/\/item\/(\d+)/);
  const shopMatch = raw.match(/@([^/?]+)/);
  return {
    shopId: shopMatch?.[1] ?? null,
    itemId: itemMatch?.[1] ?? null,
  };
}

// ── Main normalizer ────────────────────────────────────────────────────────────

export function normalizeInput(raw: string): NormalizedInput {
  const url = raw.trim();
  const lower = url.toLowerCase();

  let platform: Platform = 'unknown';
  let shopId: string | null = null;
  let itemId: string | null = null;

  if (lower.includes('shopee') || lower.includes('shope.ee')) {
    platform = 'shopee';
    ({ shopId, itemId } = parseShopee(raw));
  } else if (lower.includes('lazada')) {
    platform = 'lazada';
    ({ shopId, itemId } = parseLazada(raw));
  } else if (lower.includes('tiki')) {
    platform = 'tiki';
    ({ shopId, itemId } = parseTiki(raw));
  } else if (lower.includes('tiktok')) {
    platform = 'tiktok';
    ({ shopId, itemId } = parseTiktok(raw));
  }

  const cleanUrl = stripTracking(url);

  // Build query key for DB lookup
  const queryKey = [
    platform,
    shopId ?? '',
    itemId ?? '',
  ].join('::');

  return {
    platform,
    shopId,
    itemId,
    cleanUrl,
    queryKey,
    originalUrl: url,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: true;
  normalized: NormalizedInput;
}

export interface ValidationFailure {
  valid: false;
  code: string;
  message: string;
}

export function validateInput(raw: unknown): ValidationResult | ValidationFailure {
  if (typeof raw !== 'string') {
    return { valid: false, code: 'INVALID_INPUT', message: 'Input phải là chuỗi URL' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 10) {
    return { valid: false, code: 'INPUT_TOO_SHORT', message: 'Link quá ngắn, vui lòng nhập link sản phẩm đầy đủ' };
  }
  if (trimmed.length > 2000) {
    return { valid: false, code: 'INPUT_TOO_LONG', message: 'Link quá dài' };
  }
  // Basic URL pattern check
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes('.')) {
    return { valid: false, code: 'NOT_A_URL', message: 'Vui lòng nhập link sản phẩm hợp lệ (VD: https://shopee.vn/...)' };
  }
  const normalized = normalizeInput(trimmed);
  if (normalized.platform === 'unknown') {
    return { valid: false, code: 'UNSUPPORTED_PLATFORM', message: 'Chỉ hỗ trợ Shopee, Shopee (shope.ee), Lazada, Tiki, TikTok' };
  }
  return { valid: true, normalized };
}
