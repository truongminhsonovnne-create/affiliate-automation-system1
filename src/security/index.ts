/**
 * Security Layer - Main Export
 * Production-grade security model for Affiliate Automation System
 */

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

export * from './types';
export * from './constants';

// =============================================================================
// CONFIG
// =============================================================================

export * from './config/secureEnv';
export * from './config/secretRegistry';

// =============================================================================
// AUTH
// =============================================================================

export * from './auth/internalTokenAuth';
export * from './auth/rolesAndPermissions';
export * from './auth/accessPolicies';

// =============================================================================
// HTTP SECURITY
// =============================================================================

export * from './http/securityHeaders';
export * from './http/requestGuards';
export * from './http/csrfOrMutationProtection';

// =============================================================================
// REDACTION
// =============================================================================

export * from './redaction/sensitiveDataRedaction';

// =============================================================================
// DATA CLASSIFICATION
// =============================================================================

export * from './data/dataClassification';
export * from './data/responseSanitizer';

// =============================================================================
// RUNTIME
// =============================================================================

export * from './runtime/runtimeBoundaryGuards';

// =============================================================================
// STORAGE
// =============================================================================

export * from './storage/sessionStoragePolicy';

// =============================================================================
// AUDIT
// =============================================================================

export * from './audit/securityAuditLogger';

// =============================================================================
// REPOSITORIES
// =============================================================================

export * from './repositories/securityEventRepository';
export * from './repositories/internalSessionRepository';

// =============================================================================
// POLICIES
// =============================================================================

export * from './policies/environmentPolicies';
export * from './policies/secretAccessPolicy';
export * from './policies/auditSensitivityPolicy';

// =============================================================================
// INTEGRATION
// =============================================================================

export * from './integration/controlPlaneSecurityIntegration';
export * from './integration/dashboardSecurityIntegration';

// =============================================================================
// MIDDLEWARE
// =============================================================================

export * from './http/middleware/securityContext';
export * from './http/middleware/securityErrorHandler';

// =============================================================================
// INITIALIZATION
// =============================================================================

import { loadSecureEnv } from './config/secureEnv';

/**
 * Initialize security layer
 * Call this once at application startup
 */
export function initializeSecurity(): void {
  loadSecureEnv();
}
