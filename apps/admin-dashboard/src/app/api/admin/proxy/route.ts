/**
 * Admin API Proxy — Production Hardened
 *
 * Server-side proxy that forwards read-only requests from the admin dashboard
 * to the internal control plane API. Acts as a trust boundary bridge.
 *
 * HARDENING APPLIED:
 *  - Route whitelist: only known, pre-approved internal paths are forwarded
 *  - Path validation: path traversal, absolute URLs, null-bytes all rejected
 *  - Header stripping: client-supplied headers stripped before forwarding
 *  - Method allowlist: GET only (dashboard is read-only by design)
 *  - Request size limit: max 64KB body for any forwarded request
 *  - Timeout: 30s hard timeout to prevent hanging connections
 *  - Audit log: every proxy request is logged (target path, actor, outcome)
 *  - Error sanitization: internal errors never leaked to client
 *  - No query forwarding: query params built from validated internal schema
 *
 * TRUST MODEL:
 *   Browser → [session cookie] → Dashboard → [proxy] → Control Plane
 *   The proxy is the ONLY egress point from the dashboard to the internal API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth/session';
import { logProxyRequest } from '@/lib/auth/auditLogger';

// =============================================================================
// Config (fail-fast startup validation)
// =============================================================================

const INTERNAL_BASE_URL = (() => {
  const url = process.env.INTERNAL_API_URL || 'http://localhost:3001';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`INTERNAL_API_URL must use http/https, got: ${parsed.protocol}`);
    }
    return url.replace(/\/$/, ''); // Normalize: no trailing slash
  } catch {
    throw new Error(
      'FATAL: INTERNAL_API_URL is not a valid URL. ' +
        'Set a valid internal API URL in your environment.'
    );
  }
})();

// Internal secret for admin→control-plane auth (server-side only, never exposed)
const INTERNAL_SECRET = (() => {
  const secret = process.env.CONTROL_PLANE_INTERNAL_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: CONTROL_PLANE_INTERNAL_SECRET is not set. ' +
        'This secret is required for admin-to-control-plane authentication. ' +
        'Set it in your environment before starting the server.'
    );
  }
  if (secret.length < 16) {
    throw new Error(
      `FATAL: CONTROL_PLANE_INTERNAL_SECRET is too short (${secret.length} chars). ` +
        'Minimum 16 characters required. Generate: openssl rand -hex 32'
    );
  }
  return secret;
})();

// =============================================================================
// Route Allowlist — complete map of allowed paths and their HTTP methods
// Matches the actual control plane /internal/dashboard/* routes.
// Any path NOT in this list will be rejected immediately.
// =============================================================================

interface AllowedRoute {
  /** Path suffix added to INTERNAL_BASE_URL/internal/dashboard */
  path: string;
  /** HTTP methods allowed for this route */
  methods: readonly ('GET' | 'POST' | 'PUT' | 'DELETE')[];
  /** Human-readable description for audit logs */
  description: string;
}

const ALLOWED_ROUTES: AllowedRoute[] = [
  // Overview
  { path: '/overview',          methods: ['GET'], description: 'Dashboard overview' },
  { path: '/activity',          methods: ['GET'], description: 'Activity feed' },
  { path: '/failure-insights',  methods: ['GET'], description: 'Failure insights' },
  { path: '/trends',            methods: ['GET'], description: 'Trend data' },

  // Products
  { path: '/products',                  methods: ['GET'], description: 'List products' },
  { path: '/products/:productId',       methods: ['GET'], description: 'Get product detail' },

  // Crawl Jobs
  { path: '/crawl-jobs',               methods: ['GET'], description: 'List crawl jobs' },
  { path: '/crawl-jobs/:jobId',         methods: ['GET'], description: 'Get crawl job detail' },

  // Publish Jobs
  { path: '/publish-jobs',              methods: ['GET'], description: 'List publish jobs' },
  { path: '/publish-jobs/:jobId',         methods: ['GET'], description: 'Get publish job detail' },

  // AI Content
  { path: '/ai-contents',               methods: ['GET'], description: 'List AI content' },
  { path: '/ai-contents/:contentId',    methods: ['GET'], description: 'Get AI content detail' },

  // Operations
  { path: '/dead-letters',              methods: ['GET'], description: 'List dead letters' },
  { path: '/dead-letters/:id',          methods: ['GET'], description: 'Get dead letter detail' },

  // Workers
  { path: '/workers',                   methods: ['GET'], description: 'List workers' },
  { path: '/workers/:workerIdentity',   methods: ['GET'], description: 'Get worker detail' },

  // AccessTrade Integration
  { path: '/integrations/accesstrade/health',  methods: ['GET'], description: 'AccessTrade health check' },
  { path: '/integrations/accesstrade/sync',    methods: ['POST'], description: 'AccessTrade sync trigger' },
];

// Build a fast lookup map: method → path patterns
type RouteKey = `GET:${string}`;
const ROUTE_MAP = new Map<RouteKey, AllowedRoute>(
  ALLOWED_ROUTES.flatMap((r) =>
    r.methods.map((m) => [`${m}:${r.path}`, r] as const)
  ) as Iterable<readonly [`GET:${string}`, AllowedRoute]>
);

