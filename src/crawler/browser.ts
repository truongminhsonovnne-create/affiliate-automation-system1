/**
 * Browser Factory for Shopee Crawler
 *
 * Provides Playwright browser with stealth configuration
 * using persistent context for session persistence.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { chromium as playwrightExtra } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { env } from '../config/env.js';
import { log } from '../utils/logger.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Browser configuration options
 */
export interface BrowserOptions {
  /** Run browser in headless mode (default: from env or true) */
  headless?: boolean;

  /** Browser user data dir for persistent session */
  userDataDir?: string;

  /** Custom user agent (default: from env) */
  userAgent?: string;

  /** Browser timeout in ms (default: 30000) */
  timeout?: number;

  /** Enable stealth mode (default: true) */
  stealth?: boolean;

  /** Show browser devtools (default: false) */
  devtools?: boolean;
}

/**
 * Mobile viewport configuration for Shopee mobile
 */
export const MOBILE_VIEWPORT = {
  width: 375,  // iPhone width
  height: 812, // iPhone height
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
} as const;

/**
 * Desktop viewport configuration
 */
export const DESKTOP_VIEWPORT = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
} as const;

/**
 * Default launch arguments for stealth
 */
const DEFAULT_LAUNCH_ARGS = [
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
];

// ============================================
// Singleton Instances
// ============================================

let browserInstance: Browser | null = null;
let persistentContext: BrowserContext | null = null;

// ============================================
// Core Functions
// ============================================

/**
 * Initialize stealth plugin with playwright-extra
 */
function initStealth(): void {
  try {
    playwrightExtra.use(stealth());
    log.debug('Stealth plugin initialized');
  } catch (error) {
    log.warn({ error }, 'Failed to initialize stealth plugin, continuing without it');
  }
}

/**
 * Get browser launch options based on environment
 */
function getLaunchOptions(options: BrowserOptions = {}): {
  headless: boolean;
  args: string[];
  devtools: boolean;
} {
  const headless = options.headless ?? env.BROWSER_HEADLESS ?? true;
  const devtools = options.devtools ?? false;

  return {
    headless,
    args: DEFAULT_LAUNCH_ARGS,
    devtools,
  };
}

/**
 * Get persistent context options for Shopee mobile
 */
function getContextOptions(options: BrowserOptions = {}): {
  userAgent: string;
  viewport: typeof MOBILE_VIEWPORT;
  locale: string;
  timezoneId: string;
  permissions: string[];
  extraHTTPHeaders: Record<string, string>;
  storageState?: string;
} {
  const userAgent = options.userAgent || env.SHOPEE_MOBILE_USER_AGENT;
  const userDataDir = options.userDataDir || env.SHOPEE_USER_DATA_DIR;

  return {
    userAgent,
    viewport: MOBILE_VIEWPORT,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    // Keep session storage if userDataDir is provided
    ...(userDataDir && { storageState: undefined }),
  };
}

/**
 * Launch browser with stealth mode
 */
async function launchBrowser(options: BrowserOptions = {}): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  const launchOptions = getLaunchOptions(options);

  log.info(
    {
      headless: launchOptions.headless,
      userDataDir: options.userDataDir || env.SHOPEE_USER_DATA_DIR,
    },
    'Launching browser...'
  );

  try {
    // Initialize stealth
    initStealth();

    // Launch with playwright-extra
    browserInstance = await playwrightExtra.launch({
      headless: launchOptions.headless,
      args: launchOptions.args,
      devtools: launchOptions.devtools,
      // Use userDataDir for persistent session
      userDataDir: options.userDataDir || env.SHOPEE_USER_DATA_DIR,
    });

    log.info('Browser launched successfully');

    return browserInstance;
  } catch (error) {
    log.error({ error }, 'Failed to launch browser');
    throw error;
  }
}

/**
 * Create a new browser context (non-persistent)
 */
