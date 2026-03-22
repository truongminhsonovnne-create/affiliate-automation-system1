/**
 * Anti-Bot Scroll Utilities
 *
 * Provides human-like scrolling behavior to avoid detection.
 */

import { z } from 'zod';
import type { Page } from 'playwright';
import type {
  HumanLikeScrollOptions,
  HumanScrollResult,
  ScrollStoppedReason,
  AntiBotLogger,
} from './types.js';
import { SCROLL_DEFAULTS } from './constants.js';
import { randomBetween, randomDelay } from './delay.js';

// ============================================
// Validation Schemas
// ============================================

const scrollOptionsSchema = z.object({
  minStep: z.number().int().positive().optional(),
  maxStep: z.number().int().positive().optional(),
  minDelay: z.number().int().positive().optional(),
  maxDelay: z.number().int().positive().optional(),
  maxScrolls: z.number().int().positive().optional(),
  stopAtHeightPercent: z.number().min(0).max(1).optional(),
  targetSelector: z.string().optional(),
  targetY: z.number().int().optional(),
  enableReadingPause: z.boolean().optional(),
  readingPauseChance: z.number().min(0).max(1).optional(),
  readingPauseMin: z.number().int().positive().optional(),
  readingPauseMax: z.number().int().positive().optional(),
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
// Helper Functions (Browser-side)
// ============================================

/**
 * Get current scroll position and page metrics
 */
async function getScrollMetrics(page: Page): Promise<{
  scrollY: number;
  scrollHeight: number;
  viewportHeight: number;
  maxScroll: number;
}> {
  return page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
    maxScroll: Math.max(0, document.body.scrollHeight - window.innerHeight),
  }));
}

// ============================================
// Main Scroll Function
// ============================================

/**
 * Perform human-like scrolling on a page.
 *
 * Features:
 * - Random scroll distances
 * - Random delays between scrolls
 * - Early stop detection (height threshold, selector, target Y)
 * - Random reading pauses to simulate human behavior
 *
 * @param page - Playwright Page object
 * @param options - Configuration options
 * @returns HumanScrollResult with statistics
 *
 * @example
 * const result = await humanLikeScroll(page, {
 *   minStep: 300,
 *   maxStep: 600,
 *   maxScrolls: 20,
 *   verbose: true
 * });
 *
 * console.log(`Scrolled ${result.totalScrolls} times, ${result.totalDistance}px`);
 */
