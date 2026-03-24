/**
 * Affiliate Link Builder — Server-side only
 *
 * Constructs redirect URLs that preserve affiliate attribution
 * while allowing VoucherFinder to log click events.
 *
 * How it works:
 *   User clicks "Mua ngay" → goes to /redirect?deal=<id>&src=<source>
 *   → we log the click to Supabase
 *   → 302 redirect to the real tracking link (AccessTrade / MasOffer)
 *   → AccessTrade/MasOffer sets their cookie → user lands on Shopee
 *   → Shopee reads AccessTrade/MasOffer cookie → attributes the sale to us
 *
 * SECURITY:
 *  - Never expose ACCESSTRADE_API_KEY or MASOFFER_API_TOKEN to browser.
 *  - This module is server-side only (called from route handlers).
 */

export interface RedirectParams {
  dealId: string;
  source: string;       // 'accesstrade' | 'masoffer'
  trackingUrl: string;  // The raw tracking URL from our DB
  offerTitle?: string;  // Optional: for analytics logging
}

// ── URL Builder ────────────────────────────────────────────────────────────────

/**
 * Build the internal redirect URL for a deal.
 * This is what we store in the DB and what the frontend calls.
 *
 * Format: /redirect?d=<dealId>&s=<source>
 *   d = base64url-encoded dealId  (short, not guessable)
 *   s = source (at, mo)
 *
 * We encode the dealId in base64url to:
 *   1. Avoid exposing internal IDs in URLs
 *   2. Prevent trivial enumeration attacks
 */
export function buildRedirectUrl(dealId: string, source: 'accesstrade' | 'masoffer'): string {
  // base64url encode — manual URL-safe encoding (Node.js Buffer)
  const b64 = Buffer.from(dealId, 'utf8').toString('base64');
  const encoded = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const src = source === 'accesstrade' ? 'at' : 'mo';
  return `/redirect?d=${encoded}&s=${src}`;
}

/**
 * Decode a base64url deal ID.
 * Returns null if the string is invalid.
 */
export function decodeDealId(encoded: string): string | null {
  try {
    // Restore base64 padding
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    if (!decoded) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Parse a redirect URL's query params.
 * Returns null if the URL is malformed.
 */
export function parseRedirectParams(url: URL): RedirectParams | null {
  const encodedId = url.searchParams.get('d');
  const src = url.searchParams.get('s');

  if (!encodedId || !src) return null;

  const dealId = decodeDealId(encodedId);
  if (!dealId) return null;

  let source: 'accesstrade' | 'masoffer';
  if (src === 'at') source = 'accesstrade';
  else if (src === 'mo') source = 'masoffer';
  else return null;

  return { dealId, source, trackingUrl: '' };
}

// ── MasOffer link generation ──────────────────────────────────────────────────

/**
 * MasOffer requires generating tracking links per-campaign.
 * If we don't have a stored tracking_url for a deal, we can generate one
 * using the MasOffer publisher API (if configured).
 *
 * Docs: https://masoffer.com — Publisher API
 *
 * MasOffer link format:
 *   https://link.masoffer.net/?id=<publisher_id>&offer_id=<offer_id>&...
 *
 * The API endpoint for creating links would be called server-side here,
 * but for simplicity we store pre-generated links in the DB during sync.
 * This function is a placeholder for future dynamic link generation.
 */
export function buildMasOfferTrackingUrl(
  offerId: string,
  publisherId: string,
  _campaignId?: string
): string {
  // MasOffer uses a link service that wraps the destination URL.
  // Publisher ID identifies us as the source.
  // The actual click tracking is handled by MasOffer's link server.
  const params = new URLSearchParams({
    id: publisherId,
    offer_id: offerId,
    ...(_campaignId ? { campaign_id: _campaignId } : {}),
  });
  return `https://link.masoffer.net/?${params.toString()}`;
}
