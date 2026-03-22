/**
 * Runtime Layer - Worker Runtime
 * Worker process abstraction
 */

import type { RuntimeRole, WorkerConfig } from '../types';
import { getCurrentRuntimeConfig } from '../config/runtimeConfig';
import { getProcessIdentity } from '../bootstrap/bootstrapRuntime';
import { registerShutdownCallback, getIsShuttingDown } from '../shutdown/gracefulShutdown';

// =============================================================================
// WORKER TYPES
// =============================================================================

/** Worker job handler */
export type WorkerJobHandler<T = unknown> = (job: T) => Promise<void>;

/** Worker loop state */
export interface WorkerLoopState {
  running: boolean;
  processing: boolean;
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  lastJobAt?: Date;
  lastError?: Error;
}

/** Worker instance */
export interface WorkerInstance {
  role: Exclude<RuntimeRole, 'web' | 'control-plane'>;
  config: WorkerConfig;
  state: WorkerLoopState;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

// =============================================================================
// ABSTRACT WORKER
// =============================================================================

/**
 * Abstract worker implementation
 */
export abstract class AbstractWorker implements WorkerInstance {
  public role: Exclude<RuntimeRole, 'web' | 'control-plane'>;
  public config: WorkerConfig;
  public state: WorkerLoopState;

  private loopInterval?: ReturnType<typeof setInterval>;

  constructor(role: Exclude<RuntimeRole, 'web' | 'control-plane'>, config?: Partial<WorkerConfig>) {
    this.role = role;
    this.config = {
      role,
      concurrency: config?.concurrency ?? 1,
      pollInterval: config?.pollInterval ?? 5000,
      heartbeatInterval: config?.heartbeatInterval ?? 30000,
      shutdownTimeout: config?.shutdownTimeout ?? 30000,
    };

    this.state = {
      running: false,
      processing: false,
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
    };
  }

  /**
   * Poll for jobs - implement in subclass
   */
  abstract pollJobs(): Promise<unknown[]>;

  /**
   * Process a job - implement in subclass
   */
  abstract processJob(job: unknown): Promise<void>;

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.state.running) {
      return;
    }

    const identity = getProcessIdentity();
    console.log(`[Worker:${this.role}] Starting worker`, {
      instanceId: identity?.instanceId,
      concurrency: this.config.concurrency,
    });

    this.state.running = true;

    // Register shutdown callback
    registerShutdownCallback(async () => {
      await this.stop();
    });

    // Start poll loop
    this.loopInterval = setInterval(async () => {
      if (!this.state.running || this.state.processing) {
        return;
      }

      await this.processLoop();
    }, this.config.pollInterval);

    // Process immediately
    await this.processLoop();
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.state.running) {
      return;
    }

    const identity = getProcessIdentity();
    console.log(`[Worker:${this.role}] Stopping worker`, {
      instanceId: identity?.instanceId,
      jobsProcessed: this.state.jobsProcessed,
    });

    this.state.running = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = undefined;
    }

    // Wait for current job to finish
    if (this.state.processing) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  /**
   * Process job loop
   */
  private async processLoop(): Promise<void> {
    if (getIsShuttingDown() || !this.state.running) {
      return;
    }

    try {
      const jobs = await this.pollJobs();

      for (const job of jobs) {
        if (!this.state.running || getIsShuttingDown()) {
          break;
        }

        this.state.processing = true;

        try {
          await this.processJob(job);
          this.state.jobsSucceeded++;
        } catch (error) {
          this.state.jobsFailed++;
          this.state.lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`[Worker:${this.role}] Job failed`, { error: this.state.lastError.message });
        }

        this.state.jobsProcessed++;
        this.state.lastJobAt = new Date();
        this.state.processing = false;
      }
    } catch (error) {
      console.error(`[Worker:${this.role}] Poll error`, { error });
    }
  }

  /**
   * Get worker status
   */
  getStatus(): WorkerLoopState & { role: RuntimeRole } {
    return {
      ...this.state,
      role: this.role,
    };
  }
}

// =============================================================================
// CONCRETE WORKERS
// =============================================================================

/**
 * Crawler worker
 */
export class CrawlerWorker extends AbstractWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super('worker-crawler', config);
  }

  async pollJobs(): Promise<unknown[]> {
    // Placeholder - implement actual queue polling
    return [];
  }

  async processJob(job: unknown): Promise<void> {
    console.log('[CrawlerWorker] Processing job', { job });
    // Implement actual crawling logic
  }
}

/**
 * AI worker
 */
export class AiWorker extends AbstractWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super('worker-ai', config);
  }

  async pollJobs(): Promise<unknown[]> {
    // Placeholder - implement actual queue polling
    return [];
  }

  async processJob(job: unknown): Promise<void> {
    console.log('[AiWorker] Processing job', { job });
    // Implement actual AI enrichment logic
  }
}

/**
 * Publisher worker
 */
export class PublisherWorker extends AbstractWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super('worker-publisher', config);
  }

  async pollJobs(): Promise<unknown[]> {
    // Placeholder - implement actual queue polling
    return [];
  }

  async processJob(job: unknown): Promise<void> {
    console.log('[PublisherWorker] Processing job', { job });
    // Implement actual publishing logic
  }
}

/**
 * Ops runner worker
 */
export class OpsRunnerWorker extends AbstractWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super('ops-runner', config);
  }

  async pollJobs(): Promise<unknown[]> {
    // Placeholder - implement actual cron job polling
    return [];
  }

  async processJob(job: unknown): Promise<void> {
    console.log('[OpsRunnerWorker] Processing job', { job });
    // Implement actual ops logic
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create worker by role
 */
export function createWorker(
  role: Exclude<RuntimeRole, 'web' | 'control-plane'>,
  config?: Partial<WorkerConfig>
): WorkerInstance {
  switch (role) {
    case 'worker-crawler':
      return new CrawlerWorker(config);
    case 'worker-ai':
      return new AiWorker(config);
    case 'worker-publisher':
      return new PublisherWorker(config);
    case 'ops-runner':
      return new OpsRunnerWorker(config);
    default:
      throw new Error(`Unknown worker role: ${role}`);
  }
}

// =============================================================================
// START FUNCTIONS
// =============================================================================

/**
 * Start crawler worker
 */
export async function startCrawlerWorker(config?: Partial<WorkerConfig>): Promise<WorkerInstance> {
  const worker = createWorker('worker-crawler', config);
  await worker.start();
  return worker;
}

/**
 * Start AI worker
 */
export async function startAiWorker(config?: Partial<WorkerConfig>): Promise<WorkerInstance> {
  const worker = createWorker('worker-ai', config);
  await worker.start();
  return worker;
}

/**
 * Start publisher worker
 */
export async function startPublisherWorker(config?: Partial<WorkerConfig>): Promise<WorkerInstance> {
  const worker = createWorker('worker-publisher', config);
  await worker.start();
  return worker;
}

/**
 * Start ops runner
 */
export async function startOpsRunner(config?: Partial<WorkerConfig>): Promise<WorkerInstance> {
  const worker = createWorker('ops-runner', config);
  await worker.start();
  return worker;
}
