// =============================================================================
// Voucher Evaluation Routes
// Production-grade HTTP routes for voucher evaluation operations
// =============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import {
  evaluateVoucherResolutionAgainstExpectation,
  evaluateVoucherResolutionBatch,
} from '../evaluation/voucherMatchingEvaluator.js';
import { buildRankingQualitySummary } from '../evaluation/voucherRankingQualityService.js';
import { buildVoucherQualityFeedbackReport } from '../evaluation/voucherQualityFeedbackLoop.js';
import { voucherMatchEvaluationRepository } from '../repositories/voucherMatchEvaluationRepository.js';
import { validateEvaluateVoucherRequest, validateUuidParam } from '../middleware/voucherDataRequestValidation.js';
import { serializeEvaluationResult, serializePaginatedResponse } from '../api/serializers.js';

const router = Router();

/**
 * POST /internal/vouchers/evaluate
 * Evaluate a voucher resolution
 */
router.post('/evaluate', validateEvaluateVoucherRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      platform,
      requestInput,
      expectedVoucherIds,
      resolvedVoucherIds,
      bestVoucherId,
      rankingScores,
    } = req.body;

    const result = await evaluateVoucherResolutionAgainstExpectation(
      {
        platform,
        requestInput,
        expectedVoucherIds,
      },
      {
        resolvedVoucherIds,
        bestVoucherId,
        rankingScores,
      }
    );

    res.json(serializeEvaluationResult(result));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/vouchers/evaluations
 * Get evaluations with filters
 */
router.get('/evaluations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.query.platform as 'shopee' | 'lazada' | 'tiktok' | 'general' | undefined;
    const status = req.query.status as 'pending' | 'success' | 'partial' | 'failed' | 'no_expectation' | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await voucherMatchEvaluationRepository.findAll({
      platform,
      status,
      limit,
      offset,
    });

    res.json(serializePaginatedResponse(
      result.evaluations.map(serializeEvaluationResult),
      result.total,
      limit,
      offset
    ));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/vouchers/evaluations/:id
 * Get a single evaluation
 */
router.get('/evaluations/:id', validateUuidParam('id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const evaluation = await voucherMatchEvaluationRepository.findById(req.params.id);

    if (!evaluation) {
      res.status(404).json({ error: 'Evaluation not found' });
      return;
    }

    res.json(serializeEvaluationResult(evaluation));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/vouchers/quality
 * Get quality summary
 */
router.get('/quality', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.query.platform as 'shopee' | 'lazada' | 'tiktok' | 'general' | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const evaluations = await voucherMatchEvaluationRepository.findAll({
      platform,
      limit,
      offset: 0,
    });

    const summary = buildRankingQualitySummary(evaluations.evaluations);

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/vouchers/quality/report
 * Get quality feedback report
 */
router.get('/quality/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.query.platform as 'shopee' | 'lazada' | 'tiktok' | 'general' | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const evaluations = await voucherMatchEvaluationRepository.findAll({
      platform,
      limit,
      offset: 0,
    });

    const report = buildVoucherQualityFeedbackReport(evaluations.evaluations);

    res.json(report);
  } catch (error) {
    next(error);
  }
});

export default router;
