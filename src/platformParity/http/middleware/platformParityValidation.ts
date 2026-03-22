/**
 * Platform Parity Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export interface ValidationSchema {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

/**
 * Validate request against Zod schema
 */
export function validateRequest(schema: ValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schema.body) {
        await schema.body.parseAsync(req.body);
      }

      // Validate query
      if (schema.query) {
        await schema.query.parseAsync(req.query);
      }

      // Validate params
      if (schema.params) {
        await schema.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        });
        return;
      }

      next(error);
    }
  };
}

/**
 * Validate UUID parameter
 */
export function validateUuidParam(paramName: string) {
  const uuidSchema = z.string().uuid();

  return (req: Request, res: Response, next: NextFunction) => {
    const paramValue = req.params[paramName];

    if (!paramValue) {
      res.status(400).json({
        error: {
          code: 'MISSING_PARAM',
          message: `Parameter ${paramName} is required`,
        },
      });
      return;
    }

    const result = uuidSchema.safeParse(paramValue);

    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PARAM',
          message: `Parameter ${paramName} must be a valid UUID`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Validate date parameter
 */
export function validateDateParam(paramName: string, required = false) {
  const dateSchema = z.string().datetime().transform((s) => new Date(s));

  return (req: Request, res: Response, next: NextFunction) => {
    const paramValue = req.query[paramName];

    if (!paramValue) {
      if (required) {
        res.status(400).json({
          error: {
            code: 'MISSING_PARAM',
            message: `Query parameter ${paramName} is required`,
          },
        });
        return;
      }
      next();
      return;
    }

    const result = dateSchema.safeParse(paramValue);

    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PARAM',
          message: `Query parameter ${paramName} must be a valid ISO date`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Validate pagination params
 */
export function validatePagination() {
  return (req: Request, res: Response, next: NextFunction) => {
    const limit = req.query.limit;
    const offset = req.query.offset;

    if (limit !== undefined) {
      const limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          error: {
            code: 'INVALID_PARAM',
            message: 'limit must be between 1 and 100',
          },
        });
        return;
      }
    }

    if (offset !== undefined) {
      const offsetNum = parseInt(offset as string);
      if (isNaN(offsetNum) || offsetNum < 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_PARAM',
            message: 'offset must be a non-negative integer',
          },
        });
        return;
      }
    }

    next();
  };
}