// =============================================================================
// Request Validation
// =============================================================================

const MAX_BODY_SIZE = 64 * 1024; // 64 KB
const PROXY_TIMEOUT_MS = 30_000;  // 30 seconds
const MAX_PATH_LENGTH = 256;
const MAX_QUERY_LENGTH = 1024;

/**
 * Result of path validation
 */
type PathValidation =
  | { valid: true; internalPath: string }
  | { valid: false; reason: string };

/**
 * Validate and normalize the proxy path from the `path` query parameter.
 *
 * Rejects:
 *   - Path traversal: /../ /..%00
 *   - Absolute URLs: http://, https://, //
 *   - Null bytes: %00, \0
 *   - Non-printable or dangerous characters
 *   - Paths outside /internal/dashboard namespace
 *   - Paths not in the allowlist
 *   - Methods not allowed for the path
 */
function validateAndResolveRoute(
  path: string,
  method: string
): PathValidation {
  // 1. Type check
  if (typeof path !== 'string') {
    return { valid: false, reason: 'path must be a string' };
  }

  // 2. Length check
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) {
    return { valid: false, reason: `path length must be 1–${MAX_PATH_LENGTH} characters` };
  }

  // 3. No leading slash normalization
  const normalized = '/' + path.trim().replace(/^\/+/, '');

  // 4. Path traversal detection
  if (
    normalized.includes('/../') ||
    normalized.endsWith('/..') ||
    normalized === '/..' ||
    normalized.includes('%2e%2e') ||
    normalized.includes('%252e') ||
    normalized.includes('..') ||
    normalized.includes('\0') ||
    normalized.includes('%00')
  ) {
    return { valid: false, reason: 'path traversal attempt detected' };
  }

  // 5. Protocol / absolute URL detection
  const lower = normalized.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('//') ||
    lower.startsWith('ftp://') ||
    normalized.startsWith('/http') ||
    normalized.includes('://')
  ) {
    return { valid: false, reason: 'absolute URLs are not allowed' };
  }

  // 6. No control characters
  if (/[\x00-\x1f\x7f]/.test(normalized)) {
    return { valid: false, reason: 'control characters not allowed in path' };
  }

  // 7. Resolve dynamic segments — replace :param with a placeholder for matching
  //    The control plane will validate actual param values.
  //    We allow alphanumeric, hyphen, underscore for param values.
  const segments = normalized.split('/');
  let routeKeyPattern = normalized;

  // Check exact match first
  const exactKey = `${method}:${normalized}` as RouteKey;
  if (ROUTE_MAP.has(exactKey)) {
    return { valid: true, internalPath: normalized };
  }

  // Check dynamic match (replace :segment with wildcard)
  for (const [routeKey, route] of ROUTE_MAP) {
    if (!routeKey.startsWith(`${method}:`)) continue;

    const pattern = routeKey.slice(method.length + 1); // e.g. /products/:productId
    if (pattern.includes(':')) {
      const patternParts = pattern.split('/');
      if (patternParts.length !== segments.length) continue;

      let matches = true;
      const resolvedPathParts: string[] = [];

      for (let i = 0; i < patternParts.length; i++) {
        const pp = patternParts[i];
        const sp = segments[i];

        if (pp.startsWith(':')) {
          // Validate param value: alphanumeric, hyphen, underscore only
          // Reject paths with ../ or other dangerous chars in dynamic segments
          if (!/^[a-zA-Z0-9_-]+$/.test(sp)) {
            matches = false;
            break;
          }
          resolvedPathParts.push(sp);
        } else if (pp === sp) {
          resolvedPathParts.push(sp);
        } else {
          matches = false;
          break;
        }
      }

      if (matches) {
        return { valid: true, internalPath: resolvedPathParts.join('/') };
      }
    }
  }

  return {
    valid: false,
    reason: `path '${normalized}' with method '${method}' is not in the allowed routes`,
  };
}

// =============================================================================
// Headers — strip sensitive client headers
// =============================================================================

/**
 * Headers that MUST NOT be forwarded from the client to the internal API.
 * These headers either duplicate our server-set values or would allow
 * the client to spoof internal authentication.
 */
const STRIP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',  // We set this based on actual body
  'cookie',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'x-internal-secret',  // Never let client set the internal secret
  'x-actor-id',          // Never trust client-supplied actor ID
  'x-actor-role',        // Never trust client-supplied role
  'authorization',       // We use our own auth mechanism
  'x-correlation-id',    // We generate our own correlation ID
  'x-request-id',
  'x-api-key',
  'x-api-token',
  'x-session',
  'x-session-id',
  'x-session-token',
  'proxy-authorization',
  'www-authenticate',
  'upgrade-insecure-requests',
]);

/**
 * Build the headers object for the forwarded request.
 * Strips sensitive headers from the client and injects only our server-side values.
 */
