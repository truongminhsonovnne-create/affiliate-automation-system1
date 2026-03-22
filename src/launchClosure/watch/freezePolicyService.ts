/**
 * Freeze Policy Service
 * Manages launch freeze policies
 */

import { FREEZE_POLICY_RULES, DEFAULT_FREEZE_WINDOW_HOURS } from '../constants.js';

export interface FreezePolicy {
  isActive: boolean;
  freezeStartTime?: Date;
  freezeEndTime?: Date;
  rules: typeof FREEZE_POLICY_RULES;
}

export interface FreezeDecision {
  isChangeAllowed: boolean;
  changeType: string;
  requiresApproval: boolean;
  approvalLevel?: string;
  rationale: string;
}

/**
 * Build launch freeze policy
 */
export function buildLaunchFreezePolicy(
  launchTime: Date,
  freezeWindowHours: number = DEFAULT_FREEZE_WINDOW_HOURS
): FreezePolicy {
  const freezeStartTime = new Date(launchTime.getTime() - freezeWindowHours * 60 * 60 * 1000);
  const freezeEndTime = new Date(launchTime.getTime() + freezeWindowHours * 60 * 60 * 1000);
  const now = new Date();

  const isActive = now >= freezeStartTime && now <= freezeEndTime;

  return {
    isActive,
    freezeStartTime,
    freezeEndTime,
    rules: FREEZE_POLICY_RULES,
  };
}

/**
 * Check if change is allowed during launch window
 */
export function isChangeAllowedDuringLaunchWindow(
  changeType: string,
  freezePolicy: FreezePolicy
): FreezeDecision {
  if (!freezePolicy.isActive) {
    return {
      isChangeAllowed: true,
      changeType,
      requiresApproval: false,
      rationale: 'Not in freeze window',
    };
  }

  const allowedTypes = ['emergency_fix', 'security_patch'];
  const isEmergency = allowedTypes.includes(changeType);

  if (isEmergency) {
    return {
      isChangeAllowed: true,
      changeType,
      requiresApproval: true,
      approvalLevel: freezePolicy.rules.bypass_approval_level,
      rationale: 'Emergency change requires director approval',
    };
  }

  return {
    isChangeAllowed: false,
    changeType,
    requiresApproval: false,
    rationale: `Change type '${changeType}' is blocked during freeze window`,
  };
}

/**
 * Build freeze decision summary
 */
export function buildFreezeDecisionSummary(
  freezePolicy: FreezePolicy
): string {
  if (!freezePolicy.isActive) {
    return '✅ No freeze active. All changes allowed.';
  }

  let summary = '🔒 FREEZE ACTIVE\n';
  summary += `Window: ${freezePolicy.freezeStartTime?.toISOString()} to ${freezePolicy.freezeEndTime?.toISOString()}\n`;
  summary += '\nBlocked changes:\n';
  summary += `- Production deployments: ${freezePolicy.rules.production_deployments_blocked ? '❌' : '✅'}\n`;
  summary += `- Configuration changes: ${freezePolicy.rules.configuration_changes_blocked ? '❌' : '✅'}\n`;
  summary += `- Database migrations: ${freezePolicy.rules.database_migrations_blocked ? '❌' : '✅'}\n`;
  summary += `- Feature flags: ${freezePolicy.rules.feature_flags_blocked ? '❌' : '✅'}\n`;
  summary += `\nEmergency bypass requires: ${freezePolicy.rules.bypass_approval_level} approval\n`;

  return summary;
}