export async function humanLikeScroll(
  page: Page,
  options: HumanLikeScrollOptions = {}
): Promise<HumanScrollResult> {
  // Parse and validate options
  const opts = scrollOptionsSchema.parse(options);

  const logger = opts.logger;
  const startTime = Date.now();

  // Merge with defaults
  const config = {
    minStep: opts.minStep ?? SCROLL_DEFAULTS.MIN_STEP,
    maxStep: opts.maxStep ?? SCROLL_DEFAULTS.MAX_STEP,
    minDelay: opts.minDelay ?? SCROLL_DEFAULTS.MIN_DELAY,
    maxDelay: opts.maxDelay ?? SCROLL_DEFAULTS.MAX_DELAY,
    maxScrolls: opts.maxScrolls ?? SCROLL_DEFAULTS.MAX_SCROLLS,
    stopAtHeightPercent: opts.stopAtHeightPercent ?? SCROLL_DEFAULTS.STOP_AT_HEIGHT_PERCENT,
    enableReadingPause: opts.enableReadingPause ?? true,
    readingPauseChance: opts.readingPauseChance ?? SCROLL_DEFAULTS.READING_PAUSE_CHANCE,
    readingPauseMin: opts.readingPauseMin ?? SCROLL_DEFAULTS.READING_PAUSE_MIN,
    readingPauseMax: opts.readingPauseMax ?? SCROLL_DEFAULTS.READING_PAUSE_MAX,
  };

  let totalScrolls = 0;
  let totalDistance = 0;
  let stoppedReason: ScrollStoppedReason = 'max_scrolls';
  let readingPauseOccurred = false;

  // Initial scroll position
  const initialMetrics = await getScrollMetrics(page);
  const targetY = opts.targetY ?? initialMetrics.maxScroll * config.stopAtHeightPercent;

  if (opts.verbose && logger) {
    logger.info('Starting human-like scroll', {
      maxScrolls: config.maxScrolls,
      targetY: Math.round(targetY),
    });
  }

  try {
    for (let i = 0; i < config.maxScrolls; i++) {
      // Check abort signal
      if (opts.abortSignal?.aborted) {
        stoppedReason = 'aborted';
        break;
      }

      // Get current metrics
      const metrics = await getScrollMetrics(page);

      // Check if we've reached target Y position
      if (opts.targetY !== undefined && metrics.scrollY >= opts.targetY) {
        stoppedReason = 'target_y_reached';
        if (opts.verbose && logger) {
          logger.debug(`Target Y reached: ${metrics.scrollY} >= ${opts.targetY}`);
        }
        break;
      }

      // Check height threshold
      if (metrics.scrollY >= metrics.maxScroll * config.stopAtHeightPercent) {
        stoppedReason = 'height_threshold';
        if (opts.verbose && logger) {
          logger.debug(`Height threshold reached: ${Math.round((metrics.scrollY / metrics.maxScroll) * 100)}%`);
        }
        break;
      }

      // Check for target selector
      if (opts.targetSelector) {
        const element = await page.$(opts.targetSelector);
        if (element) {
          stoppedReason = 'target_selector_found';
          if (opts.verbose && logger) {
            logger.debug(`Target selector found: ${opts.targetSelector}`);
          }
          break;
        }
      }

      // Random scroll step
      const scrollStep = randomBetween(config.minStep, config.maxStep);
      const direction = Math.random() > 0.95 ? -1 : 1; // 5% chance to scroll up slightly
      const actualScroll = scrollStep * direction;

      // Perform scroll
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, actualScroll);

      totalScrolls++;
      totalDistance += Math.abs(actualScroll);

      if (opts.verbose && logger) {
        logger.debug(`Scroll #${totalScrolls}: ${actualScroll}px (total: ${totalDistance}px)`);
      }

      // Random reading pause (like human stopping to read content)
      if (config.enableReadingPause && Math.random() < config.readingPauseChance) {
        const readingDelay = randomBetween(config.readingPauseMin, config.readingPauseMax);
        await randomDelay(readingDelay, readingDelay, { label: 'reading-pause' });
        readingPauseOccurred = true;

        if (opts.verbose && logger) {
          logger.debug(`Reading pause: ${readingDelay}ms`);
        }
      }

      // Random delay between scrolls
      const delay = randomBetween(config.minDelay, config.maxDelay);
      await randomDelay(delay, delay);
    }

    // Check if we hit max scrolls
    if (totalScrolls >= config.maxScrolls) {
      stoppedReason = 'max_scrolls';
    }
  } catch (error) {
    if (logger) {
      logger.error('Scroll error', { error });
    }
    stoppedReason = 'error';
  }

  // Get final metrics
  const finalMetrics = await getScrollMetrics(page);
  const durationMs = Date.now() - startTime;

  const result: HumanScrollResult = {
    totalScrolls,
    totalDistance,
    durationMs,
    stoppedReason,
    finalPosition: finalMetrics.scrollY,
    readingPauseOccurred,
  };

  if (opts.verbose && logger) {
    logger.info('Human-like scroll completed', {
      totalScrolls: result.totalScrolls,
      totalDistance: result.totalDistance,
      durationMs: result.durationMs,
      stoppedReason: result.stoppedReason,
      readingPauseOccurred: result.readingPauseOccurred,
    });
  }

  return result;
}

/**
 * Scroll to a specific element
 *
 * @param page - Playwright Page
 * @param selector - CSS selector
 * @param options - Scroll options
 */
export async function scrollToElement(
  page: Page,
  selector: string,
  options: HumanLikeScrollOptions = {}
): Promise<boolean> {
  try {
    const element = await page.$(selector);
    if (!element) {
      return false;
    }

    // Scroll element into view with smooth behavior
    await element.scrollIntoViewIfNeeded();

    // Small delay after scroll
    await randomDelay(200, 500);

    return true;
  } catch (error) {
    if (options.logger) {
      options.logger.error('Failed to scroll to element', { selector, error });
    }
    return false;
  }
}

/**
 * Scroll to top of page
 */
export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

/**
 * Scroll to bottom of page
 */
export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
}
