// =============================================================================
// Public API HTTP Middleware - Request Validation
// Production-grade validation for public API requests
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { PublicVoucherResolveRequest } from '../../types.js';
import { PUBLIC_API } from '../../constants.js';
import logger from '../../../utils/logger.js';

/**
 * Extract client IP from request
 */
function extractClientIp(req: Request): string {
  // Check x-forwarded-for header first (for proxied requests)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0];
    return ips.trim();
  }

  // Fall back to socket remote address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Validate resolve voucher request
 */
export function validateResolveVoucherRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = req.body as PublicVoucherResolveRequest;

    // Check required field
    if (!body.input) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Input is required',
        },
      });
      return;
    }

    // Validate input type
    if (typeof body.input !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Input must be a string',
        },
      });
      return;
    }

    // Validate input length
    if (body.input.length < PUBLIC_API.MIN_INPUT_LENGTH) {
      res.status(400).json({
        error: {
          code: 'INPUT_TOO_SHORT',
          message: `Input must be at least ${PUBLIC_API.MIN_INPUT_LENGTH} characters`,
        },
      });
      return;
    }

    if (body.input.length > PUBLIC_API.MAX_INPUT_LENGTH) {
      res.status(400).json({
        error: {
          code: 'INPUT_TOO_LONG',
          message: `Input must be less than ${PUBLIC_API.MAX_INPUT_LENGTH} characters`,
        },
      });
      return;
    }

    // Validate limit if provided
    if (body.limit !== undefined) {
      if (typeof body.limit !== 'number' || body.limit < 1 || body.limit > PUBLIC_API.MAX_CANDIDATE_LIMIT) {
        res.status(400).json({
          error: {
            code: 'INVALID_LIMIT',
            message: `Limit must be between 1 and ${PUBLIC_API.MAX_CANDIDATE_LIMIT}`,
          },
        });
        return;
      }
    }

    // Validate requestId if provided
    if (body.requestId !== undefined) {
      if (typeof body.requestId !== 'string' || body.requestId.length > 100) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST_ID',
            message: 'Request ID must be a string with max 100 characters',
          },
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Request validation error', { error });
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request format',
      },
    });
  }
}

/**
 * Extract client info from request
 */
export function extractClientInfo(req: Request): {
  ip?: string;
  userAgent?: string;
  platform: 'web' | 'mobile' | 'api';
  referrer?: string;
} {
  // Get IP from various sources (proxy, direct)
  const ip = extractClientIp(req);

  // Get user agent
  const userAgent = req.headers['user-agent'];

  // Determine platform
  let platform: 'web' | 'mobile' | 'api' = 'web';
  if (userAgent) {
    if (/mobile|android|iphone|ipad/i.test(userAgent)) {
      platform = 'mobile';
    }
  }

  // Check if API client
  if (req.headers['x-api-client']) {
    platform = 'api';
  }

  return {
    ip,
    userAgent,
    platform,
    referrer: req.headers.referer || req.headers.referrer,
  };
}
