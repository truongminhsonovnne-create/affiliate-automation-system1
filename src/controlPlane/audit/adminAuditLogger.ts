/**
 * Admin Audit Logger
 *
 * Production-grade audit trail logging for all admin actions.
 */

import type { AdminAuditRecordInput, AdminActionType, AdminTargetType } from '../types.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { AUDIT_LOGGING_ENABLED, MAX_AUDIT_PAYLOAD_SIZE } from '../constants.js';
import { insertAdminActionLog } from '../repositories/adminActionLogRepository.js';

const logger = createLogger({ subsystem: 'admin_audit' });

/** In-memory audit buffer */
const auditBuffer: AdminAuditRecordInput[] = [];

/** Flush interval handle */
let flushInterval: NodeJS.Timeout | null = null;

/**
 * Initialize audit logger
 */
export function initializeAuditLogger(): void {
  if (flushInterval) return;

  // Flush every 5 seconds
  flushInterval = setInterval(() => {
    if (auditBuffer.length > 0) {
      flushAuditBuffer();
    }
  }, 5000);

  if (flushInterval.unref) {
    flushInterval.unref();
  }

  logger.info('Audit logger initialized');
}

/**
 * Stop audit logger
 */
export function stopAuditLogger(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
    flushAuditBuffer();
  }
}

/**
 * Flush audit buffer to database
 */
async function flushAuditBuffer(): Promise<void> {
  if (auditBuffer.length === 0) return;

  const toFlush = auditBuffer.splice(0, auditBuffer.length);

  try {
    // Process in background
    for (const record of toFlush) {
      try {
        await insertAdminActionLog(record);
      } catch (err) {
        logger.error('Failed to insert audit log', err as Error, {
          actionType: record.actionType,
          targetId: record.targetId,
        });
      }
    }
  } catch (err) {
    logger.error('Failed to flush audit buffer', err as Error);
    // Re-add failed records to buffer
    auditBuffer.unshift(...toFlush);
  }
}

/**
 * Record admin action
 */
export function recordAdminAction(
  input: AdminAuditRecordInput,
  options?: {
    immediate?: boolean;
  }
): void {
  if (!AUDIT_LOGGING_ENABLED) {
    logger.debug('Audit logging disabled, skipping', { actionType: input.actionType });
    return;
  }

  // Truncate payload if too large
  const sanitizedInput = sanitizePayload(input);

  if (options?.immediate) {
    // Flush immediately
    insertAdminActionLog(sanitizedInput).catch(err => {
      logger.error('Failed to record audit action immediately', err as Error, {
        actionType: input.actionType,
      });
    });
  } else {
    // Add to buffer
    auditBuffer.push(sanitizedInput);

    // Force flush if buffer is getting large
    if (auditBuffer.length >= 100) {
      flushAuditBuffer();
    }
  }

  // Also log to structured logger
  logToStructuredLogger(sanitizedInput);
}

/**
 * Record success action
 */
export function recordAdminActionSuccess(
  actorId: string,
  actorRole: string,
  actionType: AdminActionType,
  options?: {
    actorEmail?: string;
    targetType?: AdminTargetType;
    targetId?: string;
    requestPayload?: Record<string, unknown>;
    resultSummary?: string;
    correlationId?: string;
    sourceIp?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  recordAdminAction({
    actorId,
    actorRole: actorRole as any,
    actorEmail: options?.actorEmail,
    actionType,
    targetType: options?.targetType,
    targetId: options?.targetId,
    requestPayload: options?.requestPayload,
    resultStatus: 'success',
    resultSummary: options?.resultSummary,
    correlationId: options?.correlationId,
    sourceIp: options?.sourceIp,
    userAgent: options?.userAgent,
    metadata: options?.metadata,
  });
}

/**
 * Record failure action
 */
export function recordAdminActionFailure(
  actorId: string,
  actorRole: string,
  actionType: AdminActionType,
  error: Error,
  options?: {
    actorEmail?: string;
    targetType?: AdminTargetType;
    targetId?: string;
    requestPayload?: Record<string, unknown>;
    correlationId?: string;
    sourceIp?: string;
    userAgent?: string;
  }
): void {
  recordAdminAction({
    actorId,
    actorRole: actorRole as any,
    actorEmail: options?.actorEmail,
    actionType,
    targetType: options?.targetType,
    targetId: options?.targetId,
    requestPayload: options?.requestPayload,
    resultStatus: 'failure',
    resultSummary: error.message,
    resultErrorCode: (error as any).code || 'INTERNAL_ERROR',
    correlationId: options?.correlationId,
    sourceIp: options?.sourceIp,
    userAgent: options?.userAgent,
  });
}

/**
 * Record rejected action (blocked by guards/validation)
 */
export function recordAdminActionRejected(
  actorId: string,
  actorRole: string,
  actionType: AdminActionType,
  reason: string,
  options?: {
    actorEmail?: string;
    targetType?: AdminTargetType;
    targetId?: string;
    requestPayload?: Record<string, unknown>;
    correlationId?: string;
    sourceIp?: string;
    userAgent?: string;
  }
): void {
  recordAdminAction({
    actorId,
    actorRole: actorRole as any,
    actorEmail: options?.actorEmail,
    actionType,
    targetType: options?.targetType,
    targetId: options?.targetId,
    requestPayload: options?.requestPayload,
    resultStatus: 'rejected',
    resultSummary: reason,
    correlationId: options?.correlationId,
    sourceIp: options?.sourceIp,
    userAgent: options?.userAgent,
  });
}

/**
 * Record skipped action
 */
export function recordAdminActionSkipped(
  actorId: string,
  actorRole: string,
  actionType: AdminActionType,
  reason: string,
  options?: {
    actorEmail?: string;
    targetType?: AdminTargetType;
    targetId?: string;
    requestPayload?: Record<string, unknown>;
    correlationId?: string;
    sourceIp?: string;
    userAgent?: string;
  }
): void {
  recordAdminAction({
    actorId,
    actorRole: actorRole as any,
    actorEmail: options?.actorEmail,
    actionType,
    targetType: options?.targetType,
    targetId: options?.targetId,
    requestPayload: options?.requestPayload,
    resultStatus: 'skipped',
    resultSummary: reason,
    correlationId: options?.correlationId,
    sourceIp: options?.sourceIp,
    userAgent: options?.userAgent,
  });
}

/**
 * Sanitize payload to prevent oversized records
 */
function sanitizePayload(input: AdminAuditRecordInput): AdminAuditRecordInput {
  if (!input.requestPayload) return input;

  const payloadStr = JSON.stringify(input.requestPayload);

  if (payloadStr.length > MAX_AUDIT_PAYLOAD_SIZE) {
    return {
      ...input,
      requestPayload: {
        ...input.requestPayload,
        _truncated: true,
        _originalSize: payloadStr.length,
      },
    };
  }

  return input;
}

/**
 * Log to structured logger
 */
function logToStructuredLogger(input: AdminAuditRecordInput): void {
  const logFn = input.resultStatus === 'success' ? logger.info : logger.warn;

  logFn(`Admin action: ${input.actionType}`, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    targetType: input.targetType,
    targetId: input.targetId,
    resultStatus: input.resultStatus,
    resultSummary: input.resultSummary,
    correlationId: input.correlationId,
  });
}

/**
 * Get audit buffer size
 */
export function getAuditBufferSize(): number {
  return auditBuffer.length;
}

// Auto-initialize
initializeAuditLogger();
