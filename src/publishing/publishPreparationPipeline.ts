/**
 * Publish Preparation Pipeline
 *
 * Top-level orchestrator for the content scheduling + publishing preparation layer
 */

import type {
  PublishingChannel,
  PublishPreparationOptions,
  PublishPreparationResult,
  PublishPreparationBatchResult,
  PublishPreparationWarning,
  PublishPreparationError,
  ChannelPreparationResult,
  ChannelPublishPayload,
} from './types.js';
import { SUPPORTED_CHANNELS } from './types.js';
import {
  loadProductWithContentForPublishing,
  loadProductsWithContentForPublishing,
} from './productContentLoader.js';
import {
  evaluatePublishEligibility,
  evaluateChannelEligibility,
} from './eligibility.js';
import { buildPublishPayload } from './payloadBuilder.js';
import { schedulePublishJob } from './scheduler.js';
import {
  persistPublishJob,
  mapPreparedPayloadToPublishJobRecord,
} from './persistence.js';
import { getPublishJobRepository } from './repositories/publishJobRepository.js';
import {
  buildPublishPreparationResult,
  buildPublishPreparationBatchResult,
  createChannelPreparationResult,
  createPreparationWarning,
  createPreparationError,
} from './resultBuilder.js';
import { SCHEDULING_DEFAULTS, LOG_CONFIG } from './constants.js';
import { log, info, warn, error, debug } from '../utils/logger.js';

// ============================================
// Pipeline Functions
// ============================================

/**
 * Prepare publishing for a single product across multiple channels
 */
export async function preparePublishingForProduct(
  productId: string,
  channels: PublishingChannel[],
  options?: PublishPreparationOptions
): Promise<PublishPreparationResult> {
  const startTime = new Date();
  const channelResults: ChannelPreparationResult[] = [];
  const allWarnings: PublishPreparationWarning[] = [];
  const allErrors: PublishPreparationError[] = [];

  // Validate channels
  const validChannels = channels.filter((ch) => SUPPORTED_CHANNELS.includes(ch));
  if (validChannels.length === 0) {
    return buildPublishPreparationResult({
      productId,
      channels: [],
      channelResults: [],
      startTime,
      endTime: new Date(),
      schedulingPolicyUsed: 'none',
    });
  }

  // Load product with content
  const productWithContent = await loadProductWithContentForPublishing(productId, {
    requireContent: options?.eligibility?.strictMode ?? false,
  });

  if (!productWithContent) {
    const error = createPreparationError(
      'PRODUCT_NOT_FOUND',
      `Product ${productId} not found`,
      { productId }
    );
    allErrors.push(error);

    return buildPublishPreparationResult({
      productId,
      channels: validChannels,
      channelResults: [],
      startTime,
      endTime: new Date(),
      schedulingPolicyUsed: 'none',
    });
  }

  const { product, content } = productWithContent;

  // Process each channel
  for (const channel of validChannels) {
    const channelResult = await processChannel(
      productWithContent,
      channel,
      options
    );
    channelResults.push(channelResult);

    if (channelResult.warning) {
      allWarnings.push(channelResult.warning);
    }
    if (channelResult.error) {
      allErrors.push(channelResult.error);
    }
  }

  const endTime = new Date();

  // Build result
  return buildPublishPreparationResult({
    productId,
    channels: validChannels,
    channelResults,
    startTime,
    endTime,
    schedulingPolicyUsed: options?.scheduling?.mode ?? SCHEDULING_DEFAULTS.DEFAULT_MODE,
  });
}

/**
 * Prepare publishing for multiple products across multiple channels
 */
