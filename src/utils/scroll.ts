/**
 * Scroll Utilities for Playwright
 *
 * Provides human-like scrolling behavior to avoid detection
 * when automating mobile Shopee and other e-commerce sites.
 */

import { Page } from 'playwright';
import { randomBetween, sleep } from './delay.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Options for human-like scrolling
 */
export interface HumanLikeScrollOptions {
  /** Minimum scroll step in pixels (default: 200) */
  minStep?: number;

  /** Maximum scroll step in pixels (default: 500) */
  maxStep?: number;

  /** Minimum delay between scrolls in ms (default: 300) */
  minDelay?: number;

  /** Maximum delay between scrolls in ms (default: 800) */
  maxDelay?: number;

  /** Maximum number of scroll actions (default: 30) */
  maxScrolls?: number;

  /** Stop when reaching this percentage of page height (default: 0.95) */
  stopAtHeightPercent?: number;

  /** Enable random stop to simulate human behavior (default: true) */
  randomStop?: boolean;

  /** Probability of random stop (default: 0.1) */
  randomStopChance?: number;

  /** Log scroll actions to console (default: false) */
  verbose?: boolean;
}

/**
 * Result of human-like scroll operation
 */
export interface ScrollResult {
  /** Total number of scroll actions performed */
  scrollCount: number;

  /** Total distance scrolled in pixels */
  totalDistance: number;

  /** Whether scrolling stopped early due to reaching bottom */
  stoppedEarly: boolean;

  /** Final scroll position */
  finalPosition: number;
}

/**
 * Default options for human-like scroll
 */
const DEFAULT_SCROLL_OPTIONS: Required<HumanLikeScrollOptions> = {
  minStep: 200,
  maxStep: 500,
  minDelay: 300,
  maxDelay: 800,
  maxScrolls: 30,
  stopAtHeightPercent: 0.95,
  randomStop: true,
  randomStopChance: 0.1,
  verbose: false,
};

// ============================================
// Core Function: Human-Like Scroll
// ============================================

/**
 * Scroll the page in a human-like manner.
 *
 * Features:
 * - Random scroll distances
 * - Random delays between scrolls
 * - Early stop detection
 * - Optional random stops to simulate human behavior
 *
 * @param page - Playwright Page object
 * @param options - Configuration options
 * @returns ScrollResult with statistics
 *
 * @example
 * const result = await humanLikeScroll(page, {
 *   minStep: 300,
 *   maxStep: 600,
 *   maxScrolls: 20,
 *   verbose: true
 * });
 *
 * console.log(`Scrolled ${result.scrollCount} times, ${result.totalDistance}px`);
 */
export async function humanLikeScroll(
  page: Page,
  options: HumanLikeScrollOptions = {}
): Promise<ScrollResult> {
  // Merge with defaults
  const opts = { ...DEFAULT_SCROLL_OPTIONS, ...options };

  const log = opts.verbose ? console.log : () => {};

  let scrollCount = 0;
  let totalDistance = 0;
  let stoppedEarly = false;

  log('🎯 Starting human-like scroll...');

  try {
    // Get initial scroll position
    const initialPosition = await page.evaluate(() => window.scrollY);
    const documentHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    // Calculate stop threshold
    const maxScrollPosition = documentHeight * opts.stopAtHeightPercent;

    for (let i = 0; i < opts.maxScrolls; i++) {
      // Check if we've reached the stop threshold
      const currentPosition = await page.evaluate(() => window.scrollY);

      if (currentPosition >= maxScrollPosition) {
        log('✅ Reached bottom threshold');
        stoppedEarly = true;
        break;
      }

      // Random scroll step
      const scrollStep = randomBetween(opts.minStep, opts.maxStep);

      // Random scroll direction (mostly down, rarely up)
      const direction = Math.random() > 0.95 ? -1 : 1;
      const actualScroll = scrollStep * direction;

      // Perform scroll using JavaScript
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, actualScroll);

      scrollCount++;
      totalDistance += Math.abs(actualScroll);

      log(`  scroll #${scrollCount}: ${actualScroll}px (total: ${totalDistance}px)`);

      // Random stop simulation (human doesn't always scroll to bottom)
      if (opts.randomStop && Math.random() < opts.randomStopChance) {
        log('🛑 Random stop triggered (human behavior)');
        stoppedEarly = true;
        break;
      }

      // Random delay between scrolls
      const delay = randomBetween(opts.minDelay, opts.maxDelay);
      await sleep(delay);
    }

    // Get final position
    const finalPosition = await page.evaluate(() => window.scrollY);

    log(`✅ Scroll complete: ${scrollCount} times, ${totalDistance}px, stoppedEarly: ${stoppedEarly}`);

    return {
      scrollCount,
      totalDistance,
      stoppedEarly,
      finalPosition,
    };
  } catch (error) {
    // Log error but don't throw - scroll should be resilient
    console.error('⚠️ Error during human-like scroll:', error);

    return {
      scrollCount,
      totalDistance,
      stoppedEarly: true,
      finalPosition: 0,
    };
  }
}

// ============================================
// Utility Scroll Functions
// ============================================

/**
 * Scroll down by a specific number of pixels
 *
 * @param page - Playwright Page
 * @param distance - Distance in pixels (positive = down, negative = up)
 */
export async function scrollBy(page: Page, distance: number): Promise<void> {
  await page.evaluate((d) => {
    window.scrollBy(0, d);
  }, distance);
}

/**
 * Scroll to a specific position
 *
 * @param page - Playwright Page
 * @param position - Y position in pixels
 */
export async function scrollTo(page: Page, position: number): Promise<void> {
  await page.evaluate((y) => {
    window.scrollTo(0, y);
  }, position);
}

/**
 * Scroll to the top of the page
 */
export async function scrollToTop(page: Page): Promise<void> {
  await scrollTo(page, 0);
  await sleep(200);
}

/**
 * Scroll to the bottom of the page
 */
export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await sleep(500);
}

/**
 * Scroll to an element and bring it into view
 *
 * @param page - Playwright Page
 * @param selector - CSS selector
 * @param block - Position of element (start, center, end)
 */
export async function scrollToElement(
  page: Page,
  selector: string,
  block: 'start' | 'center' | 'end' = 'center'
): Promise<boolean> {
  try {
    await page.evaluate(
      ({ sel, blockPosition }) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: blockPosition });
        }
      },
      { sel: selector, blockPosition: block }
    );

    await sleep(300);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if element is in viewport
 *
 * @param page - Playwright Page
 * @param selector - CSS selector
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  try {
    const result = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= viewportHeight &&
        rect.right <= viewportWidth
      );
    }, selector);

    return result;
  } catch {
    return false;
  }
}

/**
 * Get current scroll position
 */
export async function getScrollPosition(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

/**
 * Get page scrollable height
 */
export async function getScrollableHeight(page: Page): Promise<number> {
  return page.evaluate(() => document.body.scrollHeight - window.innerHeight);
}

/**
 * Calculate scroll progress (0-1)
 */
export async function getScrollProgress(page: Page): Promise<number> {
  const [position, max] = await Promise.all([
    getScrollPosition(page),
    getScrollableHeight(page),
  ]);

  if (max <= 0) return 1;
  return Math.min(1, position / max);
}

// ============================================
// Type Exports
// ============================================

export type { HumanLikeScrollOptions, ScrollResult };
