/**
 * Voucher Intelligence API Routes
 */

import { Router } from 'express';
import {
  runVoucherIntelligenceAnalysis,
  buildVoucherOptimizationReport,
  generateVoucherImprovementSignals,
} from '../../service/voucherIntelligenceService.js';
import * as insightRepo from '../../repositories/voucherOptimizationInsightRepository.js';
import { serializeOptimizationReport, serializeInsight, parseDate } from '../serializers.js';
import type { AnalyzeRequestDto, InsightsQueryDto } from '../types.js';

const router = Router();

// GET /internal/voucher-intelligence/summary
router.get('/summary', async (req, res) => {
  try {
    const result = await runVoucherIntelligenceAnalysis({
      platform: req.query.platform as any,
    });

    res.json({
      success: true,
      data: result.summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// GET /internal/voucher-intelligence/insights
router.get('/insights', async (req, res) => {
  try {
    const query = req.query as unknown as InsightsQueryDto;

    let insights;
    if (query.status) {
      insights = await insightRepo.getInsightsByStatus(query.status as any);
    } else {
      insights = await insightRepo.getOpenInsights();
    }

    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const paginated = insights.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        items: paginated.map(serializeInsight),
        total: insights.length,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + limit < insights.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// GET /internal/voucher-intelligence/no-match-analysis
router.get('/no-match-analysis', async (req, res) => {
  try {
    const result = await runVoucherIntelligenceAnalysis({});

    res.json({
      success: true,
      data: {
        noMatchPatterns: result.summary.noMatchRate,
        insights: result.insights.filter(i => i.insightType === 'no_match_coverage_gap'),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// POST /internal/voucher-intelligence/analyze
router.post('/analyze', async (req, res) => {
  try {
    const body = req.body as AnalyzeRequestDto;

    const timeWindow = {
      start: parseDate(body.timeWindowStart) || new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: parseDate(body.timeWindowEnd) || new Date(),
    };

    const result = await runVoucherIntelligenceAnalysis({
      timeWindow,
      platform: body.platform as any,
      minSampleSize: body.minSampleSize,
      maxInsights: body.maxInsights,
    });

    res.json({
      success: result.success,
      data: serializeOptimizationReport(result),
      ...(result.errors && { errors: result.errors }),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// GET /internal/voucher-intelligence/ranking-feedback
router.get('/ranking-feedback', async (req, res) => {
  try {
    const result = await runVoucherIntelligenceAnalysis({});

    res.json({
      success: true,
      data: {
        aggregates: result.aggregates,
        rankingAdvice: result.rankingAdvice,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
