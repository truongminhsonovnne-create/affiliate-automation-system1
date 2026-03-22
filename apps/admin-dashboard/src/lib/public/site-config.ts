/**
 * site-config.ts — Single source of truth for all contact and brand info.
 *
 * Every piece of copy that references the publisher/operator comes from here.
 * Change ONE place — updates everywhere.
 *
 * ── How to update ──────────────────────────────────────────────────────────
 * 1. Set NEXT_PUBLIC_CONTACT_EMAIL in .env / hosting platform dashboard
 * 2. Update SITE_LAST_UPDATED_DISPLAY when content changes
 * 3. Rebuild (NEXT_PUBLIC_* vars are read at build time)
 *
 * ── Why use NEXT_PUBLIC_* for the email? ──────────────────────────────────
 * The email address appears in public-facing pages that render on the client.
 * It is NOT a secret — it's shown on the /contact page and in footer.
 * What IS secret: SESSION_SECRET, ADMIN_PASSWORD_HASH (server-only vars).
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Contact email shown to users on contact page and in footer. */
const CONTACT_EMAIL =
  (process.env.NEXT_PUBLIC_CONTACT_EMAIL as string | undefined) ??
  'lienhe@voucherfinder.app';

/** Current year — used in copyright notices. */
export const SITE_YEAR = new Date().getFullYear();

/** ISO date string for when the content was last meaningfully updated. */
export const SITE_LAST_UPDATED = '2026-03-21';

/** Formatted last updated for display — used in both rendered content AND static metadata exports. */
export const SITE_LAST_UPDATED_DISPLAY = 'Tháng 3, 2026';

/** Pre-built template string safe to use in static metadata objects. */
export const SITE_METADATA_DESCRIPTION_TEMPLATE =
  `Cập nhật lần cuối: ${SITE_LAST_UPDATED_DISPLAY}` as const;

export const SITE_CONFIG = {
  name: 'VoucherFinder',
  /** Shown in <title> and branding */
  email: CONTACT_EMAIL,
  /** Shown in footer copyright */
  year: SITE_YEAR,
  /** Shown on legal/info pages as "last updated" */
  lastUpdated: SITE_LAST_UPDATED_DISPLAY,
  /** ISO date for sitemap lastModified */
  lastModifiedIso: SITE_LAST_UPDATED,
  /** Base URL (matches NEXT_PUBLIC_SITE_URL) */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voucherfinder.app',
} as const;
