/**
 * Crawler Foundation Layer - Public API
 *
 * Re-exports all public APIs from the crawler foundation modules.
 */

// ============================================
// Types
// ============================================

export type {
  // Browser Context
  CreateShopeeBrowserContextOptions,
  CreateShopeeBrowserContextResult,
  ShopeeMobileProfile,
  BrowserHealthStatus,

  // Page Preparation
  PrepareShopeePageOptions,
  PrepareShopeePageResult,
  VerifyShopeePageReadyOptions,
  VerifyShopeePageReadyResult,

  // Network Policy
  NetworkPolicyMode,
  NetworkPolicyOptions,
  ApplyNetworkPolicyResult,

  // Logger
  CrawlerLogger,

  // Init Scripts
  InitScript,
  InitScriptsCollection,
} from './types.js';

// ============================================
// Constants
// ============================================

export {
  TIMEOUT,
  RETRY,
  NAVIGATION,
  MOBILE_PROFILE,
  BROWSER_ARGS,
  RESOURCE_POLICY,
  HEALTH,
  LOGGING,
  EVENTS,
} from './constants.js';

// ============================================
// Browser Profile
// ============================================

export {
  getShopeeMobileProfile,
  getContextOptionsFromProfile,
  validateProfile,
} from './browserProfile.js';

// ============================================
// Init Scripts
// ============================================

export {
  getShopeeInitScripts,
  getEnabledInitScripts,
  getInitScriptByName,
  validateScriptSafety,
  getScriptsWithSafetyReport,
} from './initScripts.js';

// ============================================
// Network Policy
// ============================================

export {
  applyShopeeNetworkPolicy,
  removeNetworkPolicy,
  createNetworkPolicyOptions,
  getPolicyModeDescription,
  applyBasicResourceHandling,
} from './networkPolicy.js';

// ============================================
// Browser Management
// ============================================

export {
  createShopeeBrowserContext,
  closeShopeeBrowserContext,
  createShopeePage,
  checkBrowserHealth,

  // Legacy/Backwards Compatibility
  createBrowserContext,
  createShopeePersistentContext,
  getBrowser,
  closeBrowser,
  isBrowserConnected,
  setupBrowserCleanup,
} from './browser.js';

// ============================================
// Page Preparation
// ============================================

export {
  prepareShopeePage,
  registerShopeePageHandlers,
  verifyShopeePageReady,
  waitForPageStabilize,
  getPageMetadata,
} from './pagePreparation.js';
