/**
 * Voucher Engine Metrics
 *
 * Metrics collection for voucher engine operations.
 */

import { Counter, Gauge, Histogram, collectDefaultMetrics } from '../metrics';

/**
 * Voucher engine metrics
 */
export class VoucherEngineMetrics {
  // Resolution counters
  private resolutionTotal: Counter;
  private resolutionSuccess: Counter;
  private resolutionNoMatch: Counter;
  private resolutionFailed: Counter;

  // Cache metrics
  private cacheHits: Counter;
  private cacheMisses: Counter;
  private cacheHitRate: Gauge;

  // Timing metrics
  private resolutionDuration: Histogram;
  private urlParseDuration: Histogram;
  private eligibilityDuration: Histogram;
  private rankingDuration: Histogram;

  // Quality metrics
  private eligibilityEvaluations: Counter;
  private eligibleVouchers: Counter;
  private ineligibleVouchers: Counter;

  // Ranking metrics
  private candidateCount: Histogram;
  private rankingScore: Histogram;

  constructor() {
    // Initialize counters
    this.resolutionTotal = new Counter({
      name: 'voucher_resolution_total',
      help: 'Total number of voucher resolution requests',
      labelNames: ['platform'],
    });

    this.resolutionSuccess = new Counter({
      name: 'voucher_resolution_success_total',
      help: 'Total successful resolutions',
      labelNames: ['platform', 'match_type'],
    });

    this.resolutionNoMatch = new Counter({
      name: 'voucher_resolution_no_match_total',
      help: 'Total resolutions with no match',
      labelNames: ['platform'],
    });

    this.resolutionFailed = new Counter({
      name: 'voucher_resolution_failed_total',
      help: 'Total failed resolutions',
      labelNames: ['platform', 'error_type'],
    });

    // Cache
    this.cacheHits = new Counter({
      name: 'voucher_cache_hits_total',
      help: 'Total cache hits',
    });

    this.cacheMisses = new Counter({
      name: 'voucher_cache_misses_total',
      help: 'Total cache misses',
    });

    this.cacheHitRate = new Gauge({
      name: 'voucher_cache_hit_rate',
      help: 'Cache hit rate (0-1)',
    });

    // Durations
    this.resolutionDuration = new Histogram({
      name: 'voucher_resolution_duration_seconds',
      help: 'Total resolution duration in seconds',
      buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      labelNames: ['platform'],
    });

    this.urlParseDuration = new Histogram({
      name: 'voucher_url_parse_duration_seconds',
      help: 'URL parsing duration in seconds',
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25],
    });

    this.eligibilityDuration = new Histogram({
      name: 'voucher_eligibility_duration_seconds',
      help: 'Eligibility evaluation duration in seconds',
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
    });

    this.rankingDuration = new Histogram({
      name: 'voucher_ranking_duration_seconds',
      help: 'Ranking duration in seconds',
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25],
    });

    // Quality
    this.eligibilityEvaluations = new Counter({
      name: 'voucher_eligibility_evaluations_total',
      help: 'Total eligibility evaluations',
    });

    this.eligibleVouchers = new Counter({
      name: 'voucher_eligible_total',
      help: 'Total eligible vouchers',
      labelNames: ['match_type'],
    });

    this.ineligibleVouchers = new Counter({
      name: 'voucher_ineligible_total',
      help: 'Total ineligible vouchers',
    });

    // Ranking
    this.candidateCount = new Histogram({
      name: 'voucher_candidate_count',
      help: 'Number of candidates returned',
      buckets: [1, 3, 5, 10, 20],
    });

    this.rankingScore = new Histogram({
      name: 'voucher_ranking_score',
      help: 'Ranking score distribution',
      buckets: [10, 25, 50, 75, 90, 100],
    });
  }

  // Recording methods
  recordResolution(platform: string): void {
    this.resolutionTotal.inc({ platform });
  }

  recordResolutionSuccess(platform: string, matchType: string): void {
    this.resolutionSuccess.inc({ platform, match_type: matchType });
  }

  recordResolutionNoMatch(platform: string): void {
    this.resolutionNoMatch.inc({ platform });
  }

  recordResolutionFailed(platform: string, errorType: string): void {
    this.resolutionFailed.inc({ platform, error_type: errorType });
  }

  recordCacheHit(): void {
    this.cacheHits.inc();
    this.updateCacheHitRate();
  }

  recordCacheMiss(): void {
    this.cacheMisses.inc();
    this.updateCacheHitRate();
  }

  recordResolutionDuration(platform: string, durationMs: number): void {
    this.resolutionDuration.observe({ platform }, durationMs / 1000);
  }

  recordUrlParseDuration(durationMs: number): void {
    this.urlParseDuration.observe(durationMs / 1000);
  }

  recordEligibilityDuration(durationMs: number): void {
    this.eligibilityDuration.observe(durationMs / 1000);
  }

  recordRankingDuration(durationMs: number): void {
    this.rankingDuration.observe(durationMs / 1000);
  }

  recordEligibilityEvaluation(): void {
    this.eligibilityEvaluations.inc();
  }

  recordEligibleVoucher(matchType: string): void {
    this.eligibleVouchers.inc({ match_type: matchType });
  }

  recordIneligibleVoucher(): void {
    this.ineligibleVouchers.inc();
  }

  recordCandidateCount(count: number): void {
    this.candidateCount.observe(count);
  }

  recordRankingScore(score: number): void {
    this.rankingScore.observe(score);
  }

  private updateCacheHitRate(): void {
    const hits = this.cacheHits.get();
    const misses = this.cacheMisses.get();
    const total = hits + misses;

    if (total > 0) {
      this.cacheHitRate.set(hits / total);
    }
  }
}

/**
 * Global metrics instance
 */
export const voucherMetrics = new VoucherEngineMetrics();
