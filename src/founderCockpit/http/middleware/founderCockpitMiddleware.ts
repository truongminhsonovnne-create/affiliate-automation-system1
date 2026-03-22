/**
 * Founder Cockpit HTTP Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

// Request ID middleware for tracing
export function founderCockpitRequestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Audit logging middleware
export function founderCockpitAuditLog(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      msg: 'Founder Cockpit Request',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      requestId: (req as any).requestId,
    });
  });

  next();
}

// Validation middleware for date params
export function validateDateRange(req: Request, res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.query;

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate as string) : null;
    const end = endDate ? new Date(endDate as string) : null;

    if (start && isNaN(start.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid startDate format' });
    }
    if (end && isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid endDate format' });
    }
    if (start && end && start > end) {
      return res.status(400).json({ success: false, error: 'startDate must be before endDate' });
    }
  }

  next();
}

// Rate limiting simple implementation
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function founderCockpitRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  let record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    requestCounts.set(ip, record);
  } else {
    record.count++;
  }

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
  }

  next();
}

// Error handler middleware
export function founderCockpitErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({
    msg: 'Founder Cockpit Error',
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
}
