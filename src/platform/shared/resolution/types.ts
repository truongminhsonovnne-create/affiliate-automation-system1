/**
 * Platform Support State Types
 *
 * Core types for platform resolution gates, sandbox resolution,
 * and public flow gating across multi-platform affiliate system.
 */

/**
 * Platform Support State
 * Represents the current support level for a platform
 */
export type PlatformSupportState =
  | 'unsupported'      // Platform not supported
  | 'not_ready'        // Platform identified but not ready for any resolution
  | 'sandbox_only'     // Only sandbox resolution available
  | 'gated'            // Gated access, limited production support
  | 'partially_supported' // Some features supported in production
  | 'supported'        // Full production support
  | 'production_enabled'; // Production fully enabled with all features

/**
 * Platform Enablement Phase
 * Governance phase for platform enablement
 */
export type PlatformEnablementPhase =
  | 'disabled'                    // Platform disabled
  | 'internal_only'              // Internal testing only
  | 'sandbox_preview'            // Sandbox preview for select users
  | 'limited_public_preview'     // Limited public preview
  | 'production_candidate'       // Ready for production, pending final approval
  | 'production_enabled';        // Full production enabled

/**
 * Gate Evaluation Result
 * Result of evaluating platform resolution gates
 */
export interface GateEvaluationResult {
  platform: string;
  supportState: PlatformSupportState;
  enablementPhase: PlatformEnablementPhase;

  // Gate evaluation flags
  domainReady: boolean;
  dataFoundationReady: boolean;
  acquisitionReady: boolean;
  resolutionReady: boolean;
  governanceApproved: boolean;

  // Decision
  canResolve: boolean;
  canUseSandbox: boolean;
  canUseProduction: boolean;
  shouldBlock: boolean;

  // Quality
  qualityScore: number;

  // Metadata
  gateConfig: GateConfig;
  evaluatedAt: Date;
}

/**
 * Gate Configuration
 * Configuration for platform resolution gates
 */
export interface GateConfig {
  sandboxEnabled: boolean;
  sandboxMaxRequestsPerHour: number;
  sandboxMaxRequestsPerDay: number;
  productionEnabled: boolean;
  productionMaxRequestsPerHour: number;
  productionMaxRequestsPerDay: number;
  allowPublicResolution: boolean;
  allowSandboxResolution: boolean;
  allowGatedResolution: boolean;

  // Feature-specific gates
  promotionResolutionEnabled: boolean;
  productResolutionEnabled: boolean;
  sellerResolutionEnabled: boolean;
  attributionEnabled: boolean;
}

/**
 * Platform Gate Record
 * Database record for platform resolution gate
 */
export interface PlatformGateRecord {
  id: string;
  platform: string;
  supportState: PlatformSupportState;
  enablementPhase: PlatformEnablementPhase;

  // Readiness flags
  domainReady: boolean;
  dataFoundationReady: boolean;
  acquisitionReady: boolean;
  resolutionReady: boolean;
  governanceApproved: boolean;

  // Configuration
  sandboxEnabled: boolean;
  sandboxMaxRequestsPerHour: number;
  sandboxMaxRequestsPerDay: number;
  productionEnabled: boolean;
  productionMaxRequestsPerHour: number;
  productionMaxRequestsPerDay: number;
  allowPublicResolution: boolean;
  allowSandboxResolution: boolean;
  allowGatedResolution: boolean;

  // Metadata
  gateConfig: GateConfig;
  evaluatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sandbox Resolution Request
 * Input for sandbox resolution
 */
export interface SandboxResolutionRequest {
  platform: string;
  inputType: 'url' | 'reference_key' | 'product_id' | 'promotion_code';
  inputValue: string;
  inputMetadata?: Record<string, unknown>;
  resolutionType: 'promotion' | 'product' | 'seller';
  requestedAt?: Date;
}

/**
 * Sandbox Resolution Result
 * Result from sandbox resolution
 */
export interface SandboxResolutionResult {
  requestId: string;
  runId: string;
  platform: string;

  // Input echo
  inputType: string;
  inputValue: string;

  // Resolution status
  resolutionStatus: 'success' | 'failed' | 'throttled' | 'gated' | 'blocked';
  supportState: PlatformSupportState;

  // Response data
  responseData: Record<string, unknown>;
  responseQualityScore: number | null;

  // Timing
  resolvedAt: Date;
  resolutionDurationMs: number;

  // Error details
  errorCode: string | null;
  errorMessage: string | null;

