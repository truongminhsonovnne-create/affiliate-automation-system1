/**
 * Dead Letter Service
 *
 * Handles dead letter record queries and operations.
 */

import type {
  ControlPlaneRequestContext,
  AdminActionResult,
  DeadLetterQueryFilters,
  RequeueDeadLetterRequest,
  MarkDeadLetterResolvedRequest,
} from '../types.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { recordAdminActionSuccess, recordAdminActionFailure, recordAdminActionRejected } from '../audit/adminAuditLogger.js';
import { guardDeadLetterRequeueRequest, guardMarkDeadLetterResolvedRequest } from '../guards/operationalGuards.js';

const logger = createLogger({ subsystem: 'dead_letter_service' });

/**
 * Get dead letter records
 */
export async function getDeadLetterRecords(
  filters: DeadLetterQueryFilters,
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
        actionType: 'dead_letter.read',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('dead_letter_jobs')
      .select('*', { count: 'exact' });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.operation) {
      query = query.eq('operation', filters.operation);
    }

    if (filters.errorCategory) {
      query = query.eq('error_category', filters.errorCategory);
    }

    if (filters.since) {
      query = query.gte('created_at', filters.since);
    }

    if (filters.until) {
      query = query.lte('created_at', filters.until);
    }

    if (filters.search) {
      query = query.ilike('error_message', `%${filters.search}%`);
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
      actionType: 'dead_letter.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get dead letter records', error, { actorId: context.actor.id });

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'dead_letter.read',
    };
  }
}

/**
 * Get dead letter detail
 */
export async function getDeadLetterDetail(
  id: string,
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
        actionType: 'dead_letter.detail',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('dead_letter_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Dead letter record '${id}' not found` },
        correlationId: context.correlationId,
        actionType: 'dead_letter.detail',
        targetId: id,
      };
    }

    return {
      success: true,
      data,
      correlationId: context.correlationId,
      actionType: 'dead_letter.detail',
      targetType: 'dead_letter',
      targetId: id,
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'dead_letter.detail',
    };
  }
}

/**
 * Requeue dead letter record
 */
export async function requeueDeadLetterRecord(
  request: RequeueDeadLetterRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Run guard
    const guard = await guardDeadLetterRequeueRequest(context.actor, request);

    if (!guard.allowed) {
      recordAdminActionRejected(
        context.actor.id,
        context.actor.role,
        'dead_letter.requeue',
        guard.reason || 'Requeue rejected by guard',
        { targetId: request.deadLetterId, requestPayload: request, correlationId: context.correlationId }
      );

      return {
        success: false,
        error: {
          code: 'GUARD_REJECTED',
          message: guard.reason || 'Requeue rejected',
        },
        correlationId: context.correlationId,
        actionType: 'dead_letter.requeue',
        targetId: request.deadLetterId,
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
        actionType: 'dead_letter.requeue',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get original job details
    const { data: dl } = await supabase
      .from('dead_letter_jobs')
      .select('original_job_id, operation')
      .eq('id', request.deadLetterId)
      .single();

    // Update status to resolved (re-queued)
    const { error } = await supabase
      .from('dead_letter_jobs')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution: 'Requeued for processing',
        resolved_by: context.actor.id,
      })
      .eq('id', request.deadLetterId);

    if (error) {
      throw error;
    }

    logger.info('Dead letter requeued', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      deadLetterId: request.deadLetterId,
      originalJobId: dl?.original_job_id,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'dead_letter.requeue',
      {
        targetType: 'dead_letter',
        targetId: request.deadLetterId,
        requestPayload: request,
        resultSummary: 'Dead letter requeued',
        correlationId: context.correlationId,
      }
    );

    return {
      success: true,
      data: {
        deadLetterId: request.deadLetterId,
        status: 'resolved',
        message: 'Dead letter requeued successfully',
      },
      correlationId: context.correlationId,
      actionType: 'dead_letter.requeue',
      targetType: 'dead_letter',
      targetId: request.deadLetterId,
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to requeue dead letter', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'dead_letter.requeue',
      error,
      { targetId: request.deadLetterId, requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'dead_letter.requeue',
    };
  }
}

/**
 * Mark dead letter resolved
 */
export async function markDeadLetterResolved(
  request: MarkDeadLetterResolvedRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Run guard
    const guard = await guardMarkDeadLetterResolvedRequest(context.actor, request);

    if (!guard.allowed) {
      recordAdminActionRejected(
        context.actor.id,
        context.actor.role,
        'dead_letter.resolve',
        guard.reason || 'Resolve rejected by guard',
        { targetId: request.deadLetterId, requestPayload: request, correlationId: context.correlationId }
      );

      return {
        success: false,
        error: {
          code: 'GUARD_REJECTED',
          message: guard.reason || 'Resolve rejected',
        },
        correlationId: context.correlationId,
        actionType: 'dead_letter.resolve',
        targetId: request.deadLetterId,
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
        actionType: 'dead_letter.resolve',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('dead_letter_jobs')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution: request.resolution,
        resolved_by: context.actor.id,
      })
      .eq('id', request.deadLetterId);

    if (error) {
      throw error;
    }

    logger.info('Dead letter resolved', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      deadLetterId: request.deadLetterId,
      resolution: request.resolution,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'dead_letter.resolve',
      {
        targetType: 'dead_letter',
        targetId: request.deadLetterId,
        requestPayload: request,
        resultSummary: request.resolution,
        correlationId: context.correlationId,
      }
    );

    return {
      success: true,
      data: {
        deadLetterId: request.deadLetterId,
        status: 'resolved',
        resolution: request.resolution,
        message: 'Dead letter marked as resolved',
      },
      correlationId: context.correlationId,
      actionType: 'dead_letter.resolve',
      targetType: 'dead_letter',
      targetId: request.deadLetterId,
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to resolve dead letter', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'dead_letter.resolve',
      error,
      { targetId: request.deadLetterId, requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'dead_letter.resolve',
    };
  }
}
