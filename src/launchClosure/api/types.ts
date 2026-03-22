/**
 * Launch Closure API Types
 */

import { z } from 'zod';

export const LaunchReviewStatusSchema = z.enum(['draft', 'in_progress', 'completed', 'finalized', 'cancelled']);
export const LaunchReadinessStatusSchema = z.enum(['pending', 'ready', 'conditional_go', 'no_go', 'blocked', 'watch_required', 'stabilization_incomplete']);
export const LaunchChecklistStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'skipped', 'failed']);
export const LaunchRiskSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export const LaunchSignoffAreaSchema = z.enum(['product_quality', 'release_runtime', 'commercial_safety', 'multi_platform_support', 'governance_ops']);

export const LaunchReadinessReviewDto = z.object({
  id: z.string().uuid(),
  launchKey: z.string(),
  reviewStatus: LaunchReviewStatusSchema,
  readinessStatus: LaunchReadinessStatusSchema,
  readinessScore: z.number().nullable(),
  blockerCount: z.number(),
  warningCount: z.number(),
  createdAt: z.string().datetime(),
});

export const LaunchChecklistDto = z.object({
  id: z.string().uuid(),
  checklistKey: z.string(),
  checklistStatus: LaunchChecklistStatusSchema,
  checklistPayload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export const LaunchRiskDto = z.object({
  id: z.string().uuid(),
  riskType: z.string(),
  severity: LaunchRiskSeveritySchema,
  riskStatus: z.string(),
  riskPayload: z.record(z.unknown()),
  ownerId: z.string().nullable(),
  dueAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const LaunchSignoffDto = z.object({
  id: z.string().uuid(),
  signoffArea: LaunchSignoffAreaSchema,
  signoffStatus: z.string(),
  actorId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const LaunchWatchPlanDto = z.object({
  id: z.string().uuid(),
  planStatus: z.string(),
  watchWindowStart: z.string().datetime().nullable(),
  watchWindowEnd: z.string().datetime().nullable(),
  planPayload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

export const LaunchGoNoGoDecisionDto = z.object({
  decision: z.enum(['go', 'conditional_go', 'no_go']),
  readinessStatus: LaunchReadinessStatusSchema,
  readinessScore: z.number(),
  blockerCount: z.number(),
  warningCount: z.number(),
  rationale: z.string(),
  decidedAt: z.string().datetime(),
});

export const LaunchClosureReportDto = z.object({
  reportId: z.string(),
  launchKey: z.string(),
  generatedAt: z.string().datetime(),
  readinessStatus: LaunchReadinessStatusSchema,
  readinessScore: z.number(),
  goNoGoDecision: LaunchGoNoGoDecisionDto,
});
