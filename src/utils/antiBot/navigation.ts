/**
 * Anti-Bot Navigation Utilities
 *
 * Provides safe navigation with retry logic, error detection, and human-like delays.
 */

import { z } from 'zod';
import type { Page } from 'playwright';
import type {
  SafeNavigateOptions,
  SafeNavigateResult,
  AntiBotLogger,
  AbortSignalLike,
} from './types.js';
import { NAVIGATION_DEFAULTS } from './constants.js';
import { randomBetween, randomDelay } from './delay.js';

// ============================================
// Validation Schemas
// ============================================

const navigationOptionsSchema = z.object({
  maxRetries: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional(),
  preDelay: z.number().int().positive().optional(),
  postDelay: z.number().int().positive().optional(),
  retryOnFailure: z.boolean().optional(),
  headers: z.record(z.string()).optional(),
  logger: z.object({
    info: z.function(),
    warn: z.function(),
    debug: z.function(),
    error: z.function(),
  }).optional(),
  abortSignal: z.object({
    aborted: z.boolean(),
    addEventListener: z.function(),
    removeEventListener: z.function(),
  }).nullable().optional(),
  verbose: z.boolean().optional(),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Check if error is a navigation error that should trigger retry
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error);

  const retryablePatterns = [
    'timeout',
    'net::err_',
    'failed to load',
    'navigation',
    'connection',
    'econnrefused',
    'ehostunreach',
    'enetunreach',
    'dns',
    'temporary failure',
    'no internet',
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Check if page has detected bot
 */
async function detectBotDetection(page: Page): Promise<boolean> {
  try {
    const hasBotIndicators = await page.evaluate(() => {
      // Check for common bot detection indicators
      const indicators = [
        // CAPTCHA elements
        document.querySelector('.g-recaptcha, #recaptcha, [data-sitekey]'),
        // Bot detection messages
        ...Array.from(document.querySelectorAll('*')).filter(el =>
          el.textContent && (
            el.textContent.toLowerCase().includes('robot') ||
            el.textContent.toLowerCase().includes('automated') ||
            el.textContent.toLowerCase().includes('suspicious activity') ||
            el.textContent.toLowerCase().includes('blocked') ||
            el.textContent.toLowerCase().includes('verification required')
          )
        ),
      ];
      return indicators.some(Boolean);
    });

    return hasBotIndicators;
  } catch {
    return false;
  }
}

/**
 * Check if page loaded successfully (no critical errors)
 */
async function isPageHealthy(page: Page): Promise<boolean> {
  try {
    const status = page.url();

    // Check for error URLs
    if (status.includes('error') || status.includes('blocked')) {
      return false;
    }

    // Check for critical console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for console errors to appear
    await page.waitForTimeout(500);

    const criticalErrors = consoleErrors.filter(err =>
      err.includes('net::ERR_') ||
      err.includes('Failed to load')
    );

    return criticalErrors.length === 0;
  } catch {
    return false;
  }
}

// ============================================
// Main Navigation Function
// ============================================

/**
 * Safely navigate to a URL with retry logic and human-like behavior.
 *
 * Features:
 * - Automatic retry on failure
 * - Pre/post navigation delays
 * - Bot detection handling
 * - Abort signal support
 * - Detailed result reporting
 *
 * @param page - Playwright Page object
 * @param url - Target URL
 * @param options - Navigation options
 * @returns SafeNavigateResult with navigation details
 *
 * @example
 * const result = await safeNavigate(page, 'https://shopee.vn', {
 *   maxRetries: 3,
 *   timeout: 30000,
 *   verbose: true
 * });
 *
 * if (result.ok) {
 *   console.log(`Navigated to ${result.finalUrl}`);
 * }
 */
export async function safeNavigate(
  page: Page,
  url: string,
  options: SafeNavigateOptions = {}
): Promise<SafeNavigateResult> {
  // Parse and validate options
  const opts = navigationOptionsSchema.parse(options);

  const logger = opts.logger;
  const startTime = Date.now();

  // Merge with defaults
  const config = {
    maxRetries: opts.maxRetries ?? NAVIGATION_DEFAULTS.MAX_RETRIES,
    timeout: opts.timeout ?? NAVIGATION_DEFAULTS.TIMEOUT,
    waitUntil: opts.waitUntil ?? NAVIGATION_DEFAULTS.WAIT_UNTIL,
    preDelayMin: NAVIGATION_DEFAULTS.PRE_DELAY_MIN,
    preDelayMax: NAVIGATION_DEFAULTS.PRE_DELAY_MAX,
    postDelayMin: NAVIGATION_DEFAULTS.POST_DELAY_MIN,
    postDelayMax: NAVIGATION_DEFAULTS.POST_DELAY_MAX,
    retryOnFailure: opts.retryOnFailure ?? true,
  };

  let attempts = 0;
  let lastError: string | undefined;
  let finalUrl = '';

  if (opts.verbose && logger) {
    logger.info('Starting safe navigation', {
      url,
      maxRetries: config.maxRetries,
      timeout: config.timeout,
    });
  }

  while (attempts < config.maxRetries) {
    attempts++;

    // Check abort signal
    if (opts.abortSignal?.aborted) {
      return {
        ok: false,
        finalUrl: page.url(),
        attempts,
        durationMs: Date.now() - startTime,
        error: 'Navigation aborted',
        aborted: true,
      };
    }

    if (opts.verbose && logger) {
      logger.debug(`Navigation attempt ${attempts}/${config.maxRetries}`);
    }

    try {
      // Pre-navigation delay (human-like)
      if (opts.preDelay) {
        await randomDelay(opts.preDelay, opts.preDelay);
      } else if (attempts === 1) {
        const preDelay = randomBetween(config.preDelayMin, config.preDelayMax);
        await randomDelay(preDelay, preDelay, { label: 'pre-navigation' });
      }

      // Check abort before navigation
      if (opts.abortSignal?.aborted) {
        return {
          ok: false,
          finalUrl: page.url(),
          attempts,
          durationMs: Date.now() - startTime,
          error: 'Navigation aborted',
          aborted: true,
        };
      }

      // Perform navigation
      const navigationPromise = page.goto(url, {
        timeout: config.timeout,
        waitUntil: config.waitUntil,
        ...(opts.headers ? { headers: opts.headers } : {}),
      });

      // Wait for navigation with abort support
      let response;
      if (opts.abortSignal) {
        response = await Promise.race([
          navigationPromise,
          new Promise<never>((_, reject) => {
            const checkAbort = setInterval(() => {
              if (opts.abortSignal?.aborted) {
                clearInterval(checkAbort);
                reject(new Error('Aborted'));
              }
            }, 100);
          }),
        ]);
      } else {
        response = await navigationPromise;
      }

      finalUrl = page.url();

      // Check HTTP status
      if (response) {
        const status = response.status();

        // Handle HTTP errors
        if (status >= 400) {
          if (status === 403 || status === 429) {
            // Bot detection likely
            if (logger) {
              logger.warn(`HTTP ${status} - potential bot detection`, { url });
            }

            if (attempts < config.maxRetries && config.retryOnFailure) {
              const backoffDelay = Math.min(1000 * Math.pow(2, attempts), 10000);
              await randomDelay(backoffDelay, backoffDelay + 1000, {
                label: 'rate-limit-backoff'
              });
              continue;
            }

            return {
              ok: false,
              finalUrl,
              status,
              attempts,
              durationMs: Date.now() - startTime,
              error: `HTTP ${status} - Access forbidden or rate limited`,
              aborted: false,
            };
          }

          if (status >= 500) {
            // Server error - retry
            if (attempts < config.maxRetries && config.retryOnFailure) {
              const backoffDelay = randomBetween(1000, 3000);
              await randomDelay(backoffDelay, backoffDelay + 1000, {
                label: 'server-error-backoff'
              });
              continue;
            }

            return {
              ok: false,
              finalUrl,
              status,
              attempts,
              durationMs: Date.now() - startTime,
              error: `HTTP ${status} - Server error`,
              aborted: false,
            };
          }
        }
      }

      // Check for bot detection on page
      const botDetected = await detectBotDetection(page);
      if (botDetected) {
        if (logger) {
          logger.warn('Bot detection indicators found on page');
        }

        if (attempts < config.maxRetries && config.retryOnFailure) {
          const backoffDelay = randomBetween(2000, 5000);
          await randomDelay(backoffDelay, backoffDelay + 2000, {
            label: 'bot-detection-backoff'
          });
          continue;
        }

        return {
          ok: false,
          finalUrl,
          attempts,
          durationMs: Date.now() - startTime,
          error: 'Bot detection triggered',
          aborted: false,
        };
      }

      // Check page health
      const isHealthy = await isPageHealthy(page);
      if (!isHealthy) {
        if (logger) {
          logger.warn('Page health check failed');
        }

        if (attempts < config.maxRetries && config.retryOnFailure) {
          continue;
        }

        return {
          ok: false,
          finalUrl,
          attempts,
          durationMs: Date.now() - startTime,
          error: 'Page health check failed',
          aborted: false,
        };
      }

      // Post-navigation delay (human-like)
      if (opts.postDelay) {
        await randomDelay(opts.postDelay, opts.postDelay);
      } else {
        const postDelay = randomBetween(config.postDelayMin, config.postDelayMax);
        await randomDelay(postDelay, postDelay, { label: 'post-navigation' });
      }

      // Success!
      if (opts.verbose && logger) {
        logger.info('Navigation successful', {
          url: finalUrl,
          attempts,
          status: response?.status(),
        });
      }

      return {
        ok: true,
        finalUrl,
        status: response?.status(),
        attempts,
        durationMs: Date.now() - startTime,
        aborted: false,
      };

    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (logger) {
        logger.error(`Navigation attempt ${attempts} failed`, {
          error: lastError,
          retryable: isRetryableError(error),
        });
      }

      // Check if should retry
      if (attempts < config.maxRetries && config.retryOnFailure && isRetryableError(error)) {
        const backoffDelay = randomBetween(1000, 3000);
        await randomDelay(backoffDelay, backoffDelay + 1000, {
          label: 'error-backoff'
        });
        continue;
      }

      // Max retries or non-retryable error
      return {
        ok: false,
        finalUrl: page.url(),
        attempts,
        durationMs: Date.now() - startTime,
        error: lastError,
        aborted: false,
      };
    }
  }

  // Should not reach here, but handle gracefully
  return {
    ok: false,
    finalUrl: page.url(),
    attempts,
    durationMs: Date.now() - startTime,
    error: lastError ?? 'Max retries exceeded',
    aborted: false,
  };
}

/**
 * Navigate and wait for specific element to be visible
 *
 * @param page - Playwright Page
 * @param url - Target URL
 * @param selector - Selector to wait for
 * @param options - Navigation options
 */
export async function safeNavigateAndWait(
  page: Page,
  url: string,
  selector: string,
  options: SafeNavigateOptions & { waitTimeout?: number } = {}
): Promise<SafeNavigateResult & { elementFound: boolean }> {
  const navResult = await safeNavigate(page, url, options);

  if (!navResult.ok) {
    return { ...navResult, elementFound: false };
  }

  try {
    const element = await page.waitForSelector(selector, {
      timeout: options.waitTimeout ?? 10000,
    });

    return { ...navResult, elementFound: !!element };
  } catch {
    return { ...navResult, elementFound: false };
  }
}

/**
 * Refresh page with retry logic
 *
 * @param page - Playwright Page
 * @param options - Navigation options
 */
export async function safeRefresh(
  page: Page,
  options: SafeNavigateOptions = {}
): Promise<SafeNavigateResult> {
  const logger = options.logger;
  const startTime = Date.now();

  try {
    // Pre-refresh delay
    const preDelay = randomBetween(500, 1500);
    await randomDelay(preDelay, preDelay);

    // Check abort
    if (options.abortSignal?.aborted) {
      return {
        ok: false,
        finalUrl: page.url(),
        attempts: 1,
        durationMs: Date.now() - startTime,
        error: 'Refresh aborted',
        aborted: true,
      };
    }

    // Perform refresh
    const response = await page.reload({
      timeout: options.timeout ?? NAVIGATION_DEFAULTS.TIMEOUT,
      waitUntil: options.waitUntil ?? NAVIGATION_DEFAULTS.WAIT_UNTIL,
    });

    // Post-refresh delay
    const postDelay = randomBetween(500, 1500);
    await randomDelay(postDelay, postDelay);

    if (options.verbose && logger) {
      logger.info('Page refreshed', {
        url: page.url(),
        status: response?.status()
      });
    }

    return {
      ok: true,
      finalUrl: page.url(),
      status: response?.status(),
      attempts: 1,
      durationMs: Date.now() - startTime,
      aborted: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (logger) {
      logger.error('Page refresh failed', { error: errorMessage });
    }

    return {
      ok: false,
      finalUrl: page.url(),
      attempts: 1,
      durationMs: Date.now() - startTime,
      error: errorMessage,
      aborted: false,
    };
  }
}
