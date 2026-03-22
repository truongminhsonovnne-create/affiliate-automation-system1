/**
 * Mock API Responses
 *
 * Centralized mock responses for external API calls.
 */

import type { MockResponse } from '../types';

/**
 * Create a mock HTTP response
 */
export function createMockResponse<T>(
  data: T,
  options?: {
    status?: number;
    headers?: Record<string, string>;
    delay?: number;
  }
): MockResponse<T> {
  return {
    ok: (options?.status ?? 200) >= 200 && (options?.status ?? 200) < 300,
    status: options?.status ?? 200,
    statusText: getStatusText(options?.status ?? 200),
    headers: new Map(Object.entries(options?.headers ?? {})),
    data,
    delay: options?.delay ?? 0,
  };
}

/**
 * Get HTTP status text
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return statusTexts[status] ?? 'Unknown';
}

// =============================================================================
// Shopee API Mocks
// =============================================================================

/** Mock Shopee search API response */
export const mockShopeeSearchResponse = createMockResponse({
  items: [
    {
      itemid: 1234567890,
      name: 'Test Product',
      price: 129000,
      original_price: 199000,
      discount: '35',
      rating: 4.5,
      rating_count: [0, 0, 0, 50, 100],
      sold: 5000,
      images: ['/file/abc123'],
      shopid: 12345678,
      shop_location: 'TP. Hồ Chí Minh',
    },
  ],
  total_count: 1,
  page_info: {
    total_page: 1,
    page_size: 50,
    current_page: 1,
  },
});

/** Mock Shopee item detail API response */
export const mockShopeeItemDetailResponse = createMockResponse({
  item: {
    itemid: 1234567890,
    name: 'Áo Thun Nam Cotton Basic',
    price: 129000,
    original_price: 199000,
    discount: '35',
    rating: 4.5,
    rating_count: [0, 0, 0, 50, 100],
    sold: 5000,
    description: '<p>Chất liệu: 100% Cotton</p>',
    images: [
      { image_id: 1, url: '/file/abc123' },
      { image_id: 2, url: '/file/def456' },
    ],
    videos: [{ video_id: 1, url: '/video/123' }],
    attributes: [
      { name: 'Chất liệu', value: '100% Cotton' },
      { name: 'Màu sắc', value: 'Đen, Trắng' },
    ],
    options: [
      {
        name: 'Màu sắc',
        values: [
          { optionid: 1, name: 'Đen' },
          { optionid: 2, name: 'Trắng' },
        ],
      },
      {
        name: 'Size',
        values: [
          { optionid: 101, name: 'S' },
          { optionid: 102, name: 'M' },
        ],
      },
    ],
  },
  shop: {
    shopid: 12345678,
    name: 'Fashion Store',
    rating: 4.9,
    location: 'TP. Hồ Chí Minh',
    follower_count: 15000,
    product_count: 250,
    response_rate: 95,
  },
});

/** Mock Shopee shop info API response */
export const mockShopeeShopResponse = createMockResponse({
  shopid: 12345678,
  name: 'Fashion Store',
  rating: 4.9,
  location: 'TP. Hồ Chí Minh',
  follower_count: 15000,
  product_count: 250,
  response_rate: 95,
  response_time: 'trong vòng vài giờ',
  is_official_shop: true,
  is_premium: true,
});

// =============================================================================
// Gemini AI API Mocks
// =============================================================================

/** Mock Gemini success response */
export const mockGeminiSuccessResponse = createMockResponse({
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              hashtags: ['fashion', 'style', 'ootd', 'vietnamesefashion'],
              description:
                'Áo thun nam chất liệu cotton 100% mềm mại, thoáng mát. Thiết kế basic form regular fit phù hợp mọi dáng người.',
              title: 'Áo Thun Nam Cotton Basic - Phong cách Basic, Thoải Mái Mỗi Ngày',
              tags: ['cotton', 'basic', 'comfortable', 'vietnam'],
            }),
          },
        ],
      },
      finishReason: 'STOP',
    },
  ],
  usageMetadata: {
    promptTokenCount: 100,
    candidatesTokenCount: 50,
    totalTokenCount: 150,
  },
});

