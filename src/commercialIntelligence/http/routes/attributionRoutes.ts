/**
 * Attribution Routes
 *
 * Internal/Admin APIs for attribution reporting.
 */

import { Router, Request, Response } from 'express';
import { getRevenueAttributionReportBuilder } from '../../reports/revenueAttributionReportBuilder.js';
import { validateDateRange } from '../middleware/commercialValidation.js';

const router = Router();

/**
 * GET /internal/commercial/attribution/revenue
 * Get revenue attribution report
 */
router.get('/attribution/revenue', async (req: Request, res: Response) => {
  try {
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const reportBuilder = getRevenueAttributionReportBuilder();
    const result = await reportBuilder.buildRevenueAttributionReport({
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
 * GET /internal/commercial/attribution/vouchers/:voucherId
 * Get voucher attribution report
 */
router.get('/attribution/vouchers/:voucherId', async (req: Request, res: Response) => {
  try {
    const { voucherId } = req.params;
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const reportBuilder = getRevenueAttributionReportBuilder();
    const result = await reportBuilder.buildVoucherAttributionReport({
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
 * GET /internal/commercial/attribution/surfaces/:surfaceType/:surfaceId
 * Get surface attribution report
 */
router.get('/attribution/surfaces/:surfaceType/:surfaceId', async (req: Request, res: Response) => {
  try {
    const { surfaceType, surfaceId } = req.params;
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const reportBuilder = getRevenueAttributionReportBuilder();
    const result = await reportBuilder.buildSurfaceAttributionReport({
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

/**
 * GET /internal/commercial/attribution/experiments/:experimentId
 * Get experiment attribution report
 */
router.get('/attribution/experiments/:experimentId', async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.params;
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const reportBuilder = getRevenueAttributionReportBuilder();
    const result = await reportBuilder.buildExperimentCommercialReport({
      experimentId,
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
