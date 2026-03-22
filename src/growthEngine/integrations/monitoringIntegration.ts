/**
 * Monitoring Integration
 *
 * Integration with monitoring and observability platforms.
 */

export interface MonitoringConfig {
  serviceName: string;
  environment: string;
  datadogApiKey?: string;
  sentryDsn?: string;
}

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Monitoring and observability integration
 */
export class MonitoringIntegration {
  private config: MonitoringConfig;
  private metricsBuffer: Metric[] = [];

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name: `${this.config.serviceName}.${name}`,
      value,
      tags: {
        environment: this.config.environment,
        ...tags,
      },
      timestamp: new Date(),
    };

    this.metricsBuffer.push(metric);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= 10) {
      this.flushMetrics();
    }
  }

  /**
   * Flush buffered metrics
   */
  async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // Would send to monitoring service in production
    console.log(`[Monitoring] Flushing ${metrics.length} metrics`, metrics);
  }

  /**
   * Log an event
   */
  log(level: LogEntry['level'], message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message: `[${this.config.serviceName}] ${message}`,
      context: {
        environment: this.config.environment,
        ...context,
      },
      timestamp: new Date(),
    };

    // Would send to logging service in production
    const logFn = console[level] || console.log;
    logFn(JSON.stringify(entry));
  }

  /**
   * Track Growth Engine specific metrics
   */
  trackSurfaceGeneration(success: boolean, duration: number): void {
    this.recordMetric('surface.generation.total', 1, { result: success ? 'success' : 'failure' });
    this.recordMetric('surface.generation.duration', duration, { result: success ? 'success' : 'failure' });
  }

  trackGovernanceCheck(surfaceId: string, passed: boolean): void {
    this.recordMetric('governance.check.total', 1, { result: passed ? 'passed' : 'failed' });
  }

  trackQualityEvaluation(surfaceId: string, score: number): void {
    this.recordMetric('quality.score', score);
  }

  trackScalingReadiness(ready: boolean, surfaceCount: number): void {
    this.recordMetric('scaling.readiness', ready ? 1 : 0, { count: surfaceCount.toString() });
  }

  /**
   * Create span for tracing
   */
  startSpan(name: string): Span {
    return new Span(name, this);
  }
}

/**
 * Tracing span
 */
export class Span {
  private name: string;
  private startTime: number;
  private endTime?: number;
  private tags: Record<string, string> = {};
  private monitoring: MonitoringIntegration;

  constructor(name: string, monitoring: MonitoringIntegration) {
    this.name = name;
    this.startTime = Date.now();
    this.monitoring = monitoring;
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  end(): void {
    this.endTime = Date.now();
    const duration = this.endTime - this.startTime;

    this.monitoring.recordMetric(`trace.${this.name}`, duration, this.tags);
  }
}

/**
 * Create monitoring integration instance
 */
export function createMonitoringIntegration(
  config?: Partial<MonitoringConfig>
): MonitoringIntegration {
  return new MonitoringIntegration({
    serviceName: config?.serviceName ?? 'growth-engine',
    environment: config?.environment ?? process.env.NODE_ENV ?? 'development',
    datadogApiKey: config?.datadogApiKey,
    sentryDsn: config?.sentryDsn,
  });
}

// Default instance
export const monitoring = createMonitoringIntegration();
