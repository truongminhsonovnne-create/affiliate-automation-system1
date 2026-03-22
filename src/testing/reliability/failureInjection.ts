/**
 * Failure Injection
 *
 * Provides failure injection capabilities for reliability testing.
 */

import type { FailureInjectionScenario } from '../types';

/**
 * Failure injection configuration
 */
export interface FailureInjectionConfig {
  enabled: boolean;
  scenarios: FailureInjectionScenario[];
  globalRate?: number;
}

/**
 * Failure types
 */
export type FailureType = 'transient' | 'timeout' | 'invalid-payload' | 'dependency-unavailable';

/**
 * Target services
 */
export type FailureTarget = 'repository' | 'ai' | 'publishing' | 'crawler';

/**
 * Create failure injection scenario
 */
export function createFailureScenario(
  id: string,
  name: string,
  type: FailureType,
  target: FailureTarget
): FailureInjectionScenario {
  return {
    id,
    name,
    type,
    target,
    injected: false,
    expectedBehavior: getExpectedBehavior(type, target),
  };
}

/**
 * Get expected behavior description
 */
function getExpectedBehavior(type: FailureType, target: FailureTarget): string {
  const behaviors: Record<FailureType, Record<FailureTarget, string>> = {
    transient: {
      repository: 'Should retry and eventually succeed',
      ai: 'Should retry with exponential backoff',
      publishing: 'Should retry publishing',
      crawler: 'Should retry extraction',
    },
    timeout: {
      repository: 'Should fail after timeout threshold',
      ai: 'Should fail with timeout error',
      publishing: 'Should fail with timeout error',
      crawler: 'Should fail with timeout error',
    },
    'invalid-payload': {
      repository: 'Should reject with validation error',
      ai: 'Should return error response',
      publishing: 'Should fail validation',
      crawler: 'Should skip invalid items',
    },
    'dependency-unavailable': {
      repository: 'Should fail with connection error',
      ai: 'Should fail with service unavailable',
      publishing: 'Should queue for retry',
      crawler: 'Should fail with connection error',
    },
  };
  return behaviors[type]?.[target] ?? 'Unknown behavior';
}

/**
 * Predefined failure injection scenarios
 */
export const failureScenarios: FailureInjectionScenario[] = [
  createFailureScenario('transient-repo-1', 'Transient Database Error', 'transient', 'repository'),
  createFailureScenario('timeout-repo-1', 'Database Timeout', 'timeout', 'repository'),
  createFailureScenario('invalid-repo-1', 'Invalid Repository Payload', 'invalid-payload', 'repository'),
  createFailureScenario('unavailable-repo-1', 'Database Unavailable', 'dependency-unavailable', 'repository'),

  createFailureScenario('transient-ai-1', 'Transient AI Error', 'transient', 'ai'),
  createFailureScenario('timeout-ai-1', 'AI Timeout', 'timeout', 'ai'),
  createFailureScenario('invalid-ai-1', 'Invalid AI Request', 'invalid-payload', 'ai'),
  createFailureScenario('unavailable-ai-1', 'AI Service Unavailable', 'dependency-unavailable', 'ai'),

  createFailureScenario('transient-pub-1', 'Transient Publishing Error', 'transient', 'publishing'),
  createFailureScenario('timeout-pub-1', 'Publishing Timeout', 'timeout', 'publishing'),
  createFailureScenario('invalid-pub-1', 'Invalid Publish Payload', 'invalid-payload', 'publishing'),
  createFailureScenario('unavailable-pub-1', 'Platform API Unavailable', 'dependency-unavailable', 'publishing'),

  createFailureScenario('transient-crawl-1', 'Transient Crawler Error', 'transient', 'crawler'),
  createFailureScenario('timeout-crawl-1', 'Crawler Timeout', 'timeout', 'crawler'),
  createFailureScenario('invalid-crawl-1', 'Invalid Crawl Response', 'invalid-payload', 'crawler'),
  createFailureScenario('unavailable-crawl-1', 'Target Site Unavailable', 'dependency-unavailable', 'crawler'),
];

