// Browser & Crawler
export const BROWSER_CONFIG = {
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  ],
  VIEWPORT: {
    width: 1920,
    height: 1080,
  },
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
} as const;

// Delays
export const DELAY_CONFIG = {
  MIN_PAGE_LOAD: 2000,
  MAX_PAGE_LOAD: 5000,
  MIN_ACTION: 500,
  MAX_ACTION: 1500,
  SCROLL_PAUSE: 1000,
  RATE_LIMIT_DELAY: 3000,
} as const;

// Shopee Selectors
export const SHOPEE_SELECTORS = {
  PRODUCT_CARD: '[data-sqe="product"]',
  PRODUCT_TITLE: '.ie3A+ b',
  PRODUCT_PRICE: '.a2Kyf',
  PRODUCT_IMAGE: 'img._1T5dN',
  PRODUCT_LINK: '.x5GTyc',
  SEARCH_BAR: 'input[placeholder="Tìm trên Shopee"]',
  LOAD_MORE_BUTTON: '.shopee-icon-button',
} as const;

// Database
export const DB_CONFIG = {
  TABLE_NAME: 'affiliate_products',
  SCHEMA: 'public',
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// AI
export const AI_CONFIG = {
  MODEL_NAME: 'gemini-2.0-flash',
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2048,
  TOP_P: 0.95,
  TOP_K: 40,
} as const;

// Status
export const PRODUCT_STATUS = {
  PENDING: 'pending',
  ANALYZING: 'analyzing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ERROR: 'error',
} as const;

// Affiliate Platforms
export const AFFILIATE_PLATFORMS = {
  SHOPEE: 'shopee',
  TIKE: 'tiki',
  LAZADA: 'lazada',
} as const;
