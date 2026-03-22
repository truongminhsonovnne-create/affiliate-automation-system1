/**
 * Public Outcome Recorder
 *
 * Records outcome signals for the public voucher flow
 * - Idempotent design
 * - Integrates cleanly with public flow
 * - Buffered/async-friendly
 */

import { randomUUID } from 'crypto';
import {
  VoucherOutcomeSignal,
  VoucherOutcomeAttributionContext,
  Platform,
  VoucherOutcomeEventType,
} from '../types/index.js';
import {
  buildResolutionViewedEvent,
  buildVoucherCopiedEvent,
  buildOpenShopeeClickedEvent,
  buildNoMatchViewedEvent,
  buildFallbackClickedEvent,
  buildBestVoucherViewedEvent,
  buildCandidateViewedEvent,
} from './publicOutcomeEventModel.js';

// ============================================================================
// Types
// ============================================================================

export interface VoucherResolutionOutcomeInput {
  resolutionRequestId?: string;
  platform: Platform;
  normalizedUrl: string;
  productContext?: Record<string, unknown>;
  bestVoucherId?: string;
  shownVoucherIds: string[];
  growthSurfaceType?: string;
  attributionContext?: VoucherOutcomeAttributionContext;
}

export interface VoucherInteractionInput {
  outcomeId: string;
  eventType: VoucherOutcomeEventType;
  voucherId?: string;
  sessionId?: string;
  eventPayload?: Record<string, unknown>;
}

export interface NoMatchOutcomeInput {
  platform: Platform;
  normalizedUrl: string;
  sessionId?: string;
  attributionContext?: VoucherOutcomeAttributionContext;
}

// ============================================================================
// In-Memory Buffer (for batch processing)
// ============================================================================

// In production, this would be replaced with a proper message queue
const eventBuffer: VoucherOutcomeSignal[] = [];
const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds
const MAX_BUFFER_SIZE = 100;

// ============================================================================
// Recorder Functions
// ============================================================================

/**
 * Create and store a new resolution outcome
 * Returns the outcome ID for tracking subsequent signals
 */
export async function recordVoucherResolutionOutcome(
  input: VoucherResolutionOutcomeInput
): Promise<string> {
  // Generate outcome ID
  const outcomeId = randomUUID();

  // In production, this would save to database
  // For now, we'll simulate with a stored map
  const outcomeRecord: StoredOutcome = {
    id: outcomeId,
    resolutionRequestId: input.resolutionRequestId,
    platform: input.platform,
    normalizedUrl: input.normalizedUrl,
    productContext: input.productContext,
    bestVoucherId: input.bestVoucherId,
    shownVoucherIds: input.shownVoucherIds,
    growthSurfaceType: input.growthSurfaceType,
    attributionContext: input.attributionContext,
    createdAt: new Date(),
  };

  // Store outcome (simulated)
  storedOutcomes.set(outcomeId, outcomeRecord);

  // Record resolution viewed event
  const resolutionEvent = buildResolutionViewedEvent({
    outcomeId,
    platform: input.platform,
    normalizedUrl: input.normalizedUrl,
    bestVoucherId: input.bestVoucherId,
    shownVoucherIds: input.shownVoucherIds,
    sessionId: undefined, // Will be set from context if available
    attributionContext: input.attributionContext,
    productContext: input.productContext,
  });

  await recordVoucherInteractionSignal(resolutionEvent);

  return outcomeId;
}

/**
 * Record a voucher interaction signal
 * Supports both immediate and buffered recording
 */
export async function recordVoucherInteractionSignal(
  signal: VoucherOutcomeSignal,
  immediate: boolean = false
): Promise<void> {
  if (immediate) {
    await persistSignal(signal);
  } else {
    bufferSignal(signal);
  }
}

/**
 * Record a specific interaction type
 */
export async function recordVoucherCopied(
  outcomeId: string,
  voucherId: string,
  sessionId?: string,
  copySuccess: boolean = true,
  errorMessage?: string
): Promise<void> {
  const event = buildVoucherCopiedEvent({
    outcomeId,
    voucherId,
    sessionId,
    copySuccess,
    errorMessage,
  });

  await recordVoucherInteractionSignal(event);
}

export async function recordOpenShopeeClicked(
  outcomeId: string,
  voucherId?: string,
  sessionId?: string
): Promise<void> {
  const event = buildOpenShopeeClickedEvent({
    outcomeId,
    voucherId,
    sessionId,
  });

  await recordVoucherInteractionSignal(event);
}

