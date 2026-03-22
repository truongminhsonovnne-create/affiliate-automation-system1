/**
 * Anti-Bot Interaction Utilities
 *
 * Provides human-like interaction functions with randomization and natural behavior.
 */

import { z } from 'zod';
import type { Page } from 'playwright';
import type {
  RandomizedInteractionOptions,
  RandomizedInteractionResult,
  InteractionIntensity,
  AntiBotLogger,
  AbortSignalLike,
} from './types.js';
import { INTERACTION_DEFAULTS } from './constants.js';
import { randomBetween, randomDelay } from './delay.js';

// ============================================
// Validation Schemas
// ============================================

const interactionOptionsSchema = z.object({
  intensity: z.enum(['low', 'medium', 'high']).optional(),
  enablePrePause: z.boolean().optional(),
  enablePostPause: z.boolean().optional(),
  enableMicroScroll: z.boolean().optional(),
  enableViewportNudge: z.boolean().optional(),
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
  }).optional(),
  verbose: z.boolean().optional(),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Get intensity preset configuration
 */
function getIntensityConfig(intensity: InteractionIntensity) {
  switch (intensity) {
    case 'low':
      return {
        prePauseMin: 200,
        prePauseMax: 500,
        postPauseMin: 100,
        postPauseMax: 300,
        microScrollChance: 0.1,
        viewportNudgeChance: 0.05,
      };
    case 'high':
      return {
        prePauseMin: 500,
        prePauseMax: 1500,
        postPauseMin: 300,
        postPauseMax: 1000,
        microScrollChance: 0.4,
        viewportNudgeChance: 0.2,
      };
    case 'medium':
    default:
      return {
        prePauseMin: 300,
        prePauseMax: 800,
        postPauseMin: 200,
        postPauseMax: 500,
        microScrollChance: 0.25,
        viewportNudgeChance: 0.1,
      };
  }
}

/**
 * Check if abort signal is triggered
 */
function checkAbort(signal: AbortSignalLike | null | undefined): boolean {
  return signal?.aborted ?? false;
}

/**
 * Simulate mouse movement with random path
 */
async function simulateMouseMovement(page: Page, fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
  const steps = randomBetween(5, 15);
  const deltaX = (toX - fromX) / steps;
  const deltaY = (toY - fromY) / steps;

  await page.mouse.move(fromX, fromY);

  for (let i = 1; i <= steps; i++) {
    // Add slight randomness to path
    const jitterX = randomBetween(-3, 3);
    const jitterY = randomBetween(-3, 3);

    await page.mouse.move(
      fromX + (deltaX * i) + jitterX,
      fromY + (deltaY * i) + jitterY
    );

    // Random delay between steps
    await randomBetween(5, 15);
  }
}

// ============================================
// Main Interaction Functions
// ============================================

/**
 * Perform a human-like click on an element or coordinates.
 *
 * Features:
 * - Random pre/post delays
 * - Mouse movement simulation
 * - Micro-scroll after click
 * - Viewport nudge
 *
 * @param page - Playwright Page object
 * @param selectorOrPosition - CSS selector or {x, y} coordinates
 * @param options - Interaction options
 * @returns RandomizedInteractionResult
 *
 * @example
 * // Click by selector
 * await humanLikeClick(page, '.buy-button', { intensity: 'high' });
 *
 * // Click by coordinates
 * await humanLikeClick(page, { x: 100, y: 200 });
 */
