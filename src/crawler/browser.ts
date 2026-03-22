/**
 * Crawler Foundation Layer - Browser Context Management
 *
 * Hardened browser context creation with playwright-extra and stealth plugin.
 * Provides production-grade browser automation with mobile profile support.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { chromium as playwrightExtra } from 'playwright-extra';

import type {
  CreateShopeeBrowserContextOptions,
  CreateShopeeBrowserContextResult,
  ShopeeMobileProfile,
  BrowserHealthStatus,
  CrawlerLogger,
} from './types.js';
import {
  getShopeeMobileProfile,
  getContextOptionsFromProfile,
  validateProfile,
} from './browserProfile.js';
import { getEnabledInitScripts } from './initScripts.js';
import { TIMEOUT, BROWSER_ARGS, LOGGING } from './constants.js';

// ============================================
// Singleton State
// ============================================

let browserInstance: Browser | null = null;
let persistentContext: BrowserContext | null = null;

// ============================================
// Logger
// ============================================

function createCrawlerLogger(enableDebug: boolean = false): CrawlerLogger {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(`${LOGGING.PREFIX} ℹ️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(`${LOGGING.PREFIX} ⚠️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (enableDebug) {
        console.debug(`${LOGGING.PREFIX} 🔍 ${message}`, meta ? JSON.stringify(meta) : '');
      }
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      console.error(`${LOGGING.PREFIX} ❌ ${message}`, meta ? JSON.stringify(meta) : '');
    },
  };
}

// ============================================
// Stealth Plugin
// ============================================

let stealthInitialized = false;

function initStealth(logger?: CrawlerLogger): void {
  if (stealthInitialized) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stealth = require('puppeteer-extra-plugin-stealth');
    playwrightExtra.use(stealth());
    stealthInitialized = true;
    logger?.debug('Stealth plugin initialized');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger?.warn('Failed to initialize stealth plugin, continuing without it: ' + errMsg);
  }
}

// ============================================
// Main Functions
// ============================================

/**
 * Create a hardened Shopee browser context
 */
