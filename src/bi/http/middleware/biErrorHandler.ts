/**
 * BI Error Handler
 */

import { Request, Response, NextFunction } from 'express';

export function biErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('BI Error:', err.message);
  res.status(500).json({ success: false, error: err.message });
}
