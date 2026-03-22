/**
 * TikTok Shop Acquisition Error Handler
 */

import { Request, Response, NextFunction } from 'express';

export function handleAcquisitionError(error: Error, req: Request, res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();

  console.error(`[TikTokShopAcquisitionError] ${timestamp}`, {
    path: req.path,
    error: error.message,
  });

  let statusCode = 500;
  let message = 'Internal server error';

  if (error.message.includes('not found')) {
    statusCode = 404;
    message = error.message;
  } else if (error.message.includes('validation') || error.message.includes('invalid')) {
    statusCode = 400;
    message = error.message;
  }

  res.status(statusCode).json({
    error: { code: statusCode, message, timestamp },
  });
}