export async function createShopeeBrowserContext(
  options: CreateShopeeBrowserContextOptions = {}
): Promise<CreateShopeeBrowserContextResult> {
  const startTime = Date.now();
  const logger = createCrawlerLogger(options.enableDebugLogging);

  const profile = getShopeeMobileProfile(options.profileOverride);

  const validation = validateProfile(profile);
  if (!validation.valid) {
    logger.error('Invalid mobile profile', { errors: validation.errors });
    return {
      ok: false,
      error: `Invalid profile: ${validation.errors.join(', ')}`,
      createdAt: startTime,
    };
  }

  try {
    logger.info('Creating Shopee browser context', {
      profile: profile.profileName,
      headless: options.headless ?? true,
    });

    initStealth(logger);

    const launchArgs = [
      ...BROWSER_ARGS.ESSENTIAL,
      ...BROWSER_ARGS.STABILITY,
      ...BROWSER_ARGS.SECURITY,
      ...(options.launchArgs || []),
    ];

    const contextOptions = getContextOptionsFromProfile(profile);
    const initScripts = getEnabledInitScripts();

    const browser = await playwrightExtra.launch({
      headless: options.headless ?? true,
      args: launchArgs,
      slowMo: options.slowMo,
      executablePath: options.executablePath,
    });

    const context = await browser.newContext({
      ...contextOptions,
    });

    context.setDefaultTimeout(options.timeoutOverride ?? TIMEOUT.NAVIGATION);
    context.setDefaultNavigationTimeout(options.timeoutOverride ?? TIMEOUT.NAVIGATION);

    for (const { name, script } of initScripts) {
      await context.addInitScript(script);
      logger.debug(`Applied init script: ${name}`);
    }

    if (options.proxy) {
      await context.setProxy(options.proxy);
      logger.info('Proxy configured', { server: options.proxy.server });
    }

    const duration = Date.now() - startTime;
    logger.info('Browser context created successfully', {
      duration: `${duration}ms`,
      profile: profile.profileName,
    });

    return {
      ok: true,
      browser,
      context,
      profile,
      createdAt: startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create browser context', { error: errorMessage });

    return {
      ok: false,
      error: errorMessage,
      createdAt: startTime,
    };
  }
}

/**
 * Close Shopee browser context safely
 */
export async function closeShopeeBrowserContext(
  context?: BrowserContext,
  browser?: Browser
): Promise<void> {
  const logger = createCrawlerLogger();

  try {
    if (context) {
      await context.close();
      logger.info('Browser context closed');
    }

    if (browser) {
      await browser.close();
      logger.info('Browser closed');
    } else if (browserInstance && browserInstance.isConnected()) {
      await browserInstance.close();
      browserInstance = null;
      logger.info('Browser closed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error closing browser context', { error: errorMessage });
  }
}

/**
 * Create a new page in the given context
 */
export async function createShopeePage(
  context: BrowserContext
): Promise<{
  ok: boolean;
  page?: Page;
  error?: string;
}> {
  const logger = createCrawlerLogger();

  try {
    const page = await context.newPage();
    logger.debug('New page created in context');
    return { ok: true, page };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create page', { error: errorMessage });
    return { ok: false, error: errorMessage };
  }
}

/**
 * Check browser health status
 */
export async function checkBrowserHealth(
  browser: Browser,
  context?: BrowserContext
): Promise<BrowserHealthStatus> {
  const warnings: string[] = [];
  let browserConnected = false;
  let contextValid = false;
  let pageCount = 0;

  try {
    browserConnected = browser.isConnected();

    if (!browserConnected) {
      warnings.push('Browser is not connected');
    }

    if (context) {
      try {
        const pages = context.pages();
        contextValid = pages.length >= 0;
        pageCount = pages.length;
      } catch {
        contextValid = false;
        warnings.push('Context is not accessible');
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    warnings.push(`Health check error: ${errMsg}`);
  }

  return {
    healthy: browserConnected && (context ? contextValid : true),
    browserConnected,
    contextValid: context ? contextValid : true,
    pageCount,
    warnings,
    checkedAt: Date.now(),
  };
}

// ============================================
// Legacy Functions
// ============================================

export async function launchBrowser(options: CreateShopeeBrowserContextOptions = {}): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  const logger = createCrawlerLogger(options.enableDebugLogging);
  initStealth(logger);

  const profile = getShopeeMobileProfile(options.profileOverride);
  const launchArgs = [
    ...BROWSER_ARGS.ESSENTIAL,
    ...BROWSER_ARGS.STABILITY,
    ...BROWSER_ARGS.SECURITY,
    ...(options.launchArgs || []),
  ];

  browserInstance = await playwrightExtra.launch({
    headless: options.headless ?? true,
    args: launchArgs,
    slowMo: options.slowMo,
    executablePath: options.executablePath,
  });

  return browserInstance;
}

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    return launchBrowser();
  }
  return browserInstance;
}

export async function createBrowserContext(
  options: CreateShopeeBrowserContextOptions = {}
): Promise<BrowserContext> {
  const browser = await launchBrowser(options);
  const profile = getShopeeMobileProfile(options.profileOverride);
  const contextOptions = getContextOptionsFromProfile(profile);

  const context = await browser.newContext(contextOptions);
  context.setDefaultTimeout(options.timeoutOverride ?? TIMEOUT.NAVIGATION);

  return context;
}

export async function createShopeePersistentContext(
  options: CreateShopeeBrowserContextOptions = {}
): Promise<BrowserContext> {
  if (persistentContext) {
    try {
      const pages = persistentContext.pages();
      if (pages.length > 0) {
        const logger = createCrawlerLogger(options.enableDebugLogging);
        logger.debug('Reusing existing persistent context');
        return persistentContext;
      }
    } catch {
      // Continue to create new
    }
  }

  const logger = createCrawlerLogger(options.enableDebugLogging);
  logger.info({ userDataDir: options.userDataDir }, 'Creating persistent browser context...');

  const browser = await launchBrowser(options);
  const profile = getShopeeMobileProfile(options.profileOverride);
  const contextOptions = getContextOptionsFromProfile(profile);

  persistentContext = await browser.newContext({
    ...contextOptions,
  });

  persistentContext.setDefaultTimeout(options.timeoutOverride ?? TIMEOUT.NAVIGATION);

  logger.info('Persistent browser context created successfully');

  return persistentContext;
}

export async function closeBrowser(): Promise<void> {
  if (persistentContext) {
    await persistentContext.close().catch(() => {});
    persistentContext = null;
  }

  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }

  const logger = createCrawlerLogger();
  logger.info('Browser closed');
}

export function isBrowserConnected(): boolean {
  return browserInstance !== null && browserInstance.isConnected();
}

export function setupBrowserCleanup(): void {
  const logger = createCrawlerLogger();

  const cleanup = async () => {
    logger.info('Cleaning up browser...');
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

  logger.debug('Browser cleanup handlers registered');
}

// ============================================
// Types Export
// ============================================

export type {
  CreateShopeeBrowserContextOptions,
  CreateShopeeBrowserContextResult,
  ShopeeMobileProfile,
  BrowserHealthStatus,
  CrawlerLogger,
};
