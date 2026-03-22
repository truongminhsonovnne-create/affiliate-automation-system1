/**
 * Crawler Foundation Layer - Constants
 *
 * Default configuration values and magic numbers for browser automation.
 */

// ============================================
// Timeout Constants
// ============================================

export const TIMEOUT = {
  /** Default navigation timeout (30 seconds) */
  NAVIGATION: 30000,

  /** Default page ready timeout (10 seconds) */
  PAGE_READY: 10000,

  /** Default operation timeout (60 seconds) */
  OPERATION: 60000,

  /** Default element wait timeout (10 seconds) */
  ELEMENT_WAIT: 10000,

  /** Default script execution timeout (5 seconds) */
  SCRIPT: 5000,

  /** Post-creation stabilization delay (2 seconds) */
  POST_CREATE_STABILIZE: 2000,
} as const;

// ============================================
// Retry Constants
// ============================================

export const RETRY = {
  /** Maximum navigation retry attempts */
  MAX_NAVIGATION: 3,

  /** Maximum page preparation retries */
  MAX_PREPARATION: 2,

  /** Maximum verification retries */
  MAX_VERIFICATION: 3,

  /** Base delay for exponential backoff (1 second) */
  BACKOFF_BASE: 1000,

  /** Maximum backoff delay (10 seconds) */
  BACKOFF_MAX: 10000,
} as const;

// ============================================
// Navigation Constants
// ============================================

export const NAVIGATION = {
  /** Default wait until strategy */
  WAIT_UNTIL: 'networkidle' as const,

  /** Pre-navigation delay min (500ms) */
  PRE_DELAY_MIN: 500,

  /** Pre-navigation delay max (1500ms) */
  PRE_DELAY_MAX: 1500,

  /** Post-navigation delay min (500ms) */
  POST_DELAY_MIN: 500,

  /** Post-navigation delay max (1500ms) */
  POST_DELAY_MAX: 1500,
} as const;

// ============================================
// Mobile Profile Constants
// ============================================

export const MOBILE_PROFILE = {
  /** Default viewport width */
  VIEWPORT_WIDTH: 375,

  /** Default viewport height */
  VIEWPORT_HEIGHT: 812,

  /** Device scale factor for mobile */
  DEVICE_SCALE_FACTOR: 3,

  /** Default locale */
  LOCALE: 'vi-VN',

  /** Default timezone */
  TIMEZONE: 'Asia/Ho_Chi_Minh',

  /** Accept language header */
  ACCEPT_LANGUAGE: 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',

  /** Ho Chi Minh City coordinates */
  GEOLOCATION: {
    latitude: 10.8231,
    longitude: 106.6297,
  },
} as const;

// ============================================
// Browser Launch Arguments
// ============================================

export const BROWSER_ARGS = {
  /** Essential args for stealth */
  ESSENTIAL: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ] as const,

  /** Additional stability args */
  STABILITY: [
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
  ] as const,

  /** Security args */
  SECURITY: [
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
  ] as const,
};

// ============================================
// Resource Policy Constants
// ============================================

export const RESOURCE_POLICY = {
  /** Default policy mode */
  DEFAULT_MODE: 'default' as const,

  /** Resource types to block in strict mode */
  STRICT_BLOCKED_TYPES: [
    'media',
    'font',
  ] as const,

  /** Resource types to block in relaxed mode */
  RELAXED_BLOCKED_TYPES: [
    'media',
  ] as const,

  /** Hosts to block (advertising/tracking) */
  BLOCKED_HOSTS: [
    'google-analytics.com',
    'googletagmanager.com',
    'facebook.net',
    'doubleclick.net',
    'adnxs.com',
  ] as const,

  /** Hosts to always allow */
  ALLOWED_HOSTS: [
    'shopee.vn',
    'cdngeneral.shopee.com',
    'cf.shopee.vn',
    'v.shopee.cn',
  ] as const,
} as const;

// ============================================
// Page Health Thresholds
// ============================================

export const HEALTH = {
  /** Minimum content length to consider page loaded */
  MIN_CONTENT_LENGTH: 1000,

  /** Maximum allowed console error count */
  MAX_CONSOLE_ERRORS: 5,

  /** Maximum time since last response (ms) */
  MAX_IDLE_TIME: 30000,

  /** Check interval for health (ms) */
  CHECK_INTERVAL: 5000,
} as const;

// ============================================
// Logging Constants
// ============================================

export const LOGGING = {
  /** Default log prefix */
  PREFIX: '[Crawler]',

  /** Include timestamp in logs */
  INCLUDE_TIMESTAMP: true,

  /** Maximum log message length */
  MAX_MESSAGE_LENGTH: 500,
} as const;

// ============================================
// Event Handler Constants
// ============================================

export const EVENTS = {
  /** Console types to log */
  LOG_CONSOLE_TYPES: ['log', 'info', 'warn', 'error'] as const,

  /** Log page errors */
  LOG_PAGE_ERRORS: true,

  /** Log failed requests */
  LOG_FAILED_REQUESTS: true,

  /** Log failed request reasons */
  LOG_FAILURE_REASONS: true,
} as const;
