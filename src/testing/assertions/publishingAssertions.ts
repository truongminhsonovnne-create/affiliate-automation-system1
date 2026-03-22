/**
 * Publishing Assertions
 *
 * Assertions for validating publishing lifecycle and status.
 */

import type { PublishLifecycleValidationResult, PublishTransition } from '../types';

/**
 * Assertion result
 */
export interface PublishingAssertionResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Valid state transitions for publish jobs
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'failed', 'cancelled'],
  processing: ['completed', 'failed'],
  completed: [],
  failed: ['pending', 'completed', 'cancelled'],
  cancelled: [],
};

/**
 * Validate state transition is valid
 */
export function assertValidTransition(
  from: string,
  to: string
): PublishingAssertionResult {
  const validNextStates = VALID_TRANSITIONS[from] ?? [];
  const isValid = validNextStates.includes(to);

  return {
    passed: isValid,
    message: isValid
      ? `Valid transition: ${from} → ${to}`
      : `Invalid transition: ${from} → ${to}`,
    details: { from, to, validNextStates },
  };
}

/**
 * Validate publish job has required fields
 */
export function assertJobRequiredFields(
  job: Record<string, unknown>
): PublishingAssertionResult {
  const requiredFields = ['id', 'productId', 'channel', 'status'];
  const missingFields = requiredFields.filter(
    (field) => !(field in job) || job[field] === null
  );

  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `Job missing required fields: ${missingFields.join(', ')}`,
      details: { missingFields },
    };
  }

  return {
    passed: true,
    message: 'All required fields present',
    details: { requiredFields },
  };
}

/**
 * Validate publish response
 */
export function assertPublishResponse(
  response: Record<string, unknown>
): PublishingAssertionResult {
  const requiredFields = ['success', 'externalId', 'postUrl'];
  const missingFields = requiredFields.filter(
    (field) => !(field in response)
  );

  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `Response missing required fields: ${missingFields.join(', ')}`,
      details: { missingFields },
    };
  }

  // Check success flag
  if (response.success !== true) {
    return {
      passed: false,
      message: 'Publish was not successful',
      details: { success: response.success },
    };
  }

  // Validate external ID format
  if (typeof response.externalId !== 'string' || response.externalId.length === 0) {
    return {
      passed: false,
      message: 'Invalid external ID format',
      details: { externalId: response.externalId },
    };
  }

  // Validate URL format
  if (typeof response.postUrl !== 'string' || !response.postUrl.startsWith('http')) {
    return {
      passed: false,
      message: 'Invalid post URL format',
      details: { postUrl: response.postUrl },
    };
  }

  return {
    passed: true,
    message: 'Publish response is valid',
    details: { externalId: response.externalId, postUrl: response.postUrl },
  };
}

/**
 * Validate lifecycle transitions
 */
export function assertLifecycleTransitions(
  transitions: PublishTransition[]
): PublishLifecycleValidationResult {
  const errors: string[] = [];
  const validTransitions: PublishTransition[] = [];

  for (const transition of transitions) {
    const result = assertValidTransition(transition.from, transition.to);

    if (result.passed) {
      validTransitions.push({
        ...transition,
        valid: true,
        timestamp: new Date(),
      });
    } else {
      errors.push(`${transition.from} → ${transition.to}: ${result.message}`);
      validTransitions.push({
        ...transition,
        valid: false,
        timestamp: new Date(),
      });
    }
  }

  const lifecycleValid = errors.length === 0;

  return {
    lifecycleValid,
    transitions: validTransitions,
    errors,
  };
}

/**
 * Validate retry configuration
 */
export function assertRetryConfiguration(
  job: Record<string, unknown>
): PublishingAssertionResult {
  const maxAttempts = job.maxAttempts as number;
  const attempts = job.attempts as number;

  if (maxAttempts === undefined || maxAttempts === null) {
    return {
      passed: false,
      message: 'maxAttempts is required',
      details: { maxAttempts },
    };
  }

  if (typeof maxAttempts !== 'number' || maxAttempts < 1) {
    return {
      passed: false,
      message: 'maxAttempts must be a positive number',
      details: { maxAttempts },
    };
  }

  if (attempts !== undefined && attempts !== null) {
    if (attempts < 0) {
      return {
        passed: false,
        message: 'attempts cannot be negative',
        details: { attempts },
      };
    }

    if (attempts > maxAttempts) {
      return {
        passed: false,
        message: 'attempts cannot exceed maxAttempts',
        details: { attempts, maxAttempts },
      };
    }
  }

  return {
    passed: true,
    message: 'Retry configuration is valid',
    details: { maxAttempts, attempts },
  };
}

/**
 * Validate timestamp consistency
 */