  // Context
  contextSnapshotId: string | null;
}

/**
 * Public Flow Request
 * Input for public flow resolution
 */
export interface PublicFlowRequest {
  platform: string;
  inputType: 'url' | 'reference_key' | 'product_id' | 'promotion_code';
  inputValue: string;
  userAgent?: string;
  requestId?: string;
  resolutionType: 'promotion' | 'product' | 'seller';
}

/**
 * Public Flow Response
 * Response for public flow resolution
 */
export interface PublicFlowResponse {
  // Request echo
  requestId: string;
  platform: string;
  inputType: string;
  inputValue: string;

  // Routing decision
  routeDecision: 'production' | 'sandbox' | 'gated' | 'blocked';
  supportState: PlatformSupportState;
  enablementPhase: PlatformEnablementPhase;

  // Resolution result
  resolutionStatus: 'success' | 'failed' | 'throttled' | 'unavailable';
  resolvedData: Record<string, unknown> | null;
  qualityScore: number | null;

  // UX representation
  representation: HonestRepresentation;

  // Timing
  resolvedAt: Date;
  resolutionDurationMs: number;

  // Error handling
  errorCode: string | null;
  errorMessage: string | null;
  userFacingMessage: string | null;

  // Links
  docsUrl?: string;
  statusPageUrl?: string;
}

/**
 * Honest Representation
 * User-facing representation with honest semantics
 */
export interface HonestRepresentation {
  isSupported: boolean;
  isInSandbox: boolean;
  isGated: boolean;
  isLimited: boolean;
  supportLevelText: string;
  featureAvailability: Record<string, boolean>;
  limitations: string[];
  nextSteps: string[];
}

/**
 * Enablement Review
 * Governance review for platform enablement
 */
export interface EnablementReview {
  id: string;
  reviewId: string;
  platform: string;
  currentPhase: PlatformEnablementPhase;
  targetPhase: PlatformEnablementPhase;
  reviewType: 'scheduled' | 'triggered' | 'emergency';

  // Readiness assessment
  readinessScore: number;
  readinessChecks: ReadinessCheck[];
  blockers: Blocker[];
  risks: Risk[];

  // Decision
  decision: 'approved' | 'rejected' | 'conditional' | 'deferred';
  decisionReason: string | null;
  approvedBy: string | null;
  conditions: string[];

  // Timeline
  reviewRequestedAt: Date;
  reviewCompletedAt: Date | null;
  effectiveFrom: Date | null;
}

/**
 * Readiness Check
 * Individual readiness check for enablement
 */
export interface ReadinessCheck {
  checkId: string;
  checkName: string;
  category: 'domain' | 'data' | 'acquisition' | 'resolution' | 'governance';
  status: 'pass' | 'fail' | 'warning' | 'pending';
  score: number;
  details: string;
  lastChecked: Date;
}

/**
 * Blocker
 * Blocker for platform enablement
 */
export interface Blocker {
  blockerId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  estimatedResolutionDays: number | null;
  owner: string | null;
}

/**
 * Risk
 * Risk for platform enablement
 */
export interface Risk {
  riskId: string;
  title: string;
  description: string;
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
}

/**
 * Public Flow Audit
 * Audit record for public flow operations
 */
export interface PublicFlowAudit {
  id: string;
  auditId: string;
  platform: string;
  flowType: 'resolution' | 'redirect' | 'attribution';
  inputType: string;
  inputValue: string;
  userAgent: string | null;
  requestId: string | null;

  // Routing decision
  routeDecision: 'production' | 'sandbox' | 'gated' | 'blocked';
  supportState: PlatformSupportState;
  enablementPhase: PlatformEnablementPhase;
  gateEvaluation: Record<string, unknown>;

  // Response
  responseStatus: 'success' | 'error' | 'redirected';
  responsePayload: Record<string, unknown>;
  qualityScore: number | null;

  // UX feedback
  userFeedback: 'positive' | 'negative' | 'neutral' | null;
  userFeedbackDetails: string | null;

  // Compliance
  honestRepresentation: boolean;
  misleadingFlags: string[];

  createdAt: Date;
}

/**
 * Support State Transition
 * Record of support state changes
 */
export interface SupportStateTransition {
  id: string;
  platform: string;
  fromState: PlatformSupportState;
  toState: PlatformSupportState;
  fromPhase: PlatformEnablementPhase;
  toPhase: PlatformEnablementPhase;
  trigger: 'scheduled' | 'manual' | 'automated' | 'emergency';
  reason: string;
  approvedBy: string | null;
  effectiveFrom: Date;
  createdAt: Date;
}

/**
 * Usage Quota
 * Sandbox usage quota tracking
 */
export interface UsageQuota {
  id: string;
  platform: string;
  quotaPeriod: 'hourly' | 'daily' | 'monthly';
  requestsUsed: number;
  requestsLimit: number;
  errorsUsed: number;
  errorsLimit: number;
  throttledAt: Date | null;
  throttledUntil: Date | null;
  throttleReason: string | null;
  periodStart: Date;
  periodEnd: Date;
}
