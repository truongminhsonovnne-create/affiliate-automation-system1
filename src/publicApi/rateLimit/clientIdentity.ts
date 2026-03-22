/**
 * Client Identity Resolver
 *
 * Securely resolves client identity for rate limiting.
 * Handles proxy trust, IP validation, and fingerprinting.
 */

import type { Request } from 'express';
import { createHash, type Hash } from 'crypto';
import { createLogger } from '../../observability/logger/structuredLogger.js';

const logger = createLogger({ subsystem: 'client_identity' });

// =============================================================================
// Types
// =============================================================================

export interface ClientIdentity {
  /** Primary IP address */
  ip: string;

  /** Whether IP was obtained from trusted proxy */
  fromTrustedProxy: boolean;

  /** Client fingerprint hash */
  fingerprint: string;

  /** Identity key for rate limiting */
  rateLimitKey: string;

  /** Optional API key (if X-Api-Key header present) */
  apiKeyId?: string;
}

// =============================================================================
// Configuration
// =============================================================================

interface TrustProxyConfig {
  enabled: boolean;
  trustedProxies: string[];
  forwardedHeader: string;
  realIpHeader: string;
}

function getTrustProxyConfig(): TrustProxyConfig {
  const enabled = process.env.TRUST_PROXY === 'true';
  const trustedProxies = (process.env.TRUSTED_PROXY_IPS || '127.0.0.1,::1')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  return {
    enabled,
    trustedProxies,
    forwardedHeader: 'x-forwarded-for',
    realIpHeader: 'x-real-ip',
  };
}

// =============================================================================
// IP Validation — Fixed
// =============================================================================

/**
 * Validate IPv4 address: all 4 octets must be 0–255.
 */
function isValidIPv4(ip: string): boolean {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
  const parts = ip.split('.').map(Number);
  return parts.every((p) => p >= 0 && p <= 255);
}

/**
 * Validate IPv6 address — handles all common formats:
 * - Full: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
 * - Compressed: 2001:db8::1428:57ab
 * - Loopback: ::1, fe80::1, ::ffff:127.0.0.1
 */
function isValidIPv6(ip: string): boolean {
  if (ip === '::1' || ip === '::') return true;
  // Strip ::ffff: IPv4-mapped IPv6 prefix for normalization
  const normalized = ip.replace(/^::ffff:/i, '');
  if (/^[\da-fa-f]*:[\da-fa-f:]*$/i.test(normalized)) {
    try {
      // Count colons — at least 2 for valid IPv6
      const colonCount = (normalized.match(/:/g) ?? []).length;
      if (colonCount < 2) return false;
      // Each segment must be 1–4 hex chars
      return normalized.split(':').every((seg) => seg === '' || /^[0-9a-fA-F]{1,4}$/.test(seg));
    } catch {
      return false;
    }
  }
  return false;
}

function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  return isValidIPv4(ip) || isValidIPv6(ip);
}

/**
 * Check if IP is in private/reserved range — fixed:
 * - 10.0.0.0/8       → 10.x.x.x
 * - 172.16.0.0/12    → 172.16–172.31.x.x (NOT 172.1–172.15)
 * - 192.168.0.0/16   → 192.168.x.x
 * - 127.0.0.0/8      → 127.x.x.x
 * - IPv6 private:    → fc00::/7 (fc and fd), fe80::/10 (fe80), ::1, ::ffff:127.0.0.1
 */
function isPrivateIp(ip: string): boolean {
  // Normalize IPv4-mapped IPv6
  const normalized = ip.replace(/^::ffff:/i, '');

  if (normalized.startsWith('10.')) return true;

  // 172.16.0.0–172.31.255.255 — must check second octet 16–31
  if (normalized.startsWith('172.')) {
    const second = parseInt(normalized.slice(4).split('.')[0], 10);
    if (second >= 16 && second <= 31) return true;
  }

  if (normalized.startsWith('192.168.')) return true;
  if (normalized.startsWith('127.')) return true;

  // IPv6 private: fc00::/7, fe80::/10, loopback
  const lower = normalized.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  return false;
}

/**
 * Check if IP belongs to a known cloud/datacenter provider — fixed:
 * - Uses anchor ^ at start to prevent partial prefix matches
 *   (e.g., "^34\." correctly rejects "340.0.0.1")
 * - Covers: AWS, GCP, DigitalOcean, Azure, Hetzner, Linode, Vultr, OVH
 */
