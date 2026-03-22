/**
 * Product Governance Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';

export function validateReleaseKey(req: Request, res: Response, next: NextFunction): void {
  const { releaseKey } = req.params;
  if (!releaseKey || releaseKey.trim().length === 0) {
    res.status(400).json({ error: 'Release key is required' });
    return;
  }
  next();
}

export function validateEnvironment(req: Request, res: Response, next: NextFunction): void {
  const { environment } = req.body;
  const validEnvironments = ['development', 'staging', 'production'];
  if (environment && !validEnvironments.includes(environment)) {
    res.status(400).json({ error: 'Invalid environment' });
    return;
  }
  next();
}

export function validateDecisionRequest(req: Request, res: Response, next: NextFunction): void {
  const { decision, actorId, actorRole } = req.body;
  const validDecisions = ['approve', 'conditional_approve', 'block', 'defer', 'rollback_recommended'];

  if (!decision || !validDecisions.includes(decision)) {
    res.status(400).json({ error: 'Invalid decision type' });
    return;
  }

  if (decision !== 'approve' && decision !== 'defer' && (!actorId || !actorRole)) {
    res.status(400).json({ error: 'actorId and actorRole required for this decision' });
    return;
  }

  next();
}
