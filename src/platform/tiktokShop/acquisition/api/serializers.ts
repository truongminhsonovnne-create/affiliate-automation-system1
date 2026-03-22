/**
 * TikTok Shop Acquisition API Serializers
 */

export function serializeDiscoveryJob(job: any) {
  return {
    id: job.id,
    jobType: job.jobType,
    seedType: job.seedType,
    jobStatus: job.jobStatus,
    itemsDiscovered: job.itemsDiscovered,
    itemsDeduped: job.itemsDeduped,
    itemsFailed: job.itemsFailed,
    startedAt: job.startedAt?.toISOString(),
    finishedAt: job.finishedAt?.toISOString(),
  };
}

export function serializeCandidate(candidate: any) {
  return {
    id: candidate.id,
    candidateKey: candidate.candidateKey,
    canonicalReferenceKey: candidate.canonicalReferenceKey,
    candidateStatus: candidate.candidateStatus,
    confidenceScore: candidate.confidenceScore,
  };
}

export function serializeDetailJob(job: any) {
  return {
    id: job.id,
    canonicalReferenceKey: job.canonicalReferenceKey,
    jobStatus: job.jobStatus,
    extractionStatus: job.extractionStatus,
    qualityScore: job.qualityScore,
    errorSummary: job.errorSummary,
    startedAt: job.startedAt?.toISOString(),
    finishedAt: job.finishedAt?.toISOString(),
  };
}

export function serializeRawDetail(record: any) {
  return {
    id: record.id,
    canonicalReferenceKey: record.canonicalReferenceKey,
    rawPayload: record.rawPayload,
    extractionStatus: record.extractionStatus,
    extractionVersion: record.extractionVersion,
  };
}

export function serializeHealth(health: any) {
  return {
    runtimeHealth: health.runtimeHealth,
    healthScore: health.healthScore,
    shouldThrottle: health.shouldThrottle,
    shouldPause: health.shouldPause,
    pauseReasons: health.pauseReasons,
  };
}

export function serializeError(error: any, statusCode: number = 500) {
  return {
    error: {
      code: statusCode,
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    },
  };
}

export function serializeSuccess(data: any) {
  return { data, meta: { timestamp: new Date().toISOString() } };
}
