/**
 * Publisher Runner Index
 *
 * Public API exports for the publisher execution layer
 */

// Types
export * from './types.js';

// Constants
export * from './constants.js';

// Channel Adapters
export * from './channelAdapters/index.js';

// Job Selection
export * from './jobSelector.js';

// Job Claiming
export * from './jobClaiming.js';

// Retry Policy
export * from './retryPolicy.js';

// Lifecycle
export * from './lifecycle.js';

// Execution
export * from './execution.js';

// Batch Runner
export * from './batchRunner.js';

// Result Builder
export * from './resultBuilder.js';

// Main Runner
export * from './publisherJobRunner.js';

// Re-export commonly used functions
import { runPublisherOnce, runPublisherDryRun, runPublisherForChannel } from './publisherJobRunner.js';

export {
  // Main functions
  runPublisherOnce,
  runPublisherDryRun,
  runPublisherForChannel,
};

// Default export
export default {
  runPublisherOnce,
  runPublisherDryRun,
  runPublisherForChannel,
};
