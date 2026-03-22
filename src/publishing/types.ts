/**
 * Publishing Layer Types
 *
 * Shared type definitions for Content Scheduling + Publishing Preparation Layer
 */

import type { AffiliateProduct, AffiliateContent } from '../types/database.js';

// ============================================
// Channel Types
// ============================================

/**
 * Supported publishing channels
 */
export type PublishingChannel = 'tiktok' | 'facebook' | 'website';

/**
 * List of all supported channels
 */
export const SUPPORTED_CHANNELS: PublishingChannel[] = ['tiktok', 'facebook', 'website'];

/**
 * Check if a string is a valid publishing channel
 */
export function isValidChannel(channel: string): channel is PublishingChannel {
  return SUPPORTED_CHANNELS.includes(channel as PublishingChannel);
}

// ============================================
// Job Status Types
// ============================================

/**
 * Publish job lifecycle status
 */
export type PublishJobStatus =
  | 'pending'      // Job created, not yet scheduled
  | 'scheduled'   // Job has a scheduled time
  | 'ready'       // Job is ready to be published
  | 'publishing'  // Job is currently being published
  | 'published'   // Job was successfully published
  | 'failed'      // Job failed to publish
  | 'cancelled';  // Job was cancelled

/**
 * Active statuses (jobs that are not terminal)
 */
export const ACTIVE_JOB_STATUSES: PublishJobStatus[] = ['pending', 'scheduled', 'ready', 'publishing'];

/**
 * Terminal statuses (jobs that are done)
 */
export const TERMINAL_JOB_STATUSES: PublishJobStatus[] = ['published', 'failed', 'cancelled'];

/**
 * Check if status is terminal
 */
export function isTerminalStatus(status: PublishJobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}

// ============================================
// Eligibility Types
// ============================================

/**
 * Individual eligibility check result
 */
export interface PublishEligibilityCheck {
  channel: PublishingChannel;
  eligible: boolean;
  reason?: string;
  warnings?: string[];
  score?: number;
}

/**
 * Overall eligibility evaluation result
 */
export interface PublishEligibilityResult {
  productId: string;
  contentId: string;
  checks: PublishEligibilityCheck[];
  overallEligible: boolean;
  eligibleChannels: PublishingChannel[];
  ineligibleChannels: PublishingChannel[];
}

// ============================================
// Payload Types
// ============================================

/**
 * Base payload for all channels
 */
export interface BasePublishPayload {
  productId: string;
  contentId: string;
  channel: PublishingChannel;
  productUrl: string;
  productTitle: string;
  productImageUrl?: string;
  source: {
    platform?: string;
    aiModel?: string;
    promptVersion?: string;
    confidenceScore?: number;
  };
  createdAt: string;
}

/**
 * TikTok-specific payload
 */
export interface TikTokPublishPayload extends BasePublishPayload {
  channel: 'tiktok';
  title: string;
  caption: string;
  hashtags: string[];
  affiliateLink?: string;
  mediaHints?: {
    hasImage: boolean;
    imageUrl?: string;
  };
  disclaimer?: string;
}

/**
 * Facebook-specific payload
 */
export interface FacebookPublishPayload extends BasePublishPayload {
  channel: 'facebook';
  caption: string;
  hashtags: string[];
  affiliateLink?: string;
  shortReview?: string;
  mediaHints?: {
    hasImage: boolean;
    imageUrl?: string;
  };
}

/**
 * Website-specific payload
 */
export interface WebsitePublishPayload extends BasePublishPayload {
  channel: 'website';
  title: string;
  body: string;
  summary?: string;
  keywords?: string[];
  structuredData?: Record<string, unknown>;
}

/**
 * Union type for all channel payloads
 */
export type ChannelPublishPayload = TikTokPublishPayload | FacebookPublishPayload | WebsitePublishPayload;

/**
 * Result of building a publish payload
 */
export interface PublishPayloadBuildResult {
  success: boolean;
  channel: PublishingChannel;
  payload?: ChannelPublishPayload;
  error?: string;
  warnings?: string[];
}

