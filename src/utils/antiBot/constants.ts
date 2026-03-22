/**
 * Anti-Bot Toolkit Constants
 *
 * Default configuration values for anti-bot utilities.
 */

// ============================================
// Delay Defaults
// ============================================

export const DELAY_DEFAULTS = {
  MIN: 100,
  MAX: 300,
  PAGE_LOAD_MIN: 1500,
  PAGE_LOAD_MAX: 3000,
  RATE_LIMIT: 3000,
  ACTION_MIN: 200,
  ACTION_MAX: 600,
} as const;

// ============================================
// Scroll Defaults
// ============================================

export const SCROLL_DEFAULTS = {
  MIN_STEP: 200,
  MAX_STEP: 500,
  MIN_DELAY: 300,
  MAX_DELAY: 800,
  MAX_SCROLLS: 30,
  STOP_AT_HEIGHT_PERCENT: 0.92,
  READING_PAUSE_CHANCE: 0.15,
  READING_PAUSE_MIN: 2000,
  READING_PAUSE_MAX: 5000,
} as const;

// ============================================
// Navigation Defaults
// ============================================

export const NAVIGATION_DEFAULTS = {
  MAX_RETRIES: 3,
  TIMEOUT: 30000,
  WAIT_UNTIL: 'networkidle' as const,
  PRE_DELAY_MIN: 500,
  PRE_DELAY_MAX: 1500,
  POST_DELAY_MIN: 500,
  POST_DELAY_MAX: 1500,
} as const;

// ============================================
// Interaction Defaults
// ============================================

export const INTERACTION_DEFAULTS = {
  INTENSITY: 'medium' as const,
  PRE_PAUSE_MIN: 300,
  PRE_PAUSE_MAX: 800,
  POST_PAUSE_MIN: 200,
  POST_PAUSE_MAX: 500,
  MICRO_SCROLL_CHANCE: 0.25,
  VIEWPORT_NUDGE_CHANCE: 0.1,
} as const;

// ============================================
// Jitter Defaults
// ============================================

export const JITTER_DEFAULTS = {
  ENABLED: true,
  PERCENT: 0.1, // 10%
} as const;

// ============================================
// Viewport Constants
// ============================================

export const MOBILE_VIEWPORT = {
  width: 375,
  height: 812,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
} as const;

export const DESKTOP_VIEWPORT = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
} as const;

// ============================================
// Browser Launch Arguments
// ============================================

export const STEALTH_ARGUMENTS = [
  '--disable-blink-features=AutomationControlled',
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
] as const;

// ============================================
// Language & Locale
// ============================================

export const LOCALE_SETTINGS = {
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  acceptLanguage: 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
} as const;
