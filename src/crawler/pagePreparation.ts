/**
 * Crawler Foundation Layer - Page Preparation
 *
 * Page-level preparation and event handler management.
 */

import type { Page, BrowserContext } from 'playwright';
import type {
  PrepareShopeePageOptions,
  PrepareShopeePageResult,
  VerifyShopeePageReadyOptions,
  VerifyShopeePageReadyResult,
  CrawlerLogger,
  NetworkPolicyMode,
} from './types.js';
import { applyShopeeNetworkPolicy } from './networkPolicy.js';
import { getEnabledInitScripts } from './initScripts.js';
import { TIMEOUT, EVENTS, LOGGING } from './constants.js';

/**
 * Default logger for page preparation
 */
function createDefaultLogger(): CrawlerLogger {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(`${LOGGING.PREFIX} ℹ️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(`${LOGGING.PREFIX} ⚠️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      console.debug(`${LOGGING.PREFIX} 🔍 ${message}`, meta ? JSON.stringify(meta) : '');
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      console.error(`${LOGGING.PREFIX} ❌ ${message}`, meta ? JSON.stringify(meta) : '');
    },
  };
}

/**
 * Prepare a Shopee page for crawling
 *
 * This function:
 * - Registers event handlers (console, pageerror, requestfailed)
 * - Applies network policy
 * - Applies page-level timeout
 * - Applies additional init scripts
 * - Verifies page readiness
 *
 * @param page - Playwright Page instance
 * @param options - Preparation options
 * @returns Preparation result
 *
 * @example
 * const result = await prepareShopeePage(page, {
 *   enableConsoleLogging: true,
 *   enablePageErrorLogging: true,
 *   networkPolicyMode: 'default',
 * });
 *
 * if (!result.ok) {
 *   console.error('Page preparation failed:', result.error);
 * }
 */