// ============================================
// Scheduling Types
// ============================================

/**
 * Scheduling mode
 */
export type SchedulingMode = 'immediate' | 'delayed' | 'slot_based';

/**
 * Scheduling decision result
 */
export interface PublishScheduleDecision {
  scheduled: boolean;
  scheduledAt?: Date;
  priority: number;
  mode: SchedulingMode;
  reason: string;
  policyUsed: string;
  slotInfo?: {
    slotStart: Date;
    slotEnd: Date;
    slotIndex: number;
  };
}

// ============================================
// Persistence Types
// ============================================

/**
 * Input for creating a publish job record
 */
export interface PublishJobRecordInput {
  productId: string;
  contentId: string;
  channel: PublishingChannel;
  status: PublishJobStatus;
  scheduledAt?: Date;
  priority?: number;
  payload: ChannelPublishPayload;
  idempotencyKey?: string;
  sourceMetadata?: Record<string, unknown>;
}

/**
 * Result of persisting a publish job
 */
export interface PersistPublishJobResult {
  success: boolean;
  jobId?: string;
  action: 'inserted' | 'updated' | 'skipped' | 'failed';
  reason?: string;
  existingJobId?: string;
  error?: string;
}

/**
 * Result of batch persisting publish jobs
 */
export interface PersistPublishJobsResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  results: PersistPublishJobResult[];
}

// ============================================
// Policy Types
// ============================================

/**
 * Content limits for a channel
 */
export interface ChannelContentLimits {
  titleMaxLength: number;
  captionMaxLength: number;
  hashtagMaxCount: number;
  descriptionMaxLength?: number;
}

/**
 * Scheduling constraints for a channel
 */
export interface ChannelSchedulingConstraints {
  minDelayMinutes: number;
  maxDelayMinutes: number;
  allowImmediate: boolean;
  preferredTimes?: string[]; // e.g., ["09:00", "12:00", "18:00"]
  blockedTimes?: string[];
  timezone?: string;
}

/**
 * Content requirements for eligibility
 */
export interface ChannelContentRequirements {
  requireProductUrl: boolean;
  requireImage: boolean;
  requireSocialCaption: boolean;
  requireReviewContent: boolean;
  minConfidenceScore?: number;
  minContentLength?: number;
  requireRewrittenTitle?: boolean;
}

/**
 * CTA (Call-to-Action) rules
 */
export interface ChannelCTARules {
  allowed: boolean;
  style?: 'link' | 'button' | 'mention' | 'hashtag';
  maxLength?: number;
}

/**
 * Policy definition for a channel
 */
export interface ChannelPolicy {
  channel: PublishingChannel;
  contentLimits: ChannelContentLimits;
  schedulingConstraints: ChannelSchedulingConstraints;
  contentRequirements: ChannelContentRequirements;
  ctaRules: ChannelCTARules;
  formattingRules?: {
    hashtagPrefix?: string;
    addDisclaimer?: boolean;
    disclaimerText?: string;
  };
}

// ============================================
// Result Types
// ============================================

/**
 * Preparation warning
 */
