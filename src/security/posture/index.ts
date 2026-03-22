/**
 * Security Posture Checker
 * Validates security configuration at startup and provides diagnostics.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';

const logger = createLogger({ subsystem: 'security_posture' });

export type PostureLevel = 'secure' | 'warning' | 'critical' | 'unknown';

export interface PostureCheck {
  name: string;
  level: PostureLevel;
  message: string;
  details?: Record<string, unknown>;
}

export interface SecurityPostureReport {
  level: PostureLevel;
  timestamp: string;
  environment: string;
  checks: PostureCheck[];
  summary: { passed: number; warnings: number; critical: number };
}

function checkInternalAuthSecret(): PostureCheck {
  const secret = process.env.CONTROL_PLANE_INTERNAL_SECRET;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!secret) {
    return { name: 'internal_auth_secret', level: 'critical', message: 'CONTROL_PLANE_INTERNAL_SECRET is not set' };
  }

  if (secret === 'dev-secret' || secret === 'changeme' || secret.length < 32) {
    return { name: 'internal_auth_secret', level: nodeEnv === 'production' ? 'critical' : 'warning', message: 'Secret appears to be placeholder' };
  }

  return { name: 'internal_auth_secret', level: 'secure', message: 'Internal auth secret configured' };
}

function checkAdminCredentials(): PostureCheck {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!username || !password) {
    return { name: 'admin_credentials', level: 'critical', message: 'Admin credentials not configured' };
  }

  if (password === 'changeme' || password === 'admin123' || password.length < 8) {
    return { name: 'admin_credentials', level: nodeEnv === 'production' ? 'critical' : 'warning', message: 'Admin password appears weak' };
  }

  return { name: 'admin_credentials', level: 'secure', message: 'Admin credentials configured' };
}

function checkRateLimiterConfig(): PostureCheck {
  const useRedis = process.env.USE_REDIS_RATE_LIMIT === 'true';
  const redisUrl = process.env.REDIS_URL;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production' && !useRedis) {
    return { name: 'rate_limiter_backend', level: 'warning', message: 'In-memory rate limiter in production (not recommended)' };
  }

  if (useRedis && !redisUrl) {
    return { name: 'rate_limiter_backend', level: 'critical', message: 'USE_REDIS_RATE_LIMIT=true but REDIS_URL not set' };
  }

  return { name: 'rate_limiter_backend', level: 'secure', message: useRedis ? 'Using Redis' : 'Using memory (dev mode)' };
}

function checkTrustProxyConfig(): PostureCheck {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const trustedProxies = process.env.TRUSTED_PROXY_IPS;

  if (trustProxy && !trustedProxies) {
    return { name: 'trust_proxy', level: 'warning', message: 'TRUST_PROXY enabled but TRUSTED_PROXY_IPS not set' };
  }

  return { name: 'trust_proxy', level: 'secure', message: trustProxy ? 'Trust proxy configured' : 'Trust proxy disabled (safe)' };
}

function checkCorsConfig(): PostureCheck {
  const enableCors = process.env.CONTROL_PLANE_ENABLE_CORS === 'true';
  const corsOrigins = process.env.CONTROL_PLANE_CORS_ORIGINS;

  if (enableCors && corsOrigins === '*') {
    return { name: 'cors_control_plane', level: 'critical', message: 'CORS wildcard enabled (dangerous)' };
  }

  if (!enableCors) {
    return { name: 'cors_control_plane', level: 'secure', message: 'CORS disabled (safe)' };
  }

  return { name: 'cors_control_plane', level: 'secure', message: 'CORS configured' };
}

function checkNetworkBind(): PostureCheck {
  const host = process.env.CONTROL_PLANE_HOST;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (host === '0.0.0.0' && nodeEnv === 'production') {
    return { name: 'network_bind', level: 'warning', message: 'Binding to 0.0.0.0 in production' };
  }

  return { name: 'network_bind', level: 'secure', message: host === '0.0.0.0' ? 'Binding to all interfaces' : 'Binding to localhost' };
}

function checkDevModeFlags(): PostureCheck {
  const explicitDevAuth = process.env.EXPLICIT_DEV_AUTH === 'true';
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production' && explicitDevAuth) {
    return { name: 'dev_mode_flags', level: 'critical', message: 'EXPLICIT_DEV_AUTH=true in production' };
  }

  return { name: 'dev_mode_flags', level: 'secure', message: 'Dev mode config appropriate' };
}

export type PostureCheckFunction = () => PostureCheck;
const additionalChecks: PostureCheckFunction[] = [];

export function registerPostureCheck(check: PostureCheckFunction): void {
  additionalChecks.push(check);
}

const allChecks: PostureCheckFunction[] = [
  checkInternalAuthSecret, checkAdminCredentials, checkRateLimiterConfig,
  checkTrustProxyConfig, checkCorsConfig, checkNetworkBind, checkDevModeFlags
];

export function runSecurityPostureChecks(): SecurityPostureReport {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const checks = allChecks.map(fn => fn());
  const summary = {
    passed: checks.filter(c => c.level === 'secure').length,
    warnings: checks.filter(c => c.level === 'warning').length,
    critical: checks.filter(c => c.level === 'critical').length,
  };

  let level: PostureLevel = 'secure';
  if (summary.critical > 0) level = 'critical';
  else if (summary.warnings > 0) level = 'warning';

  return { level, timestamp: new Date().toISOString(), environment: nodeEnv, checks, summary };
}

export function runAllPostureChecks(): SecurityPostureReport {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const checks = [...allChecks.map(fn => fn()), ...additionalChecks.map(fn => fn())];
  const summary = {
    passed: checks.filter(c => c.level === 'secure').length,
    warnings: checks.filter(c => c.level === 'warning').length,
    critical: checks.filter(c => c.level === 'critical').length,
  };

  let level: PostureLevel = 'secure';
  if (summary.critical > 0) level = 'critical';
  else if (summary.warnings > 0) level = 'warning';

  return { level, timestamp: new Date().toISOString(), environment: nodeEnv, checks, summary };
}

export function logSecurityPostureReport(report: SecurityPostureReport): void {
  const { level, environment, checks, summary } = report;
  logger.info({ level, environment, summary }, 'Security posture check complete');

  for (const check of checks) {
    if (check.level === 'critical') logger.error({ check: check.name }, check.message);
    else if (check.level === 'warning') logger.warn({ check: check.name }, check.message);
    else logger.debug({ check: check.name }, check.message);
  }
}

export function assertSecurityPosture(): void {
  const report = runSecurityPostureChecks();
  logSecurityPostureReport(report);

  if (report.level === 'critical') {
    const criticalIssues = report.checks.filter(c => c.level === 'critical').map(c => c.name).join(', ');
    throw new Error('[Security] Critical posture issues: ' + criticalIssues + '. Fix before production.');
  }

  if (report.environment === 'production' && (report.summary.warnings > 0 || report.summary.critical > 0)) {
    logger.error({ environment: report.environment, summary: report.summary }, 'Security posture issues in production');
  }
}