export async function preparePublishingBatch(
  channels: PublishingChannel[],
  options?: PublishPreparationOptions
): Promise<PublishPreparationBatchResult> {
  const startTime = new Date();
  const allWarnings: PublishPreparationWarning[] = [];
  const allErrors: PublishPreparationError[] = [];

  // Validate channels
  const validChannels = channels.filter((ch) => SUPPORTED_CHANNELS.includes(ch));
  if (validChannels.length === 0) {
    return buildPublishPreparationBatchResult({
      channels: [],
      productResults: [],
      startTime,
      endTime: new Date(),
      schedulingPolicyUsed: 'none',
    });
  }

  // Load products with content
  const filters = options?.channels ? {} : undefined;
  const productsWithContent = await loadProductsWithContentForPublishing(
    {
      limit: options?.batchSize ?? 50,
      ...filters,
    },
    {
      requireContent: options?.eligibility?.strictMode ?? false,
    }
  );

  if (productsWithContent.length === 0) {
    return buildPublishPreparationBatchResult({
      channels: validChannels,
      productResults: [],
      startTime,
      endTime: new Date(),
      schedulingPolicyUsed: options?.scheduling?.mode ?? SCHEDULING_DEFAULTS.DEFAULT_MODE,
    });
  }

  // Process each product
  const productResults: PublishPreparationResult[] = [];
  const continueOnError = options?.continueOnError ?? true;

  for (const pwc of productsWithContent) {
    try {
      const result = await preparePublishingForProduct(
        pwc.product.id,
        validChannels,
        options
      );
      productResults.push(result);

      allWarnings.push(...result.warnings);
      allErrors.push(...result.errors);
    } catch (err) {
      error({ err, productId: pwc.product.id }, 'Error preparing publishing for product');

      if (!continueOnError) {
        throw error;
      }

      const err = createPreparationError(
        'PRODUCT_PROCESSING_ERROR',
        `Failed to process product: ${err instanceof Error ? err.message : 'Unknown error'}`,
        { productId: pwc.product.id }
      );
      allErrors.push(err);
    }
  }

  const endTime = new Date();

  return buildPublishPreparationBatchResult({
    channels: validChannels,
    productResults,
    startTime,
    endTime,
    schedulingPolicyUsed: options?.scheduling?.mode ?? SCHEDULING_DEFAULTS.DEFAULT_MODE,
  });
}

/**
 * Prepare publishing for specific products
 */
export async function preparePublishingForProducts(
  productIds: string[],
  channels: PublishingChannel[],
  options?: PublishPreparationOptions
): Promise<PublishPreparationBatchResult> {
  const startTime = new Date();
  const allWarnings: PublishPreparationWarning[] = [];
  const allErrors: PublishPreparationError[] = [];

  // Validate channels
  const validChannels = channels.filter((ch) => SUPPORTED_CHANNELS.includes(ch));
  if (validChannels.length === 0) {
    return buildPublishPreparationBatchResult({
      channels: [],
      productResults: [],
      startTime,
      endTime: new Date(),
      schedulingPolicyUsed: 'none',
    });
  }

  // Process each product
  const productResults: PublishPreparationResult[] = [];
  const continueOnError = options?.continueOnError ?? true;

  for (const productId of productIds) {
    try {
      const result = await preparePublishingForProduct(productId, validChannels, options);
      productResults.push(result);

      allWarnings.push(...result.warnings);
      allErrors.push(...result.errors);
    } catch (err) {
      error({ err, productId }, 'Error preparing publishing for product');

      if (!continueOnError) {
        throw error;
      }

      const err = createPreparationError(
        'PRODUCT_PROCESSING_ERROR',
        `Failed to process product: ${err instanceof Error ? err.message : 'Unknown error'}`,
        { productId }
      );
      allErrors.push(err);
    }
  }

  const endTime = new Date();

  return buildPublishPreparationBatchResult({
    channels: validChannels,
    productResults,
    startTime,
    endTime,
    schedulingPolicyUsed: options?.scheduling?.mode ?? SCHEDULING_DEFAULTS.DEFAULT_MODE,
  });
}

// ============================================
// Private Processing Functions
// ============================================

/**
 * Process a single channel for a product
 */
