/**
 * Platform Exception Service
 * Manages intentional platform exceptions/differences
 */

import type {
  PlatformKey,
  PlatformExceptionRecord,
  PlatformExceptionInput,
  PlatformParityGapArea,
  PlatformParityScope,
  PlatformCapabilityMatrix,
} from '../types.js';

import { PlatformExceptionStatus as Status } from '../types.js';
import { EXCEPTION_REVIEW_WINDOW_MS } from '../constants.js';

export interface ExceptionRegistryEntry {
  id: string;
  platformKey: PlatformKey;
  exceptionArea: PlatformParityGapArea;
  exceptionStatus: PlatformExceptionStatus;
  exceptionPayload: Record<string, unknown>;
  rationale?: string;
  createdAt: Date;
  resolvedAt?: Date;
  isActive: boolean;
  needsReview: boolean;
  daysSinceCreation: number;
}

export interface ExceptionSummary {
  totalExceptions: number;
  activeExceptions: number;
  exceptionsNeedingReview: number;
  deprecatedExceptions: number;
  exceptionsByArea: Record<PlatformParityGapArea, number>;
  exceptionsByPlatform: Record<PlatformKey, number>;
  reviewRecommendations: ExceptionReviewRecommendation[];
}

export interface ExceptionReviewRecommendation {
  exceptionId: string;
  recommendation: 'approve_continue' | 'deprecate' | 'resolve' | 're_evaluate';
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Register a new platform exception
 */
export async function registerPlatformException(
  input: PlatformExceptionInput
): Promise<PlatformExceptionRecord> {
  const exception: PlatformExceptionRecord = {
    id: generateExceptionId(),
    platformKey: input.platformKey,
    exceptionArea: input.exceptionArea,
    exceptionStatus: Status.ACTIVE,
    exceptionPayload: input.exceptionPayload,
    rationale: input.rationale,
    createdAt: new Date(),
  };

  // In production, this would persist to database
  // For now, return the constructed exception
  return exception;
}

/**
 * Resolve/remove a platform exception
 */
export async function resolvePlatformException(
  exceptionId: string,
  resolvedAt?: Date
): Promise<PlatformExceptionRecord | null> {
  // In production, this would update the database
  return {
    id: exceptionId,
    platformKey: 'shopee' as PlatformKey, // Would come from DB
    exceptionArea: 'data_quality' as PlatformParityGapArea, // Would come from DB
    exceptionStatus: Status.RESOLVED,
    exceptionPayload: {},
    createdAt: new Date(),
    resolvedAt: resolvedAt ?? new Date(),
  };
}

/**
 * Evaluate if a platform exception is still applicable
 */
export async function evaluatePlatformExceptionApplicability(
  exception: PlatformExceptionRecord,
  currentCapabilities: PlatformCapabilityMatrix
): Promise<{
  isStillApplicable: boolean;
  applicabilityScore: number;
  reason: string;
}> {
  // Check if the original reason for exception is still valid
  const payload = exception.exceptionPayload;

  // If exception was created because capability wasn't available
  if (payload.originalReason === 'capability_not_available') {
    const platformKey = exception.platformKey;
    const capabilities = platformKey === 'shopee'
      ? currentCapabilities.capabilities
      : currentCapabilities.capabilities;

    // Check if capability has been implemented
    const capabilityArea = payload.capabilityArea as PlatformParityScope | undefined;
    if (capabilityArea) {
      const currentLevel = capabilities[capabilityArea];
      if (currentLevel && currentLevel !== 'unknown') {
        return {
          isStillApplicable: false,
          applicabilityScore: 0,
          reason: `Capability ${capabilityArea} is now available at level ${currentLevel}`,
        };
      }
    }
  }

  // If exception was created for platform-specific behavior
  if (payload.originalReason === 'platform_specific_behavior') {
    // Platform-specific exceptions may still be valid
    return {
      isStillApplicable: true,
      applicabilityScore: 0.8,
      reason: 'Platform-specific behavior remains valid',
    };
  }

  // Check age - older exceptions should be re-evaluated
  const daysSinceCreation = (Date.now() - exception.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  if (daysSinceCreation > 90) {
    return {
      isStillApplicable: false,
      applicabilityScore: 0.2,
      reason: 'Exception is older than 90 days and needs re-evaluation',
    };
  }

  return {
    isStillApplicable: true,
    applicabilityScore: 0.7,
    reason: 'Exception remains applicable',
  };
}

/**
 * Build platform exception summary
 */
export async function buildPlatformExceptionSummary(
  exceptions: PlatformExceptionRecord[]
): Promise<ExceptionSummary> {
  const exceptionsByArea = {} as Record<PlatformParityGapArea, number>;
  const exceptionsByPlatform = {} as Record<PlatformKey, number>;
  const reviewRecommendations: ExceptionReviewRecommendation[] = [];

  let activeExceptions = 0;
  let deprecatedExceptions = 0;
  let exceptionsNeedingReview = 0;

  const ninetyDaysAgo = new Date(Date.now() - EXCEPTION_REVIEW_WINDOW_MS);

  for (const exception of exceptions) {
    // Count by area
    exceptionsByArea[exception.exceptionArea] = (exceptionsByArea[exception.exceptionArea] ?? 0) + 1;

    // Count by platform
    exceptionsByPlatform[exception.platformKey] = (exceptionsByPlatform[exception.platformKey] ?? 0) + 1;

    // Track status counts
    if (exception.exceptionStatus === Status.ACTIVE) {
      activeExceptions++;
    } else if (exception.exceptionStatus === Status.DEPRECATED) {
      deprecatedExceptions++;
    }

    // Check if needs review
    if (exception.exceptionStatus === Status.ACTIVE && exception.createdAt < ninetyDaysAgo) {
      exceptionsNeedingReview++;

      // Generate recommendation
      const recommendation = generateReviewRecommendation(exception);
      reviewRecommendations.push({
        exceptionId: exception.id,
        ...recommendation,
      });
    }
  }

  return {
    totalExceptions: exceptions.length,
    activeExceptions,
    exceptionsNeedingReview,
    deprecatedExceptions,
    exceptionsByArea,
    exceptionsByPlatform,
    reviewRecommendations,
  };
}

/**
 * Get all active exceptions for a platform
 */
export async function getActiveExceptionsByPlatform(
  platformKey: PlatformKey,
  exceptions: PlatformExceptionRecord[]
): Promise<PlatformExceptionRecord[]> {
  return exceptions.filter(
    (e) => e.platformKey === platformKey && e.exceptionStatus === Status.ACTIVE
  );
}

/**
 * Get all exceptions for a specific area
 */
export async function getExceptionsByArea(
  area: PlatformParityGapArea,
  exceptions: PlatformExceptionRecord[]
): Promise<PlatformExceptionRecord[]> {
  return exceptions.filter((e) => e.exceptionArea === area);
}

/**
 * Check if an area has active exceptions
 */
export async function hasActiveException(
  area: PlatformParityGapArea,
  exceptions: PlatformExceptionRecord[]
): Promise<boolean> {
  return exceptions.some(
    (e) => e.exceptionArea === area && e.exceptionStatus === Status.ACTIVE
  );
}

/**
 * Get exception by ID
 */
export async function getExceptionById(
  exceptionId: string,
  exceptions: PlatformExceptionRecord[]
): Promise<PlatformExceptionRecord | null> {
  return exceptions.find((e) => e.id === exceptionId) ?? null;
}

/**
 * Validate exception input
 */
export function validateExceptionInput(input: PlatformExceptionInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.platformKey) {
    errors.push('platformKey is required');
  }

  if (!input.exceptionArea) {
    errors.push('exceptionArea is required');
  }

  if (!input.exceptionPayload || Object.keys(input.exceptionPayload).length === 0) {
    errors.push('exceptionPayload is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate review recommendation for exception
 */
function generateReviewRecommendation(
  exception: PlatformExceptionRecord
): ExceptionReviewRecommendation {
  const daysSinceCreation = (Date.now() - exception.createdAt.getTime()) / (24 * 60 * 60 * 1000);

  // If very old, recommend deprecation
  if (daysSinceCreation > 180) {
    return {
      recommendation: 'deprecate',
      rationale: `Exception is ${Math.floor(daysSinceCreation)} days old and should be deprecated`,
      priority: 'high',
    };
  }

  // If moderately old, recommend re-evaluation
  if (daysSinceCreation > 90) {
    return {
      recommendation: 're_evaluate',
      rationale: `Exception is ${Math.floor(daysSinceCreation)} days old and needs re-evaluation`,
      priority: 'medium',
    };
  }

  // Otherwise, approve to continue
  return {
    recommendation: 'approve_continue',
    rationale: 'Exception is recent and still relevant',
    priority: 'low',
  };
}

function generateExceptionId(): string {
  return `exc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Type alias for backwards compatibility
type PlatformExceptionStatus = typeof Status;
