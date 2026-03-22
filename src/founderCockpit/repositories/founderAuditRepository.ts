/**
 * Founder Audit Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';

export class FounderAuditRepository {
  async log(action: string, entityType: string, entityId: string, state?: Record<string, unknown>) {
    const supabase = getSupabaseClient();
    await supabase.from('founder_review_audits').insert({
      audit_action: action,
      entity_type: entityType,
      entity_id: entityId,
      new_state: state,
    });
  }
}

let repo: FounderAuditRepository | null = null;
export function getFounderAuditRepository(): FounderAuditRepository {
  if (!repo) repo = new FounderAuditRepository();
  return repo;
}
