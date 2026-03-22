/**
 * TikTok Shop Acquisition Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';

export function validateDiscoveryRequest(req: Request, res: Response, next: NextFunction): void {
  const { seeds, categories } = req.body;

  if (seeds && !Array.isArray(seeds)) {
    res.status(400).json({ error: { code: 400, message: 'seeds must be an array' } });
    return;
  }

  if (categories && !Array.isArray(categories)) {
    res.status(400).json({ error: { code: 400, message: 'categories must be an array' } });
    return;
  }

  next();
}

export function validateDetailRequest(req: Request, res: Response, next: NextFunction): void {
  const { referenceKeys } = req.body;

  if (!referenceKeys || !Array.isArray(referenceKeys)) {
    res.status(400).json({ error: { code: 400, message: 'referenceKeys must be an array' } });
    return;
  }

  if (referenceKeys.length > 100) {
    res.status(400).json({ error: { code: 400, message: 'Maximum 100 reference keys per request' } });
    return;
  }

  next();
}
