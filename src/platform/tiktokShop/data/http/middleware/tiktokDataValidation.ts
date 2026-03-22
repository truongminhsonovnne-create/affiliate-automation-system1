/**
 * TikTok Shop Data Validation Middleware
 * Validates requests for TikTok Shop data APIs
 */

import { Request, Response, NextFunction } from 'express';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate source key parameter
 */
export function validateSourceKey(req: Request, res: Response, next: NextFunction): void {
  const { sourceKey } = req.params;

  if (!sourceKey) {
    res.status(400).json({
      error: {
        code: 400,
        message: 'Missing required parameter: sourceKey',
      },
    });
    return;
  }

  // Validate format
  const validKeys = ['manual_sample', 'import_file', 'tiktok_api_product', 'tiktok_api_promotion', 'tiktok_web_scraper', 'tiktok_affiliate_api'];
  if (!validKeys.includes(sourceKey)) {
    res.status(400).json({
      error: {
        code: 400,
        message: `Invalid sourceKey: ${sourceKey}. Valid values: ${validKeys.join(', ')}`,
      },
    });
    return;
  }

  next();
}

/**
 * Validate acquisition options
 */
export function validateAcquisitionOptions(req: Request, res: Response, next: NextFunction): void {
  const { runType, batchSize, timeout, validateOnly } = req.body;
  const errors: ValidationError[] = [];

  // Validate runType
  const validRunTypes = ['full', 'incremental', 'dry_run', 'validation'];
  if (runType && !validRunTypes.includes(runType)) {
    errors.push({
      field: 'runType',
      message: `Invalid runType. Valid values: ${validRunTypes.join(', ')}`,
    });
  }

  // Validate batchSize
  if (batchSize !== undefined) {
    const batch = Number(batchSize);
    if (isNaN(batch) || batch < 1 || batch > 1000) {
      errors.push({
        field: 'batchSize',
        message: 'batchSize must be a number between 1 and 1000',
      });
    }
  }

  // Validate timeout
  if (timeout !== undefined) {
    const timeoutVal = Number(timeout);
    if (isNaN(timeoutVal) || timeoutVal < 1000 || timeoutVal > 300000) {
      errors.push({
        field: 'timeout',
        message: 'timeout must be a number between 1000 and 300000',
      });
    }
  }

  // Validate validateOnly
  if (validateOnly !== undefined && typeof validateOnly !== 'boolean') {
    errors.push({
      field: 'validateOnly',
      message: 'validateOnly must be a boolean',
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: 400,
        message: 'Validation failed',
        details: errors,
      },
    });
    return;
  }

  next();
}

/**
 * Validate query parameters
 */
export function validateQueryParams(req: Request, res: Response, next: NextFunction): void {
  const { limit, offset } = req.query;
  const errors: ValidationError[] = [];

  if (limit !== undefined) {
    const limitVal = Number(limit);
    if (isNaN(limitVal) || limitVal < 1 || limitVal > 100) {
      errors.push({
        field: 'limit',
        message: 'limit must be a number between 1 and 100',
      });
    }
  }

  if (offset !== undefined) {
    const offsetVal = Number(offset);
    if (isNaN(offsetVal) || offsetVal < 0) {
      errors.push({
        field: 'offset',
        message: 'offset must be a non-negative number',
      });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: 400,
        message: 'Validation failed',
        details: errors,
      },
    });
    return;
  }

  next();
}

/**
 * Validate backlog completion request
 */
export function validateBacklogCompletion(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;
  const { completionNotes } = req.body;

  if (!id) {
    res.status(400).json({
      error: {
        code: 400,
        message: 'Missing required parameter: id',
      },
    });
    return;
  }

  // completionNotes is optional, but if provided must be a string
  if (completionNotes !== undefined && typeof completionNotes !== 'string') {
    res.status(400).json({
      error: {
        code: 400,
        message: 'completionNotes must be a string',
      },
    });
    return;
  }

  next();
}
