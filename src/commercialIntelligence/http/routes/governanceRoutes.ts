/**
 * Governance Routes
 *
 * Internal/Admin APIs for governance and anomalies.
 */

import { Router, Request, Response } from 'express';
import { getCommercialGovernanceService } from '../../governance/commercialGovernanceService.js';
import { getCommercialAnomalyDetector } from '../../anomalies/commercialAnomalyDetector.js';
import { serializeGovernanceReview, serializeAnomaly } from '../serializers.js';
import { validateDateRange } from '../middleware/commercialValidation.js';

const router = Router();

/**
 * GET /internal/commercial/governance/reviews
 * Get governance reviews
 */
router.get('/governance/reviews', async (req: Request, res: Response) => {
  try {
    const reviewType = req.query.reviewType as string | undefined;
    const reviewStatus = req.query.reviewStatus as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    const governanceService = getCommercialGovernanceService();
    const reviews = await governanceService.getGovernanceReviews({
      reviewType: reviewType as any,
      reviewStatus: reviewStatus as any,
      limit,
    });

    res.json({
      success: true,
      data: reviews.map(serializeGovernanceReview),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * POST /internal/commercial/governance/run-review
 * Run a governance review
 */
router.post('/governance/run-review', async (req: Request, res: Response) => {
  try {
    const { reviewType, targetEntityType, targetEntityId, businessSummary, usefulnessSummary, createdBy } = req.body;

    if (!reviewType || !businessSummary) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const governanceService = getCommercialGovernanceService();
    const result = await governanceService.runCommercialGovernanceReview({
      reviewType,
      targetEntityType,
      targetEntityId,
      businessSummary,
      usefulnessSummary,
      createdBy,
    });

    if (!result.success || !result.data) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: serializeGovernanceReview(result.data),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * GET /internal/commercial/anomalies
 * Get anomaly signals
 */
router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const validation = validateDateRange(req.query);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const severity = req.query.severity as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const anomalyDetector = getCommercialAnomalyDetector();
    const anomalies = await anomalyDetector.getRecentAnomalies({
      startDate: validation.startDate!,
      endDate: validation.endDate!,
      severity: severity as any,
      limit,
    });

    res.json({
      success: true,
      data: anomalies.map(serializeAnomaly),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * POST /internal/commercial/anomalies/detect
 * Run anomaly detection
 */
router.post('/anomalies/detect', async (req: Request, res: Response) => {
  try {
    const validation = validateDateRange(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const anomalyDetector = getCommercialAnomalyDetector();
    const result = await anomalyDetector.detectCommercialAnomalies({
      startDate: validation.startDate!,
      endDate: validation.endDate!,
    });

    if (!result.success || !result.data) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: {
        anomalies: result.data.anomalies.map(serializeAnomaly),
        summary: result.data.summary,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

export default router;