export function assertTimestampConsistency(
  job: Record<string, unknown>
): PublishingAssertionResult {
  const createdAt = job.createdAt ? new Date(job.createdAt as string) : null;
  const updatedAt = job.updatedAt ? new Date(job.updatedAt as string) : null;
  const startedAt = job.startedAt ? new Date(job.startedAt as string) : null;
  const completedAt = job.completedAt ? new Date(job.completedAt as string) : null;
  const failedAt = job.failedAt ? new Date(job.failedAt as string) : null;

  const timestamps = [
    { name: 'createdAt', value: createdAt },
    { name: 'updatedAt', value: updatedAt },
    { name: 'startedAt', value: startedAt },
    { name: 'completedAt', value: completedAt },
    { name: 'failedAt', value: failedAt },
  ].filter((t) => t.value !== null) as { name: string; value: Date }[];

  // Check temporal ordering
  for (let i = 1; i < timestamps.length; i++) {
    const prev = timestamps[i - 1].value;
    const curr = timestamps[i].value;

    if (curr.getTime() < prev.getTime()) {
      return {
        passed: false,
        message: `Timestamp ordering violation: ${timestamps[i - 1].name} (${prev.toISOString()}) is after ${timestamps[i].name} (${curr.toISOString()})`,
        details: { timestamps: timestamps.map((t) => ({ name: t.name, value: t.value.toISOString() })) },
      };
    }
  }

  // Check status-specific timestamps
  const status = job.status as string;

  if (status === 'pending') {
    if (startedAt || completedAt || failedAt) {
      return {
        passed: false,
        message: 'Pending job should not have started/completed/failed timestamps',
        details: { startedAt, completedAt, failedAt },
      };
    }
  }

  if (status === 'processing') {
    if (!startedAt) {
      return {
        passed: false,
        message: 'Processing job must have startedAt',
        details: { startedAt },
      };
    }
  }

  if (status === 'completed') {
    if (!completedAt) {
      return {
        passed: false,
        message: 'Completed job must have completedAt',
        details: { completedAt },
      };
    }
  }

  if (status === 'failed') {
    if (!failedAt) {
      return {
        passed: false,
        message: 'Failed job must have failedAt',
        details: { failedAt },
      };
    }
  }

  return {
    passed: true,
    message: 'Timestamp consistency is valid',
    details: { timestamps: timestamps.map((t) => t.name) },
  };
}

/**
 * Validate channel configuration
 */
export function assertChannelConfiguration(
  job: Record<string, unknown>
): PublishingAssertionResult {
  const channel = job.channel as string;
  const validChannels = ['tiktok', 'facebook', 'instagram', 'youtube'];

  if (!channel) {
    return {
      passed: false,
      message: 'Channel is required',
      details: { channel },
    };
  }

  if (!validChannels.includes(channel)) {
    return {
      passed: false,
      message: `Invalid channel: ${channel}. Valid channels: ${validChannels.join(', ')}`,
      details: { channel, validChannels },
    };
  }

  return {
    passed: true,
    message: `Channel configuration is valid (${channel})`,
    details: { channel },
  };
}

/**
 * Run all publishing assertions on a job
 */
export function runPublishingAssertions(
  job: Record<string, unknown>
): {
  passed: boolean;
  results: PublishingAssertionResult[];
} {
  const results: PublishingAssertionResult[] = [
    assertJobRequiredFields(job),
    assertRetryConfiguration(job),
    assertTimestampConsistency(job),
    assertChannelConfiguration(job),
  ];

  const passed = results.every((r) => r.passed);

  return { passed, results };
}

/**
 * Validate publish job status progression
 */
export function assertStatusProgression(
  currentStatus: string,
  expectedNextStatuses: string[]
): PublishingAssertionResult {
  const validNext = VALID_TRANSITIONS[currentStatus] ?? [];
  const hasValidNext = expectedNextStatuses.some((status) => validNext.includes(status));

  return {
    passed: hasValidNext,
    message: hasValidNext
      ? `Status progression valid: ${currentStatus} → [${expectedNextStatuses.join(', ')}]`
      : `Invalid next statuses from ${currentStatus}`,
    details: { currentStatus, expectedNextStatuses, validNext },
  };
}

/**
 * Validate job can be retried
 */
export function assertCanRetry(job: Record<string, unknown>): PublishingAssertionResult {
  const status = job.status as string;
  const attempts = (job.attempts as number) ?? 0;
  const maxAttempts = (job.maxAttempts as number) ?? 3;

  if (status === 'completed') {
    return {
      passed: false,
      message: 'Completed jobs cannot be retried',
      details: { status },
    };
  }

  if (status === 'cancelled') {
    return {
      passed: false,
      message: 'Cancelled jobs cannot be retried',
      details: { status },
    };
  }

  if (attempts >= maxAttempts) {
    return {
      passed: false,
      message: `Max retry attempts reached (${attempts}/${maxAttempts})`,
      details: { attempts, maxAttempts },
    };
  }

  return {
    passed: true,
    message: `Job can be retried (${attempts}/${maxAttempts} attempts)`,
    details: { attempts, maxAttempts, remaining: maxAttempts - attempts },
  };
}
