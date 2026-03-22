/**
 * Launch Risk Repository
 */
import supabase from '../../db/supabaseClient.js';
import type { LaunchRiskRecord, LaunchRiskInput } from '../types.js';

export async function createRisk(input: LaunchRiskInput): Promise<LaunchRiskRecord> {
  const { data, error } = await supabase.from('launch_risk_registry').insert({
    launch_review_id: input.launchReviewId ?? null,
    risk_type: input.riskType,
    severity: input.severity,
    risk_payload: input.riskPayload,
    owner_id: input.ownerId ?? null,
    owner_role: input.ownerRole ?? null,
    due_at: input.dueAt?.toISOString() ?? null,
  }).select().single();
  if (error) throw new Error(`Failed to create risk: ${error.message}`);
  return mapToRisk(data);
}

export async function getRisksByReview(reviewId: string): Promise<LaunchRiskRecord[]> {
  const { data, error } = await supabase.from('launch_risk_registry').select('*').eq('launch_review_id', reviewId).order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to get risks: ${error.message}`);
  return (data ?? []).map(mapToRisk);
}

export async function updateRiskStatus(id: string, status: string, resolvedAt?: Date): Promise<LaunchRiskRecord | null> {
  const update: Record<string, unknown> = { risk_status: status };
  if (resolvedAt) update.resolved_at = resolvedAt.toISOString();
  const { data, error } = await supabase.from('launch_risk_registry').update(update).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update risk: ${error.message}`);
  return data ? mapToRisk(data) : null;
}

function mapToRisk(row: Record<string, unknown>): LaunchRiskRecord {
  return {
    id: row.id as string,
    launchReviewId: row.launch_review_id as string | undefined,
    riskType: row.risk_type as any,
    severity: row.severity as any,
    riskStatus: row.risk_status as any,
    riskPayload: row.risk_payload as Record<string, unknown>,
    ownerId: row.owner_id as string | undefined,
    ownerRole: row.owner_role as string | undefined,
    dueAt: row.due_at ? new Date(row.due_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
  };
}
