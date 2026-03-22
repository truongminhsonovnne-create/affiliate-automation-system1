/**
 * Product Governance Release Readiness Routes
 *
 * Internal API routes for release readiness management.
 */

import { Router } from 'express';
import * as governanceService from '../service/productGovernanceService';
import { serializeReleaseReadinessReview } from '../api/serializers';

const router = Router();

/**
 * GET /internal/product-governance/releases
 * Get all release readiness reviews
 */
router.get('/releases', async (req, res) => {
  try {
    const { environment, status, limit = '20', offset = '0' } = req.query;

    // In real implementation, query with filters
    const reviews = []; // await getAllReleaseReadinessReviews({...})

    res.json({
      data: reviews.map(serializeReleaseReadinessReview),
      meta: { total: reviews.length }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch release reviews' });
  }
});

/**
 * GET /internal/product-governance/releases/:releaseKey
 * Get release readiness detail
 */
router.get('/releases/:releaseKey', async (req, res) => {
  try {
    const { releaseKey } = req.params;
    const { environment = 'production' } = req.query;

    const { review, reviewPack } = await governanceService.getReleaseReadinessDetail(
      releaseKey,
      environment as string
    );

    if (!review) {
      return res.status(404).json({ error: 'Release review not found' });
    }

    res.json({
      review: serializeReleaseReadinessReview(review),
      reviewPack
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch release review' });
  }
});

/**
 * POST /internal/product-governance/releases/:releaseKey/review
 * Run release readiness review
 */
router.post('/releases/:releaseKey/review', async (req, res) => {
  try {
    const { releaseKey } = req.params;
    const { environment = 'production' } = req.body;

    const result = await governanceService.runReleaseReadinessReview({
      releaseKey,
      environment
    });

    res.json({
      review: serializeReleaseReadinessReview(result.review),
      reviewPack: result.reviewPack,
      signalsCount: result.signals.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run release review' });
  }
});

/**
 * POST /internal/product-governance/releases/:releaseKey/approve
 * Approve release readiness
 */
router.post('/releases/:releaseKey/approve', async (req, res) => {
  try {
    const { releaseKey } = req.params;
    const { environment = 'production', actorId, actorRole, rationale } = req.body;

    const result = await governanceService.processReleaseGovernanceDecision(
      releaseKey,
      environment,
      'approve',
      actorId,
      actorRole,
      rationale
    );

    res.json({
      review: serializeReleaseReadinessReview(result.review),
      decision: result.decision,
      followupsCount: result.followups.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve release' });
  }
});

/**
 * POST /internal/product-governance/releases/:releaseKey/conditionally-approve
 * Conditionally approve release readiness
 */
router.post('/releases/:releaseKey/conditionally-approve', async (req, res) => {
  try {
    const { releaseKey } = req.params;
    const { environment = 'production', actorId, actorRole, rationale, conditions } = req.body;

    const result = await governanceService.processReleaseGovernanceDecision(
      releaseKey,
      environment,
      'conditional_approve',
      actorId,
      actorRole,
      rationale
    );

    res.json({
      review: serializeReleaseReadinessReview(result.review),
      decision: result.decision,
      followupsCount: result.followups.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to conditionally approve release' });
  }
});

/**
 * POST /internal/product-governance/releases/:releaseKey/block
 * Block release readiness
 */
router.post('/releases/:releaseKey/block', async (req, res) => {
  try {
    const { releaseKey } = req.params;
    const { environment = 'production', actorId, actorRole, rationale } = req.body;

    const result = await governanceService.processReleaseGovernanceDecision(
      releaseKey,
      environment,
      'block',
      actorId,
      actorRole,
      rationale
    );

    res.json({
      review: serializeReleaseReadinessReview(result.review),
      decision: result.decision,
      followupsCount: result.followups.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block release' });
  }
});

/**
 * POST /internal/product-governance/releases/:releaseKey/defer
 * Defer release readiness decision
 */
router.post('/releases/:releaseKey/defer', async (req, res) => {
  try {
    const { releaseKey } = req.params;
    const { environment = 'production', actorId, actorRole, rationale } = req.body;

    const result = await governanceService.processReleaseGovernanceDecision(
      releaseKey,
      environment,
      'defer',
      actorId,
      actorRole,
      rationale
    );

    res.json({
      review: serializeReleaseReadinessReview(result.review),
      decision: result.decision
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to defer release decision' });
  }
});

/**
 * POST /internal/product-governance/releases/:releaseKey/rollback-recommended
 * Recommend rollback
 */
router.post('/releases/:releaseKey/rollback-recommended', async (req, res) => {
  try {
    const { releaseKey } = req.params;
    const { environment = 'production', actorId, actorRole, rationale } = req.body;

    const result = await governanceService.processReleaseGovernanceDecision(
      releaseKey,
      environment,
      'rollback_recommended',
      actorId,
      actorRole,
      rationale
    );

    res.json({
      review: serializeReleaseReadinessReview(result.review),
      decision: result.decision,
      followupsCount: result.followups.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to recommend rollback' });
  }
});

export default router;
