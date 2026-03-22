/**
 * Tracing
 *
 * Distributed tracing for Growth Engine operations.
 */

import { monitoring } from '../integrations/monitoringIntegration';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface SpanOptions {
  name: string;
  type: 'internal' | 'external' | 'database';
  tags?: Record<string, string>;
}

/**
 * Create a trace context
 */
export function createTraceContext(): TraceContext {
  return {
    traceId: crypto.randomUUID(),
    spanId: crypto.randomUUID(),
  };
}

/**
 * Execute operation within a span
 */
export async function withSpan<T>(
  options: SpanOptions,
  operation: (span: Span) => Promise<T>
): Promise<T> {
  const span = monitoring.startSpan(options.name);

  if (options.tags) {
    for (const [key, value] of Object.entries(options.tags)) {
      span.setTag(key, value);
    }
  }

  try {
    const result = await operation(span);
    span.setTag('result', 'success');
    return result;
  } catch (error) {
    span.setTag('result', 'error');
    span.setTag('error', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace surface generation
 */
export async function traceSurfaceGeneration<T>(
  surfaceId: string,
  operation: () => Promise<T>
): Promise<T> {
  return withSpan(
    {
      name: 'surface.generation',
      type: 'internal',
      tags: { surfaceId },
    },
    operation
  );
}

/**
 * Trace governance check
 */
export async function traceGovernanceCheck<T>(
  surfaceId: string,
  operation: () => Promise<T>
): Promise<T> {
  return withSpan(
    {
      name: 'governance.check',
      type: 'internal',
      tags: { surfaceId },
    },
    operation
  );
}

/**
 * Trace quality evaluation
 */
export async function traceQualityEvaluation<T>(
  surfaceId: string,
  operation: () => Promise<T>
): Promise<T> {
  return withSpan(
    {
      name: 'quality.evaluation',
      type: 'internal',
      tags: { surfaceId },
    },
    operation
  );
}

/**
 * Trace batch operation
 */
export async function traceBatchOperation<T>(
  operationName: string,
  itemCount: number,
  operation: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    {
      name: operationName,
      type: 'internal',
      tags: { itemCount: itemCount.toString() },
    },
    operation
  );
}

/**
 * Add trace context to request
 */
export function extractTraceContext(req: Request): TraceContext | null {
  const traceId = req.headers['x-trace-id'] as string | undefined;
  const spanId = req.headers['x-span-id'] as string | undefined;
  const parentSpanId = req.headers['x-parent-span-id'] as string | undefined;

  if (!traceId || !spanId) {
    return null;
  }

  return {
    traceId,
    spanId,
    parentSpanId,
  };
}