export async function humanLikeClick(
  page: Page,
  selectorOrPosition: string | { x: number; y: number },
  options: RandomizedInteractionOptions = {}
): Promise<RandomizedInteractionResult> {
  const opts = interactionOptionsSchema.parse(options) as RandomizedInteractionOptions;
  const logger = opts.logger;

  const intensity = opts.intensity ?? 'medium';
  const config = getIntensityConfig(intensity);

  const result: RandomizedInteractionResult = {
    ok: false,
    microScrollApplied: false,
    viewportNudgeApplied: false,
  };

  try {
    // Check abort
    if (checkAbort(opts.abortSignal ?? null)) {
      result.error = 'Interaction aborted';
      return result;
    }

    // Pre-action pause
    if (opts.enablePrePause !== false) {
      const prePause = randomBetween(config.prePauseMin, config.prePauseMax);
      await randomDelay(prePause, prePause);
      result.prePauseMs = prePause;
    }

    // Check abort again
    if (checkAbort(opts.abortSignal ?? null)) {
      result.error = 'Interaction aborted';
      return result;
    }

    // Determine if clicking by selector or position
    const isSelector = typeof selectorOrPosition === 'string';

    if (isSelector) {
      const selector = selectorOrPosition;

      // Find element and get its bounding box
      const element = await page.$(selector);
      if (!element) {
        result.error = `Element not found: ${selector}`;
        return result;
      }

      const box = await element.boundingBox();
      if (!box) {
        result.error = `Could not get element bounds: ${selector}`;
        return result;
      }

      // Calculate click position within element (randomized)
      const clickX = box.x + randomBetween(Math.floor(box.width * 0.2), Math.floor(box.width * 0.8));
      const clickY = box.y + randomBetween(Math.floor(box.height * 0.2), Math.floor(box.height * 0.8));

      // Simulate mouse movement to element
      await simulateMouseMovement(page, clickX - 50, clickY - 50, clickX, clickY);

      // Perform click
      await page.mouse.click(clickX, clickY);
    } else {
      const { x, y } = selectorOrPosition;

      // Move to position
      await simulateMouseMovement(page, x - 50, y - 50, x, y);

      // Perform click
      await page.mouse.click(x, y);
    }

    if (opts.verbose && logger) {
      logger.debug('Click performed', { selector: isSelector ? selectorOrPosition : 'coordinates' });
    }

    // Post-action pause
    if (opts.enablePostPause !== false) {
      const postPause = randomBetween(config.postPauseMin, config.postPauseMax);
      await randomDelay(postPause, postPause);
      result.postPauseMs = postPause;
    }

    // Micro-scroll after click (sometimes)
    if (opts.enableMicroScroll !== false && Math.random() < config.microScrollChance) {
      const microScrollDistance = randomBetween(-100, 100);
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, microScrollDistance);
      result.microScrollApplied = true;

      if (opts.verbose && logger) {
        logger.debug(`Micro-scroll applied: ${microScrollDistance}px`);
      }
    }

    // Viewport nudge (sometimes)
    if (opts.enableViewportNudge && Math.random() < config.viewportNudgeChance) {
      const viewportChange = randomBetween(-20, 20);
      const currentViewport = page.viewportSize();
      if (currentViewport) {
        await page.setViewportSize({
          width: currentViewport.width,
          height: currentViewport.height + viewportChange,
        });
        result.viewportNudgeApplied = true;

        if (opts.verbose && logger) {
          logger.debug(`Viewport nudge: ${viewportChange}px`);
        }
      }
    }

    result.ok = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    if (logger) {
      logger.error('Human-like click failed', { error: result.error });
    }
    return result;
  }
}

/**
 * Perform a human-like double click
 */
