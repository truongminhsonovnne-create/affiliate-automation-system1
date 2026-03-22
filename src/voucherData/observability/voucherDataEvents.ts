// =============================================================================
// Voucher Data Events
// Production-grade operational events for voucher data, rules, and evaluation
// =============================================================================

import { logger } from '../../utils/logger.js';
import { EVENT_NAMES } from '../constants.js';

/**
 * Record voucher ingestion started event
 */
export function recordVoucherIngestionStarted(sourceId: string, runId: string): void {
  logger.info(
    { sourceId, runId, event: EVENT_NAMES.INGESTION_STARTED },
    'Voucher ingestion started'
  );
}

/**
 * Record voucher ingestion completed event
 */
export function recordVoucherIngestionCompleted(
  sourceId: string,
  runId: string,
  itemsSeen: number,
  itemsInserted: number,
  itemsUpdated: number,
  itemsFailed: number
): void {
  logger.info(
    {
      sourceId,
      runId,
      itemsSeen,
      itemsInserted,
      itemsUpdated,
      itemsFailed,
      event: EVENT_NAMES.INGESTION_COMPLETED,
    },
    'Voucher ingestion completed'
  );
}

/**
 * Record voucher ingestion failed event
 */
export function recordVoucherIngestionFailed(sourceId: string, runId: string, error: string): void {
  logger.error(
    { sourceId, runId, error, event: EVENT_NAMES.INGESTION_FAILED },
    'Voucher ingestion failed'
  );
}

/**
 * Record voucher ingestion item validated event
 */
export function recordVoucherIngestionItemValidated(itemIndex: number, valid: boolean): void {
  logger.debug(
    { itemIndex, valid, event: EVENT_NAMES.INGESTION_ITEM_VALIDATED },
    'Voucher ingestion item validated'
  );
}

/**
 * Record voucher ingestion item normalized event
 */
export function recordVoucherIngestionItemNormalized(itemIndex: number, warnings: number): void {
  logger.debug(
    { itemIndex, warnings, event: EVENT_NAMES.INGESTION_ITEM_NORMALIZED },
    'Voucher ingestion item normalized'
  );
}

/**
 * Record voucher ingestion item persisted event
 */
export function recordVoucherIngestionItemPersisted(itemIndex: number, action: 'inserted' | 'updated' | 'skipped'): void {
  logger.debug(
    { itemIndex, action, event: EVENT_NAMES.INGESTION_ITEM_PERSISTED },
    'Voucher ingestion item persisted'
  );
}

// =============================================================================
// Rule Events
// =============================================================================

/**
 * Record voucher rule created event
 */
export function recordVoucherRuleCreated(voucherId: string, ruleId: string, version: string): void {
  logger.info(
    { voucherId, ruleId, version, event: EVENT_NAMES.RULE_CREATED },
    'Voucher rule created'
  );
}

/**
 * Record voucher rule updated event
 */
export function recordVoucherRuleUpdated(ruleId: string, changes: string[]): void {
  logger.info(
    { ruleId, changes, event: EVENT_NAMES.RULE_UPDATED },
    'Voucher rule updated'
  );
}

/**
 * Record voucher rule validated event
 */
export function recordVoucherRuleValidated(ruleId: string, valid: boolean, errors: number): void {
  logger.info(
    { ruleId, valid, errors, event: EVENT_NAMES.RULE_VALIDATED },
    'Voucher rule validated'
  );
}

/**
 * Record voucher rule activated event
 */
export function recordVoucherRuleActivated(voucherId: string, ruleId: string, activatedBy?: string): void {
  logger.info(
    { voucherId, ruleId, activatedBy, event: EVENT_NAMES.RULE_ACTIVATED },
    'Voucher rule activated'
  );
}

/**
 * Record voucher rule archived event
 */
export function recordVoucherRuleArchived(voucherId: string, ruleId: string, archivedBy?: string): void {
  logger.info(
    { voucherId, ruleId, archivedBy, event: EVENT_NAMES.RULE_ARCHIVED },
    'Voucher rule archived'
  );
}

// =============================================================================
// Evaluation Events
// =============================================================================

/**
 * Record voucher evaluation started event
 */
export function recordVoucherEvaluationStarted(platform: string): void {
  logger.info(
    { platform, event: EVENT_NAMES.EVALUATION_STARTED },
    'Voucher evaluation started'
  );
}

/**
 * Record voucher evaluation completed event
 */
export function recordVoucherEvaluationCompleted(
  platform: string,
  evaluationId: string,
  status: string,
  qualityScore: number | null
): void {
  logger.info(
    { platform, evaluationId, status, qualityScore, event: EVENT_NAMES.EVALUATION_COMPLETED },
    'Voucher evaluation completed'
  );
}

/**
 * Record voucher evaluation failed event
 */
export function recordVoucherEvaluationFailed(evaluationId: string, error: string): void {
  logger.error(
    { evaluationId, error, event: EVENT_NAMES.EVALUATION_FAILED },
    'Voucher evaluation failed'
  );
}

/**
 * Record voucher quality issue detected event
 */
export function recordVoucherQualityIssueDetected(issueType: string, severity: string, voucherId?: string): void {
  logger.warn(
    { issueType, severity, voucherId, event: EVENT_NAMES.QUALITY_ISSUE_DETECTED },
    'Voucher quality issue detected'
  );
}

// =============================================================================
// Override Events
// =============================================================================

/**
 * Record voucher override created event
 */
export function recordVoucherOverrideCreated(overrideId: string, voucherId: string, type: string): void {
  logger.info(
    { overrideId, voucherId, type, event: EVENT_NAMES.OVERRIDE_CREATED },
    'Voucher override created'
  );
}

/**
 * Record voucher override expired event
 */
export function recordVoucherOverrideExpired(overrideId: string): void {
  logger.info(
    { overrideId, event: EVENT_NAMES.OVERRIDE_EXPIRED },
    'Voucher override expired'
  );
}

/**
 * Record voucher override applied event
 */
export function recordVoucherOverrideApplied(voucherId: string, overrideId: string): void {
  logger.debug(
    { voucherId, overrideId, event: EVENT_NAMES.OVERRIDE_APPLIED },
    'Voucher override applied'
  );
}

// =============================================================================
// Freshness Events
// =============================================================================

/**
 * Record voucher became stale event
 */
export function recordVoucherBecameStale(voucherId: string): void {
  logger.info(
    { voucherId, event: EVENT_NAMES.VOUCHER_BECAME_STALE },
    'Voucher became stale'
  );
}

/**
 * Record voucher became fresh event
 */
export function recordVoucherBecameFresh(voucherId: string): void {
  logger.info(
    { voucherId, event: EVENT_NAMES.VOUCHER_BECAME_FRESH },
    'Voucher became fresh'
  );
}
