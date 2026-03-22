// =============================================================================
// Voucher Override Service
// Production-grade service for managing voucher rule overrides
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  VoucherOverrideRecord,
  VoucherOverrideType,
  VoucherOverrideStatus,
  VoucherNormalizedRecord,
} from '../types.js';
import { OVERRIDE } from '../constants.js';
import { voucherOverrideRepository } from '../repositories/voucherOverrideRepository.js';
import { logger } from '../../utils/logger.js';

export interface CreateVoucherOverrideInput {
  voucherId: string;
  overrideType: VoucherOverrideType;
  overridePayload: Record<string, unknown>;
  createdBy?: string;
  expiresInDays?: number;
}

export interface ApplyOverridesOptions {
  currentTime?: Date;
}

/**
 * Create a new voucher override
 */
export async function createVoucherOverride(input: CreateVoucherOverrideInput): Promise<VoucherOverrideRecord> {
  logger.info({ voucherId: input.voucherId, type: input.overrideType }, 'Creating voucher override');

  // Validate override
  const validation = validateVoucherOverride(input);
  if (!validation.valid) {
    throw new Error(`Invalid override: ${validation.errors.join(', ')}`);
  }

  // Calculate expiry
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + OVERRIDE.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const override: VoucherOverrideRecord = {
    id: uuidv4(),
    voucherId: input.voucherId,
    overrideType: input.overrideType,
    overridePayload: input.overridePayload,
    overrideStatus: 'active',
    createdBy: input.createdBy || 'system',
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const created = await voucherOverrideRepository.create(override);

  logger.info({ overrideId: created.id, voucherId: input.voucherId }, 'Voucher override created');

  return created;
}

/**
 * Apply overrides to a voucher
 */
export function applyVoucherOverrides(
  voucher: VoucherNormalizedRecord,
  overrides: VoucherOverrideRecord[],
  options?: ApplyOverridesOptions
): VoucherNormalizedRecord {
  const now = options?.currentTime || new Date();
  const effectiveOverrides = overrides.filter((o) => {
    // Must be active
    if (o.overrideStatus !== 'active') {
      return false;
    }

    // Must not be expired
    if (o.expiresAt && o.expiresAt < now) {
      return false;
    }

    // Must match voucher
    return o.voucherId === voucher.id;
  });

  if (effectiveOverrides.length === 0) {
    return voucher;
  }

  // Clone voucher to avoid mutation
  const modified = { ...voucher };

  // Apply each override type
  for (const override of effectiveOverrides) {
    switch (override.overrideType) {
      case 'eligibility':
        // Modify eligibility criteria
        if (override.overridePayload.isEligible !== undefined) {
          modified.isActive = override.overridePayload.isEligible as boolean;
        }
        break;

      case 'ranking':
        // Modify ranking priority
        if (override.overridePayload.priorityBoost) {
          // This would affect ranking - stored in metadata
          (modified as unknown as Record<string, unknown>).__rankingBoost = override.overridePayload.priorityBoost;
        }
        break;

      case 'visibility':
        // Modify visibility
        if (override.overridePayload.hidden !== undefined) {
          modified.isActive = !(override.overridePayload.hidden as boolean);
        }
        break;

      case 'exclusion':
        // Completely exclude voucher
        if (override.overridePayload.excluded === true) {
          modified.isActive = false;
        }
        break;

      case 'priority':
        // Set explicit priority
        if (override.overridePayload.priority !== undefined) {
          (modified as unknown as Record<string, unknown>).__priority = override.overridePayload.priority;
        }
        break;
    }
  }

  return modified;
}

/**
 * Get all active overrides for a voucher
 */
export async function getActiveOverridesForVoucher(voucherId: string): Promise<VoucherOverrideRecord[]> {
  return voucherOverrideRepository.findActiveByVoucherId(voucherId);
}

/**
 * Get all overrides for a voucher (including expired)
 */
export async function getAllOverridesForVoucher(voucherId: string): Promise<VoucherOverrideRecord[]> {
  return voucherOverrideRepository.findByVoucherId(voucherId);
}

/**
 * Expire overrides that have passed their expiry date
 */
export async function expireVoucherOverrides(options?: {
  batchSize?: number;
}): Promise<{
  expired: number;
  errors: string[];
}> {
  const now = new Date();
  const expiredOverrides = await voucherOverrideRepository.findExpired(now);

  let expired = 0;
  const errors: string[] = [];

  for (const override of expiredOverrides) {
    try {
      await voucherOverrideRepository.update(override.id, {
        overrideStatus: 'expired',
        updatedAt: new Date(),
      });
      expired++;
    } catch (error) {
      errors.push(`Failed to expire override ${override.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  logger.info({ expired, errors: errors.length }, 'Voucher override expiration completed');

  return { expired, errors };
}

/**
 * Cancel an override
 */
export async function cancelVoucherOverride(overrideId: string, cancelledBy?: string): Promise<VoucherOverrideRecord> {
  const existing = await voucherOverrideRepository.findById(overrideId);
  if (!existing) {
    throw new Error(`Override not found: ${overrideId}`);
  }

  if (existing.overrideStatus !== 'active') {
    throw new Error(`Override is not active: ${existing.overrideStatus}`);
  }

  const updated = await voucherOverrideRepository.update(overrideId, {
    overrideStatus: 'cancelled',
    updatedAt: new Date(),
  });

  logger.info({ overrideId, cancelledBy }, 'Voucher override cancelled');

  return updated;
}

/**
 * Validate voucher override
 */
export function validateVoucherOverride(input: CreateVoucherOverrideInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate override type
  if (!OVERRIDE.OVERRIDE_TYPES.includes(input.overrideType)) {
    errors.push(`Invalid override type: ${input.overrideType}`);
  }

  // Validate payload based on type
  switch (input.overrideType) {
    case 'eligibility':
      if (input.overridePayload.isEligible !== undefined && typeof input.overridePayload.isEligible !== 'boolean') {
        errors.push('eligibility override requires boolean isEligible field');
      }
      break;

    case 'ranking':
      if (input.overridePayload.priorityBoost !== undefined && typeof input.overridePayload.priorityBoost !== 'number') {
        errors.push('ranking override requires numeric priorityBoost field');
      }
      break;

    case 'visibility':
      if (input.overridePayload.hidden !== undefined && typeof input.overridePayload.hidden !== 'boolean') {
        errors.push('visibility override requires boolean hidden field');
      }
      break;

    case 'exclusion':
      if (input.overridePayload.excluded !== undefined && typeof input.overridePayload.excluded !== 'boolean') {
        errors.push('exclusion override requires boolean excluded field');
      }
      break;

    case 'priority':
      if (input.overridePayload.priority !== undefined && typeof input.overridePayload.priority !== 'number') {
        errors.push('priority override requires numeric priority field');
      }
      break;
  }

  // Validate expiry
  if (input.expiresInDays !== undefined) {
    if (input.expiresInDays < OVERRIDE.MIN_EXPIRY_DAYS || input.expiresInDays > OVERRIDE.MAX_EXPIRY_DAYS) {
      errors.push(`Expiry must be between ${OVERRIDE.MIN_EXPIRY_DAYS} and ${OVERRIDE.MAX_EXPIRY_DAYS} days`);
    }
  }

  return { valid: errors.length === 0, errors };
}
