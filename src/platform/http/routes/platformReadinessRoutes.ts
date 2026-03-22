/**
 * Platform Readiness HTTP Routes
 */

import { Router, type Request, type Response } from 'express';
import { runPlatformReadinessReview, runTikTokShopReadinessReview } from '../../service/multiPlatformFoundationService.js';
import { getPlatformReadinessReviewRepository } from '../../repositories/platformReadinessReviewRepository.js';
import { serializeReadinessReview } from '../../api/serializers.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

// GET /internal/platforms/:platformKey/readiness - Get platform readiness
router.get('/:platformKey/readiness', async (req: Request, res: Response) => {
  try {
    const { platformKey } = req.params;
    const repo = getPlatformReadinessReviewRepository();
    const reviews = await repo.findByPlatform(platformKey);

    res.json({
      success: true,
      data: {
        platformKey,
        reviews: reviews.map(serializeReadinessReview),
        latest: reviews.length > 0 ? serializeReadinessReview(reviews[0]) : null,
      },
    });
  } catch (error) {
    logger.error({ msg: 'Failed to get platform readiness', error });
    res.status(500).json({ success: false, error: 'Failed to get readiness' });
  }
});

// GET /internal/platforms/tiktok-shop/readiness - Get TikTok Shop readiness specifically
router.get('/tiktok-shop/readiness', async (_req: Request, res: Response) => {
  try {
    const repo = getPlatformReadinessReviewRepository();
    const review = await repo.findLatest('tiktok_shop');

    if (!review) {
      return res.json({
        success: true,
        data: {
          platformKey: 'tiktok_shop',
          status: 'not_evaluated',
          message: 'Run readiness review to get current status',
        },
      });
    }

    res.json({ success: true, data: serializeReadinessReview(review) });
  } catch (error) {
    logger.error({ msg: 'Failed to get TikTok Shop readiness', error });
    res.status(500).json({ success: false, error: 'Failed to get readiness' });
  }
});

// POST /internal/platforms/:platformKey/readiness/run - Run readiness review
router.post('/:platformKey/readiness/run', async (req: Request, res: Response) => {
  try {
    const { platformKey } = req.params;
    const { reviewType } = req.body;

    const result = await runPlatformReadinessReview(
      platformKey,
      reviewType || 'initial'
    );

    res.json({
      success: true,
      data: {
        reviewId: result.reviewId,
        status: result.status,
        score: result.score.overall,
        blockers: result.blockers,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    logger.error({ msg: 'Failed to run readiness review', error });
    res.status(500).json({ success: false, error: 'Failed to run review' });
  }
});

// POST /internal/platforms/tiktok-shop/readiness/run - Run TikTok Shop readiness review specifically
router.post('/tiktok-shop/readiness/run', async (_req: Request, res: Response) => {
  try {
    const result = await runTikTokShopReadinessReview();

    res.json({
      success: true,
      data: {
        reviewId: result.reviewId,
        status: result.status,
        score: result.score.overall,
        blockers: result.blockers,
        warnings: result.warnings,
        summary: result.summary,
      },
    });
  } catch (error) {
    logger.error({ msg: 'Failed to run TikTok Shop readiness review', error });
    res.status(500).json({ success: false, error: 'Failed to run review' });
  }
});

export default router;
