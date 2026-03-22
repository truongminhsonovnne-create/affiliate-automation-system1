/**
 * Publishing Operations Service
 *
 * Handles publishing preparation, publisher runner, and publish job operations.
 */

import type {
  ControlPlaneRequestContext,
  AdminActionResult,
  ManualPublishPreparationRequest,
  ManualPublisherRunRequest,
  PublishJobQueryFilters,
  RetryPublishJobRequest,
  CancelPublishJobRequest,
  UnlockStalePublishJobRequest,
} from '../types.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { recordAdminActionSuccess, recordAdminActionFailure, recordAdminActionRejected } from '../audit/adminAuditLogger.js';
import { guardManualPublisherRunRequest, guardRetryPublishJobRequest, guardCancelPublishJobRequest, guardUnlockStalePublishJobRequest } from '../guards/operationalGuards.js';

const logger = createLogger({ subsystem: 'publishing_operations_service' });

/**
 * Prepare publishing for products
 */
export async function preparePublishingForProducts(
  request: ManualPublishPreparationRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Validate input
    if (!request.productIds || request.productIds.length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one product ID is required',
          field: 'productIds',
        },
        correlationId: context.correlationId,
        actionType: 'publishing.prepare',
      };
    }

    if (request.productIds.length > 100) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Maximum 100 products per request',
          field: 'productIds',
        },
        correlationId: context.correlationId,
        actionType: 'publishing.prepare',
      };
    }

    // TODO: Integrate with actual publish preparation pipeline
    const preparationId = `prep_${Date.now().toString(36)}`;

    logger.info('Publishing preparation triggered', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      productCount: request.productIds.length,
      preparationId,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'publishing.prepare',
      {
        targetType: 'publish_job',
        requestPayload: { ...request, count: request.productIds.length },
        resultSummary: `Prepared ${request.productIds.length} products for publishing`,
        correlationId: context.correlationId,
      }
    );

    return {
      success: true,
      data: {
        preparationId,
        count: request.productIds.length,
        status: 'queued',
        message: `Publishing preparation for ${request.productIds.length} products queued`,
      },
      correlationId: context.correlationId,
      actionType: 'publishing.prepare',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to prepare publishing', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'publishing.prepare',
      error,
      { requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'publishing.prepare',
    };
  }
}

/**
 * Run publisher once
 */
export async function runPublisherOnce(
  request: ManualPublisherRunRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Run operational guard
    const guard = guardManualPublisherRunRequest(context.actor, request);

    if (!guard.allowed) {
      recordAdminActionRejected(
        context.actor.id,
        context.actor.role,
        'publishing.run',
        guard.reason || 'Operation rejected by guard',
        { requestPayload: request, correlationId: context.correlationId }
      );

      return {
        success: false,
        error: {
          code: 'GUARD_REJECTED',
          message: guard.reason || 'Operation rejected',
        },
        correlationId: context.correlationId,
        actionType: 'publishing.run',
      };
    }

    // TODO: Integrate with actual publisher runner
    const runId = `pub_run_${Date.now().toString(36)}`;

    logger.info('Publisher run triggered', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      channels: request.channels,
      limit: request.limit,
      dryRun: request.dryRun,
      runId,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'publishing.run',
      {
        targetType: 'publish_job',
        requestPayload: request,
        resultSummary: `Publisher run initiated (dry-run: ${request.dryRun})`,
        correlationId: context.correlationId,
        metadata: { warnings: guard.warnings },
      }
    );

    return {
      success: true,
      data: {
        runId,
        status: 'started',
        message: request.dryRun
          ? 'Publisher dry-run completed'
          : 'Publisher run started',
        warnings: guard.warnings,
      },
      correlationId: context.correlationId,
      actionType: 'publishing.run',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to run publisher', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'publishing.run',
      error,
      { requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'publishing.run',
    };
  }
}

/**
 * Get publish jobs with filters
 */
export async function getPublishJobs(
  filters: PublishJobQueryFilters,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'publishing.jobs.read',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('publish_jobs')
      .select('*', { count: 'exact' });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.channel) {
      query = query.eq('channel', filters.channel);
    }

    if (filters.priority !== undefined) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.claimedBy) {
      query = query.eq('claimed_by', filters.claimedBy);
    }

    if (filters.since) {
      query = query.gte('created_at', filters.since);
    }

    if (filters.until) {
      query = query.lte('created_at', filters.until);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: {
        items: data || [],
        pagination: {
          page,
          pageSize,
          totalItems: count || 0,
          hasMore: (offset + pageSize) < (count || 0),
        },
      },
      correlationId: context.correlationId,
      actionType: 'publishing.jobs.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get publish jobs', error, { actorId: context.actor.id });

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'publishing.jobs.read',
    };
  }
}

/**
 * Get publish job detail
 */
export async function getPublishJobDetail(
  jobId: string,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'publishing.job.detail',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: job, error: jobError } = await supabase
      .from('publish_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Publish job '${jobId}' not found` },
        correlationId: context.correlationId,
        actionType: 'publishing.job.detail',
        targetId: jobId,
      };
    }

    // Get attempts
    const { data: attempts } = await supabase
      .from('publish_job_attempts')
      .select('*')
      .eq('publish_job_id', jobId)
      .order('attempt_number', { ascending: false })
      .limit(10);

    return {
      success: true,
      data: {
        ...job,
        attempts: attempts || [],
      },
      correlationId: context.correlationId,
      actionType: 'publishing.job.detail',
      targetType: 'publish_job',
      targetId: jobId,
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'publishing.job.detail',
    };
  }
}

/**
 * Retry publish job
 */
