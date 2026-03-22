/**
 * TikTok Shop Navigation Safety
 * Safe navigation handling with retry/backoff awareness
 */

import type { TikTokShopNavigationDecision, TikTokShopRuntimeSafetyProfile } from '../types.js';
import { TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

export interface TikTokShopNavigationAttempt {
  url: string;
  attemptNumber: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Safe navigate with safety checks
 */
export async function safeNavigateTikTokShopPage(
  page: any,
  url: string,
  options?: {
    timeout?: number;
    waitUntil?: string;
    retries?: number;
  }
): Promise<{
  success: boolean;
  error?: Error;
  duration: number;
}> {
  const startTime = Date.now();
  const timeout = options?.timeout || TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.NAVIGATION_TIMEOUT_MS;
  const maxRetries = options?.retries ?? TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.MAX_NAVIGATION_RETRIES;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug({ msg: 'Navigating to TikTok Shop page', url, attempt: attempt + 1 });

      await page.goto(url, {
        timeout,
        waitUntil: options?.waitUntil || 'domcontentloaded',
      });

      // Apply page load delay
      await applyTikTokShopNavigationDelays(page);

      const duration = Date.now() - startTime;

      logger.debug({ msg: 'Navigation successful', url, duration });

      return { success: true, duration };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logger.warn({
        msg: 'Navigation attempt failed',
        url,
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message,
      });

      // Wait before retry
      if (attempt < maxRetries) {
        const backoff = TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.NAVIGATION_BACKOFF_MS * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  const duration = Date.now() - startTime;

  logger.error({
    msg: 'Navigation failed after all retries',
    url,
    maxRetries,
    error: lastError?.message,
    duration,
  });

  return {
    success: false,
    error: lastError,
    duration,
  };
}

/**
 * Apply navigation delays for safe crawling
 */
export async function applyTikTokShopNavigationDelays(page: any): Promise<void> {
  // Wait for page to settle
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Ignore timeout
  });

  // Random delay to mimic human behavior
  const delay = TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.PAGE_LOAD_DELAY_MS;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Apply runtime throttling
 */
export async function applyTikTokShopRuntimeThrottling(
  lastRequestTime: number,
  safetyProfile: TikTokShopRuntimeSafetyProfile
): Promise<number> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Calculate required delay
  const requiredDelay = Math.max(
    safetyProfile.requestDelayMs - timeSinceLastRequest,
    TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.MIN_REQUEST_DELAY_MS
  );

  // Add small random jitter
  const jitter = Math.random() * 500;

  const totalDelay = Math.min(requiredDelay + jitter, TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.MAX_REQUEST_DELAY_MS);

  if (totalDelay > 0) {
    logger.debug({ msg: 'Applying throttling delay', delay: totalDelay });
    await new Promise((resolve) => setTimeout(resolve, totalDelay));
  }

  return totalDelay;
}

/**
 * Build navigation decision
 */
export function buildTikTokShopNavigationDecision(
  url: string,
  safetyProfile: TikTokShopRuntimeSafetyProfile,
  recentRequests: number,
  lastRequestTime: number
): TikTokShopNavigationDecision {
  const now = Date.now();

  // Check rate limit
  if (recentRequests >= safetyProfile.maxRequestsPerMinute) {
    return {
      shouldNavigate: false,
      delayMs: 60000,
      reason: 'Rate limit exceeded - max requests per minute reached',
    };
  }

  // Check time since last request
  if (lastRequestTime > 0) {
    const timeSinceLastRequest = now - lastRequestTime;
    const requiredDelay = safetyProfile.requestDelayMs;

    if (timeSinceLastRequest < requiredDelay) {
      const delayMs = requiredDelay - timeSinceLastRequest;
      return {
        shouldNavigate: true,
        delayMs,
        reason: 'Throttled to respect rate limits',
      };
    }
  }

  return {
    shouldNavigate: true,
    delayMs: 0,
    reason: 'Navigation allowed',
  };
}

/**
 * Build scroll-based navigation decision
 */
export async function safeScrollTikTokShopPage(
  page: any,
  options?: {
    maxScrolls?: number;
    scrollDelay?: number;
  }
): Promise<{
  success: boolean;
  scrolls: number;
  newContentLoaded: boolean;
}> {
  const maxScrolls = options?.maxScrolls || 5;
  const scrollDelay = options?.scrollDelay || TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.SCROLL_DELAY_MS;

  let scrolls = 0;
  let lastHeight = 0;

  try {
    // Get initial height
    lastHeight = await page.evaluate(() => document.body.scrollHeight);

    for (let i = 0; i < maxScrolls; i++) {
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Wait for content to load
      await new Promise((resolve) => setTimeout(resolve, scrollDelay));

      // Check if new content loaded
      const newHeight = await page.evaluate(() => document.body.scrollHeight);

      if (newHeight === lastHeight) {
        // No new content
        break;
      }

      lastHeight = newHeight;
      scrolls++;
    }

    return {
      success: true,
      scrolls,
      newContentLoaded: scrolls < maxScrolls,
    };
  } catch (error) {
    logger.error({ msg: 'Scroll failed', error: error instanceof Error ? error.message : 'Unknown' });

    return {
      success: false,
      scrolls,
      newContentLoaded: false,
    };
  }
}

/**
 * Detect anti-bot challenges
 */
export async function detectTikTokShopAntiBotChallenge(page: any): Promise<{
  detected: boolean;
  type?: string;
  message?: string;
}> {
  try {
    // Check for common anti-bot indicators
    const indicators = await page.evaluate(() => {
      const checks = [];

      // Check for CAPTCHA
      if (document.querySelector('.captcha, #captcha, [class*="captcha"]')) {
        checks.push('captcha');
      }

      // Check for rate limit messages
      if (document.body.innerText.includes('rate limit') || document.body.innerText.includes('too many requests')) {
        checks.push('rate_limit');
      }

      // Check for access denied
      if (document.body.innerText.includes('access denied') || document.body.innerText.includes('forbidden')) {
        checks.push('access_denied');
      }

      // Check for blocked
      if (document.body.innerText.includes('blocked') || document.body.innerText.includes('suspicious')) {
        checks.push('blocked');
      }

      return checks;
    });

    if (indicators.length > 0) {
      return {
        detected: true,
        type: indicators[0],
        message: `Anti-bot challenge detected: ${indicators.join(', ')}`,
      };
    }

    return { detected: false };
  } catch (error) {
    return {
      detected: true,
      type: 'detection_error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
