/**
 * Publishing Layer Index
 *
 * Public API exports for Content Scheduling + Publishing Preparation Layer
 */

// Re-export types from types.ts
export type {
  PublishingChannel,
  PublishJobStatus,
  PublishEligibilityCheck,
  PublishEligibilityResult,
  BasePublishPayload,
  ChannelPublishPayload,
  PublishPayloadBuildResult,
  PublishScheduleDecision,
  PublishJobRecordInput,
  PersistPublishJobResult,
  PersistPublishJobsResult,
  ChannelPolicy,
  ChannelContentLimits,
  ChannelSchedulingConstraints,
  ChannelContentRequirements,
  ChannelCTARules,
  PublishPreparationWarning,
  PublishPreparationError,
  PublishingMetadata,
  ChannelPreparationResult,
  PublishPreparationResult,
  PublishPreparationBatchResult,
  EligibilityOptions,
  PayloadBuildOptions,
  SchedulingOptions,
  PersistenceOptions,
  PublishPreparationOptions,
  ProductContentFilters,
  ProductWithContent,
  ChannelRenderContext,
  ContentVariant,
  SchedulingMode,
} from './types.js';

// Re-export value exports from types.ts
export {
  SUPPORTED_CHANNELS,
  isValidChannel,
  ACTIVE_JOB_STATUSES,
  TERMINAL_JOB_STATUSES,
  isTerminalStatus,
} from './types.js';

// Constants
export * from './constants.js';

// Channel Policies
export * from './channelPolicies.js';

// Eligibility
export * from './eligibility.js';

// Renderers
export {
  renderTikTokContent,
  validateTikTokPayload,
  createTikTokRenderer,
  renderFacebookContent,
  validateFacebookPayload,
  createFacebookRenderer,
  renderWebsiteContent,
  validateWebsitePayload,
  createWebsiteRenderer,
} from './renderers/index.js';

export type {
  TikTokPublishPayload,
  FacebookPublishPayload,
  WebsitePublishPayload,
} from './renderers/index.js';

// Payload Builder
export * from './payloadBuilder.js';

// Scheduler
export * from './scheduler.js';

// Persistence
export * from './persistence.js';

// Repository
export * from './repositories/publishJobRepository.js';

// Product Content Loader
export * from './productContentLoader.js';

// Result Builder
export * from './resultBuilder.js';

// Pipeline
export * from './publishPreparationPipeline.js';

// ============================================
// Convenience Functions
// ============================================

// Re-export commonly used functions
import { preparePublishingForProduct, preparePublishingBatch, preparePublishingForProducts } from './publishPreparationPipeline.js';
import { loadProductsReadyForPublishing } from './productContentLoader.js';
import { getPublishJobRepository, getReadyPublishJobs } from './repositories/publishJobRepository.js';

export {
  // Pipeline functions
  preparePublishingForProduct,
  preparePublishingBatch,
  preparePublishingForProducts,

  // Loader
  loadProductsReadyForPublishing,

  // Repository
  getPublishJobRepository,
  getReadyPublishJobs,
};

// Default export for convenience
export default {
  preparePublishingForProduct,
  preparePublishingBatch,
  preparePublishingForProducts,
  loadProductsReadyForPublishing,
  getPublishJobRepository,
  getReadyPublishJobs,
};
