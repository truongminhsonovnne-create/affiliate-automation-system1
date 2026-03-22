/**
 * Commercial Session Resolver
 *
 * Production-grade session resolution and stitching.
 * Privacy-safe, deterministic, explainable.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type {
  CommercialSession,
  CreateCommercialSessionInput,
  UpdateCommercialSessionInput,
  GrowthSurfaceType,
  CommercialResult,
} from '../types.js';
import { SESSION_THRESHOLDS } from '../constants.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Commercial Session Resolver
 *
 * Handles session resolution, creation, and updates.
 */
export class CommercialSessionResolver {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  /**
   * Resolve or create a commercial session
   */
  async resolveCommercialSession(
    input: CreateCommercialSessionInput
  ): Promise<CommercialResult<CommercialSession>> {
    try {
      // Try to find existing session
      const existingSession = await this.findExistingSession(input.sessionKey);

      if (existingSession) {
        // Update activity timestamp
        await this.updateCommercialSessionActivity(existingSession.id);

        // Update attribution context if provided
        if (Object.keys(input.attributionContext ?? {}).length > 0) {
          await this.updateAttributionContext(existingSession.id, input.attributionContext);
        }

        return {
          success: true,
          data: existingSession,
        };
      }

      // Create new session
      return await this.createCommercialSession(input);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({
        msg: 'Error resolving commercial session',
        error: errorMessage,
        sessionKey: input.sessionKey,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create a new commercial session
   */
  async createCommercialSession(
    input: CreateCommercialSessionInput
  ): Promise<CommercialResult<CommercialSession>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_commercial_sessions')
        .insert({
          session_key: input.sessionKey,
          anonymous_subject_key: input.anonymousSubjectKey,
          platform: input.platform ?? 'public',
          entry_surface_type: input.entrySurfaceType,
          entry_surface_id: input.entrySurfaceId,
          attribution_context: input.attributionContext ?? {},
        })
        .select()
        .single();

      if (error) {
        logger.error({
          msg: 'Failed to create commercial session',
          error: error.message,
          sessionKey: input.sessionKey,
        });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToSession(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({
        msg: 'Error creating commercial session',
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Find existing session by session key
   */
  async findExistingSession(sessionKey: string): Promise<CommercialSession | null> {
    const { data, error } = await this.supabase
      .from('affiliate_commercial_sessions')
      .select('*')
      .eq('session_key', sessionKey)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbToSession(data);
  }

  /**
   * Attach event to commercial session
   */
  async attachEventToCommercialSession(
    sessionKey: string,
    eventData: {
      surfaceType?: GrowthSurfaceType;
      surfaceId?: string;
      experimentContext?: Record<string, unknown>;
    }
  ): Promise<CommercialResult<CommercialSession>> {
    try {
      const session = await this.resolveCommercialSession({
        sessionKey,
        entrySurfaceType: eventData.surfaceType,
        entrySurfaceId: eventData.surfaceId,
        attributionContext: eventData.experimentContext ?? {},
      });

      return session;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update commercial session activity
   */
  async updateCommercialSessionActivity(
    sessionId: string
  ): Promise<CommercialResult<void>> {
    try {
      // The trigger will update last_seen_at automatically
      const { error } = await this.supabase
        .from('affiliate_commercial_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update attribution context
   */
  async updateAttributionContext(
    sessionId: string,
    context: Record<string, unknown>
  ): Promise<CommercialResult<void>> {
    try {
      // Merge with existing context
      const { data: existing } = await this.supabase
        .from('affiliate_commercial_sessions')
        .select('attribution_context')
        .eq('id', sessionId)
        .single();

      const mergedContext = {
        ...(existing?.attribution_context ?? {}),
        ...context,
      };

      const { error } = await this.supabase
        .from('affiliate_commercial_sessions')
        .update({ attribution_context: mergedContext })
        .eq('id', sessionId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update session with new input
   */
  async updateCommercialSession(
    sessionId: string,
    input: UpdateCommercialSessionInput
  ): Promise<CommercialResult<CommercialSession>> {
    try {
      const updateData: Record<string, unknown> = {};

      if (input.attributionContext) {
        const { data: existing } = await this.supabase
          .from('affiliate_commercial_sessions')
          .select('attribution_context')
          .eq('id', sessionId)
          .single();

        updateData.attribution_context = {
          ...(existing?.attribution_context ?? {}),
          ...input.attributionContext,
        };
      }

      const { data, error } = await this.supabase
        .from('affiliate_commercial_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToSession(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build commercial session context
   */
  buildCommercialSessionContext(session: CommercialSession): {
    sessionId: string;
    sessionKey: string;
    platform: string;
    entrySurface: {
      type: string | null;
      id: string | null;
    };
    attributionContext: Record<string, unknown>;
    isActive: boolean;
    duration: number;
  } {
    const now = new Date();
    const duration = now.getTime() - session.firstSeenAt.getTime();
    const isActive = duration < SESSION_THRESHOLDS.INACTIVITY_TIMEOUT_MS;

    return {
      sessionId: session.id,
      sessionKey: session.sessionKey,
      platform: session.platform,
      entrySurface: {
        type: session.entrySurfaceType,
        id: session.entrySurfaceId,
      },
      attributionContext: session.attributionContext,
      isActive,
      duration,
    };
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<CommercialSession | null> {
    const { data, error } = await this.supabase
      .from('affiliate_commercial_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbToSession(data);
  }

  /**
   * Get sessions by date range
   */
  async getSessionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<CommercialSession[]> {
    const { data, error } = await this.supabase
      .from('affiliate_commercial_sessions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({
        msg: 'Error fetching sessions by date range',
        error: error.message,
      });
      return [];
    }

    return (data ?? []).map(this.mapDbToSession);
  }

  /**
   * Map database record to CommercialSession
   */
  private mapDbToSession(data: Record<string, unknown>): CommercialSession {
    return {
      id: data.id as string,
      sessionKey: data.session_key as string,
      anonymousSubjectKey: data.anonymous_subject_key as string | null,
      platform: data.platform as CommercialSession['platform'],
      entrySurfaceType: data.entry_surface_type as GrowthSurfaceType | null,
      entrySurfaceId: data.entry_surface_id as string | null,
      attributionContext: data.attribution_context as Record<string, unknown> ?? {},
      firstSeenAt: new Date(data.first_seen_at as string),
      lastSeenAt: new Date(data.last_seen_at as string),
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================
// Factory Functions
// ============================================================

let sessionResolver: CommercialSessionResolver | null = null;

/**
 * Get singleton session resolver instance
 */
export function getCommercialSessionResolver(): CommercialSessionResolver {
  if (!sessionResolver) {
    sessionResolver = new CommercialSessionResolver();
  }
  return sessionResolver;
}

// ============================================================
// Direct Export Functions
// ============================================================

/**
 * Resolve commercial session (convenience function)
 */
export async function resolveCommercialSession(
  input: CreateCommercialSessionInput
): Promise<CommercialResult<CommercialSession>> {
  return getCommercialSessionResolver().resolveCommercialSession(input);
}

/**
 * Create commercial session (convenience function)
 */
export async function createCommercialSession(
  input: CreateCommercialSessionInput
): Promise<CommercialResult<CommercialSession>> {
  return getCommercialSessionResolver().createCommercialSession(input);
}

/**
 * Attach event to commercial session (convenience function)
 */
export async function attachEventToCommercialSession(
  sessionKey: string,
  eventData: {
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): Promise<CommercialResult<CommercialSession>> {
  return getCommercialSessionResolver().attachEventToCommercialSession(sessionKey, eventData);
}

/**
 * Update commercial session activity (convenience function)
 */
export async function updateCommercialSessionActivity(
  sessionId: string
): Promise<CommercialResult<void>> {
  return getCommercialSessionResolver().updateCommercialSessionActivity(sessionId);
}

/**
 * Build commercial session context (convenience function)
 */
export function buildCommercialSessionContext(
  session: CommercialSession
): ReturnType<CommercialSessionResolver['buildCommercialSessionContext']> {
  return getCommercialSessionResolver().buildCommercialSessionContext(session);
}

/**
 * Generate a new session key
 */
export function generateSessionKey(): string {
  return `cs_${uuidv4()}`;
}
