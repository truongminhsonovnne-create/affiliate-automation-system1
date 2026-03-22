/**
 * Growth Analytics Routes
 *
 * HTTP routes for analytics and reporting.
 */

import { Router, Request, Response } from 'express';
import { getPortfolioMeasurementSummary, getSurfaceMeasurementMetrics } from '../analytics/measurementAnalytics';
import { getPortfolioConversionSummary, getSurfaceConversionMetrics, getBestConvertingSurfaces } from '../analytics/conversionAnalytics';

const router = Router();

// ============================================================================
// Measurement Analytics Routes
// ============================================================================

/**
 * GET /api/growth/analytics/portfolio/measurement
 * Get portfolio-wide measurement summary
 */
router.get('/analytics/portfolio/measurement', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Would fetch surfaces from DB in production
    const surfaces: any[] = [];

    const summary = await getPortfolioMeasurementSummary(surfaces, start, end);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/growth/analytics/surface/:id/measurement
 * Get measurement metrics for a surface
 */
router.get('/analytics/surface/:id/measurement', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await getSurfaceMeasurementMetrics(id, start, end);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'No metrics found for surface',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Conversion Analytics Routes
// ============================================================================

/**
 * GET /api/growth/analytics/portfolio/conversion
 * Get portfolio-wide conversion summary
 */
router.get('/analytics/portfolio/conversion', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Would fetch surfaces from DB in production
    const surfaces: any[] = [];

    const summary = await getPortfolioConversionSummary(surfaces, start, end);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/growth/analytics/surface/:id/conversion
 * Get conversion metrics for a surface
 */
router.get('/analytics/surface/:id/conversion', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await getSurfaceConversionMetrics(id, start, end);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'No conversion metrics found for surface',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/growth/analytics/top-converting
 * Get top converting surfaces
 */
router.get('/analytics/top-converting', async (req: Request, res: Response) => {
  try {
    const { minConversions = '5', limit = '10' } = req.query;

    // Would fetch surfaces from DB in production
    const surfaces: any[] = [];

    const topConverting = await getBestConvertingSurfaces(
      surfaces,
      Number(minConversions)
    );

    res.json({
      success: true,
      data: topConverting.slice(0, Number(limit)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Dashboard Summary Routes
// ============================================================================

/**
 * GET /api/growth/analytics/dashboard
 * Get dashboard summary with key metrics
 */
router.get('/analytics/dashboard', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Would fetch surfaces from DB in production
    const surfaces: any[] = [];

    const measurementSummary = await getPortfolioMeasurementSummary(surfaces, start, end);
    const conversionSummary = await getPortfolioConversionSummary(surfaces, start, end);

    res.json({
      success: true,
      data: {
        measurement: {
          totalPageViews: measurementSummary.totalPageViews,
          totalUniqueVisitors: measurementSummary.totalUniqueVisitors,
          avgTimeOnPage: measurementSummary.avgTimeOnPage,
          avgBounceRate: measurementSummary.avgBounceRate,
        },
        conversion: {
          totalCtaClicks: conversionSummary.totalCtaClicks,
          totalConversions: conversionSummary.totalConversions,
          avgConversionRate: conversionSummary.avgConversionRate,
        },
        topPerforming: measurementSummary.topPerformingSurfaces.slice(0, 5),
        underperforming: measurementSummary.underperformingSurfaces.slice(0, 5),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
