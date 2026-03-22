/**
 * Experimentation Service
 *
 * Main orchestrator for experimentation
 */

import { ExperimentDefinition, ExperimentTargetSurface } from '../types/index.js';
import { assignExperimentVariant } from '../assignment/assignmentStrategy.js';
import { resolveExperimentSubjectKey } from '../assignment/subjectIdentityResolver.js';
import { isExperimentTargetedToContext } from '../targeting/targetingRuleEvaluator.js';
import { getActiveExperiments } from '../registry/experimentRegistry.js';
import { recordVariantRenderExposure } from '../exposure/exposureRecorder.js';
import { recordCopySuccessForExperiment, recordNoMatchForExperiment } from '../outcomes/outcomeRecorder.js';
import { evaluateExperimentRollout } from '../rollout/rolloutPolicy.js';

/**
 * Resolve experiment context for public flow
 */
export async function resolveExperimentContextForPublicFlow(params: {
  surface: ExperimentTargetSurface;
  sessionId?: string;
  requestId?: string;
  userId?: string;
  environment?: string;
}): Promise<{
  assignments: Array<{ experiment: ExperimentDefinition; variant: any }>;
}> {
  const { surface, sessionId, requestId, userId, environment = 'production' } = params;

  // Resolve subject
  const subject = resolveExperimentSubjectKey({
    sessionId,
    requestId,
    userId,
  });

  // Get active experiments for surface
  const experiments = await getActiveExperiments(surface);

  const assignments: Array<{ experiment: ExperimentDefinition; variant: any }> = [];

  for (const experiment of experiments) {
    // Check rollout
    const rollout = evaluateExperimentRollout(experiment, environment);
    if (!rollout.allowed) continue;

    // Check targeting
    const targetingContext = {
      surface,
      environment,
    };
    if (!isExperimentTargetedToContext(experiment, targetingContext)) continue;

    // Assign variant
    const assignment = assignExperimentVariant({
      experiment,
      subjectKey: subject.subjectKey,
    });

    if (assignment.success && assignment.variant) {
      assignments.push({
        experiment,
        variant: assignment.variant,
      });

      // Record exposure
      await recordVariantRenderExposure({
        experimentId: experiment.id,
        variantKey: assignment.variant.key,
        subjectKey: subject.subjectKey,
        surface,
      });
    }
  }

  return { assignments };
}

/**
 * Get experiment-aware voucher resolution context
 */
export async function getExperimentAwareVoucherResolutionContext(params: {
  sessionId?: string;
  requestId?: string;
  environment?: string;
}) {
  return resolveExperimentContextForPublicFlow({
    surface: ExperimentTargetSurface.PASTE_LINK,
    ...params,
  });
}

/**
 * Get experiment-aware presentation context
 */
export async function getExperimentAwarePresentationContext(params: {
  sessionId?: string;
  requestId?: string;
  surface: ExperimentTargetSurface;
  environment?: string;
}) {
  return resolveExperimentContextForPublicFlow(params);
}

/**
 * Record public flow experiment outcomes
 */
export async function recordPublicFlowExperimentOutcomes(params: {
  experimentId: string;
  variantKey: string;
  outcomeType: 'copy_success' | 'no_match' | 'open_shopee';
  subjectKey: string;
}) {
  if (params.outcomeType === 'copy_success') {
    await recordCopySuccessForExperiment({
      experimentId: params.experimentId,
      variantKey: params.variantKey,
      subjectKey: params.subjectKey,
    });
  } else if (params.outcomeType === 'no_match') {
    await recordNoMatchForExperiment({
      experimentId: params.experimentId,
      variantKey: params.variantKey,
      subjectKey: params.subjectKey,
    });
  }
}
