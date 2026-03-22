/**
 * Launch Closure Validation Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateLaunchKey(req: Request, res: Response, next: NextFunction) {
  const launchKey = req.body.launchKey;
  if (!launchKey || typeof launchKey !== 'string') {
    res.status(400).json({ error: 'launchKey is required' });
    return;
  }
  next();
}

export function validateReviewId(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    res.status(400).json({ error: 'Invalid review ID' });
    return;
  }
  next();
}