export async function prepareShopeePage(
  page: Page,
  options: PrepareShopeePageOptions = {}
): Promise<PrepareShopeePageResult> {
  const logger = options.logger ?? createDefaultLogger();
  const preparedAt = Date.now();
  const handlersRegistered: string[] = [];

  try {
    logger.info('Preparing Shopee page...');

    // 1. Register event handlers
    const handlersResult = await registerShopeePageHandlers(page, {
      enableConsoleLogging: options.enableConsoleLogging,
      enablePageErrorLogging: options.enablePageErrorLogging,
      enableRequestFailureLogging: options.enableRequestFailureLogging,
      logger,
    });

    handlersRegistered.push(...handlersResult.handlers);

    // 2. Apply network policy (if not skipped)
    let networkPolicyApplied = false;
    if (!options.skipNetworkPolicy) {
      const policyResult = await applyShopeeNetworkPolicy(page, {
        mode: options.networkPolicyMode ?? 'default',
        logger,
      });
      networkPolicyApplied = policyResult.ok;

      if (policyResult.ok) {
        logger.debug(`Network policy applied: ${policyResult.appliedMode}`);
      }
    }

    // 3. Apply additional init scripts if provided
    if (options.additionalInitScripts && options.additionalInitScripts.length > 0) {
      for (const script of options.additionalInitScripts) {
        await page.addInitScript(script);
      }
      logger.debug(`Applied ${options.additionalInitScripts.length} additional init scripts`);
    }

    // 4. Set page-level timeout
    const readyTimeout = options.readyTimeout ?? TIMEOUT.PAGE_READY;
    page.setDefaultTimeout(readyTimeout);

    // 5. Verify page readiness
    const verifyResult = await verifyShopeePageReady(page, {
      timeout: readyTimeout,
      logger,
      checkDomAccess: true,
      checkBrowserValues: true,
    });

    if (!verifyResult.ok) {
      logger.warn('Page verification had warnings', {
        errors: verifyResult.errors,
      });
    }

    const duration = Date.now() - preparedAt;
    logger.info('Page prepared successfully', {
      duration: `${duration}ms`,
      handlersRegistered: handlersRegistered.length,
      networkPolicyApplied,
      pageReady: verifyResult.ok,
    });

    return {
      ok: true,
      page,
      handlersRegistered,
      networkPolicyApplied,
      pageReady: verifyResult.ok,
      preparedAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Page preparation failed', { error: errorMessage });

    return {
      ok: false,
      page,
      handlersRegistered,
      networkPolicyApplied: false,
      pageReady: false,
      error: errorMessage,
      preparedAt,
    };
  }
}

/**
 * Register event handlers on a Shopee page
 *
 * Registers:
 * - Console message handler
 * - Page error handler
 * - Request failure handler
 *
 * @param page - Playwright Page instance
 * @param options - Handler options
 * @returns Registration result
 */
export async function registerShopeePageHandlers(
  page: Page,
  options: {
    enableConsoleLogging?: boolean;
    enablePageErrorLogging?: boolean;
    enableRequestFailureLogging?: boolean;
    logger?: CrawlerLogger;
  } = {}
): Promise<{
  ok: boolean;
  handlers: string[];
  error?: string;
}> {
  const logger = options.logger ?? createDefaultLogger();
  const handlers: string[] = [];

  try {
    // Console handler
    if (options.enableConsoleLogging) {
      page.on('console', (msg) => {
        const type = msg.type();
        if (EVENTS.LOG_CONSOLE_TYPES.includes(type as typeof EVENTS.LOG_CONSOLE_TYPES[number])) {
          const text = msg.text();
          // Truncate long messages
          const truncated = text.length > LOGGING.MAX_MESSAGE_LENGTH
            ? text.substring(0, LOGGING.MAX_MESSAGE_LENGTH) + '...'
            : text;

          switch (type) {
            case 'error':
              logger.error(`[Console] ${truncated}`);
              break;
            case 'warn':
              logger.warn(`[Console] ${truncated}`);
              break;
            default:
              logger.debug(`[Console:${type}] ${truncated}`);
          }
        }
      });
      handlers.push('console');
    }

    // Page error handler
    if (options.enablePageErrorLogging !== false) {
      page.on('pageerror', (error) => {
        logger.error('[PageError]', {
          message: error.message,
          stack: error.stack,
        });
      });
      handlers.push('pageerror');
    }

    // Request failure handler
    if (options.enableRequestFailureLogging !== false) {
      page.on('requestfailed', (request) => {
        const failure = request.failure();
        if (failure) {
          logger.warn('[RequestFailed]', {
            url: request.url(),
            method: request.method(),
            errorText: failure.errorText,
          });
        }
      });
      handlers.push('requestfailed');
    }

    // Response handler for debugging (optional)
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        logger.warn(`[HTTP ${status}] ${response.url()}`, {
          status,
          headers: response.headers(),
        });
      }
    });

    if (options.enableRequestFailureLogging !== false) {
      handlers.push('response');
    }

    logger.debug(`Registered ${handlers.length} event handlers`);

    return {
      ok: true,
      handlers,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to register page handlers', { error: errorMessage });

    return {
      ok: false,
      handlers,
      error: errorMessage,
    };
  }
}

/**
 * Verify that a page is ready for crawling
 *
 * Checks:
 * - Page is not closed
 * - Main frame is valid
 * - DOM is accessible
 * - URL is valid
 * - Document readyState is complete/interactive
 *
 * @param page - Playwright Page instance
 * @param options - Verification options
 * @returns Verification result
 */
