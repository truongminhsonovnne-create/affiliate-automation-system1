/**
 * Public Voucher Resolution API Route
 *
 * Unauthenticated endpoints that proxy to the internal voucher engine.
 * This route is intentionally NOT authenticated so end-users can call it
 * directly from the browser.
 *
 * The internal API URL is never exposed — all requests go through this route.
 */

import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL;

// No fallback — if this is missing the request fails fast with a clear
// error instead of silently proxying to localhost in production.
const TIMEOUT_MS = 10_000;

// =============================================================================
// Logging helpers (safe — never log secrets or raw body content)
// =============================================================================

function logRequest(
  method: string,
  url: string,
  status: number,
  latencyMs: number,
  cause?: unknown
) {
  const entry = {
    ts: new Date().toISOString(),
    level: status >= 500 ? 'error' : 'warn',
    method,
    url,
    status,
    latencyMs,
    cause: cause instanceof Error ? cause.message : undefined,
    stack: cause instanceof Error ? cause.stack : undefined,
  };
  // Use console.error/warn so Vercel captures it in structured logs
  if (status >= 500) {
    console.error(JSON.stringify(entry));
  } else {
    console.warn(JSON.stringify(entry));
  }
}

// =============================================================================
// Shared helpers
// =============================================================================

function validateInput(input: unknown): { valid: true } | { valid: false; message: string } {
  if (typeof input !== 'string') {
    return { valid: false, message: 'Input must be a string' };
  }
  if (input.trim().length < 5) {
    return { valid: false, message: 'Input too short' };
  }
  if (input.length > 2000) {
    return { valid: false, message: 'Input too long' };
  }
  return { valid: true };
}

function proxyHeaders(request: NextRequest): Record<string, string> {
  const result: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  const xff = request.headers.get('x-forwarded-for');
  if (xff) result['X-Forwarded-For'] = xff;
  const ua = request.headers.get('user-agent');
  if (ua) result['User-Agent'] = ua;
  const referer = request.headers.get('referer');
  if (referer) result['Referer'] = referer;
  return result;
}

function proxyErrorResponse(
  message: string,
  code: string,
  status = 503,
  cause?: unknown
) {
  return NextResponse.json(
    {
      requestId: '',
      status: 'error',
      bestMatch: null,
      candidates: [],
      performance: {
        totalLatencyMs: 0,
        servedFromCache: false,
        resolvedAt: new Date().toISOString(),
      },
      explanation: {
        summary: 'Dịch vụ tạm thời không khả dụng.',
        tips: ['Vui lòng thử lại sau vài phút.'],
      },
      warnings: [{ code, message, severity: 'warning' as const }],
    },
    { status }
  );
}

// =============================================================================
// POST — Submit resolution request (sync or async)
// =============================================================================

export async function POST(request: NextRequest) {
  if (!INTERNAL_API_URL) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      method: 'POST',
      route: '/api/public/v1/resolve',
      error: 'MISSING_ENV',
      message: 'INTERNAL_API_URL is not set. Check Vercel environment variables.',
    }));
    return proxyErrorResponse(
      'Dịch vụ chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
      'MISSING_INTEGRATION',
      503
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        requestId: '',
        status: 'invalid_input',
        bestMatch: null,
        candidates: [],
        performance: {
          totalLatencyMs: 0,
          servedFromCache: false,
          resolvedAt: new Date().toISOString(),
        },
        explanation: {
          summary: 'Yêu cầu không hợp lệ.',
          tips: ['Vui lòng nhập link sản phẩm Shopee hợp lệ.'],
        },
        warnings: [
          {
            code: 'INVALID_INPUT',
            message: 'Invalid JSON body',
            severity: 'warning',
          },
        ],
      },
      { status: 400 }
    );
  }

  const { input } = body as { input?: unknown };

  const validation = validateInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      {
        requestId: '',
        status: 'invalid_input',
        bestMatch: null,
        candidates: [],
        performance: {
          totalLatencyMs: 0,
          servedFromCache: false,
          resolvedAt: new Date().toISOString(),
        },
        explanation: {
          summary: 'Link không hợp lệ.',
          tips: ['Vui lòng nhập link sản phẩm Shopee, ví dụ: https://shopee.vn/...'],
        },
        warnings: [
          {
            code: 'INVALID_INPUT',
            message: validation.message,
            severity: 'warning',
          },
        ],
      },
      { status: 400 }
    );
  }

  const upstreamUrl = `${INTERNAL_API_URL}/api/public/v1/resolve`;

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: proxyHeaders(request),
      body: JSON.stringify({ input: (input as string).trim() }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    const data = await response.json();
    logRequest('POST', upstreamUrl, response.status, latencyMs);

    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const isAbort =
      err instanceof DOMException && err.name === 'AbortException';
    const isFetchError =
      err instanceof TypeError && err.message.includes('fetch');

    logRequest('POST', upstreamUrl, isAbort ? 504 : 503, latencyMs, err);

    return proxyErrorResponse(
      isAbort
        ? 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.'
        : 'Không thể kết nối đến máy chủ.',
      isAbort ? 'TIMEOUT' : isFetchError ? 'CONNECTION_REFUSED' : 'SERVICE_UNAVAILABLE',
      isAbort ? 504 : 503,
      err
    );
  }
}

// =============================================================================
// GET — Poll resolution status by requestId
// =============================================================================

export async function GET(request: NextRequest) {
  if (!INTERNAL_API_URL) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      method: 'GET',
      route: '/api/public/v1/resolve',
      error: 'MISSING_ENV',
      message: 'INTERNAL_API_URL is not set. Check Vercel environment variables.',
    }));
    return NextResponse.json(
      {
        error: 'MISSING_INTEGRATION',
        message: 'Dịch vụ chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  if (!requestId || requestId.trim().length < 8) {
    return NextResponse.json(
      {
        error: 'INVALID_REQUEST_ID',
        message: 'requestId is required and must be at least 8 characters.',
      },
      { status: 400 }
    );
  }

  const upstreamUrl = `${INTERNAL_API_URL}/api/v1/voucher/resolve/${encodeURIComponent(requestId.trim())}`;

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: proxyHeaders(request),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    logRequest('GET', upstreamUrl, response.status, latencyMs);

    return NextResponse.json(await response.json(), { status: response.status });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const isAbort =
      err instanceof DOMException && err.name === 'AbortException';

    logRequest('GET', upstreamUrl, isAbort ? 504 : 503, latencyMs, err);

    return NextResponse.json(
      {
        error: isAbort ? 'TIMEOUT' : 'SERVICE_UNAVAILABLE',
        message: isAbort
          ? 'Hết thời gian chờ khi kiểm tra trạng thái.'
          : 'Không thể kết nối đến máy chủ.',
      },
      { status: isAbort ? 504 : 503 }
    );
  }
}
