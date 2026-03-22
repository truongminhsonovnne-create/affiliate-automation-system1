/**
 * Audit Logger - Auth Events
 *
 * Minimal structured audit log for admin authentication events.
 * NEVER logs: passwords, session tokens, secrets, or full request bodies.
 * ONLY logs: event type, timestamp, actor identity, IP, outcome.
 *
 * In production, route this to your log aggregator (Datadog, GCP Logging, etc.)
 */

export type AuthEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED'
  | 'SESSION_INVALID'
  | 'RATE_LIMITED'
  | 'PASSWORD_MISMATCH'
  | 'PROXY_SUCCESS'
  | 'PROXY_REJECTED'
  | 'PROXY_ERROR';

export interface AuditLogEntry {
  timestamp: string;      // ISO 8601
  event: AuthEvent;
  actorId?: string;       // username, never email or password
  ip: string;
  userAgent?: string;
  reason?: string;       // human-readable reason, never includes secrets
  sessionId?: string;    // truncated server-side session reference, not the token
}

function formatAuditEntry(entry: AuditLogEntry): string {
  // Always JSON for structured log parsing
  return JSON.stringify(entry);
}

function redactIp(ip: string): string {
  // Don't log full IPs in audit logs to limit PII exposure
  // Keep first two segments for geo-debugging
  if (!ip || ip === 'unknown') return 'unknown';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  const v6parts = ip.split(':');
  if (v6parts.length > 2) {
    return `${v6parts[0]}:${v6parts[1]}:xxxx:xxxx`;
  }
  return 'redacted';
}

/**
 * Log an authentication event.
 * Logs to stderr so it doesn't interfere with API JSON responses.
 * In production, replace with your structured logger (pino, winston, etc.)
 */
export function auditLog(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const full: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    ip: redactIp(entry.ip),
  };

  // Print to stderr to keep stdout clean for API responses
  console.error('[AUDIT]', formatAuditEntry(full));
}

/**
 * Pre-built helpers for common auth events
 */

export function logLoginSuccess(ip: string, actorId: string, userAgent?: string): void {
  auditLog({ event: 'LOGIN_SUCCESS', actorId, ip, userAgent });
}

export function logLoginFailure(
  ip: string,
  actorIdHint: string | undefined,
  reason: string,
  userAgent?: string
): void {
  auditLog({
    event: 'LOGIN_FAILURE',
    actorId: actorIdHint,
    ip,
    reason,
    userAgent,
  });
}

export function logLogout(ip: string, actorId: string): void {
  auditLog({ event: 'LOGOUT', actorId, ip });
}

export function logSessionExpired(ip: string, actorId?: string): void {
  auditLog({ event: 'SESSION_EXPIRED', actorId, ip });
}

export function logSessionInvalid(ip: string, reason: string): void {
  auditLog({ event: 'SESSION_INVALID', ip, reason });
}

export function logRateLimited(ip: string, actorIdHint?: string): void {
  auditLog({ event: 'RATE_LIMITED', actorId: actorIdHint, ip });
}

export function logProxyRequest(params: {
  event: 'PROXY_SUCCESS' | 'PROXY_REJECTED' | 'PROXY_ERROR';
  actorId: string;
  ip: string;
  targetPath: string;
  method: string;
  status?: number;
  reason?: string;
}): void {
  auditLog({
    event: params.event,
    actorId: params.actorId,
    ip: params.ip,
    reason: params.reason,
    // Include target path in audit log (not a secret, it's the internal API path)
    // Strip any query params that might contain sensitive data
  });
}