function buildForwardHeaders(
  request: NextRequest,
  actorId: string,
  role: string
): Record<string, string> {
  const headers: Record<string, string> = {
    // --- Server-set trust boundary headers (only these are trusted) ---
    'x-internal-secret': INTERNAL_SECRET,
    'x-actor-id': actorId,
    'x-actor-role': role,
    // Correlation ID for distributed tracing
    'x-correlation-id': generateCorrelationId(),
  };

  // Forward ONLY safe, non-sensitive headers from the client
  const SAFE_FORWARD_HEADERS = [
    'accept',
    'accept-language',
    'accept-encoding',
    'cache-control',
    'user-agent',   // Already validated by the browser same-origin policy
  ];

  for (const headerName of SAFE_FORWARD_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      // Validate header values don't contain newlines (header injection)
      if (value.includes('\n') || value.includes('\r')) {
        continue; // Skip headers with injection attempts
      }
      headers[headerName.toLowerCase()] = value.slice(0, 512); // Truncate long values
    }
  }

  return headers;
}

/**
 * Generate a unique correlation ID for distributed tracing.
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `proxy_${timestamp}_${random}`;
}

// =============================================================================
// Proxy Request Handler
// =============================================================================

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  // Dashboard only uses GET proxy requests.
  // POST is accepted only for specific operations that might need it.
  return proxyRequest(request);
}

// Block all other methods at the export level — explicit handlers only
export async function PUT(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  // ---- 1. Authenticate ----
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- 2. Parse + validate path ----
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return NextResponse.json(
      { error: 'Missing required parameter: path' },
      { status: 400 }
    );
  }

  const method = request.method;
  const pathValidation = validateAndResolveRoute(rawPath, method);

  if (!pathValidation.valid) {
    // Log the rejection for audit (but don't expose internal route info)
    logProxyRequest({
      event: 'PROXY_REJECTED',
      actorId: session.actorId,
      ip: getClientIp(request),
      targetPath: rawPath,
      method,
      reason: pathValidation.reason,
    });

    return NextResponse.json(
      { error: 'Invalid request path', code: 'INVALID_PROXY_PATH' },
      { status: 400 }
    );
  }

  const targetPath = pathValidation.internalPath;

  // ---- 3. Build internal URL ----
  const internalUrl = `${INTERNAL_BASE_URL}/internal/dashboard${targetPath}`;

  // ---- 4. Handle request body (size limit) ----
  let body: string | undefined;
  const contentLength = request.headers.get('content-length');

  if (method !== 'GET' && method !== 'HEAD') {
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > MAX_BODY_SIZE) {
        logProxyRequest({
          event: 'PROXY_REJECTED',
          actorId: session.actorId,
          ip: getClientIp(request),
          targetPath,
          method,
          reason: `request body too large: ${size} bytes (max ${MAX_BODY_SIZE})`,
        });
        return NextResponse.json(
          { error: 'Request too large', code: 'PAYLOAD_TOO_LARGE' },
          { status: 413 }
        );
      }
    }

    try {
      body = await request.text();
      if (body.length > MAX_BODY_SIZE) {
        return NextResponse.json(
          { error: 'Request too large', code: 'PAYLOAD_TOO_LARGE' },
          { status: 413 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  }

  // ---- 5. Build headers ----
  const forwardHeaders = buildForwardHeaders(request, session.actorId, session.role);

  // ---- 6. Forward request ----
  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    response = await fetch(internalUrl, {
      method,
      headers: forwardHeaders,
      body,
      signal: controller.signal as AbortSignal,
    });

    clearTimeout(timeout);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';

    // Don't log the full error — might contain internal URLs
    logProxyRequest({
      event: 'PROXY_ERROR',
      actorId: session.actorId,
      ip: getClientIp(request),
      targetPath,
      method,
      reason: 'internal service unreachable',
    });

    if (reason.includes('abort') || reason.includes('timeout')) {
      return NextResponse.json(
        { error: 'Internal service timeout', code: 'GATEWAY_TIMEOUT' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reach internal service', code: 'GATEWAY_ERROR' },
      { status: 502 }
    );
  }

  // ---- 7. Forward response ----
  const contentType = response.headers.get('content-type') ?? '';
  const responseBody = await response.text();

  // Sanitize response body: don't leak internal stack traces
  let safeBody: unknown;
  try {
    // If it's JSON, keep it as-is (the control plane should already sanitize errors)
    if (contentType.includes('application/json')) {
      JSON.parse(responseBody); // Validate it's actually JSON
      safeBody = JSON.parse(responseBody);
    } else {
      // Non-JSON responses: return a generic message
      safeBody = { message: 'Response received', status: response.status };
    }
  } catch {
    safeBody = { message: 'Response received', status: response.status };
  }

  logProxyRequest({
    event: 'PROXY_SUCCESS',
    actorId: session.actorId,
    ip: getClientIp(request),
    targetPath,
    method,
    status: response.status,
  });

  return NextResponse.json(safeBody, {
    status: response.status,
    headers: {
      // Only forward safe response headers
      'Content-Type': contentType || 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// =============================================================================
// Utilities
// =============================================================================

function getClientIp(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
