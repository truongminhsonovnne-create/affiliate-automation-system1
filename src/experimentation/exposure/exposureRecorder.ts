/**
 * Exposure Recorder
 */

import { randomUUID } from 'crypto';
import { ExperimentExposure, ExperimentTargetSurface, ExposureType } from '../types/index.js';

// In-memory storage (replace with DB)
const exposures: ExperimentExposure[] = [];

/**
 * Record experiment exposure
 */
export async function recordExperimentExposure(params: {
  experimentId: string;
  variantKey: string;
  subjectKey: string;
  surface: ExperimentTargetSurface;
  exposureType: ExposureType;
  exposureContext?: Record<string, unknown>;
}): Promise<ExperimentExposure> {
  const exposure: ExperimentExposure = {
    id: randomUUID(),
    experimentId: params.experimentId,
    variantKey: params.variantKey,
    subjectKey: params.subjectKey,
    surface: params.surface,
    exposureType: params.exposureType,
    exposureContext: params.exposureContext,
    createdAt: new Date(),
  };

  exposures.push(exposure);
  return exposure;
}

/**
 * Record variant render exposure
 */
export async function recordVariantRenderExposure(params: {
  experimentId: string;
  variantKey: string;
  subjectKey: string;
  surface: ExperimentTargetSurface;
}): Promise<ExperimentExposure> {
  return recordExperimentExposure({
    ...params,
    exposureType: ExposureType.RENDER,
  });
}

/**
 * Record variant action exposure
 */
export async function recordVariantActionExposure(params: {
  experimentId: string;
  variantKey: string;
  subjectKey: string;
  surface: ExperimentTargetSurface;
  actionContext?: Record<string, unknown>;
}): Promise<ExperimentExposure> {
  return recordExperimentExposure({
    ...params,
    exposureType: ExposureType.ACTION,
    exposureContext: params.actionContext,
  });
}

/**
 * Get exposures for experiment
 */
export async function getExposuresForExperiment(experimentId: string): Promise<ExperimentExposure[]> {
  return exposures.filter(e => e.experimentId === experimentId);
}

/**
 * Get exposures by variant
 */
export async function getExposuresByVariant(experimentId: string, variantKey: string): Promise<ExperimentExposure[]> {
  return exposures.filter(e => e.experimentId === experimentId && e.variantKey === variantKey);
}

/**
 * Clear exposures (for testing)
 */
export function clearExposures(): void {
  exposures.length = 0;
}
