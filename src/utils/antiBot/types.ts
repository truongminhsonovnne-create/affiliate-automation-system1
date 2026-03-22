/**
 * Anti-Bot Toolkit Types
 *
 * Shared types and interfaces for the anti-bot utilities.
 */

import type { Page } from 'playwright';

// ============================================
// Common Types
// ============================================

/**
 * Logger interface for anti-bot operations
 */
export interface AntiBotLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Abort signal for cancellation
 */
export interface AbortSignalLike {
  readonly aborted: boolean;
  addEventListener: (type: 'abort', listener: () => void) => void;
  removeEventListener: (type: 'abort', listener: () => void) => void;
}

// ============================================
// Delay Types
// ============================================

/**
 * Options for random delay
 */
export interface RandomDelayOptions {
  /** Label for logging */
  label?: string;

  /** Custom logger */
  logger?: AntiBotLogger;

  /** Abort signal for cancellation */
  abortSignal?: AbortSignalLike | null;

  /** Enable jitter (default: true) */
  enableJitter?: boolean;

  /** Jitter percentage (default: 0.1 = 10%) */
  jitterPercent?: number;
}

/**
 * Result from random delay
 */
export interface RandomDelayResult {
  /** Actual delay in milliseconds */
  actualDelayMs: number;

  /** Whether jitter was applied */
  jitterApplied: boolean;

  /** Whether was aborted */
  aborted: boolean;
}

// ============================================
// Scroll Types
// ============================================

/**
 * Options for human-like scroll
 */
export interface HumanLikeScrollOptions {
  /** Minimum scroll step in pixels */
  minStep?: number;

  /** Maximum scroll step in pixels */
  maxStep?: number;

  /** Minimum delay between scrolls in ms */
  minDelay?: number;

  /** Maximum delay between scrolls in ms */
  maxDelay?: number;

  /** Maximum number of scroll actions */
  maxScrolls?: number;

  /** Stop when reaching this percentage of page height (0-1) */
  stopAtHeightPercent?: number;

  /** Stop when this selector appears */
  targetSelector?: string;

  /** Stop when reaching this Y position */
  targetY?: number;

  /** Enable random pause like reading (default: true) */
  enableReadingPause?: boolean;

  /** Probability of random pause (default: 0.15) */
  readingPauseChance?: number;

  /** Minimum reading pause duration in ms (default: 2000) */
  readingPauseMin?: number;

  /** Maximum reading pause duration in ms (default: 5000) */
  readingPauseMax?: number;

  /** Custom logger */
  logger?: AntiBotLogger;

  /** Abort signal */
  abortSignal?: AbortSignalLike | null;

  /** Log each scroll action */
  verbose?: boolean;
}

/**
 * Result from human-like scroll
 */
export interface HumanScrollResult {
  /** Total number of scroll actions performed */
  totalScrolls: number;

  /** Total distance scrolled in pixels */
  totalDistance: number;

  /** Total duration in milliseconds */
  durationMs: number;

  /** Why scrolling stopped */
  stoppedReason: ScrollStoppedReason;

  /** Final scroll position */
  finalPosition: number;

  /** Whether reading pause occurred */
  readingPauseOccurred: boolean;
}

/**
 * Reasons for scroll to stop
 */
export type ScrollStoppedReason =
  | 'max_scrolls'
  | 'height_threshold'
  | 'target_selector_found'
  | 'target_y_reached'
  | 'aborted'
  | 'error';

// ============================================
// Navigation Types
// ============================================

/**
 * Options for safe navigation
 */
export interface SafeNavigateOptions {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;

  /** Timeout in ms (default: 30000) */
  timeout?: number;

  /** Wait until load event (default: networkidle) */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';

  /** Pre-navigation delay in ms */
  preDelay?: number;

  /** Post-navigation settle delay in ms */
  postDelay?: number;

  /** Enable retry on failure (default: true) */
  retryOnFailure?: boolean;

  /** Additional headers */
  headers?: Record<string, string>;

  /** Custom logger */
  logger?: AntiBotLogger;

  /** Abort signal */
  abortSignal?: AbortSignalLike | null;

  /** Log each attempt */
  verbose?: boolean;
}

/**
 * Result from safe navigation
 */
export interface SafeNavigateResult {
  /** Whether navigation succeeded */
  ok: boolean;

  /** Final URL after navigation */
  finalUrl: string;

  /** HTTP status if available */
  status?: number;

  /** Number of attempts made */
  attempts: number;

  /** Total duration in milliseconds */
  durationMs: number;

  /** Error message if failed */
  error?: string;

  /** Whether was aborted */
  aborted: boolean;
}

// ============================================
// Interaction Types
// ============================================

/**
 * Intensity level for human-like interactions
 */
export type InteractionIntensity = 'low' | 'medium' | 'high';

/**
 * Options for randomized interaction
 */
export interface RandomizedInteractionOptions {
  /** Interaction intensity level */
  intensity?: InteractionIntensity;

  /** Enable pre-action pause (default: true) */
  enablePrePause?: boolean;

  /** Enable post-action pause (default: true) */
  enablePostPause?: boolean;

  /** Enable micro-scroll after action (default: true) */
  enableMicroScroll?: boolean;

  /** Enable viewport adjustment (default: false) */
  enableViewportNudge?: boolean;

  /** Custom logger */
  logger?: AntiBotLogger;

  /** Abort signal */
  abortSignal?: AbortSignalLike | null;

  /** Log each interaction */
  verbose?: boolean;
}

/**
 * Result from randomized interaction
 */
export interface RandomizedInteractionResult {
  /** Whether interaction succeeded */
  ok: boolean;

  /** Pre-pause duration if applied */
  prePauseMs?: number;

  /** Post-pause duration if applied */
  postPauseMs?: number;

  /** Whether micro-scroll was applied */
  microScrollApplied: boolean;

  /** Whether viewport nudge was applied */
  viewportNudgeApplied: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Predefined intensity configurations
 */
export const INTENSITY_PRESETS: Record<InteractionIntensity, {
  prePauseMin: number;
  prePauseMax: number;
  postPauseMin: number;
  postPauseMax: number;
  microScrollChance: number;
  viewportNudgeChance: number;
}> = {
  low: {
    prePauseMin: 200,
    prePauseMax: 500,
    postPauseMin: 100,
    postPauseMax: 300,
    microScrollChance: 0.1,
    viewportNudgeChance: 0.05,
  },
  medium: {
    prePauseMin: 300,
    prePauseMax: 800,
    postPauseMin: 200,
    postPauseMax: 500,
    microScrollChance: 0.25,
    viewportNudgeChance: 0.1,
  },
  high: {
    prePauseMin: 500,
    prePauseMax: 1500,
    postPauseMin: 300,
    postPauseMax: 1000,
    microScrollChance: 0.4,
    viewportNudgeChance: 0.2,
  },
};
