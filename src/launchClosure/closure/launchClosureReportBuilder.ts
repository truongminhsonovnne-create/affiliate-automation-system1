/**
 * Launch Closure Report Builder
 * Builds final launch closure artifacts
 */

import type {
  LaunchClosureReport,
  LaunchGoNoGoDecision,
  ChecklistCompletionSummary,
  RiskSummary,
  SignoffSummary,
  LaunchWatchPlan,
  ClosureArtifact,
} from '../types.js';

export interface ClosureReportBuildInput {
  launchKey: string;
  goNoGoDecision: LaunchGoNoGoDecision;
  checklistSummary: ChecklistCompletionSummary;
  riskSummary: RiskSummary;
  signoffSummary: SignoffSummary;
  watchPlan?: LaunchWatchPlan;
}

/**
 * Build launch closure report
 */
export async function buildLaunchClosureReport(
  input: ClosureReportBuildInput
): Promise<LaunchClosureReport> {
  const {
    launchKey,
    goNoGoDecision,
    checklistSummary,
    riskSummary,
    signoffSummary,
    watchPlan,
  } = input;

  const closureArtifacts = buildClosureArtifacts(
    checklistSummary,
    riskSummary,
    signoffSummary,
    goNoGoDecision
  );

  return {
    reportId: generateReportId(),
    launchKey,
    generatedAt: new Date(),
    readinessStatus: goNoGoDecision.readinessStatus,
    readinessScore: goNoGoDecision.readinessScore,
    goNoGoDecision,
    checklistCompletion: checklistSummary,
    riskSummary,
    signoffSummary,
    watchPlan,
    closureArtifacts,
  };
}

/**
 * Build launch command summary
 */
export function buildLaunchCommandSummary(report: LaunchClosureReport): string {
  const { launchKey, goNoGoDecision, readinessScore } = report;

  let summary = '═══════════════════════════════════════\n';
  summary += `       LAUNCH COMMAND SUMMARY\n`;
  summary += `═══════════════════════════════════════\n\n`;
  summary += `Launch Key: ${launchKey}\n`;
  summary += `Generated: ${report.generatedAt.toISOString()}\n`;
  summary += `Readiness Score: ${Math.round(readinessScore * 100)}%\n\n`;

  summary += `═══════════════════════════════════════\n`;
  summary += `DECISION: ${goNoGoDecision.decision.toUpperCase()}\n`;
  summary += `═══════════════════════════════════════\n\n`;

  summary += `Status: ${goNoGoDecision.readinessStatus}\n`;
  summary += `Blockers: ${goNoGoDecision.blockerCount}\n`;
  summary += `Warnings: ${goNoGoDecision.warningCount}\n\n`;

  summary += `Rationale:\n${goNoGoDecision.rationale}\n`;

  return summary;
}

/**
 * Build launch risk register report
 */
export function buildLaunchRiskRegisterReport(
  riskSummary: RiskSummary,
  blockers: Array<{ riskId: string; description: string; severity: string }>
): string {
  let report = '═══════════════════════════════════════\n';
  report += `       LAUNCH RISK REGISTER\n`;
  report += `═══════════════════════════════════════\n\n`;

  report += `Total Risks: ${riskSummary.totalRisks}\n`;
  report += `Critical: ${riskSummary.criticalRisks}\n`;
  report += `High: ${riskSummary.highRisks}\n`;
  report += `Medium: ${riskSummary.mediumRisks}\n`;
  report += `Low: ${riskSummary.lowRisks}\n\n`;

  if (blockers.length > 0) {
    report += `═══════════════════════════════════════\n`;
    report += `🚫 BLOCKERS (Must Fix Before Launch)\n`;
    report += `═══════════════════════════════════════\n\n`;

    for (const blocker of blockers) {
      report += `[${blocker.severity.toUpperCase()}] ${blocker.description}\n`;
    }
  }

  return report;
}

/**
 * Build launch readiness pack
 */
export function buildLaunchReadinessPack(report: LaunchClosureReport): string {
  let pack = '═══════════════════════════════════════\n';
  pack += `       LAUNCH READINESS PACK\n`;
  pack += `═══════════════════════════════════════\n\n`;

  pack += buildLaunchCommandSummary(report);

  pack += '\n═══════════════════════════════════════\n';
  pack += `CHECKLIST SUMMARY\n`;
  pack += `═══════════════════════════════════════\n\n`;

  const checklist = report.checklistCompletion;
  pack += `Total Items: ${checklist.totalItems}\n`;
  pack += `Completed: ${checklist.completedItems}\n`;
  pack += `Failed: ${checklist.failedItems}\n`;
  pack += `Pending: ${checklist.pendingItems}\n`;
  pack += `Completion: ${checklist.completionPercentage.toFixed(1)}%\n`;

  pack += '\n═══════════════════════════════════════\n';
  pack += `RISK SUMMARY\n`;
  pack += `═══════════════════════════════════════\n\n`;

  const risks = report.riskSummary;
  pack += `Total Risks: ${risks.totalRisks}\n`;
  pack += `Open: ${risks.openRisks}\n`;
  pack += `Resolved: ${risks.resolvedRisks}\n`;

  pack += '\n═══════════════════════════════════════\n';
  pack += `SIGNOFF SUMMARY\n`;
  pack += `═══════════════════════════════════════\n\n`;

  const signoffs = report.signoffSummary;
  pack += `Required: ${signoffs.totalRequired}\n`;
  pack += `Approved: ${signoffs.totalApproved}\n`;
  pack += `Pending: ${signoffs.totalPending}\n`;

  if (signoffs.missingSignoffs.length > 0) {
    pack += `\nMissing: ${signoffs.missingSignoffs.join(', ')}\n`;
  }

  return pack;
}

// Helper functions

function buildClosureArtifacts(
  checklist: ChecklistCompletionSummary,
  risks: RiskSummary,
  signoffs: SignoffSummary,
  decision: LaunchGoNoGoDecision
): ClosureArtifact[] {
  const artifacts: ClosureArtifact[] = [
    {
      artifactType: 'checklist_summary',
      artifactKey: 'checklist',
      artifactPayload: checklist as Record<string, unknown>,
      createdAt: new Date(),
    },
    {
      artifactType: 'risk_summary',
      artifactKey: 'risks',
      artifactPayload: risks as Record<string, unknown>,
      createdAt: new Date(),
    },
    {
      artifactType: 'signoff_summary',
      artifactKey: 'signoffs',
      artifactPayload: signoffs as Record<string, unknown>,
      createdAt: new Date(),
    },
    {
      artifactType: 'go_no_go_decision',
      artifactKey: 'decision',
      artifactPayload: {
        decision: decision.decision,
        readinessStatus: decision.readinessStatus,
        readinessScore: decision.readinessScore,
        rationale: decision.rationale,
      },
      createdAt: new Date(),
    },
  ];

  return artifacts;
}

function generateReportId(): string {
  return `lcr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