export async function recordBestVoucherViewed(
  outcomeId: string,
  voucherId: string,
  sessionId?: string
): Promise<void> {
  const event = buildBestVoucherViewedEvent({
    outcomeId,
    voucherId,
    sessionId,
  });

  await recordVoucherInteractionSignal(event);
}

export async function recordCandidateViewed(
  outcomeId: string,
  voucherId: string,
  sessionId?: string,
  eventOrder?: number
): Promise<void> {
  const event = buildCandidateViewedEvent({
    outcomeId,
    voucherId,
    sessionId,
    eventOrder,
  });

  await recordVoucherInteractionSignal(event);
}

/**
 * Record no-match outcome
 */
export async function recordNoMatchOutcome(
  input: NoMatchOutcomeInput
): Promise<string> {
  const outcomeId = randomUUID();

  // Store outcome
  const outcomeRecord: StoredOutcome = {
    id: outcomeId,
    platform: input.platform,
    normalizedUrl: input.normalizedUrl,
    shownVoucherIds: [],
    growthSurfaceType: input.attributionContext?.growthSurfaceType,
    attributionContext: input.attributionContext,
    createdAt: new Date(),
  };

  storedOutcomes.set(outcomeId, outcomeRecord);

  // Record no-match viewed event
  const noMatchEvent = buildNoMatchViewedEvent({
    outcomeId,
    normalizedUrl: input.normalizedUrl,
    sessionId: undefined,
    attributionContext: input.attributionContext,
  });

  await recordVoucherInteractionSignal(noMatchEvent);

  return outcomeId;
}

/**
 * Record fallback clicked event
 */
export async function recordFallbackClicked(
  outcomeId: string,
  fallbackOption?: string,
  sessionId?: string
): Promise<void> {
  const event = buildFallbackClickedEvent({
    outcomeId,
    fallbackOption,
    sessionId,
  });

  await recordVoucherInteractionSignal(event);
}

// ============================================================================
// Buffer Management
// ============================================================================

/**
 * Add signal to buffer
 */
function bufferSignal(signal: VoucherOutcomeSignal): void {
  eventBuffer.push(signal);

  // Flush if buffer is full
  if (eventBuffer.length >= MAX_BUFFER_SIZE) {
    flushBuffer();
  }
}

/**
 * Flush buffer to persistence
 */
async function flushBuffer(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const signalsToFlush = [...eventBuffer];
  eventBuffer.length = 0;

  // In production, batch persist to database
  for (const signal of signalsToFlush) {
    await persistSignal(signal);
  }
}

/**
 * Persist signal to database
 */
async function persistSignal(signal: VoucherOutcomeSignal): Promise<void> {
  // In production, this would be a database insert
  // For now, we'll log it
  console.log('[VoucherIntelligence] Persisting signal:', {
    eventType: signal.eventType,
    outcomeId: signal.outcomeId,
    voucherId: signal.voucherId,
  });

  // Simulate storage in memory
  storedSignals.push(signal);
}

// ============================================================================
// Initialization
// ============================================================================

// Start buffer flush interval
let bufferFlushInterval: NodeJS.Timeout | null = null;

export function startOutcomeRecorder(): void {
  if (bufferFlushInterval) return;

  bufferFlushInterval = setInterval(() => {
    flushBuffer().catch(console.error);
  }, BUFFER_FLUSH_INTERVAL);

  console.log('[VoucherIntelligence] Outcome recorder started');
}

export function stopOutcomeRecorder(): void {
  if (bufferFlushInterval) {
    clearInterval(bufferFlushInterval);
    bufferFlushInterval = null;
  }

  // Flush remaining
  flushBuffer().catch(console.error);

  console.log('[VoucherIntelligence] Outcome recorder stopped');
}

// ============================================================================
// Storage (Simulated)
// ============================================================================

interface StoredOutcome {
  id: string;
  resolutionRequestId?: string;
  platform: Platform;
  normalizedUrl: string;
  productContext?: Record<string, unknown>;
  bestVoucherId?: string;
  shownVoucherIds: string[];
  growthSurfaceType?: string;
  attributionContext?: VoucherOutcomeAttributionContext;
  createdAt: Date;
}

const storedOutcomes = new Map<string, StoredOutcome>();
const storedSignals: VoucherOutcomeSignal[] = [];

/**
 * Get stored outcome by ID
 */
export function getStoredOutcome(outcomeId: string): StoredOutcome | undefined {
  return storedOutcomes.get(outcomeId);
}

/**
 * Get all stored signals
 */
export function getStoredSignals(): VoucherOutcomeSignal[] {
  return [...storedSignals];
}

/**
 * Clear stored data (for testing)
 */
export function clearStoredData(): void {
  storedOutcomes.clear();
  storedSignals.length = 0;
}