export interface PublishPreparationWarning {
  channel?: PublishingChannel;
  productId: string;
  contentId?: string;
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Preparation error
 */
export interface PublishPreparationError {
  channel?: PublishingChannel;
  productId: string;
  contentId?: string;
  code: string;
  message: string;
  error?: unknown;
}

/**
 * Metadata for preparation results
 */
export interface PublishingMetadata {
  startTime: Date;
  endTime: Date;
  channels: PublishingChannel[];
  channelsProcessed: PublishingChannel[];
  schedulingPolicyUsed: string;
  payloadBuildStats: {
    total: number;
    succeeded: number;
    failed: number;
  };
  persistenceStats: {
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  eligibilityStats: {
    total: number;
    eligible: number;
    ineligible: number;
  };
  schedulingStats: {
    total: number;
    scheduled: number;
    immediate: number;
    failed: number;
  };
}

/**
 * Single channel preparation result
 */
export interface ChannelPreparationResult {
  channel: PublishingChannel;
  productId: string;
  contentId: string;
  eligible: boolean;
  payloadBuilt: boolean;
  scheduled: boolean;
  persisted: boolean;
  warning?: PublishPreparationWarning;
  error?: PublishPreparationError;
  scheduledAt?: Date;
  jobId?: string;
}

/**
 * Overall preparation result
 */
export interface PublishPreparationResult {
  ok: boolean;
  status: 'success' | 'partial_success' | 'failed';
  productId: string;
  channels: PublishingChannel[];
  channelsProcessed: PublishingChannel[];
  processedCount: number;
  eligibleCount: number;
  payloadBuiltCount: number;
  scheduledCount: number;
  persistedCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: PublishPreparationWarning[];
  errors: PublishPreparationError[];
  metadata: PublishingMetadata;
  channelResults?: ChannelPreparationResult[];
}

/**
 * Batch preparation result
 */
export interface PublishPreparationBatchResult {
  ok: boolean;
  status: 'success' | 'partial_success' | 'failed';
  totalProducts: number;
  processedProducts: number;
  successfulProducts: number;
  failedProducts: number;
  channels: PublishingChannel[];
  processedCount: number;
  eligibleCount: number;
  payloadBuiltCount: number;
  scheduledCount: number;
  persistedCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: PublishPreparationWarning[];
  errors: PublishPreparationError[];
  metadata: PublishingMetadata;
  productResults: PublishPreparationResult[];
}

// ============================================
// Option Types
// ============================================

/**
 * Options for eligibility evaluation
 */
export interface EligibilityOptions {
  strictMode?: boolean;
  skipDedupeCheck?: boolean;
  skipStalenessCheck?: boolean;
  stalenessThresholdDays?: number;
}

/**
 * Options for payload building
 */
export interface PayloadBuildOptions {
  includeMetadata?: boolean;
  validateAgainstPolicy?: boolean;
  transformOptions?: {
    truncate?: boolean;
    addDisclaimer?: boolean;
  };
}

/**
 * Options for scheduling
 */
export interface SchedulingOptions {
  mode?: SchedulingMode;
  delayMinutes?: number;
  preferredSlot?: Date;
  priority?: number;
  forceSchedule?: boolean;
}

/**
 * Options for persistence
 */
export interface PersistenceOptions {
  skipIfExists?: boolean;
  updateIfBetter?: boolean;
  idempotencyEnabled?: boolean;
}

/**
 * Master options for publish preparation
 */
export interface PublishPreparationOptions {
  channels?: PublishingChannel[];
  eligibility?: EligibilityOptions;
  payload?: PayloadBuildOptions;
  scheduling?: SchedulingOptions;
  persistence?: PersistenceOptions;
  batchSize?: number;
  continueOnError?: boolean;
}

// ============================================
// Loader Types
// ============================================

/**
 * Filters for loading products with content
 */
export interface ProductContentFilters {
  productIds?: string[];
  platform?: string;
  sourceType?: string;
  sourceKeyword?: string;
  limit?: number;
  offset?: number;
  hasAiContent?: boolean;
  minConfidenceScore?: number;
}

/**
 * Product with its AI content loaded
 */
export interface ProductWithContent {
  product: AffiliateProduct;
  content: AffiliateContent | null;
}

// ============================================
// Renderer Types
// ============================================

/**
 * Context for channel rendering
 */
export interface ChannelRenderContext {
  product: AffiliateProduct;
  content: AffiliateContent;
  policy: ChannelPolicy;
  options?: PayloadBuildOptions;
}

/**
 * Content variant for different channels
 */
export interface ContentVariant {
  channel: PublishingChannel;
  title?: string;
  caption?: string;
  body?: string;
  hashtags: string[];
  summary?: string;
  keywords?: string[];
  structuredData?: Record<string, unknown>;
}
