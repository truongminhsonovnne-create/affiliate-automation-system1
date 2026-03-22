/**
 * Workflow Diagnostics Module
 *
 * Collects and formats diagnostics for workflow failures.
 */

import type { CiDiagnosticsSummary, WorkflowFailureSummary } from '../types';

// =============================================================================
// Diagnostics Collection
// =============================================================================

/**
 * Collect workflow diagnostics
 */
export function collectWorkflowDiagnostics(options?: {
  workflow?: string;
  runId?: string;
  job?: string;
  stage?: string;
}): CiDiagnosticsSummary {
  return {
    workflow: options?.workflow || process.env.GITHUB_WORKFLOW || 'unknown',
    runId: options?.runId || process.env.GITHUB_RUN_ID || 'unknown',
    job: options?.job || process.env.GITHUB_JOB || 'unknown',
    stage: options?.stage || 'unknown',
    exitCode: 1,
    duration: 0,
    errors: [],
    warnings: [],
  };
}

/**
 * Build workflow failure summary
 */
export function buildWorkflowFailureSummary(params: {
  workflow: string;
  runUrl: string;
  failedJob: string;
  failedStage: string;
  error: string;
  context?: Record<string, unknown>;
}): WorkflowFailureSummary {
  return {
    workflow: params.workflow,
    runUrl: params.runUrl,
    failedJob: params.failedJob,
    failedStage: params.failedStage,
    error: params.error,
    context: params.context || {},
    suggestions: generateSuggestions(params.failedStage, params.error),
  };
}

/**
 * Generate suggestions based on failure stage
 */
function generateSuggestions(stage: string, error: string): string[] {
  const suggestions: string[] = [];

  switch (stage) {
    case 'build':
      suggestions.push('Check TypeScript compilation errors');
      suggestions.push('Verify all dependencies are installed');
      suggestions.push('Check for missing import statements');
      break;

    case 'test':
      suggestions.push('Run tests locally to see detailed errors');
      suggestions.push('Check test file imports');
      suggestions.push('Verify test environment configuration');
      break;

    case 'security':
      suggestions.push('Review security audit output');
      suggestions.push('Update vulnerable dependencies');
      suggestions.push('Check for exposed secrets');
      break;

    case 'migration':
      suggestions.push('Review migration SQL for dangerous operations');
      suggestions.push('Test migrations in development first');
      suggestions.push('Ensure rollback scripts are available');
      break;

    case 'deploy':
      suggestions.push('Check deployment target configuration');
      suggestions.push('Verify environment variables');
      suggestions.push('Check resource quotas');
      break;

    case 'verify':
      suggestions.push('Check health endpoint configuration');
      suggestions.push('Verify database connectivity');
      suggestions.push('Check service dependencies');
      break;

    default:
      suggestions.push('Review workflow logs for details');
      suggestions.push('Try running locally with same environment');
  }

  // Add error-specific suggestions
  if (error.includes('timeout')) {
    suggestions.push('Consider increasing timeout values');
  }

  if (error.includes('permission')) {
    suggestions.push('Check required permissions/secrets');
  }

  if (error.includes('not found')) {
    suggestions.push('Verify required resources exist');
  }

  return suggestions;
}

/**
 * Attach diagnostics as artifacts
 */
export function attachDiagnosticsArtifacts(diagnostics: CiDiagnosticsSummary): void {
  // In GitHub Actions, this would create artifact files
  console.log('Diagnostics:', JSON.stringify(diagnostics, null, 2));
}

/**
 * Format diagnostics for output
 */
export function formatDiagnostics(diagnostics: CiDiagnosticsSummary): string {
  const lines: string[] = [];

  lines.push('## Workflow Diagnostics');
  lines.push('');
  lines.push(`**Workflow:** ${diagnostics.workflow}`);
  lines.push(`**Run ID:** ${diagnostics.runId}`);
  lines.push(`**Job:** ${diagnostics.job}`);
  lines.push(`**Stage:** ${diagnostics.stage}`);
  lines.push('');

  if (diagnostics.errors.length > 0) {
    lines.push('### Errors');
    for (const error of diagnostics.errors) {
      lines.push(`- ${error}`);
    }
    lines.push('');
  }

  if (diagnostics.warnings.length > 0) {
    lines.push('### Warnings');
    for (const warning of diagnostics.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Create failure context for debugging
 */
export function createFailureContext(error: Error | string, context?: Record<string, unknown>): Record<string, unknown> {
  return {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    environment: process.env,
    ...context,
  };
}

/**
 * Extract relevant logs from workflow
 */
export function extractRelevantLogs(logs: string, stage: string): string {
  // Simple implementation - in production would be more sophisticated
  const lines = logs.split('\n');
  const relevant: string[] = [];
  let capturing = false;

  for (const line of lines) {
    if (line.includes(stage) || line.includes('##[group]')) {
      capturing = true;
    }
    if (capturing) {
      relevant.push(line);
      if (line.includes('##[endgroup]')) {
        capturing = false;
      }
    }
  }

  return relevant.join('\n').slice(-5000); // Last 5000 chars
}
