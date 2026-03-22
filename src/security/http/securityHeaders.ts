/**
 * Security Layer - HTTP Security Headers
 * Production-grade security headers for HTTP responses
 */

import type { OutgoingHttpHeaders } from 'http';

// =============================================================================
// CONFIG
// =============================================================================

/** Security header options */
export interface SecurityHeaderOptions {
  /** Enable CSP */
  enableCSP?: boolean;

  /** Custom CSP directives */
  cspDirectives?: Record<string, string[]>;

  /** Enable HSTS */
  enableHSTS?: boolean;

  /** HSTS max age in seconds */
  hstsMaxAge?: number;

  /** Enable iframe restrictions */
  allowFraming?: boolean;

  /** Allowed frame origins */
  allowedFrameOrigins?: string[];

  /** Enable CORS for admin */
  enableAdminCORS?: boolean;

  /** Allowed origins for CORS */
  allowedOrigins?: string[];
}

// =============================================================================
// BUILDERS
// =============================================================================

/**
 * Build Content Security Policy string
 */
export function buildContentSecurityPolicy(options?: {
  enableInlineStyles?: boolean;
  allowedScriptSources?: string[];
  allowedStyleSources?: string[];
  allowedImageSources?: string[];
  allowedConnectSources?: string[];
}): string {
  const directives: string[] = [];

  // Default-src
  directives.push("default-src 'self'");

  // Script-src
  const scriptSources = options?.allowedScriptSources ?? ["'self'"];
  directives.push(`script-src ${scriptSources.join(' ')}`);

  // Style-src
  const styleSources = options?.allowedStyleSources ?? ["'self'"];
  if (options?.enableInlineStyles) {
    styleSources.push("'unsafe-inline'");
  }
  directives.push(`style-src ${styleSources.join(' ')}`);

  // Img-src
  const imageSources = options?.allowedImageSources ?? ["'self'", 'data:', 'https:'];
  directives.push(`img-src ${imageSources.join(' ')}`);

  // Connect-src
  const connectSources = options?.allowedConnectSources ?? ["'self'"];
  directives.push(`connect-src ${connectSources.join(' ')}`);

  // Font-src
  directives.push("font-src 'self'");

  // Object-src
  directives.push("object-src 'none'");

  // Base-uri
  directives.push("base-uri 'self'");

  // Form-action
  directives.push("form-action 'self'");

  // Frame-ancestors
  directives.push("frame-ancestors 'none'");

  return directives.join('; ');
}

/**
 * Build admin-specific CSP
 */
export function buildAdminSecurityHeaders(options?: SecurityHeaderOptions): OutgoingHttpHeaders {
  const headers: OutgoingHttpHeaders = {
    // Prevent content type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking
    'X-Frame-Options': options?.allowFraming ? 'SAMEORIGIN' : 'DENY',

    // XSS Protection
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',

    // Cache Control for sensitive pages
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
  };

  // Content Security Policy
  if (options?.enableCSP !== false) {
    const csp = options?.cspDirectives
      ? Object.entries(options.cspDirectives)
          .map(([directive, values]) => `${directive} ${values.join(' ')}`)
          .join('; ')
      : buildContentSecurityPolicy({
          enableInlineStyles: true,
          allowedScriptSources: ["'self'", "'unsafe-inline'"],
          allowedStyleSources: ["'self'", "'unsafe-inline'"],
        });

    headers['Content-Security-Policy'] = csp;
  }

  // HSTS for production
  if (options?.enableHSTS !== false && process.env.NODE_ENV === 'production') {
    const maxAge = options?.hstsMaxAge ?? 31536000; // 1 year
    headers['Strict-Transport-Security'] = `max-age=${maxAge}; includeSubDomains; preload`;
  }

  // CORS for admin
  if (options?.enableAdminCORS && options?.allowedOrigins) {
    headers['Access-Control-Allow-Origin'] = options.allowedOrigins.join(' ');
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  headers: OutgoingHttpHeaders,
  options?: SecurityHeaderOptions
): OutgoingHttpHeaders {
  const securityHeaders = buildAdminSecurityHeaders(options);

  return {
    ...securityHeaders,
    ...headers,
  };
}

/**
 * Get default security headers for API responses
 */
export function getDefaultAPISecurityHeaders(): OutgoingHttpHeaders {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };
}

/**
 * Get default security headers for static assets
 */
export function getDefaultStaticSecurityHeaders(): OutgoingHttpHeaders {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
}

/**
 * Get default security headers for error responses
 */
export function getDefaultErrorSecurityHeaders(): OutgoingHttpHeaders {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'X-Frame-Options': 'DENY',
  };
}
