/**
 * Commercial Summary Routes
 *
 * Internal/Admin APIs for commercial summaries.
 */

import { Router, Request, Response } from 'express';
import { getCommercialSummaryBuilder } from '../../reports/commercialSummaryBuilder.js';
import { serializeCommercialSummary } from '../serializers.js';
import { validateDateRange } from '../middleware/commercialValidation.js';

const router = Router();

/**
 * GET /internal/commercial/summary
 * Get commercial performance summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const summaryBuilder = getCommercialSummaryBuilder();
    const result = await summaryBuilder.buildCommercialPerformanceSummary({
      startDate: validation.startDate!,
      endDate: validation.endDate!,
      includeVouchers: true,
      includeSurfaces: true,
    });

    if (!result.success || !result.data) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: serializeCommercialSummary(result.data),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * GET /internal/commercial/trends
 * Get commercial trends
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const summaryBuilder = getCommercialSummaryBuilder();
    const currentStart = validation.startDate!;
    const currentEnd = validation.endDate!;
    const previousStart = new Date(currentStart.getTime() - (currentEnd.getTime() - currentStart.getTime()));
    const previousEnd = new Date(currentStart.getTime() - 1);

    const result = await summaryBuilder.buildCommercialTrendSummary({
      currentStartDate: currentStart,
      currentEndDate: currentEnd,
      previousStartDate: previousStart,
      previousEndDate: previousEnd,
    });

    if (!result.success || !result.data) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: {
        currentPeriod: { start: currentStart.toISOString(), end: currentEnd.toISOString() },
        previousPeriod: { start: previousStart.toISOString(), end: previousEnd.toISOString() },
        ...result.data,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * GET /internal/commercial/vouchers/:voucherId
 * Get voucher commercial performance
 */
router.get('/vouchers/:voucherId', async (req: Request, res: Response) => {
  try {
    const { voucherId } = req.params;
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const summaryBuilder = getCommercialSummaryBuilder();
    const result = await summaryBuilder.buildVoucherCommercialSummary({
      voucherId,
      startDate: validation.startDate!,
      endDate: validation.endDate!,
    });

    if (!result.success || !result.data) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * GET /internal/commercial/growth-surfaces/:surfaceType/:surfaceId
 * Get growth surface commercial performance
 */
router.get('/growth-surfaces/:surfaceType/:surfaceId', async (req: Request, res: Response) => {
  try {
    const { surfaceType, surfaceId } = req.params;
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const summaryBuilder = getCommercialSummaryBuilder();
    const result = await summaryBuilder.buildGrowthSurfaceCommercialSummary({
      surfaceType: surfaceType as any,
      surfaceId,
      startDate: validation.startDate!,
      endDate: validation.endDate!,
    });

    if (!result.success || !result.data) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

export default router;
