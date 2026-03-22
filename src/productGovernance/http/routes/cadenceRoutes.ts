/**
 * Product Governance Cadence Routes
 *
 * Internal API routes for cadence management.
 */

import { Router } from 'express';
import { serializeCadenceRun, serializeContinuousImprovementReport } from '../api/serializers';
import * as cadenceService from '../cadence/cadenceRunService';
import * as ciService from '../continuousImprovement/continuousImprovementService';

const router = Router();

/**
 * GET /internal/product-governance/cadence-runs
 * Get cadence runs
 */
router.get('/cadence-runs', async (req, res) => {
  try {
    const { type, limit = '10' } = req.query;
    const runs = await cadenceService.getRecentCadenceRuns(
      type as string,
      parseInt(limit as string, 10)
    );
    res.json({
      data: runs.map(serializeCadenceRun),
      meta: { total: runs.length }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cadence runs' });
  }
});

/**
 * POST /internal/product-governance/cadence-runs/start
 * Start a cadence run
 */
router.post('/cadence-runs/start', async (req, res) => {
  try {
    const { cadenceType, periodStart, periodEnd, createdBy } = req.body;
    const run = await cadenceService.startQualityCadenceRun({
      cadenceType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      createdBy
    });
    res.json({ data: serializeCadenceRun(run) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start cadence run' });
  }
});

/**
 * GET /internal/product-governance/continuous-improvement/report
 * Get continuous improvement report
 */
router.get('/continuous-improvement/report', async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.query;
    const report = await ciService.buildContinuousImprovementReport({
      periodStart: new Date(periodStart as string || Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(periodEnd as string || Date.now())
    });
    res.json({ data: serializeContinuousImprovementReport(report) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to build improvement report' });
  }
});

export default router;