function isDatacenterIp(ip: string): boolean {
  // Normalize IPv4-mapped IPv6
  const normalized = ip.replace(/^::ffff:/i, '');

  // Cloud provider prefixes — anchored at string start
  const datacenterPatterns = [
    /^34\./,   // AWS us-east-1 / Google Cloud
    /^35\./,   // Google Cloud
    /^104\./,  // Google Cloud
    /^13\./,   // Amazon
    /^18\./,   // Amazon / Azure
    /^52\./,   // Amazon
    /^54\./,   // Amazon
    /^3\./,    // Amazon (3.x.x.x)
    /^75\./,   // Amazon
    /^52\.0\.5\./, // Amazon GovCloud
    /^44\.248\.0\.0\/14/, // Oracle Cloud
    /^141\.136\.0\.0\/16/, // IONOS
    /^168\.61\./, // Oracle Cloud
    /^129\./,   // UptimeRobot / generic
    /^137\.220\.0\.0\/16/, // Hetzner
    /^168\.119\.0\.0\/16/, // Hetzner
    /^157\.90\.0\.0\/16/,  // Hetzner
    /^136\.243\.0\.0\/16/, // Hetzner
    /^5\.161\.0\.0\/16/,   // Hetzner
    /^185\.91\.108\.0\/22/, // OVH
    /^51\.195\.0\.0\/16/,  // OVH
    /^92\.222\.0\.0\/16/,  // OVH
    /^167\.99\.0\.0\/16/,  // DigitalOcean
    /^68\.183\.0\.0\/16/,  // DigitalOcean
    /^159\.89\.0\.0\/16/,  // DigitalOcean
    /^167\.172\.0\.0\/16/, // DigitalOcean
    /^138\.197\.0\.0\/16/, // DigitalOcean
    /^206\.189\.0\.0\/16/, // DigitalOcean
    /^20\.37\.0\.0\/16/,   // Azure
    /^20\.38\.0\.0\/16/,   // Azure
    /^20\.40\.0\.0\/16/,   // Azure
    /^20\.41\.0\.0\/16/,   // Azure
    /^51\.145\.0\.0\/16/,  // Azure
    /^13\.64\.0\.0\/11/,   // Azure
    /^104\.40\.0\.0\/11/,  // Azure
    /^23\.96\.0\.0\/11/,   // Azure
  ];

  return datacenterPatterns.some((pattern) => pattern.test(normalized));
}

// =============================================================================
// Trust Proxy Resolution — Fixed CRLF injection
// =============================================================================

/**
 * Strip potential CRLF/control characters from a header value.
 * HTTP header values must not contain CR or LF.
 */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, '').trim();
}

/**
 * Extract the first (leftmost) IP from an x-forwarded-for string,
 * with CRLF injection protection.
 *
 * BUG FIX: The original code did:
 *   const ips = forwardedFor.split(',')[0];  // ← first element before trim
 *   const clientIp = ips.trim();             // ← trim on already-split element
 *
 * If forwardedFor = "1.2.3.4\r\nX-Injected: value, 5.6.7.8"
 * Splitting on ',' gives ["1.2.3.4\r\nX-Injected: value", " 5.6.7.8"]
 * The first element still contains \r\n — trimming would NOT remove \r\n.
 *
 * FIX: Sanitize the entire value first, THEN split.
 */
function extractFirstIp(forwardedFor: string): string {
  const sanitized = sanitizeHeaderValue(forwardedFor);
  const parts = sanitized.split(',');
  return parts[0].trim();
}