export async function humanLikeDoubleClick(
  page: Page,
  selectorOrPosition: string | { x: number; y: number },
  options: RandomizedInteractionOptions = {}
): Promise<RandomizedInteractionResult> {
  const opts = interactionOptionsSchema.parse(options) as RandomizedInteractionOptions;
  const logger = opts.logger;

  const intensity = opts.intensity ?? 'medium';
  const config = getIntensityConfig(intensity);

  const result: RandomizedInteractionResult = {
    ok: false,
    microScrollApplied: false,
    viewportNudgeApplied: false,
  };

  try {
    if (checkAbort(opts.abortSignal ?? null)) {
      result.error = 'Interaction aborted';
      return result;
    }

    // Pre-action pause
    if (opts.enablePrePause !== false) {
      const prePause = randomBetween(config.prePauseMin, config.prePauseMax);
      await randomDelay(prePause, prePause);
      result.prePauseMs = prePause;
    }

    if (checkAbort(opts.abortSignal ?? null)) {
      result.error = 'Interaction aborted';
      return result;
    }

    const isSelector = typeof selectorOrPosition === 'string';

    if (isSelector) {
      const element = await page.$(selectorOrPosition);
      if (!element) {
        result.error = `Element not found: ${selectorOrPosition}`;
        return result;
      }

      const box = await element.boundingBox();
      if (!box) {
        result.error = 'Could not get element bounds';
        return result;
      }

      const clickX = box.x + randomBetween(Math.floor(box.width * 0.2), Math.floor(box.width * 0.8));
      const clickY = box.y + randomBetween(Math.floor(box.height * 0.2), Math.floor(box.height * 0.8));

      await simulateMouseMovement(page, clickX - 50, clickY - 50, clickX, clickY);
      await page.mouse.dblclick(clickX, clickY);
    } else {
      const { x, y } = selectorOrPosition;
      await simulateMouseMovement(page, x - 50, y - 50, x, y);
      await page.mouse.dblclick(x, y);
    }

    if (opts.verbose && logger) {
      logger.debug('Double-click performed');
    }

    // Post-action pause
    if (opts.enablePostPause !== false) {
      const postPause = randomBetween(config.postPauseMin, config.postPauseMax);
      await randomDelay(postPause, postPause);
      result.postPauseMs = postPause;
    }

    result.ok = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Perform human-like hover over element
 */
export async function humanLikeHover(
  page: Page,
  selector: string,
  options: RandomizedInteractionOptions = {}
): Promise<RandomizedInteractionResult> {
  const opts = interactionOptionsSchema.parse(options) as RandomizedInteractionOptions;
  const logger = opts.logger;

  const result: RandomizedInteractionResult = {
    ok: false,
    microScrollApplied: false,
    viewportNudgeApplied: false,
  };

  try {
    const element = await page.$(selector);
    if (!element) {
      result.error = `Element not found: ${selector}`;
      return result;
    }

    const box = await element.boundingBox();
    if (!box) {
      result.error = 'Could not get element bounds';
      return result;
    }

    const hoverX = box.x + randomBetween(Math.floor(box.width * 0.2), Math.floor(box.width * 0.8));
    const hoverY = box.y + randomBetween(Math.floor(box.height * 0.2), Math.floor(box.height * 0.8));

    // Pre-hover pause
    if (opts.enablePrePause !== false) {
      const prePause = randomBetween(200, 500);
      await randomDelay(prePause, prePause);
      result.prePauseMs = prePause;
    }

    // Move to element
    await page.mouse.move(hoverX, hoverY);

    // Post-hover pause
    if (opts.enablePostPause !== false) {
      const postPause = randomBetween(200, 500);
      await randomDelay(postPause, postPause);
      result.postPauseMs = postPause;
    }

    result.ok = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    if (logger) {
      logger.error('Hover failed', { error: result.error });
    }
    return result;
  }
}

/**
 * Type text with human-like characteristics
 *
 * Features:
 * - Random typing speed variations
 * - Occasional pauses
 * - Cursor position randomization
 *
 * @param page - Playwright Page
 * @param selector - Input selector
 * @param text - Text to type
 * @param options - Interaction options
 */
export async function humanLikeType(
  page: Page,
  selector: string,
  text: string,
  options: RandomizedInteractionOptions & { typeSpeedMin?: number; typeSpeedMax?: number } = {}
): Promise<RandomizedInteractionResult> {
  const opts = interactionOptionsSchema.parse(options) as RandomizedInteractionOptions;
  const logger = opts.logger;

  const intensity = opts.intensity ?? 'medium';
  const config = getIntensityConfig(intensity);

  const typeSpeedMin = options.typeSpeedMin ?? 50;
  const typeSpeedMax = options.typeSpeedMax ?? 150;

  const result: RandomizedInteractionResult = {
    ok: false,
    microScrollApplied: false,
    viewportNudgeApplied: false,
  };

  try {
    const element = await page.$(selector);
    if (!element) {
      result.error = `Element not found: ${selector}`;
      return result;
    }

    // Focus element
    await element.focus();

    // Clear existing content first
    await element.fill('');

    // Pre-typing pause
    if (opts.enablePrePause !== false) {
      const prePause = randomBetween(config.prePauseMin, config.prePauseMax);
      await randomDelay(prePause, prePause);
      result.prePauseMs = prePause;
    }

    // Type character by character with random delays
    for (let i = 0; i < text.length; i++) {
      if (checkAbort(opts.abortSignal ?? null)) {
        result.error = 'Typing aborted';
        return result;
      }

      const char = text[i];

      // Type the character
      await page.keyboard.type(char, { delay: randomBetween(typeSpeedMin, typeSpeedMax) });

      // Occasional pause (like human making a mistake or thinking)
      if (i > 0 && i < text.length - 1 && Math.random() < 0.1) {
        const pause = randomBetween(50, 200);
        await randomDelay(pause, pause);
      }
    }

    if (opts.verbose && logger) {
      logger.debug(`Typed ${text.length} characters`);
    }

    // Post-typing pause
    if (opts.enablePostPause !== false) {
      const postPause = randomBetween(config.postPauseMin, config.postPauseMax);
      await randomDelay(postPause, postPause);
      result.postPauseMs = postPause;
    }

    result.ok = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    if (logger) {
      logger.error('Human-like type failed', { error: result.error });
    }
    return result;
  }
}

/**
 * Press keyboard key with random delay
 */
export async function humanLikePress(
  page: Page,
  key: string,
  options: RandomizedInteractionOptions = {}
): Promise<RandomizedInteractionResult> {
  const opts = interactionOptionsSchema.parse(options) as RandomizedInteractionOptions;
  const logger = opts.logger;

  const result: RandomizedInteractionResult = {
    ok: false,
    microScrollApplied: false,
    viewportNudgeApplied: false,
  };

  try {
    // Pre-action pause
    if (opts.enablePrePause !== false) {
      const prePause = randomBetween(100, 300);
      await randomDelay(prePause, prePause);
      result.prePauseMs = prePause;
    }

    // Press key
    await page.keyboard.press(key);

    if (opts.verbose && logger) {
      logger.debug(`Key pressed: ${key}`);
    }

    // Post-action pause
    if (opts.enablePostPause !== false) {
      const postPause = randomBetween(100, 300);
      await randomDelay(postPause, postPause);
      result.postPauseMs = postPause;
    }

    result.ok = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Perform a sequence of interactions (e.g., scroll, wait, click)
 */
export async function humanLikeSequence(
  page: Page,
  actions: Array<{
    type: 'click' | 'type' | 'hover' | 'press' | 'scroll' | 'wait';
    selector?: string;
    position?: { x: number; y: number };
    text?: string;
    key?: string;
    scrollDistance?: number;
    waitMs?: number;
    options?: RandomizedInteractionOptions;
  }>,
  options: RandomizedInteractionOptions = {}
): Promise<RandomizedInteractionResult[]> {
  const results: RandomizedInteractionResult[] = [];

  for (const action of actions) {
    const result: RandomizedInteractionResult = {
      ok: false,
      microScrollApplied: false,
      viewportNudgeApplied: false,
    };

    try {
      switch (action.type) {
        case 'click': {
          const clickResult = await humanLikeClick(
            page,
            action.selector ?? action.position!,
            action.options ?? options
          );
          Object.assign(result, clickResult);
          break;
        }

        case 'hover': {
          const hoverResult = await humanLikeHover(page, action.selector!, action.options ?? options);
          Object.assign(result, hoverResult);
          break;
        }

        case 'type': {
          const typeResult = await humanLikeType(
            page,
            action.selector!,
            action.text!,
            action.options ?? options
          );
          Object.assign(result, typeResult);
          break;
        }

        case 'press': {
          const pressResult = await humanLikePress(page, action.key!, action.options ?? options);
          Object.assign(result, pressResult);
          break;
        }

        case 'scroll':
          if (action.scrollDistance) {
            await page.evaluate((distance) => {
              window.scrollBy(0, distance);
            }, action.scrollDistance);
            result.ok = true;
          }
          break;

        case 'wait':
          if (action.waitMs) {
            await randomDelay(action.waitMs, action.waitMs);
            result.ok = true;
          }
          break;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    results.push(result);

    // Stop sequence if action failed
    if (!result.ok && action.type !== 'wait') {
      break;
    }
  }

  return results;
}
