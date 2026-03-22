/**
 * Platform Resolution Gate Repository
 *
 * Repository for managing platform resolution gates using Supabase.
 * Note: Tables are defined in migration 018 but may not exist yet.
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformGateRecord,
  PlatformSupportStateSnapshot,
  EnablementReview,
  PublicFlowAudit,
  UsageQuota,
  PlatformSandboxResolutionRun,
} from '../types.js';
import type { PlatformSupportState, PlatformEnablementPhase } from './constants.js';
import logger from '../../../../utils/logger.js';

/**
 * Platform Resolution Gate Repository
 */
export class PlatformResolutionGateRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Get gate for a platform
   */
  async getGate(platform: string): Promise<PlatformGateRecord | null> {
    try {
      const { data, error } = await this.client
        .from('platform_resolution_gates')
        .select('*')
        .eq('platform', platform)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data ? this.mapToGate(data) : null;
    } catch (e) {
      // Table may not exist yet
      logger.warn({ msg: 'platform_resolution_gates table not available', platform });
      return null;
    }
  }

  /**
   * Get all gates
   */
  async getAllGates(): Promise<PlatformGateRecord[]> {
    try {
      const { data, error } = await this.client
        .from('platform_resolution_gates')
        .select('*');

      if (error) throw error;
      return (data || []).map(this.mapToGate);
    } catch (e) {
      logger.warn({ msg: 'platform_resolution_gates table not available' });
      return [];
    }
  }

  /**
   * Create or update gate
   */
  async upsertGate(gate: Partial<PlatformGateRecord> & { platform: string }): Promise<PlatformGateRecord> {
    try {
      const existing = await this.getGate(gate.platform);

      if (existing) {
        const { data, error } = await this.client
          .from('platform_resolution_gates')
          .update({
            support_state: gate.supportState,
            enablement_phase: gate.enablementPhase,
            domain_ready: gate.domainReady,
            data_foundation_ready: gate.dataFoundationReady,
            acquisition_ready: gate.acquisitionReady,
            resolution_ready: gate.resolutionReady,
            governance_approved: gate.governanceApproved,
            sandbox_enabled: gate.sandboxEnabled,
            production_enabled: gate.productionEnabled,
            updated_at: new Date().toISOString(),
          })
          .eq('platform', gate.platform)
          .select()
          .single();

        if (error) throw error;
        return this.mapToGate(data);
      } else {
        const { data, error } = await this.client
          .from('platform_resolution_gates')
          .insert({
            platform: gate.platform,
            support_state: gate.supportState || 'unsupported',
            enablement_phase: gate.enablementPhase || 'disabled',
            domain_ready: gate.domainReady || false,
            data_foundation_ready: gate.dataFoundationReady || false,
            acquisition_ready: gate.acquisitionReady || false,
            resolution_ready: gate.resolutionReady || false,
            governance_approved: gate.governanceApproved || false,
            sandbox_enabled: gate.sandboxEnabled ?? true,
            production_enabled: gate.productionEnabled || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return this.mapToGate(data);
      }
    } catch (e) {
      logger.warn({ msg: 'Failed to upsert gate, using defaults', platform: gate.platform });
      return this.getDefaultGate(gate.platform);
    }
  }

  /**
   * Update support state
   */
  async updateSupportState(
    platform: string,
    supportState: PlatformSupportState,
    evaluatedAt: Date = new Date()
  ): Promise<PlatformGateRecord | null> {
    try {
      const { data, error } = await this.client
        .from('platform_resolution_gates')
        .update({
          support_state: supportState,
          evaluated_at: evaluatedAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('platform', platform)
        .select()
        .single();

      if (error) throw error;
      return data ? this.mapToGate(data) : null;
    } catch (e) {
      return this.getGate(platform);
    }
  }

  /**
   * Update enablement phase
   */
  async updateEnablementPhase(
    platform: string,
    enablementPhase: PlatformEnablementPhase
  ): Promise<PlatformGateRecord | null> {
    try {
      const { data, error } = await this.client
        .from('platform_resolution_gates')
        .update({
          enablement_phase: enablementPhase,
          updated_at: new Date().toISOString(),
        })
        .eq('platform', platform)
        .select()
        .single();

      if (error) throw error;
      return data ? this.mapToGate(data) : null;
    } catch (e) {
      return this.getGate(platform);
    }
  }

  /**
   * Update readiness flags
   */
  async updateReadinessFlags(
    platform: string,
    flags: {
      domainReady?: boolean;
      dataFoundationReady?: boolean;
      acquisitionReady?: boolean;
      resolutionReady?: boolean;
      governanceApproved?: boolean;
    }
  ): Promise<PlatformGateRecord | null> {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (flags.domainReady !== undefined) updateData.domain_ready = flags.domainReady;
      if (flags.dataFoundationReady !== undefined) updateData.data_foundation_ready = flags.dataFoundationReady;
      if (flags.acquisitionReady !== undefined) updateData.acquisition_ready = flags.acquisitionReady;
      if (flags.resolutionReady !== undefined) updateData.resolution_ready = flags.resolutionReady;
      if (flags.governanceApproved !== undefined) updateData.governance_approved = flags.governanceApproved;

      const { data, error } = await this.client
        .from('platform_resolution_gates')
        .update(updateData)
        .eq('platform', platform)
        .select()
        .single();

      if (error) throw error;
      return data ? this.mapToGate(data) : null;
    } catch (e) {
      return this.getGate(platform);
    }
  }

  /**
   * Create support state snapshot
   */
  async createSupportStateSnapshot(snapshot: {
    platform: string;
    supportState: PlatformSupportState;
    enablementPhase: PlatformEnablementPhase;
    domainReady: boolean;
    dataFoundationReady: boolean;
    acquisitionReady: boolean;
    resolutionReady: boolean;
    governanceApproved: boolean;
    snapshotReason: string;
    triggerEvent?: string;
  }): Promise<PlatformSupportStateSnapshot> {
    try {
      // Mark current as not current
      await this.client
        .from('platform_support_state_snapshots')
        .update({ is_current: false })
        .eq('platform', snapshot.platform)
        .eq('is_current', true);

      const { data, error } = await this.client
        .from('platform_support_state_snapshots')
        .insert({
          platform: snapshot.platform,
          support_state: snapshot.supportState,
          enablement_phase: snapshot.enablementPhase,
          domain_ready: snapshot.domainReady,
          data_foundation_ready: snapshot.dataFoundationReady,
          acquisition_ready: snapshot.acquisitionReady,
          resolution_ready: snapshot.resolutionReady,
          governance_approved: snapshot.governanceApproved,
          snapshot_reason: snapshot.snapshotReason,
          trigger_event: snapshot.triggerEvent,
          valid_from: new Date().toISOString(),
          is_current: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapToSnapshot(data);
    } catch (e) {
      return this.getDefaultSnapshot(snapshot.platform);
    }
  }

  /**
   * Get current snapshot
   */
  async getCurrentSnapshot(platform: string): Promise<PlatformSupportStateSnapshot | null> {
    try {
      const { data, error } = await this.client
        .from('platform_support_state_snapshots')
        .select('*')
        .eq('platform', platform)
        .eq('is_current', true)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data ? this.mapToSnapshot(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Create public flow audit
   */
  async createPublicFlowAudit(audit: {
    auditId: string;
    platform: string;
    flowType: 'resolution' | 'redirect' | 'attribution';
    inputType: string;
    inputValue: string;
    userAgent?: string;
    requestId?: string;
    routeDecision: string;
    supportState: PlatformSupportState;
    enablementPhase: PlatformEnablementPhase;
    gateEvaluation?: Record<string, unknown>;
    responseStatus: 'success' | 'error' | 'redirected';
    responsePayload?: Record<string, unknown>;
    qualityScore?: number;
    userFeedback?: 'positive' | 'negative' | 'neutral';
    userFeedbackDetails?: string;
    honestRepresentation?: boolean;
    misleadingFlags?: string[];
  }): Promise<PublicFlowAudit> {
    try {
      const { data, error } = await this.client
        .from('platform_public_flow_audits')
        .insert({
          audit_id: audit.auditId,
          platform: audit.platform,
          flow_type: audit.flowType,
          input_type: audit.inputType,
          input_value: audit.inputValue,
          user_agent: audit.userAgent,
          request_id: audit.requestId,
          route_decision: audit.routeDecision,
          support_state: audit.supportState,
          enablement_phase: audit.enablementPhase,
          gate_evaluation: audit.gateEvaluation || {},
          response_status: audit.responseStatus,
          response_payload: audit.responsePayload || {},
          quality_score: audit.qualityScore,
          user_feedback: audit.userFeedback,
          honest_representation: audit.honestRepresentation ?? true,
          misleading_flags: audit.misleadingFlags || [],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapToAudit(data);
    } catch (e) {
      return this.getDefaultAudit(audit.platform);
    }
  }

  /**
   * Get public flow audits
   */
  async getPublicFlowAudits(platform?: string, limit: number = 100): Promise<PublicFlowAudit[]> {
    try {
      let query = this.client.from('platform_public_flow_audits').select('*');
      if (platform) query = query.eq('platform', platform);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(this.mapToAudit);
    } catch (e) {
      return [];
    }
  }

  /**
   * Get sandbox usage quota
   */
  async getSandboxUsageQuota(
    platform: string,
    quotaPeriod: 'hourly' | 'daily' | 'monthly'
  ): Promise<UsageQuota | null> {
    try {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      if (quotaPeriod === 'hourly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        periodEnd = new Date(periodStart.getTime() + 60 * 60 * 1000);
      } else if (quotaPeriod === 'daily') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      const { data, error } = await this.client
        .from('platform_sandbox_usage_quotas')
        .select('*')
        .eq('platform', platform)
        .eq('quota_period', quotaPeriod)
        .gte('period_start', periodStart.toISOString())
        .lt('period_end', periodEnd.toISOString())
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data ? this.mapToQuota(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get or create sandbox usage quota
   */
  async getOrCreateSandboxUsageQuota(
    platform: string,
    quotaPeriod: 'hourly' | 'daily' | 'monthly',
    requestsLimit: number,
    errorsLimit: number
  ): Promise<UsageQuota> {
    let quota = await this.getSandboxUsageQuota(platform, quotaPeriod);

    if (!quota) {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      if (quotaPeriod === 'hourly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        periodEnd = new Date(periodStart.getTime() + 60 * 60 * 1000);
      } else if (quotaPeriod === 'daily') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      try {
        const { data, error } = await this.client
          .from('platform_sandbox_usage_quotas')
          .insert({
            platform,
            quota_period: quotaPeriod,
            requests_used: 0,
            requests_limit: requestsLimit,
            errors_used: 0,
            errors_limit: errorsLimit,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        quota = this.mapToQuota(data);
      } catch (e) {
        return this.getDefaultQuota(platform, quotaPeriod, requestsLimit);
      }
    }

    return quota;
  }

  /**
   * Increment sandbox usage
   */
  async incrementSandboxUsage(
    platform: string,
    quotaPeriod: 'hourly' | 'daily' | 'monthly',
    requestsLimit: number,
    errorsLimit: number,
    isError: boolean = false
  ): Promise<UsageQuota> {
    const quota = await this.getOrCreateSandboxUsageQuota(platform, quotaPeriod, requestsLimit, errorsLimit);

    const updates: Record<string, unknown> = {
      requests_used: quota.requestsUsed + 1,
      updated_at: new Date().toISOString(),
    };

    if (isError) {
      updates.errors_used = quota.errorsUsed + 1;
    }

    // Check for throttling
    if ((quota.requestsUsed + 1) > requestsLimit) {
      updates.throttled_at = new Date().toISOString();
      updates.throttled_until = new Date(Date.now() + 3600000).toISOString();
      updates.throttle_reason = 'Quota exceeded';
    }

    try {
      const { data, error } = await this.client
        .from('platform_sandbox_usage_quotas')
        .update(updates)
        .eq('id', quota.id)
        .select()
        .single();

      if (error) throw error;
      return this.mapToQuota(data);
    } catch (e) {
      return quota;
    }
  }

  // Mappers
  private mapToGate(row: Record<string, unknown>): PlatformGateRecord {
    return {
      id: row.id as string,
      platform: row.platform as string,
      supportState: row.support_state as PlatformSupportState,
      enablementPhase: row.enablement_phase as PlatformEnablementPhase,
      domainReady: row.domain_ready as boolean,
      dataFoundationReady: row.data_foundation_ready as boolean,
      acquisitionReady: row.acquisition_ready as boolean,
      resolutionReady: row.resolution_ready as boolean,
      governanceApproved: row.governance_approved as boolean,
      sandboxEnabled: row.sandbox_enabled as boolean,
      sandboxMaxRequestsPerHour: row.sandbox_max_requests_per_hour as number,
      sandboxMaxRequestsPerDay: row.sandbox_max_requests_per_day as number,
      productionEnabled: row.production_enabled as boolean,
      productionMaxRequestsPerHour: row.production_max_requests_per_hour as number,
      productionMaxRequestsPerDay: row.production_max_requests_per_day as number,
      allowPublicResolution: row.allow_public_resolution as boolean,
      allowSandboxResolution: row.allow_sandbox_resolution as boolean,
      allowGatedResolution: row.allow_gated_resolution as boolean,
      gateConfig: row.gate_config as Record<string, unknown> || {},
      evaluatedAt: row.evaluated_at ? new Date(row.evaluated_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapToSnapshot(row: Record<string, unknown>): PlatformSupportStateSnapshot {
    return {
      id: row.id as string,
      platform: row.platform as string,
      supportState: row.support_state as PlatformSupportState,
      enablementPhase: row.enablement_phase as PlatformEnablementPhase,
      domainReady: row.domain_ready as boolean,
      dataFoundationReady: row.data_foundation_ready as boolean,
      acquisitionReady: row.acquisition_ready as boolean,
      resolutionReady: row.resolution_ready as boolean,
      governanceApproved: row.governance_approved as boolean,
      snapshotReason: row.snapshot_reason as string,
      triggerEvent: row.trigger_event as string | null,
      validFrom: new Date(row.valid_from as string),
      isCurrent: row.is_current as boolean,
      createdAt: new Date(row.created_at as string),
    };
  }

  private mapToAudit(row: Record<string, unknown>): PublicFlowAudit {
    return {
      id: row.id as string,
      auditId: row.audit_id as string,
      platform: row.platform as string,
      flowType: row.flow_type as 'resolution' | 'redirect' | 'attribution',
      inputType: row.input_type as string,
      inputValue: row.input_value as string,
      userAgent: row.user_agent as string | null,
      requestId: row.request_id as string | null,
      routeDecision: row.route_decision as string,
      supportState: row.support_state as PlatformSupportState,
      enablementPhase: row.enablement_phase as PlatformEnablementPhase,
      gateEvaluation: row.gate_evaluation as Record<string, unknown> || {},
      responseStatus: row.response_status as 'success' | 'error' | 'redirected',
      responsePayload: row.response_payload as Record<string, unknown> || {},
      qualityScore: row.quality_score as number | null,
      userFeedback: row.user_feedback as 'positive' | 'negative' | 'neutral' | null,
      honestRepresentation: row.honest_representation as boolean,
      misleadingFlags: row.misleading_flags as string[] || [],
      createdAt: new Date(row.created_at as string),
    };
  }

  private mapToQuota(row: Record<string, unknown>): UsageQuota {
    return {
      id: row.id as string,
      platform: row.platform as string,
      quotaPeriod: row.quota_period as 'hourly' | 'daily' | 'monthly',
      requestsUsed: row.requests_used as number,
      requestsLimit: row.requests_limit as number,
      errorsUsed: row.errors_used as number,
      errorsLimit: row.errors_limit as number,
      throttledAt: row.throttled_at ? new Date(row.throttled_at as string) : null,
      throttledUntil: row.throttled_until ? new Date(row.throttled_until as string) : null,
      throttleReason: row.throttle_reason as string | null,
      periodStart: new Date(row.period_start as string),
      periodEnd: new Date(row.period_end as string),
    };
  }

  private getDefaultGate(platform: string): PlatformGateRecord {
    return {
      id: crypto.randomUUID(),
      platform,
      supportState: 'unsupported',
      enablementPhase: 'disabled',
      domainReady: false,
      dataFoundationReady: false,
      acquisitionReady: false,
      resolutionReady: false,
      governanceApproved: false,
      sandboxEnabled: true,
      sandboxMaxRequestsPerHour: 100,
      sandboxMaxRequestsPerDay: 1000,
      productionEnabled: false,
      productionMaxRequestsPerHour: 1000,
      productionMaxRequestsPerDay: 50000,
      allowPublicResolution: false,
      allowSandboxResolution: true,
      allowGatedResolution: false,
      gateConfig: {},
      evaluatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultSnapshot(platform: string): PlatformSupportStateSnapshot {
    return {
      id: crypto.randomUUID(),
      platform,
      supportState: 'unsupported',
      enablementPhase: 'disabled',
      domainReady: false,
      dataFoundationReady: false,
      acquisitionReady: false,
      resolutionReady: false,
      governanceApproved: false,
      snapshotReason: 'default',
      validFrom: new Date(),
      isCurrent: true,
      createdAt: new Date(),
    };
  }

  private getDefaultAudit(platform: string): PublicFlowAudit {
    return {
      id: crypto.randomUUID(),
      auditId: crypto.randomUUID(),
      platform,
      flowType: 'resolution',
      inputType: 'unknown',
      inputValue: '',
      routeDecision: 'blocked',
      supportState: 'unsupported',
      enablementPhase: 'disabled',
      gateEvaluation: {},
      responseStatus: 'error',
      responsePayload: {},
      honestRepresentation: true,
      misleadingFlags: [],
      createdAt: new Date(),
    };
  }

  private getDefaultQuota(platform: string, period: string, limit: number): UsageQuota {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      platform,
      quotaPeriod: period as 'hourly' | 'daily' | 'monthly',
      requestsUsed: 0,
      requestsLimit: limit,
      errorsUsed: 0,
      errorsLimit: 100,
      throttledAt: null,
      throttledUntil: null,
      throttleReason: null,
      periodStart: now,
      periodEnd: new Date(now.getTime() + 3600000),
    };
  }
}

/**
 * Repository singleton
 */
export const platformResolutionGateRepository = new PlatformResolutionGateRepository();