/**
 * Failure injection manager
 */
export class FailureInjectionManager {
  private scenarios: Map<string, FailureInjectionScenario> = new Map();
  private activeInjections: Set<string> = new Set();
  private globalRate: number = 0.1;

  constructor(config?: Partial<FailureInjectionConfig>) {
    if (config?.scenarios) {
      config.scenarios.forEach((s) => this.scenarios.set(s.id, s));
    } else {
      failureScenarios.forEach((s) => this.scenarios.set(s.id, s));
    }

    if (config?.globalRate !== undefined) {
      this.globalRate = config.globalRate;
    }
  }

  /**
   * Enable failure injection
   */
  enable(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      console.warn(`Scenario not found: ${scenarioId}`);
      return false;
    }

    scenario.injected = true;
    this.activeInjections.add(scenarioId);
    console.log(`Failure injection enabled: ${scenario.name}`);
    return true;
  }

  /**
   * Disable failure injection
   */
  disable(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      return false;
    }

    scenario.injected = false;
    this.activeInjections.delete(scenarioId);
    console.log(`Failure injection disabled: ${scenario.name}`);
    return true;
  }

  /**
   * Disable all injections
   */
  disableAll(): void {
    this.activeInjections.forEach((id) => {
      const scenario = this.scenarios.get(id);
      if (scenario) {
        scenario.injected = false;
      }
    });
    this.activeInjections.clear();
    console.log('All failure injections disabled');
  }

  /**
   * Check if injection should trigger
   */
  shouldInject(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId);
    return scenario?.injected ?? false;
  }

  /**
   * Inject failure based on type
   */
  async inject<T>(scenarioId: string, operation: () => Promise<T>): Promise<T> {
    const scenario = this.scenarios.get(scenarioId);

    if (!scenario || !scenario.injected) {
      return operation();
    }

    // Apply failure based on type
    switch (scenario.type) {
      case 'transient':
        // 70% chance of failure
        if (Math.random() < 0.7) {
          throw new Error(`[Injected] Transient failure: ${scenario.name}`);
        }
        break;

      case 'timeout':
        await new Promise((resolve) => setTimeout(resolve, 30000));
        throw new Error(`[Injected] Timeout: ${scenario.name}`);

      case 'invalid-payload':
        throw new Error(`[Injected] Invalid payload: ${scenario.name}`);

      case 'dependency-unavailable':
        throw new Error(`[Injected] Service unavailable: ${scenario.name}`);
    }

    return operation();
  }

  /**
   * Get active scenarios
   */
  getActiveScenarios(): FailureInjectionScenario[] {
    return Array.from(this.scenarios.values()).filter((s) => s.injected);
  }

  /**
   * Get all scenarios
   */
  getAllScenarios(): FailureInjectionScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Set global injection rate
   */
  setGlobalRate(rate: number): void {
    this.globalRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Get configuration
   */
  getConfig(): FailureInjectionConfig {
    return {
      enabled: this.activeInjections.size > 0,
      scenarios: this.getAllScenarios(),
      globalRate: this.globalRate,
    };
  }
}

/**
 * Create failure injection manager
 */
export function createFailureInjectionManager(
  config?: Partial<FailureInjectionConfig>
): FailureInjectionManager {
  return new FailureInjectionManager(config);
}

/**
 * Inject mock failure for testing
 */
export function injectMockFailure(type: FailureType, target: FailureTarget): Error {
  const scenario = failureScenarios.find(
    (s) => s.type === type && s.target === target
  );

  if (scenario) {
    return new Error(`[Injected] ${scenario.name}: ${scenario.expectedBehavior}`);
  }

  return new Error(`[Injected] Unknown failure: ${type} on ${target}`);
}
