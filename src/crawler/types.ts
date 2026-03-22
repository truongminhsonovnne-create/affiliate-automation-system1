/**
 * Crawler Foundation Layer - Types
 *
 * Shared types and interfaces for browser automation foundation.
 */

import type { Browser, BrowserContext, Page, BrowserContextOptions } from 'playwright';

// ============================================
// Browser Context Types
// ============================================

/**
 * Options for creating Shopee browser context
 */
export interface CreateShopeeBrowserContextOptions {
  /** Run browser in headless mode */
  headless?: boolean;

  /** Override default mobile profile */
  profileOverride?: Partial<ShopeeMobileProfile>;

  /** Override default timeout (ms) */
  timeoutOverride?: number;

  /** Network policy mode */
  networkPolicyMode?: NetworkPolicyMode;

  /** Enable debug logging */
  enableDebugLogging?: boolean;

  /** Slow down operations for debugging (ms) */
  slowMo?: number;

  /** Path to user data directory for persistent context */
  userDataDir?: string;

  /** Proxy configuration */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };

  /** Additional launch arguments */
  launchArgs?: string[];

  /** Path to browser executable */
  executablePath?: string;
}

/**
 * Result from browser context creation
 */
export interface CreateShopeeBrowserContextResult {
  /** Whether creation succeeded */
  ok: boolean;

  /** Browser instance */
  browser?: Browser;

  /** Browser context */
  context?: BrowserContext;

  /** Created profile info */
  profile?: ShopeeMobileProfile;

  /** Error message if failed */
  error?: string;

  /** Creation timestamp */
  createdAt: number;
}

// ============================================
// Page Preparation Types
// ============================================

/**
 * Options for preparing Shopee page
 */
export interface PrepareShopeePageOptions {
  /** Enable console logging */
  enableConsoleLogging?: boolean;

  /** Enable page error logging */
  enablePageErrorLogging?: boolean;

  /** Enable request failure logging */
  enableRequestFailureLogging?: boolean;

  /** Custom logger */
  logger?: CrawlerLogger;

  /** Network policy mode */
  networkPolicyMode?: NetworkPolicyMode;

  /** Page ready timeout (ms) */
  readyTimeout?: number;

  /** Additional init scripts to apply */
  additionalInitScripts?: string[];

  /** Skip network policy application */
  skipNetworkPolicy?: boolean;
}

/**
 * Result from page preparation
 */
export interface PrepareShopeePageResult {
  /** Whether preparation succeeded */
  ok: boolean;

  /** Prepared page */
  page?: Page;

  /** Event handlers registered */
  handlersRegistered: string[];

  /** Network policy applied */
  networkPolicyApplied: boolean;

  /** Page ready status */
  pageReady: boolean;

  /** Error message if failed */
  error?: string;

  /** Preparation timestamp */
  preparedAt: number;
}

// ============================================
// Page Verification Types
// ============================================

/**
 * Options for verifying page readiness
 */
export interface VerifyShopeePageReadyOptions {
  /** Verification timeout (ms) */
  timeout?: number;

  /** Custom logger */
  logger?: CrawlerLogger;

  /** Check DOM access */
  checkDomAccess?: boolean;

  /** Check browser values */
  checkBrowserValues?: boolean;
}

/**
 * Result from page verification
 */
export interface VerifyShopeePageReadyResult {
  /** Whether page is ready */
  ok: boolean;

  /** Whether page is closed */
  isClosed: boolean;

  /** Whether main frame is valid */
  isMainFrameValid: boolean;

  /** Whether DOM is accessible */
  isDomAccessible: boolean;

  /** Current URL */
  url: string;

  /** Document ready state */
  readyState: string;

  /** Verification errors if any */
  errors: string[];

  /** Verification timestamp */
  verifiedAt: number;
}

// ============================================
// Browser Profile Types
// ============================================

/**
 * Mobile browser profile for Shopee
 */
export interface ShopeeMobileProfile {
  /** User agent string */
  userAgent: string;

  /** Viewport dimensions */
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
  };

  /** Locale settings */
  locale: {
    locale: string;
    timezoneId: string;
    acceptLanguage: string;
  };

  /** Permissions to grant */
  permissions?: string[];

  /** Geolocation */
  geolocation?: {
    latitude: number;
    longitude: number;
  };

  /** Color scheme */
  colorScheme?: 'light' | 'dark' | 'no-preference';

  /** Profile name for logging */
  profileName: string;
}

/**
 * Browser health status
 */
export interface BrowserHealthStatus {
  /** Overall health status */
  healthy: boolean;

  /** Browser is connected */
  browserConnected: boolean;

  /** Context is valid */
  contextValid: boolean;

  /** Page count */
  pageCount: number;

  /** Warnings if any */
  warnings: string[];

  /** Checked at timestamp */
  checkedAt: number;
}

// ============================================
// Network Policy Types
// ============================================

/**
 * Network policy mode
 */
export type NetworkPolicyMode = 'default' | 'relaxed' | 'strict' | 'disabled';

/**
 * Options for network policy
 */
export interface NetworkPolicyOptions {
  /** Policy mode */
  mode?: NetworkPolicyMode;

  /** Enable logging for aborted requests */
  logAbortedRequests?: boolean;

  /** Custom blocked hostnames */
  blockedHostnames?: string[];

  /** Custom allowed hostnames */
  allowedHostnames?: string[];

  /** Block resource types */
  blockedResourceTypes?: string[];

  /** Custom logger */
  logger?: CrawlerLogger;
}

/**
 * Result from applying network policy
 */
export interface ApplyNetworkPolicyResult {
  /** Whether policy applied successfully */
  ok: boolean;

  /** Applied mode */
  appliedMode: NetworkPolicyMode;

  /** Number of handlers registered */
  handlersRegistered: number;

  /** Error if failed */
  error?: string;
}

// ============================================
// Logger Types
// ============================================

/**
 * Crawler logger interface
 */
export interface CrawlerLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// ============================================
// Init Script Types
// ============================================

/**
 * Init script definition
 */
export interface InitScript {
  /** Script name for logging */
  name: string;

  /** Script content */
  script: string;

  /** Whether script is enabled */
  enabled: boolean;

  /** Brief description */
  description: string;

  /** Risk level */
  riskLevel: 'safe' | 'moderate' | 'aggressive';
}

/**
 * Init scripts collection
 */
export interface InitScriptsCollection {
  /** All available scripts */
  scripts: InitScript[];

  /** Get enabled scripts only */
  getEnabled(): InitScript[];

  /** Get script by name */
  getByName(name: string): InitScript | undefined;
}
