/**
 * Voucher Request Validation
 *
 * Validates voucher resolution requests.
 */

import type { Request, Response, NextFunction } from 'express';
import type { ResolveVoucherRequestDto } from '../api/types';
import {
  MAX_URL_LENGTH,
  MIN_URL_LENGTH,
} from '../../constants';

/**
 * Validate resolve voucher request
 */
export function validateResolveVoucherRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body as Partial<ResolveVoucherRequestDto>;

  // Check if URL is provided
  if (!body.url) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'URL is required',
        details: { field: 'url' },
        recoverable: true,
      },
      request_id: `req_${Date.now()}`,
      resolved_at: new Date().toISOString(),
    });
    return;
  }

  // Validate URL type
  if (typeof body.url !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'URL must be a string',
        details: { field: 'url', type: typeof body.url },
        recoverable: true,
      },
      request_id: `req_${Date.now()}`,
      resolved_at: new Date().toISOString(),
    });
    return;
  }

  // Validate URL length
  const urlLength = body.url.trim().length;
  if (urlLength < MIN_URL_LENGTH) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: `URL too short (minimum ${MIN_URL_LENGTH} characters)`,
        details: { field: 'url', length: urlLength, min: MIN_URL_LENGTH },
        recoverable: true,
      },
      request_id: `req_${Date.now()}`,
      resolved_at: new Date().toISOString(),
    });
    return;
  }

  if (urlLength > MAX_URL_LENGTH) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: `URL too long (maximum ${MAX_URL_LENGTH} characters)`,
        details: { field: 'url', length: urlLength, max: MAX_URL_LENGTH },
        recoverable: true,
      },
      request_id: `req_${Date.now()}`,
      resolved_at: new Date().toISOString(),
    });
    return;
  }

  // Validate platform if provided
  const validPlatforms = ['shopee', 'lazada', 'tiki', 'tiktok', 'general'];
  if (body.platform && !validPlatforms.includes(body.platform)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
        details: { field: 'platform', value: body.platform },
        recoverable: true,
      },
      request_id: `req_${Date.now()}`,
      resolved_at: new Date().toISOString(),
    });
    return;
  }

  // Validate max_candidates if provided
  if (body.max_candidates !== undefined) {
    if (typeof body.max_candidates !== 'number' || body.max_candidates < 1 || body.max_candidates > 20) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'max_candidates must be between 1 and 20',
          details: { field: 'max_candidates', value: body.max_candidates },
          recoverable: true,
        },
        request_id: `req_${Date.now()}`,
        resolved_at: new Date().toISOString(),
      });
      return;
    }
  }

  next();
}

/**
 * Validate request ID parameter
 */
export function validateRequestIdParam(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { requestId } = req.params;

  if (!requestId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request ID is required',
        details: { field: 'requestId' },
        recoverable: true,
      },
      request_id: `req_${Date.now()}`,
      resolved_at: new Date().toISOString(),
    });
    return;
  }

  next();
}
