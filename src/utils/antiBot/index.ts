/**
 * Anti-Bot Toolkit
 *
 * Production-grade utilities for simulating human-like behavior in browser automation.
 * Designed to avoid bot detection on e-commerce platforms like Shopee, TikTok Shop, etc.
 *
 * @package affiliate-automation-system
 * @version 1.0.0
 *
 * @example
 * import { safeNavigate, humanLikeClick, humanLikeScroll } from './utils/antiBot';
 *
 * // Navigate safely with retry
 * const navResult = await safeNavigate(page, 'https://shopee.vn');
 *
 * // Scroll like a human
 * const scrollResult = await humanLikeScroll(page, { maxScrolls: 20 });
 *
 * // Click naturally
 * await humanLikeClick(page, '.add-to-cart-btn', { intensity: 'high' });
 */

// ============================================
// Re-export Types
// ============================================

export type {
  AntiBotLogger,
  AbortSignalLike,
  RandomDelayOptions,
  RandomDelayResult,
  HumanLikeScrollOptions,
  HumanScrollResult,
  ScrollStoppedReason,
  SafeNavigateOptions,
  SafeNavigateResult,
  RandomizedInteractionOptions,
  RandomizedInteractionResult,
  InteractionIntensity,
} from './types.js';

export { INTENSITY_PRESETS } from './types.js';

// ============================================
// Re-export Constants
// ============================================

export {
  DELAY_DEFAULTS,
  SCROLL_DEFAULTS,
  NAVIGATION_DEFAULTS,
  INTERACTION_DEFAULTS,
  JITTER_DEFAULTS,
  MOBILE_VIEWPORT,
  DESKTOP_VIEWPORT,
  STEALTH_ARGUMENTS,
  LOCALE_SETTINGS,
} from './constants.js';

// ============================================
// Export Delay Functions
// ============================================

export {
  sleep,
  randomBetween,
  randomDelay,
  pageLoadDelay,
  actionDelay,
  rateLimitDelay,
} from './delay.js';

// ============================================
// Export Scroll Functions
// ============================================

export {
  humanLikeScroll,
  scrollToElement,
  scrollToTop,
  scrollToBottom,
} from './scroll.js';

// ============================================
// Export Navigation Functions
// ============================================

export {
  safeNavigate,
  safeNavigateAndWait,
  safeRefresh,
} from './navigation.js';

// ============================================
// Export Interaction Functions
// ============================================

export {
  humanLikeClick,
  humanLikeDoubleClick,
  humanLikeHover,
  humanLikeType,
  humanLikePress,
  humanLikeSequence,
} from './interaction.js';

// ============================================
// Utility: Create Logger
// ============================================

import type { AntiBotLogger } from './types.js';

/**
 * Create a simple console logger for anti-bot operations
 *
 * @param prefix - Prefix for log messages
 * @param verbose - Enable verbose logging
 */
export function createAntiBotLogger(prefix: string = 'AntiBot', verbose: boolean = false): AntiBotLogger {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(`[${prefix}] ℹ️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(`[${prefix}] ⚠️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (verbose) {
        console.debug(`[${prefix}] 🔍 ${message}`, meta ? JSON.stringify(meta) : '');
      }
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      console.error(`[${prefix}] ❌ ${message}`, meta ? JSON.stringify(meta) : '');
    },
  };
}

// ============================================
// Utility: Combined Browser Context Setup
// ============================================

import type { Browser, BrowserContext } from 'playwright';
import { LOCALE_SETTINGS, DESKTOP_VIEWPORT } from './constants.js';

export type { Browser, BrowserContext } from 'playwright';

/**
 * Create a stealth browser context with anti-bot configurations
 *
 * @param browser - Playwright browser instance
 * @param options - Configuration options
 */
export async function createStealthContext(
  browser: Browser,
  options: {
    viewport?: typeof DESKTOP_VIEWPORT;
    locale?: typeof LOCALE_SETTINGS;
    proxy?: { server: string; username?: string; password?: string };
  } = {}
): Promise<BrowserContext> {
  const viewport = options.viewport ?? DESKTOP_VIEWPORT;
  const locale = options.locale ?? LOCALE_SETTINGS;

  const contextOptions: {
    viewport: { width: number; height: number };
    locale: string;
    timezoneId: string;
    permissions: string[];
    geolocation: { latitude: number; longitude: number };
    extraHTTPHeaders: Record<string, string>;
    proxy?: { server: string; username?: string; password?: string };
  } = {
    viewport: { width: viewport.width, height: viewport.height },
    locale: locale.locale,
    timezoneId: locale.timezoneId,
    permissions: ['geolocation'],
    geolocation: { latitude: 10.8231, longitude: 106.6297 }, // Ho Chi Minh City
    extraHTTPHeaders: {
      'Accept-Language': locale.acceptLanguage,
    },
  };

  if (options.proxy) {
    contextOptions.proxy = options.proxy;
  }

  const context = await browser.newContext(contextOptions);

  return context;
}
