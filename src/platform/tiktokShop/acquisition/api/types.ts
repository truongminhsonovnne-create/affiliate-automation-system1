/**
 * TikTok Shop Acquisition API Types
 */

export interface TikTokShopDiscoveryJobDto {
  id: string;
  jobType: string;
  seedType: string;
  jobStatus: string;
  itemsDiscovered: number;
  itemsDeduped: number;
  itemsFailed: number;
  startedAt: string;
  finishedAt?: string;
}

export interface TikTokShopDiscoveryCandidateDto {
  id: string;
  candidateKey: string;
  canonicalReferenceKey?: string;
  candidateStatus: string;
  confidenceScore?: number;
}

export interface TikTokShopDetailJobDto {
  id: string;
  canonicalReferenceKey: string;
  jobStatus: string;
  extractionStatus: string;
  qualityScore?: number;
  errorSummary?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface TikTokShopRawDetailRecordDto {
  id: string;
  canonicalReferenceKey: string;
  rawPayload: Record<string, unknown>;
  extractionStatus: string;
  extractionVersion: string;
}

export interface TikTokShopAcquisitionHealthDto {
  runtimeHealth: string;
  healthScore: number;
  shouldThrottle: boolean;
  shouldPause: boolean;
  pauseReasons: string[];
}

export interface TikTokShopAcquisitionDecisionSupportDto {
  recommendation: string;
  readinessStatus: string;
  blockers: any[];
  warnings: any[];
  nextSteps: string[];
  summary: string;
}