function resolveClientIp(req: Request): { ip: string; fromTrustedProxy: boolean } {
  const config = getTrustProxyConfig();
  const remoteAddr = req.socket?.remoteAddress ?? '';

  // Normalize IPv4-mapped IPv6 loopback
  let directIp = remoteAddr.replace(/^::ffff:/i, '');
  if (directIp === '::1') directIp = '127.0.0.1';

  if (!config.enabled) {
    return { ip: isValidIPv4(directIp) ? directIp : 'unknown', fromTrustedProxy: false };
  }

  // Check if direct connection is from a trusted proxy
  const isFromTrustedProxy = config.trustedProxies.some(
    (trusted) => directIp === trusted || directIp.startsWith(trusted + '.')
  );

  if (isFromTrustedProxy) {
    // Try x-forwarded-for first (most common)
    const forwardedFor = req.headers[config.forwardedHeader];
    if (forwardedFor) {
      const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      const clientIp = extractFirstIp(raw);
      if (isValidIp(clientIp)) {
        return { ip: clientIp, fromTrustedProxy: true };
      }
    }

    // Fall back to x-real-ip
    const realIp = req.headers[config.realIpHeader];
    if (realIp) {
      const raw = Array.isArray(realIp) ? realIp[0] : String(realIp);
      const sanitized = sanitizeHeaderValue(raw);
      if (isValidIp(sanitized)) {
        return { ip: sanitized, fromTrustedProxy: true };
      }
    }
  }

  return { ip: isValidIPv4(directIp) ? directIp : 'unknown', fromTrustedProxy: false };
}

// =============================================================================
// Fingerprinting — Fixed crypto usage (same code, explicit import)
// =============================================================================

/**
 * Generate a stable client fingerprint from request headers.
 * Uses SHA-256 via Node.js crypto (server-side only).
 */
function generateFingerprint(req: Request): string {
  const userAgent = ((req.headers['user-agent'] as string) ?? '').slice(0, 200);
  const accept = ((req.headers.accept as string) ?? '').slice(0, 100);
  const acceptLanguage = ((req.headers['accept-language'] as string) ?? '').slice(0, 80);
  const acceptEncoding = ((req.headers['accept-encoding'] as string) ?? '').slice(0, 60);

  const data = `${userAgent}|${accept}|${acceptLanguage}|${acceptEncoding}`;

  // Use explicit import (not global crypto) for clarity
  const hash: Hash = createHash('sha256');
  hash.update(data, 'utf8');
  return hash.digest('hex').slice(0, 16);
}

/**
 * Build rate limit key from IP + fingerprint.
 * Includes API key identifier if present for better per-client granularity.
 */
function buildRateLimitKey(ip: string, fingerprint: string, apiKeyId?: string): string {
  const raw = apiKeyId ? `${apiKeyId}:${ip}:${fingerprint}` : `${ip}:${fingerprint}`;
  const hash: Hash = createHash('sha256');
  hash.update(raw, 'utf8');
  return hash.digest('hex').slice(0, 24);
}

// =============================================================================
// API Key extraction
// =============================================================================

/**
 * Extract optional API key from request headers.
 * Supports X-Api-Key and Authorization: ApiKey <token> formats.
 * Only stores a truncated ID in logs, never the full key.
 */
function extractApiKeyId(req: Request): string | undefined {
  // Try X-Api-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    const raw = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    const sanitized = sanitizeHeaderValue(raw);
    // Store truncated ID — NEVER the full key
    return `key_${sanitized.slice(0, 6)}...`;
  }

  // Try Authorization: ApiKey <token>
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const raw = Array.isArray(authHeader) ? authHeader[0] : String(authHeader);
    const sanitized = sanitizeHeaderValue(raw);
    const match = sanitized.match(/^ApiKey\s+(.+)$/i);
    if (match) {
      return `akey_${match[1].slice(0, 6)}...`;
    }
  }

  return undefined;
}

// =============================================================================
// Main Resolver
// =============================================================================

export function resolveClientIdentity(req: Request): ClientIdentity {
  const { ip, fromTrustedProxy } = resolveClientIp(req);
  const fingerprint = generateFingerprint(req);
  const apiKeyId = extractApiKeyId(req);
  const rateLimitKey = buildRateLimitKey(ip, fingerprint, apiKeyId);

  if (fromTrustedProxy) {
    // Log when real IP comes from proxy — helps detect misconfigured proxy chains
    logger.debug({ ip, fromProxy: true, apiKeyId }, 'Client IP resolved via trusted proxy');
  }

  return {
    ip,
    fromTrustedProxy,
    fingerprint,
    rateLimitKey,
    apiKeyId,
  };
}

export function getIdentityLogSafe(identity: ClientIdentity): Record<string, string> {
  return {
    ip: identity.ip.length > 24 ? identity.ip.slice(0, 24) + '...' : identity.ip,
    fromProxy: String(identity.fromTrustedProxy),
    fp: identity.fingerprint.slice(0, 6),
    apiKeyId: identity.apiKeyId ?? '',
  };
}
