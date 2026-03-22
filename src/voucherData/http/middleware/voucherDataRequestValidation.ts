// =============================================================================
// Voucher Data Request Validation Middleware
// Production-grade request validation for voucher data API
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  voucherCatalogQuerySchema,
  ingestVouchersRequestSchema,
  createRuleRequestSchema,
  updateRuleRequestSchema,
  activateRuleRequestSchema,
  archiveRuleRequestSchema,
  evaluateVoucherRequestSchema,
  createOverrideRequestSchema,
} from '../api/types.js';
import { logger } from '../../utils/logger.js';

/**
 * Validate voucher catalog query
 */
export function validateVoucherCatalogQuery(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = voucherCatalogQuerySchema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, query: req.query }, 'Invalid voucher catalog query');
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Validate ingest vouchers request
 */
export function validateIngestVouchersRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = ingestVouchersRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, body: req.body }, 'Invalid ingest vouchers request');
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Validate create rule request
 */
export function validateCreateRuleRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = createRuleRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, body: req.body }, 'Invalid create rule request');
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Validate update rule request
 */
export function validateUpdateRuleRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = updateRuleRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, body: req.body }, 'Invalid update rule request');
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Validate activate rule request
 */
export function validateActivateRuleRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = activateRuleRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, body: req.body }, 'Invalid activate rule request');
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Validate archive rule request
 */
export function validateArchiveRuleRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = archiveRuleRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, body: req.body }, 'Invalid archive rule request');
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Validate evaluate voucher request
 */
export function validateEvaluateVoucherRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = evaluateVoucherRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, body: req.body }, 'Invalid evaluate voucher request');
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Validate create override request
 */
export function validateCreateOverrideRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = createOverrideRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, body: req.body }, 'Invalid create override request');
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Validate UUID parameter
 */
export function validateUuidParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!value || !uuidRegex.test(value)) {
      res.status(400).json({
        error: `Invalid ${paramName} parameter`,
        details: `Expected UUID, got: ${value}`,
      });
      return;
    }

    next();
  };
}
