// =============================================================================
// Voucher Rule Authoring Service
// Production-grade service for creating and managing voucher rule sets
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  VoucherRuleSet,
  VoucherRuleStatus,
  VoucherRuleValidationStatus,
  VoucherRulePayload,
} from '../types.js';
import { RULE_STATUS, VALIDATION_STATUS } from '../constants.js';
import { voucherRuleSetRepository } from '../repositories/voucherRuleSetRepository.js';
import { validateVoucherRuleSet } from './voucherRuleSchema.js';
import { validateVoucherRuleSet as validateRuleLogic } from './voucherRuleValidator.js';
import { recordVoucherRuleCreated, recordVoucherRuleActivated, recordVoucherRuleArchived } from '../observability/voucherDataEvents.js';
import { logger } from '../../utils/logger.js';

export interface CreateVoucherRuleSetInput {
  voucherId: string;
  ruleVersion: string;
  rulePayload: VoucherRulePayload;
  createdBy?: string;
}

export interface UpdateVoucherRuleSetInput {
  ruleVersion?: string;
  rulePayload?: VoucherRulePayload;
}

export interface ActivateVoucherRuleSetOptions {
  activatedBy?: string;
}

export interface ArchiveVoucherRuleSetOptions {
  archivedBy?: string;
}

/**
 * Create a new voucher rule set
 */