async function processChannel(
  productWithContent: Awaited<ReturnType<typeof loadProductWithContentForPublishing>>,
  channel: PublishingChannel,
  options?: PublishPreparationOptions
): Promise<ChannelPreparationResult> {
  if (!productWithContent) {
    return createChannelPreparationResult(
      channel,
      '',
      '',
      {
        error: createPreparationError('NO_PRODUCT', 'No product loaded'),
      }
    );
  }

  const { product, content } = productWithContent;

  if (!content) {
    return createChannelPreparationResult(
      channel,
      product.id,
      '',
      {
        eligible: false,
        error: createPreparationError(
          'NO_CONTENT',
          'No AI content available',
          { channel, productId: product.id }
        ),
      }
    );
  }

  // Step 1: Evaluate eligibility
  const eligibilityOptions = options?.eligibility ?? {};
  const eligibility = await evaluateChannelEligibility(
    productWithContent,
    channel,
    eligibilityOptions,
    getPublishJobRepository()
  );

  if (LOG_CONFIG.LOG_ELIGIBILITY_DECISIONS) {
    debug(
      { channel, productId: product.id, eligible: eligibility.eligible, reason: eligibility.reason },
      'Eligibility evaluation'
    );
  }

  if (!eligibility.eligible) {
    return createChannelPreparationResult(
      channel,
      product.id,
      content.id,
      {
        eligible: false,
        error: createPreparationError(
          'NOT_ELIGIBLE',
          eligibility.reason ?? 'Content not eligible for this channel',
          { channel, productId: product.id, contentId: content.id }
        ),
      }
    );
  }

  // Step 2: Build payload
  const payloadResult = buildPublishPayload(
    productWithContent,
    channel,
    options?.payload
  );

  if (LOG_CONFIG.LOG_PAYLOAD_BUILDS) {
    debug(
      { channel, productId: product.id, success: payloadResult.success },
      'Payload build'
    );
  }

  if (!payloadResult.success || !payloadResult.payload) {
    return createChannelPreparationResult(
      channel,
      product.id,
      content.id,
      {
        eligible: true,
        payloadBuilt: false,
        error: createPreparationError(
          'PAYLOAD_BUILD_FAILED',
          payloadResult.error ?? 'Failed to build payload',
          { channel, productId: product.id, contentId: content.id }
        ),
      }
    );
  }

  // Step 3: Schedule
  const schedulingOptions = options?.scheduling;
  const scheduleDecision = schedulePublishJob(payloadResult.payload, schedulingOptions);

  if (LOG_CONFIG.LOG_SCHEDULING_DECISIONS) {
    debug(
      { channel, productId: product.id, scheduledAt: scheduleDecision.scheduledAt, mode: scheduleDecision.mode },
      'Scheduling decision'
    );
  }

  // Step 4: Persist
  const jobInput = mapPreparedPayloadToPublishJobRecord(
    payloadResult.payload,
    {
      status: scheduleDecision.scheduledAt ? 'scheduled' : 'pending',
      scheduledAt: scheduleDecision.scheduledAt,
      priority: scheduleDecision.priority,
    }
  );

  const persistResult = await persistPublishJob(
    jobInput,
    options?.persistence,
    getPublishJobRepository()
  );

  if (LOG_CONFIG.LOG_PERSISTENCE_OPERATIONS) {
    debug(
      { channel, productId: product.id, action: persistResult.action, jobId: persistResult.jobId },
      'Persistence result'
    );
  }

  // Build result
  return createChannelPreparationResult(
    channel,
    product.id,
    content.id,
    {
      eligible: true,
      payloadBuilt: true,
      scheduled: scheduleDecision.scheduled !== false,
      persisted: persistResult.success,
      scheduledAt: scheduleDecision.scheduledAt,
      jobId: persistResult.jobId,
      warning: persistResult.action === 'skipped'
        ? createPreparationWarning(
            'SKIPPED',
            persistResult.reason ?? 'Job already exists',
            { channel, productId: product.id, contentId: content.id, severity: 'low' }
          )
        : undefined,
    }
  );
}
