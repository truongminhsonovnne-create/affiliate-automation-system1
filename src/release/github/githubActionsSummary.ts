/**
 * GitHub Actions Summary Module
 *
 * Generates beautiful summaries for GitHub Actions workflows.
 */

/**
 * Write workflow summary
 */
export function writeWorkflowSummary(
  title: string,
  sections: WorkflowSummarySection[],
  options?: {
    emoji?: boolean;
  }
): string {
  const lines: string[] = [];

  lines.push(`## ${title}`);
  lines.push('');

  for (const section of sections) {
    if (section.type === 'table') {
      lines.push(`### ${section.title}`);
      lines.push('');
      lines.push('| ' + section.headers.join(' | ') + ' |');
      lines.push('| ' + section.headers.map(() => '---').join(' | ') + ' |');

      for (const row of section.rows) {
        lines.push('| ' + row.join(' | ') + ' |');
      }
    } else if (section.type === 'list') {
      lines.push(`### ${section.title}`);
      lines.push('');
      for (const item of section.items) {
        lines.push(`- ${item}`);
      }
    } else if (section.type === 'code') {
      lines.push(`### ${section.title}`);
      lines.push('');
      lines.push('```' + (section.language || ''));
      lines.push(section.content);
      lines.push('```');
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Append quality gate summary to workflow
 */
export function appendQualityGateSummary(
  summary: {
    passed: number;
    failed: number;
    results: Array<{ gate: string; passed: boolean; error?: string }>;
  },
  options?: { emoji?: boolean }
): string {
  const emoji = options?.emoji ?? true;

  const sections: WorkflowSummarySection[] = [
    {
      type: 'table',
      title: 'Quality Gates',
      headers: ['Gate', 'Status', 'Details'],
      rows: summary.results.map((r) => [
        r.gate,
        r.passed ? (emoji ? '✅' : 'PASS') : (emoji ? '❌' : 'FAIL'),
        r.error || '-',
      ]),
    },
  ];

  const status = summary.failed === 0
    ? (emoji ? '### ✅ All Quality Gates Passed' : '### All Quality Gates Passed')
    : (emoji ? `### ❌ ${summary.failed} Gate(s) Failed` : `### ${summary.failed} Gate(s) Failed`);

  return `${status}\n\n${writeWorkflowSummary('Quality Gate Summary', sections)}`;
}

/**
 * Append migration summary to workflow
 */
export function appendMigrationSummary(
  summary: {
    totalMigrations: number;
    passed: number;
    failed: number;
    risk: 'low' | 'medium' | 'high' | 'critical';
    results: Array<{ migration: string; risk: string; passed: boolean; dangerousOps: string[] }>;
  },
  options?: { emoji?: boolean }
): string {
  const emoji = options?.emoji ?? true;

  const riskEmoji: Record<string, string> = {
    low: emoji ? '🟢' : 'LOW',
    medium: emoji ? '🟡' : 'MEDIUM',
    high: emoji ? '🟠' : 'HIGH',
    critical: emoji ? '🔴' : 'CRITICAL',
  };

  const sections: WorkflowSummarySection[] = [
    {
      type: 'table',
      title: 'Migration Gates',
      headers: ['Migration', 'Risk', 'Status', 'Dangerous Ops'],
      rows: summary.results.map((r) => [
        r.migration,
        riskEmoji[r.risk],
        r.passed ? (emoji ? '✅' : 'PASS') : (emoji ? '❌' : 'FAIL'),
        r.dangerousOps.length > 0 ? r.dangerousOps.join(', ') : '-',
      ]),
    },
  ];

  return writeWorkflowSummary('Migration Summary', sections);
}

/**
 * Append release verification summary
 */
export function appendReleaseVerificationSummary(
  summary: {
    passed: number;
    failed: number;
    checks: Array<{ check: string; passed: boolean; error?: string }>;
  },
  options?: { emoji?: boolean }
): string {
  const emoji = options?.emoji ?? true;

  const sections: WorkflowSummarySection[] = [
    {
      type: 'table',
      title: 'Verification Checks',
      headers: ['Check', 'Status', 'Details'],
      rows: summary.checks.map((c) => [
        c.check,
        c.passed ? (emoji ? '✅' : 'PASS') : (emoji ? '❌' : 'FAIL'),
        c.error || '-',
      ]),
    },
  ];

  const status = summary.failed === 0
    ? (emoji ? '### ✅ All Verification Checks Passed' : '### All Verification Checks Passed')
    : (emoji ? `### ❌ ${summary.failed} Check(s) Failed` : `### ${summary.failed} Check(s) Failed`);

  return `${status}\n\n${writeWorkflowSummary('Release Verification Summary', sections)}`;
}

/**
 * Types for workflow summary sections
 */
interface WorkflowSummarySection {
  type: 'table' | 'list' | 'code';
  title: string;
  headers?: string[];
  rows?: string[][];
  items?: string[];
  content?: string;
  language?: string;
}

/**
 * Create a table section
 */
export function createTableSection(
  title: string,
  headers: string[],
  rows: string[][]
): WorkflowSummarySection {
  return { type: 'table', title, headers, rows };
}

/**
 * Create a list section
 */
export function createListSection(title: string, items: string[]): WorkflowSummarySection {
  return { type: 'list', title, items };
}

/**
 * Create a code section
 */
export function createCodeSection(
  title: string,
  content: string,
  language = ''
): WorkflowSummarySection {
  return { type: 'code', title, content, language };
}

/**
 * Generate deployment summary
 */
export function generateDeploymentSummary(params: {
  environment: string;
  version: string;
  commitSha: string;
  triggeredBy: string;
  status: 'success' | 'failure';
  duration?: number;
}): string {
  const { environment, version, commitSha, triggeredBy, status, duration } = params;

  const emoji = true;
  const statusText = status === 'success'
    ? (emoji ? '✅ Deployment Successful' : 'Deployment Successful')
    : (emoji ? '❌ Deployment Failed' : 'Deployment Failed');

  const sections: WorkflowSummarySection[] = [
    {
      type: 'table',
      title: 'Deployment Details',
      headers: ['Property', 'Value'],
      rows: [
        ['Environment', environment],
        ['Version', version],
        ['Commit', commitSha],
        ['Triggered by', triggeredBy],
        ...(duration ? [['Duration', `${duration}s`]] : []),
      ],
    },
  ];

  return `${statusText}\n\n${writeWorkflowSummary('Deployment Summary', sections)}`;
}
