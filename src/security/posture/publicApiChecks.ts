/**
 * Public API Security Posture Checks
 * 
 * Additional security checks specific to public API.
 */

import { getRateLimitStats, isUsingRedis, getStoreType } from '../../publicApi/rateLimit/store.js';
import type { PostureCheck } from './index.js';

/**
 * Check rate limiter backend health.
 * getRateLimitStats() is now async — this function must be async too.
 */
export async function checkPublicApiRateLimiter(): Promise<PostureCheck> {
  const storeType = getStoreType();
  const usingRedis = isUsingRedis();
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production' && !usingRedis) {
    return {
      name: 'public_api_rate_limiter',
      level: 'warning',
      message: 'Public API using in-memory rate limiter in production (not recommended)',
      details: { storeType, usingRedis },
    };
  }

  if (nodeEnv === 'production' && usingRedis) {
    const stats = await getRateLimitStats();
    if (!stats.isHealthy) {
      return {
        name: 'public_api_rate_limiter',
        level: 'warning',
        message: 'Rate limiter store may be degraded',
        details: { storeType, isHealthy: stats.isHealthy },
      };
    }
  }

  return {
    name: 'public_api_rate_limiter',
    level: 'secure',
    message: usingRedis
      ? 'Public API using Redis rate limiter'
      : 'Public API using memory rate limiter (dev mode)',
    details: { storeType, usingRedis },
  };
}

/**
 * Check public API trust proxy configuration
 */
export function checkPublicApiTrustProxy(): PostureCheck {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const trustedProxies = process.env.TRUSTED_PROXY_IPS;
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (trustProxy && !trustedProxies) {
    return {
      name: 'public_api_trust_proxy',
      level: 'warning',
      message: 'TRUST_PROXY enabled but TRUSTED_PROXY_IPS not configured',
      details: { trustProxy, hasTrustedProxies: !!trustedProxies },
    };
  }
  
  return {
    name: 'public_api_trust_proxy',
    level: 'secure',
    message: trustProxy 
      ? 'Trust proxy configured for public API'
      : 'Trust proxy disabled (safe)',
    details: { trustProxy },
  };
}