export async function createBrowserContext(options: BrowserOptions = {}): Promise<BrowserContext> {
  const browser = await launchBrowser(options);
  const contextOptions = getContextOptions(options);

  const context = await browser.newContext(contextOptions);

  // Set default timeout
  const timeout = options.timeout || env.BROWSER_TIMEOUT || 30000;
  context.setDefaultTimeout(timeout);

  log.debug({ userAgent: contextOptions.userAgent }, 'Created new browser context');

  return context;
}

/**
 * Create persistent context for Shopee with session persistence
 * This allows login state to be maintained across restarts
 */
export async function createShopeeBrowserContext(
  options: BrowserOptions = {}
): Promise<BrowserContext> {
  const userDataDir = options.userDataDir || env.SHOPEE_USER_DATA_DIR;

  if (!userDataDir) {
    log.warn('SHOPEE_USER_DATA_DIR not set, using non-persistent context');
    return createBrowserContext(options);
  }

  // If we already have a persistent context, return it
  if (persistentContext && persistentContext.pages().length > 0) {
    log.debug('Reusing existing persistent context');
    return persistentContext;
  }

  log.info({ userDataDir }, 'Creating persistent browser context...');

  try {
    const browser = await launchBrowser(options);
    const contextOptions = getContextOptions(options);

    // Create persistent context
    persistentContext = await browser.launchPersistentContext(userDataDir, {
      ...contextOptions,
      headless: options.headless ?? env.BROWSER_HEADLESS ?? true,
      // Persist session data
      args: [
        ...DEFAULT_LAUNCH_ARGS,
        `--user-data-dir=${userDataDir}`,
      ],
    });

    // Set default timeout
    const timeout = options.timeout || env.BROWSER_TIMEOUT || 30000;
    persistentContext.setDefaultTimeout(timeout);

    log.info('Persistent browser context created successfully');

    return persistentContext;
  } catch (error) {
    log.error({ error, userDataDir }, 'Failed to create persistent context');
    throw error;
  }
}

/**
 * Create a new page in the persistent context
 */
export async function createShopeePage(options: BrowserOptions = {}): Promise<Page> {
  const context = await createShopeeBrowserContext(options);
  const page = await context.newPage();

  log.debug('Created new page in persistent context');

  return page;
}

/**
 * Get the current browser instance
 */
export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    return launchBrowser();
  }
  return browserInstance;
}

/**
 * Get all open pages
 */
export async function getPages(): Promise<Page[]> {
  const context = persistentContext;
  if (!context) return [];

  return context.pages();
}

/**
 * Close a specific context
 */
export async function closeContext(context: BrowserContext): Promise<void> {
  await context.close();
  log.debug('Browser context closed');
}

/**
 * Close all browser instances and contexts
 */
export async function closeBrowser(): Promise<void> {
  if (persistentContext) {
    await persistentContext.close().catch(() => {});
    persistentContext = null;
  }

  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }

  log.info('Browser closed');
}

/**
 * Setup cleanup handlers for process exit
 */
export function setupBrowserCleanup(): void {
  const cleanup = async () => {
    log.info('Cleaning up browser...');
    await closeBrowser();
  };

  process.on('beforeExit', cleanup);
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  log.debug('Browser cleanup handlers registered');
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if browser is running
 */
export function isBrowserConnected(): boolean {
  return browserInstance !== null && browserInstance.isConnected();
}

/**
 * Get browser version
 */
export async function getBrowserVersion(): Promise<string> {
  const browser = await getBrowser();
  return browser.version();
}

/**
 * Clear all cookies in context
 */
export async function clearCookies(context: BrowserContext): Promise<void> {
  await context.clearCookies();
  log.debug('Cookies cleared');
}

/**
 * Clear all storage (cookies, localStorage, sessionStorage)
 */
export async function clearStorage(context: BrowserContext): Promise<void> {
  const pages = context.pages();
  for (const page of pages) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
  await context.clearCookies();
  log.debug('Storage cleared');
}

// ============================================
// Export
// ============================================

export {
  Browser,
  BrowserContext,
  Page,
  MOBILE_VIEWPORT,
  DESKTOP_VIEWPORT,
  createBrowserContext,
  createShopeeBrowserContext,
  createShopeePage,
  getBrowser,
  closeBrowser,
  setupBrowserCleanup,
};