export async function verifyShopeePageReady(
  page: Page,
  options: VerifyShopeePageReadyOptions = {}
): Promise<VerifyShopeePageReadyResult> {
  const logger = options.logger ?? createDefaultLogger();
  const timeout = options.timeout ?? TIMEOUT.PAGE_READY;
  const errors: string[] = [];

  try {
    // 1. Check if page is closed
    if (page.isClosed()) {
      errors.push('Page is closed');
      return {
        ok: false,
        isClosed: true,
        isMainFrameValid: false,
        isDomAccessible: false,
        url: '',
        readyState: 'closed',
        errors,
        verifiedAt: Date.now(),
      };
    }

    // 2. Get basic page info
    const url = page.url();
    let readyState = 'unknown';
    let isMainFrameValid = false;
    let isDomAccessible = false;

    // 3. Check browser-side values
    if (options.checkBrowserValues !== false) {
      try {
        const browserValues = await page.evaluate(() => {
          return {
            readyState: document.readyState,
            bodyLength: document.body?.innerHTML?.length ?? 0,
            title: document.title,
          };
        });

        readyState = browserValues.readyState;
        isMainFrameValid = true;
        isDomAccessible = browserValues.bodyLength > 0;

        if (browserValues.bodyLength < 100) {
          errors.push(`DOM appears empty (length: ${browserValues.bodyLength})`);
        }
      } catch (evalError) {
        errors.push(`DOM evaluation failed: ${evalError instanceof Error ? evalError.message : String(evalError)}`);
        isDomAccessible = false;
      }
    }

    // 4. Validate URL
    if (!url || url === 'about:blank' || url.startsWith('chrome://')) {
      errors.push('Invalid or empty URL');
    }

    // 5. Check readyState
    if (readyState !== 'complete' && readyState !== 'interactive') {
      errors.push(`Document readyState is "${readyState}", expected "complete" or "interactive"`);
    }

    // 6. Verify with timeout
    const verifyOk = errors.length === 0;

    if (verifyOk) {
      logger.debug('Page verification passed', { url, readyState });
    } else {
      logger.warn('Page verification had issues', { errors });
    }

    return {
      ok: verifyOk,
      isClosed: false,
      isMainFrameValid,
      isDomAccessible,
      url,
      readyState,
      errors,
      verifiedAt: Date.now(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Page verification failed', { error: errorMessage });

    return {
      ok: false,
      isClosed: page.isClosed(),
      isMainFrameValid: false,
      isDomAccessible: false,
      url: page.url(),
      readyState: 'error',
      errors: [errorMessage],
      verifiedAt: Date.now(),
    };
  }
}

/**
 * Wait for page to stabilize after navigation
 *
 * @param page - Playwright Page instance
 * @param options - Wait options
 */
export async function waitForPageStabilize(
  page: Page,
  options: {
    waitForNetworkIdle?: boolean;
    waitForDomReady?: boolean;
    timeout?: number;
    logger?: CrawlerLogger;
  } = {}
): Promise<{ ok: boolean; error?: string }> {
  const logger = options.logger ?? createDefaultLogger();
  const timeout = options.timeout ?? TIMEOUT.POST_CREATE_STABILIZE;

  try {
    if (options.waitForNetworkIdle !== false) {
      await page.waitForLoadState('networkidle', { timeout });
    }

    if (options.waitForDomReady !== false) {
      await page.waitForFunction(() => document.readyState === 'complete', { timeout });
    }

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Page stabilization timeout', { error: errorMessage });
    return { ok: false, error: errorMessage };
  }
}

/**
 * Remove all event handlers from a page
 *
 * @param page - Playwright Page instance
 */
export async function removePageHandlers(page: Page): Promise<void> {
  // Playwright doesn't have a direct way to remove handlers,
  // but we can create a new page and replace the old one
  // This is mainly for cleanup purposes
  // Note: This doesn't actually remove handlers, it's a no-op in Playwright
  // Handlers are automatically removed when page is closed
}

/**
 * Get page metadata
 *
 * @param page - Playwright Page instance
 */
export async function getPageMetadata(page: Page): Promise<{
  url: string;
  title: string;
  closed: boolean;
  mainFrameId: string | null;
}> {
  return {
    url: page.url(),
    title: await page.title(),
    closed: page.isClosed(),
    mainFrameId: page.mainFrame()._guid,
  };
}