/** Mock Gemini rate limit response */
export const mockGeminiRateLimitResponse = createMockResponse(
  {
    error: {
      code: 429,
      message: 'Rate limit exceeded. Please retry after some time.',
      status: 'RESOURCE_EXHAUSTED',
    },
  },
  { status: 429 }
);

/** Mock Gemini invalid request response */
export const mockGeminiInvalidRequestResponse = createMockResponse(
  {
    error: {
      code: 400,
      message: 'Invalid request: missing required field',
      status: 'INVALID_ARGUMENT',
    },
  },
  { status: 400 }
);

/** Mock Gemini empty response */
export const mockGeminiEmptyResponse = createMockResponse({
  candidates: [],
});

// =============================================================================
// Publishing Platform Mocks
// =============================================================================

/** Mock TikTok publish success response */
export const mockTikTokPublishSuccessResponse = createMockResponse({
  data: {
    video_id: 'tiktok-video-123456',
    share_url: 'https://tiktok.com/@fashionstore/video/123456789',
  },
  error: null,
}, { status: 200 });

/** Mock TikTok publish error response */
export const mockTikTokPublishErrorResponse = createMockResponse({
  data: null,
  error: {
    code: 'VIDEO_UPLOAD_FAILED',
    message: 'Failed to upload video',
  },
}, { status: 500 });

/** Mock Facebook publish success response */
export const mockFacebookPublishSuccessResponse = createMockResponse({
  id: 'fb-post-123456',
  permalink_url: 'https://facebook.com/post/123456',
}, { status: 200 });

/** Mock Facebook rate limit response */
export const mockFacebookRateLimitResponse = createMockResponse(
  {
    error: {
      message: 'Rate limit exceeded',
      type: 'OAuthException',
      code: 4,
    },
  },
  { status: 429 }
);

// =============================================================================
// Database Mocks
// =============================================================================

/** Mock database connection success */
export const mockDbConnectionSuccess = {
  connected: true,
  host: 'localhost',
  database: 'affiliate_test',
  poolSize: 5,
};

/** Mock database connection failure */
export const mockDbConnectionFailure = {
  connected: false,
  error: 'ECONNREFUSED',
  host: 'localhost',
  database: 'affiliate_test',
};

// =============================================================================
// Health Check Mocks
// =============================================================================

/** Mock liveness check response */
export const mockLivenessResponse = createMockResponse({
  status: 'healthy',
  timestamp: new Date().toISOString(),
});

/** Mock readiness check response */
export const mockReadinessResponse = createMockResponse({
  ready: true,
  checks: [
    { name: 'database', status: 'healthy', latency: 5 },
    { name: 'redis', status: 'healthy', latency: 2 },
  ],
  timestamp: new Date().toISOString(),
});

/** Mock not ready response */
export const mockNotReadyResponse = createMockResponse(
  {
    ready: false,
    checks: [
      { name: 'database', status: 'unhealthy', error: 'connection timeout' },
    ],
    timestamp: new Date().toISOString(),
  },
  { status: 503 }
);

// =============================================================================
// Error Response Templates
// =============================================================================

/**
 * Create a network error mock
 */
export function createNetworkErrorMock(error: string): MockResponse<unknown> {
  return createMockResponse(
    { error },
    { status: 0 }
  );
}

/**
 * Create a timeout error mock
 */
export function createTimeoutErrorMock(): MockResponse<unknown> {
  return createMockResponse(
    { error: 'Request timeout' },
    { status: 408 }
  );
}

/**
 * Create a generic server error mock
 */
export function createServerErrorMock(message = 'Internal Server Error'): MockResponse<unknown> {
  return createMockResponse(
    { error: message },
    { status: 500 }
  );
}