export async function createVoucherRuleSet(
  input: CreateVoucherRuleSetInput,
  options?: { skipValidation?: boolean }
): Promise<VoucherRuleSet> {
  logger.info({ voucherId: input.voucherId, version: input.ruleVersion }, 'Creating voucher rule set');

  // Validate rule payload structure
  const validationResult = validateVoucherRuleSet(input.rulePayload);
  if (!validationResult.success) {
    throw new Error(`Invalid rule payload: ${validationResult.errors?.message}`);
  }

  // Validate rule logic if not skipped
  if (!options?.skipValidation) {
    const logicValidation = validateRuleLogic(input.rulePayload);
    if (!logicValidation.valid) {
      throw new Error(`Rule logic validation failed: ${logicValidation.errors.map((e) => e.message).join(', ')}`);
    }
  }

  // Check if voucher exists
  const existingRules = await voucherRuleSetRepository.findByVoucherId(input.voucherId);
  const hasActiveRule = existingRules.some((r) => r.ruleStatus === 'active');

  const ruleSet: VoucherRuleSet = {
    id: uuidv4(),
    voucherId: input.voucherId,
    ruleVersion: input.ruleVersion,
    ruleStatus: RULE_STATUS.DRAFT,
    rulePayload: input.rulePayload,
    validationStatus: options?.skipValidation ? VALIDATION_STATUS.PENDING : VALIDATION_STATUS.VALID,
    validationErrors: options?.skipValidation ? null : [],
    createdBy: input.createdBy || 'system',
    activatedAt: null,
    deactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const created = await voucherRuleSetRepository.create(ruleSet);
  recordVoucherRuleCreated(input.voucherId, created.id, input.ruleVersion);

  logger.info({ ruleSetId: created.id, voucherId: input.voucherId }, 'Voucher rule set created');

  return created;
}

/**
 * Update an existing voucher rule set
 */
export async function updateVoucherRuleSet(
  ruleSetId: string,
  input: UpdateVoucherRuleSetOptions,
  options?: { skipValidation?: boolean }
): Promise<VoucherRuleSet> {
  logger.info({ ruleSetId }, 'Updating voucher rule set');

  const existing = await voucherRuleSetRepository.findById(ruleSetId);
  if (!existing) {
    throw new Error(`Rule set not found: ${ruleSetId}`);
  }

  // Can only update draft rules
  if (existing.ruleStatus !== RULE_STATUS.DRAFT) {
    throw new Error(`Cannot update rule set in status: ${existing.ruleStatus}`);
  }

  // Validate new payload if provided
  if (input.rulePayload) {
    const validationResult = validateVoucherRuleSet(input.rulePayload);
    if (!validationResult.success) {
      throw new Error(`Invalid rule payload: ${validationResult.errors?.message}`);
    }

    // Validate rule logic if not skipped
    if (!options?.skipValidation) {
      const logicValidation = validateRuleLogic(input.rulePayload);
      if (!logicValidation.valid) {
        throw new Error(`Rule logic validation failed: ${logicValidation.errors.map((e) => e.message).join(', ')}`);
      }
    }
  }

  const updates: Partial<VoucherRuleSet> = {
    updatedAt: new Date(),
    validationStatus: options?.skipValidation ? VALIDATION_STATUS.PENDING : VALIDATION_STATUS.VALID,
    validationErrors: null,
  };

  if (input.ruleVersion) {
    updates.ruleVersion = input.ruleVersion;
  }

  if (input.rulePayload) {
    updates.rulePayload = input.rulePayload;
  }

  const updated = await voucherRuleSetRepository.update(ruleSetId, updates);

  logger.info({ ruleSetId }, 'Voucher rule set updated');

  return updated;
}

/**
 * Activate a voucher rule set
 */
export async function activateVoucherRuleSet(
  ruleSetId: string,
  options?: ActivateVoucherRuleSetOptions
): Promise<VoucherRuleSet> {
  logger.info({ ruleSetId }, 'Activating voucher rule set');

  const existing = await voucherRuleSetRepository.findById(ruleSetId);
  if (!existing) {
    throw new Error(`Rule set not found: ${ruleSetId}`);
  }

  // Must be in draft or archived status
  if (existing.ruleStatus === RULE_STATUS.ACTIVE) {
    throw new Error('Rule set is already active');
  }

  if (existing.ruleStatus === RULE_STATUS.SUPERSEDED) {
    throw new Error('Cannot activate a superseded rule set');
  }

  // Must be validated
  if (existing.validationStatus === VALIDATION_STATUS.INVALID) {
    throw new Error('Cannot activate an invalid rule set');
  }

  // Deactivate any existing active rules for this voucher
  const existingRules = await voucherRuleSetRepository.findByVoucherId(existing.voucherId);
  for (const rule of existingRules) {
    if (rule.id !== ruleSetId && rule.ruleStatus === RULE_STATUS.ACTIVE) {
      await voucherRuleSetRepository.update(rule.id, {
        ruleStatus: RULE_STATUS.SUPERSEDED,
        deactivatedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Activate this rule
  const activated = await voucherRuleSetRepository.update(ruleSetId, {
    ruleStatus: RULE_STATUS.ACTIVE,
    activatedAt: new Date(),
    deactivatedAt: null,
    updatedAt: new Date(),
  });

  recordVoucherRuleActivated(existing.voucherId, ruleSetId, options?.activatedBy);

  logger.info({ ruleSetId, voucherId: existing.voucherId }, 'Voucher rule set activated');

  return activated;
}

/**
 * Archive a voucher rule set
 */
export async function archiveVoucherRuleSet(
  ruleSetId: string,
  options?: ArchiveVoucherRuleSetOptions
): Promise<VoucherRuleSet> {
  logger.info({ ruleSetId }, 'Archiving voucher rule set');

  const existing = await voucherRuleSetRepository.findById(ruleSetId);
  if (!existing) {
    throw new Error(`Rule set not found: ${ruleSetId}`);
  }

  // Cannot archive active rules directly - must deactivate first
  if (existing.ruleStatus === RULE_STATUS.ACTIVE) {
    throw new Error('Cannot archive an active rule set. Deactivate it first.');
  }

  const archived = await voucherRuleSetRepository.update(ruleSetId, {
    ruleStatus: RULE_STATUS.ARCHIVED,
    deactivatedAt: new Date(),
    updatedAt: new Date(),
  });

  recordVoucherRuleArchived(existing.voucherId, ruleSetId, options?.archivedBy);

  logger.info({ ruleSetId }, 'Voucher rule set archived');

  return archived;
}

/**
 * Get active rule for a voucher
 */
export async function getActiveRuleForVoucher(voucherId: string): Promise<VoucherRuleSet | null> {
  const rules = await voucherRuleSetRepository.findByVoucherId(voucherId);
  return rules.find((r) => r.ruleStatus === RULE_STATUS.ACTIVE) || null;
}

/**
 * Get all rules for a voucher
 */
export async function getAllRulesForVoucher(voucherId: string): Promise<VoucherRuleSet[]> {
  return voucherRuleSetRepository.findByVoucherId(voucherId);
}

/**
 * List rule sets with filters
 */
export async function listVoucherRuleSets(options?: {
  voucherId?: string;
  ruleStatus?: VoucherRuleStatus;
  validationStatus?: VoucherRuleValidationStatus;
  limit?: number;
  offset?: number;
}): Promise<{ ruleSets: VoucherRuleSet[]; total: number }> {
  return voucherRuleSetRepository.findWithFilters(options);
}
