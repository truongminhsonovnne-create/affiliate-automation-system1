/**
 * TikTok Shop Acquisition Layer - Types
 * Production-grade type definitions for discovery and detail extraction
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export enum TikTokShopDiscoveryJobType {
  FULL_SCAN = 'full_scan',
  INCREMENTAL = 'incremental',
  SEED_BASED = 'seed_based',
  MANUAL = 'manual',
}

export enum TikTokShopDiscoverySeedType {
  CURATED_URL = 'curated_url',
  KEYWORD = 'keyword',
  CATEGORY = 'category',
  MANUAL = 'manual',
}

export enum TikTokShopDiscoveryJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TikTokShopCandidateStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  DUPLICATE = 'duplicate',
  INVALID = 'invalid',
}

export enum TikTokShopDetailJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TikTokShopDetailExtractionStatus {
  PENDING = 'pending',
  EXTRACTING = 'extracting',
  EXTRACTED = 'extracted',
  PARTIAL = 'partial',
  FAILED = 'failed',
  UNSUPPORTED = 'unsupported',
}

export enum TikTokShopAcquisitionMode {
  BROWSER = 'browser',
  API = 'api',
  HYBRID = 'hybrid',
}

export enum TikTokShopAcquisitionSupportState {
  SUPPORTED = 'supported',
  PARTIAL = 'partial',
  FRAGILE = 'fragile',
  UNSUPPORTED = 'unsupported',
}

export enum TikTokShopRuntimeRole {
  DISCOVERY = 'discovery',
  DETAIL = 'detail',
  MIXED = 'mixed',
}

export enum TikTokShopRuntimeHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  PAUSED = 'paused',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export enum TikTokShopExtractionQualityStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  ACCEPTABLE = 'acceptable',
  POOR = 'poor',
  FAILED = 'failed',
}

export enum TikTokShopFailureType {
  NAVIGATION_TIMEOUT = 'navigation_timeout',
  ANTI_BOT_SUSPICION = 'anti_bot_suspicion',
  MISSING_PAGE_STATE = 'missing_page_state',
  REFERENCE_INVALID = 'reference_invalid',
  SELECTOR_FRAGILITY = 'selector_fragility',
  PARTIAL_EXTRACTION = 'partial_extraction',
  UNSUPPORTED_SURFACE = 'unsupported_surface',
  RATE_LIMIT = 'rate_limit',
  SESSION_ERROR = 'session_error',
}

export enum TikTokShopBacklogType {
  RUNTIME_GAP = 'runtime_gap',
  SELECTOR_GAP = 'selector_gap',
  EXTRACTION_GAP = 'extraction_gap',
  QUALITY_GAP = 'quality_gap',
  INTEGRATION_GAP = 'integration_gap',
}

export enum TikTokShopBacklogStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  WONT_DO = 'wont_do',
}

// ============================================================================
// Core Interfaces
// ============================================================================

export interface TikTokShopDiscoveryJob {
  id: string;
  jobType: TikTokShopDiscoveryJobType;
  seedType: TikTokShopDiscoverySeedType;
  seedPayload: Record<string, unknown>;
  jobStatus: TikTokShopDiscoveryJobStatus;
  itemsDiscovered: number;
  itemsDeduped: number;
  itemsFailed: number;
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
}

export interface TikTokShopDiscoveryCandidate {
  id: string;
  discoveryJobId?: string;
  candidateKey: string;
  rawReferencePayload: Record<string, unknown>;
  canonicalReferenceKey?: string;
  candidateStatus: TikTokShopCandidateStatus;
  confidenceScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TikTokShopDetailJob {
  id: string;
  canonicalReferenceKey: string;
  jobStatus: TikTokShopDetailJobStatus;
  acquisitionMode: TikTokShopAcquisitionMode;
  extractionStatus: TikTokShopDetailExtractionStatus;
  qualityScore?: number;
  errorSummary?: string;
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
}

export interface TikTokShopRawDetailRecord {
  id: string;
  detailJobId?: string;
  canonicalReferenceKey: string;
  rawPayload: Record<string, unknown>;
  extractionStatus: TikTokShopDetailExtractionStatus;
  extractionVersion: string;
  evidencePayload?: Record<string, unknown>;
  createdAt: Date;
}

export interface TikTokShopExtractionEvidence {
  url: string;
  timestamp: Date;
  selectors: Record<string, string>;
  fallbackSelectors: Record<string, string[]>;
  extractionMethod: string;
  confidenceScores: Record<string, number>;
}

export interface TikTokShopExtractionQualityReview {
  id: string;
  canonicalReferenceKey: string;
  reviewType: string;
  qualityStatus: TikTokShopExtractionQualityStatus;
  qualityScore?: number;
  reviewPayload: Record<string, unknown>;
  createdAt: Date;
}

export interface TikTokShopRuntimeHealthSnapshot {
  id: string;
  runtimeRole: TikTokShopRuntimeRole;
  healthStatus: TikTokShopRuntimeHealthStatus;
  snapshotPayload: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// Runtime & Safety
// ============================================================================

export interface TikTokShopAcquisitionRuntimeProfile {
  role: TikTokShopRuntimeRole;
  mode: TikTokShopAcquisitionMode;
  supportState: TikTokShopAcquisitionSupportState;
  concurrency: number;
  throttlingMs: number;
  navigationTimeoutMs: number;
  retryLimit: number;
  backoffMultiplier: number;
}

export interface TikTokShopRuntimeSafetyProfile {
  maxConcurrentSessions: number;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  requestDelayMs: number;
  pageLoadDelayMs: number;
  sessionTimeoutMs: number;
  recycleAfterRequests: number;
}

export interface TikTokShopSessionPolicy {
  sessionId: string;
  createdAt: Date;
  requestCount: number;
  lastRequestAt?: Date;
  isHealthy: boolean;
  healthScore: number;
}

export interface TikTokShopNavigationDecision {
  shouldNavigate: boolean;
  delayMs: number;
  backoffMs?: number;
  reason: string;
}

// ============================================================================
// Discovery
// ============================================================================

export interface TikTokShopDiscoverySeed {
  seedType: TikTokShopDiscoverySeedType;
  seedValue: string;
  metadata?: Record<string, unknown>;
}

export interface TikTokShopDiscoveryResult {
  jobId: string;
  itemsDiscovered: number;
  itemsDeduped: number;
  itemsFailed: number;
  candidates: TikTokShopDiscoveryCandidate[];
  errors: TikTokShopAcquisitionError[];
  warnings: TikTokShopAcquisitionWarning[];
}

export interface TikTokShopDiscoverySummary {
  jobId: string;
  jobStatus: TikTokShopDiscoveryJobStatus;
  itemsDiscovered: number;
  itemsDeduped: number;
  itemsFailed: number;
  duration: number;
  errors: TikTokShopAcquisitionError[];
  warnings: TikTokShopAcquisitionWarning[];
}

// ============================================================================
// Detail Extraction
// ============================================================================

export interface TikTokShopExtractedDetailFields {
  // Product
  productId?: string;
  productTitle?: string;
  productDescription?: string;
  productUrl?: string;

  // Seller
  sellerId?: string;
  sellerName?: string;
  sellerRating?: number;
  sellerFollowerCount?: number;
  sellerVerified?: boolean;

  // Price
  price?: number;
  currency?: string;
  originalPrice?: number;
  discountPercentage?: number;

  // Category
  categoryId?: string;
  categoryName?: string;
  categoryPath?: string[];

  // Promotion
  promotionSignals?: string[];

  // Media
  images?: string[];
  videos?: string[];
  thumbnails?: string[];
}

export interface TikTokShopDetailExtractionResult {
  jobId: string;
  referenceKey: string;
  extractionStatus: TikTokShopDetailExtractionStatus;
  extractedFields: TikTokShopExtractedDetailFields;
  evidence: TikTokShopExtractionEvidence;
  qualityScore?: number;
  errors: TikTokShopAcquisitionError[];
  warnings: TikTokShopAcquisitionWarning[];
}

export interface TikTokShopDetailExtractionSummary {
  jobId: string;
  referenceKey: string;
  extractionStatus: TikTokShopDetailExtractionStatus;
  qualityScore: number;
  fieldsExtracted: number;
  fieldsMissing: number;
  duration: number;
  errors: TikTokShopAcquisitionError[];
  warnings: TikTokShopAcquisitionWarning[];
}

// ============================================================================
// Quality & Failures
// ============================================================================

export interface TikTokShopExtractionQuality {
  overallScore: number;
  titleScore: number;
  sellerScore: number;
  priceScore: number;
  categoryScore: number;
  promotionScore: number;
  mediaScore: number;
  evidenceScore: number;
  status: TikTokShopExtractionQualityStatus;
  gaps: TikTokShopExtractionGap[];
}

export interface TikTokShopExtractionGap {
  field: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface TikTokShopSelectorFragility {
  selector: string;
  fragilityScore: number;
  pattern: string;
  recommendation: string;
}

export interface TikTokShopAcquisitionError {
  errorId: string;
  errorType: TikTokShopFailureType;
  message: string;
  field?: string;
  referenceKey?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  retryable: boolean;
}

export interface TikTokShopAcquisitionWarning {
  warningId: string;
  warningType: string;
  message: string;
  field?: string;
  referenceKey?: string;
  severity: 'medium' | 'low';
}

export interface TikTokShopRetryDecision {
  shouldRetry: boolean;
  retryCount: number;
  backoffMs: number;
  maxRetries: number;
  reason: string;
}

// ============================================================================
// Health & Governance
// ============================================================================

export interface TikTokShopAcquisitionHealth {
  runtimeHealth: TikTokShopRuntimeHealthStatus;
  healthScore: number;
  activeSessions: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
  shouldThrottle: boolean;
  shouldPause: boolean;
  pauseReasons: string[];
}

export interface TikTokShopAcquisitionGovernance {
  canRunDiscovery: boolean;
  canRunDetail: boolean;
  shouldThrottle: boolean;
  shouldPause: boolean;
  recommendation: 'proceed' | 'throttle' | 'pause' | 'stop';
  reasons: string[];
  maxConcurrentJobs: number;
  cooldownUntil?: Date;
}

export interface TikTokShopAcquisitionCapabilitySnapshot {
  platform: string;
  canDiscover: boolean;
  canExtractDetails: boolean;
  qualityScore: number;
  healthStatus: TikTokShopRuntimeHealthStatus;
  blockers: number;
  warnings: number;
  lastUpdated: Date;
}

// ============================================================================
// Decision Support
// ============================================================================

export interface TikTokShopAcquisitionDecisionSupport {
  recommendation: 'proceed' | 'throttle' | 'pause' | 'stop';
  readinessStatus: string;
  blockers: TikTokShopAcquisitionError[];
  warnings: TikTokShopAcquisitionWarning[];
  nextSteps: string[];
  summary: string;
}

export interface TikTokShopAcquisitionFoundationSummary {
  discovery: TikTokShopDiscoverySummary | null;
  detail: TikTokShopDetailExtractionSummary | null;
  health: TikTokShopAcquisitionHealth;
  governance: TikTokShopAcquisitionGovernance;
  quality: TikTokShopExtractionQuality;
  blockers: TikTokShopAcquisitionError[];
  warnings: TikTokShopAcquisitionWarning[];
}
