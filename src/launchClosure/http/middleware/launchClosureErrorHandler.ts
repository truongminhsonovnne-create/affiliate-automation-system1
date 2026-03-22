/**
 * Launch Closure Error Handler
 */
import { Request, Response, NextFunction } from 'express';

export function launchClosureErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Launch Closure Error:', err.message);
  res.status(500).json({ error: err.message });
}