export async function retryPublishJob(
  request: RetryPublishJobRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Run guard
    const guard = await guardRetryPublishJobRequest(context.actor, request);

    if (!guard.allowed) {
      recordAdminActionRejected(
        context.actor.id,
        context.actor.role,
        'publishing.job.retry',
        guard.reason || 'Retry rejected by guard',
        { targetId: request.jobId, requestPayload: request, correlationId: context.correlationId }
      );

      return {
        success: false,
        error: {
          code: 'GUARD_REJECTED',
          message: guard.reason || 'Retry rejected',
        },
        correlationId: context.correlationId,
        actionType: 'publishing.job.retry',
        targetId: request.jobId,
      };
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'publishing.job.retry',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update job status to ready for retry
    const { error } = await supabase
      .from('publish_jobs')
      .update({
        status: 'ready',
        claimed_at: null,
        claimed_by: null,
        lock_expires_at: null,
        last_attempt_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.jobId);

    if (error) {
      throw error;
    }

    logger.info('Publish job retry queued', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      jobId: request.jobId,
      reason: request.reason,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'publishing.job.retry',
      {
        targetType: 'publish_job',
        targetId: request.jobId,
        requestPayload: request,
        resultSummary: request.reason || 'Job queued for retry',
        correlationId: context.correlationId,
      }
    );

    return {
      success: true,
      data: {
        jobId: request.jobId,
        status: 'ready',
        message: 'Job queued for retry',
        reason: request.reason,
      },
      correlationId: context.correlationId,
      actionType: 'publishing.job.retry',
      targetType: 'publish_job',
      targetId: request.jobId,
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to retry publish job', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'publishing.job.retry',
      error,
      { targetId: request.jobId, requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'publishing.job.retry',
    };
  }
}

/**
 * Cancel publish job
 */
export async function cancelPublishJob(
  request: CancelPublishJobRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Run guard
    const guard = await guardCancelPublishJobRequest(context.actor, request);

    if (!guard.allowed) {
      recordAdminActionRejected(
        context.actor.id,
        context.actor.role,
        'publishing.job.cancel',
        guard.reason || 'Cancel rejected by guard',
        { targetId: request.jobId, requestPayload: request, correlationId: context.correlationId }
      );

      return {
        success: false,
        error: {
          code: 'GUARD_REJECTED',
          message: guard.reason || 'Cancel rejected',
        },
        correlationId: context.correlationId,
        actionType: 'publishing.job.cancel',
        targetId: request.jobId,
      };
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'publishing.job.cancel',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update job status to cancelled
    const { error } = await supabase
      .from('publish_jobs')
      .update({
        status: 'failed',
        claimed_at: null,
        claimed_by: null,
        lock_expires_at: null,
        updated_at: new Date().toISOString(),
        execution_metadata: { cancelled: true, reason: request.reason },
      })
      .eq('id', request.jobId);

    if (error) {
      throw error;
    }

    logger.info('Publish job cancelled', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      jobId: request.jobId,
      reason: request.reason,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'publishing.job.cancel',
      {
        targetType: 'publish_job',
        targetId: request.jobId,
        requestPayload: request,
        resultSummary: request.reason,
        correlationId: context.correlationId,
      }
    );

    return {
      success: true,
      data: {
        jobId: request.jobId,
        status: 'cancelled',
        message: 'Job cancelled',
        reason: request.reason,
      },
      correlationId: context.correlationId,
      actionType: 'publishing.job.cancel',
      targetType: 'publish_job',
      targetId: request.jobId,
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to cancel publish job', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'publishing.job.cancel',
      error,
      { targetId: request.jobId, requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'publishing.job.cancel',
    };
  }
}

/**
 * Unlock stale publish job
 */
export async function unlockStalePublishJob(
  request: UnlockStalePublishJobRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Run guard
    const guard = await guardUnlockStalePublishJobRequest(context.actor, request);

    if (!guard.allowed) {
      recordAdminActionRejected(
        context.actor.id,
        context.actor.role,
        'publishing.job.unlock',
        guard.reason || 'Unlock rejected by guard',
        { targetId: request.jobId, requestPayload: request, correlationId: context.correlationId }
      );

      return {
        success: false,
        error: {
          code: 'GUARD_REJECTED',
          message: guard.reason || 'Unlock rejected',
        },
        correlationId: context.correlationId,
        actionType: 'publishing.job.unlock',
        targetId: request.jobId,
      };
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'publishing.job.unlock',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Release lock and reset job
    const { error } = await supabase
      .from('publish_jobs')
      .update({
        status: 'ready',
        claimed_at: null,
        claimed_by: null,
        lock_expires_at: null,
        updated_at: new Date().toISOString(),
        execution_metadata: { unlocked: true, reason: request.reason },
      })
      .eq('id', request.jobId);

    if (error) {
      throw error;
    }

    logger.warn('Stale publish job unlocked', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      jobId: request.jobId,
      reason: request.reason,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'publishing.job.unlock',
      {
        targetType: 'publish_job',
        targetId: request.jobId,
        requestPayload: request,
        resultSummary: `Stale job unlocked: ${request.reason}`,
        correlationId: context.correlationId,
      }
    );

    return {
      success: true,
      data: {
        jobId: request.jobId,
        status: 'ready',
        message: 'Stale lock released, job reset to ready',
        reason: request.reason,
      },
      correlationId: context.correlationId,
      actionType: 'publishing.job.unlock',
      targetType: 'publish_job',
      targetId: request.jobId,
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to unlock stale publish job', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'publishing.job.unlock',
      error,
      { targetId: request.jobId, requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'publishing.job.unlock',
    };
  }
}
