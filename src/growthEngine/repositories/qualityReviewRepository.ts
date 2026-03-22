/**
 * Quality Review Repository
 *
 * Data access layer for surface quality reviews.
 */

import {
  GrowthSurfaceQualityReview,
  GrowthQualityReviewStatus,
} from '../types';

export interface QualityReviewFilter {
  surfaceInventoryId?: string;
  reviewStatus?: GrowthQualityReviewStatus[];
  minQualityScore?: number;
  maxQualityScore?: number;
}

/**
 * Create a new quality review
 */
export async function createQualityReview(
  data: Omit<GrowthSurfaceQualityReview, 'id' | 'createdAt'>
): Promise<GrowthSurfaceQualityReview> {
  const id = crypto.randomUUID();
  const now = new Date();

  const review: GrowthSurfaceQualityReview = {
    id,
    ...data,
    createdAt: now,
  };

  await saveQualityReview(review);
  return review;
}

/**
 * Get quality review by ID
 */
export async function getQualityReviewById(
  id: string
): Promise<GrowthSurfaceQualityReview | null> {
  return findQualityReviewById(id);
}

/**
 * Get latest quality review for a surface
 */
export async function getLatestQualityReview(
  surfaceInventoryId: string
): Promise<GrowthSurfaceQualityReview | null> {
  const reviews = await findQualityReviewsBySurface(surfaceInventoryId);
  if (reviews.length === 0) return null;

  // Sort by created date descending
  reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return reviews[0];
}

/**
 * Get all quality reviews for a surface
 */
export async function getQualityReviewsBySurface(
  surfaceInventoryId: string
): Promise<GrowthSurfaceQualityReview[]> {
  return findQualityReviewsBySurface(surfaceInventoryId);
}

/**
 * Update quality review
 */
export async function updateQualityReview(
  id: string,
  data: Partial<GrowthSurfaceQualityReview>
): Promise<GrowthSurfaceQualityReview | null> {
  const existing = await findQualityReviewById(id);
  if (!existing) return null;

  const updated: GrowthSurfaceQualityReview = {
    ...existing,
    ...data,
  };

  await saveQualityReview(updated);
  return updated;
}

/**
 * List quality reviews with filters
 */
export async function listQualityReviews(
  filter: QualityReviewFilter = {},
  limit: number = 20,
  offset: number = 0
): Promise<{
  data: GrowthSurfaceQualityReview[];
  total: number;
}> {
  let reviews = await getAllQualityReviews();

  // Apply filters
  if (filter.surfaceInventoryId) {
    reviews = reviews.filter(r => r.surfaceInventoryId === filter.surfaceInventoryId);
  }
  if (filter.reviewStatus?.length) {
    reviews = reviews.filter(r => filter.reviewStatus!.includes(r.reviewStatus));
  }
  if (filter.minQualityScore !== undefined) {
    reviews = reviews.filter(r => r.qualityScore !== null && r.qualityScore >= filter.minQualityScore!);
  }
  if (filter.maxQualityScore !== undefined) {
    reviews = reviews.filter(r => r.qualityScore !== null && r.qualityScore <= filter.maxQualityScore!);
  }

  // Sort by created date descending
  reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = reviews.length;
  const data = reviews.slice(offset, offset + limit);

  return { data, total };
}

/**
 * Get surfaces pending review
 */
export async function getSurfacesPendingReview(): Promise<GrowthSurfaceQualityReview[]> {
  const all = await getAllQualityReviews();
  return all
    .filter(r => r.reviewStatus === GrowthQualityReviewStatus.PENDING)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get rejected surfaces
 */
export async function getRejectedSurfaces(): Promise<GrowthSurfaceQualityReview[]> {
  const all = await getAllQualityReviews();
  return all
    .filter(r => r.reviewStatus === GrowthQualityReviewStatus.REJECTED)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ============================================================================
// In-Memory Storage
// ============================================================================

const reviewStore: Map<string, GrowthSurfaceQualityReview> = new Map();

async function saveQualityReview(review: GrowthSurfaceQualityReview): Promise<void> {
  reviewStore.set(review.id, review);
}

async function findQualityReviewById(id: string): Promise<GrowthSurfaceQualityReview | null> {
  return reviewStore.get(id) ?? null;
}

async function findQualityReviewsBySurface(surfaceId: string): Promise<GrowthSurfaceQualityReview[]> {
  const all = await getAllQualityReviews();
  return all.filter(r => r.surfaceInventoryId === surfaceId);
}

async function getAllQualityReviews(): Promise<GrowthSurfaceQualityReview[]> {
  return Array.from(reviewStore.values());
}

/**
 * Seed test data
 */
export function seedTestQualityReviews(reviews: GrowthSurfaceQualityReview[]): void {
  for (const review of reviews) {
    reviewStore.set(review.id, review);
  }
}
