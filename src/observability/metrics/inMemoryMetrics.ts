/**
 * In-Memory Metrics
 *
 * Production-grade in-memory metrics collection with dimensional labels,
 * supporting counters, gauges, histograms, and timers.
 */

import {
  METRICS_FLUSH_INTERVAL_MS,
  METRICS_MAX_IN_MEMORY,
  METRICS_RETENTION_MS,
  DEFAULT_HISTOGRAM_BUCKETS,
} from '../constants.js';
import type { Metric, MetricLabels, MetricsSnapshot, HistogramSnapshot } from '../types.js';

/** Metric storage by name and labels */
interface MetricStore {
  counters: Map<string, CounterMetric>;
  gauges: Map<string, GaugeMetric>;
  histograms: Map<string, HistogramMetric>;
  timers: Map<string, HistogramMetric>;
}

/** Counter metric data */
interface CounterMetric {
  name: string;
  labels: MetricLabels;
  value: number;
  lastUpdated: string;
}

/** Gauge metric data */
interface GaugeMetric {
  name: string;
  labels: MetricLabels;
  value: number;
  lastUpdated: string;
}

/** Histogram metric data */
interface HistogramMetric {
  name: string;
  labels: MetricLabels;
  buckets: Map<number, number>;
  values: number[];
  sum: number;
  count: number;
  lastUpdated: string;
}

/** Create labels key for map storage */
function labelsToKey(labels: MetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return '';
  }
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
}

/** Global metric store */
const store: MetricStore = {
  counters: new Map(),
  gauges: new Map(),
  histograms: new Map(),
  timers: new Map(),
};

/** Flush callback */
let flushCallback: ((snapshot: MetricsSnapshot) => void) | null = null;

/** Last flush timestamp */
let lastFlushTime = Date.now();

// =============================================================================
// COUNTER OPERATIONS
// =============================================================================

/**
 * Increment a counter metric
 */
export function incrementCounter(
  name: string,
  labels: MetricLabels = {},
  value: number = 1
): void {
  const key = `${name}{${labelsToKey(labels)}}`;

  let metric = store.counters.get(key);
  if (!metric) {
    metric = {
      name,
      labels,
      value: 0,
      lastUpdated: new Date().toISOString(),
    };
    store.counters.set(key, metric);
  }

  metric.value += value;
  metric.lastUpdated = new Date().toISOString();
}

/**
 * Set counter value directly
 */
export function setCounter(
  name: string,
  labels: MetricLabels = {},
  value: number
): void {
  const key = `${name}{${labelsToKey(labels)}}`;

  store.counters.set(key, {
    name,
    labels,
    value,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Get counter value
 */
export function getCounter(name: string, labels: MetricLabels = {}): number {
  const key = `${name}{${labelsToKey(labels)}}`;
  const metric = store.counters.get(key);
  return metric?.value ?? 0;
}

// =============================================================================
// GAUGE OPERATIONS
// =============================================================================

/**
 * Set a gauge metric
 */
export function setGauge(
  name: string,
  labels: MetricLabels = {},
  value: number
): void {
  const key = `${name}{${labelsToKey(labels)}}`;

  store.gauges.set(key, {
    name,
    labels,
    value,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Increment a gauge metric
 */
export function incrementGauge(
  name: string,
  labels: MetricLabels = {},
  value: number = 1
): void {
  const key = `${name}{${labelsToKey(labels)}}`;

  let metric = store.gauges.get(key);
  if (!metric) {
    metric = {
      name,
      labels,
      value: 0,
      lastUpdated: new Date().toISOString(),
    };
    store.gauges.set(key, metric);
  }

  metric.value += value;
  metric.lastUpdated = new Date().toISOString();
}

/**
 * Decrement a gauge metric
 */
export function decrementGauge(
  name: string,
  labels: MetricLabels = {},
  value: number = 1
): void {
  incrementGauge(name, labels, -value);
}

/**
 * Get gauge value
 */
export function getGauge(name: string, labels: MetricLabels = {}): number {
  const key = `${name}{${labelsToKey(labels)}}`;
  const metric = store.gauges.get(key);
  return metric?.value ?? 0;
}

// =============================================================================
// HISTOGRAM OPERATIONS
// =============================================================================

/**
 * Observe a value in a histogram
 */
export function observeHistogram(
  name: string,
  labels: MetricLabels = {},
  value: number
): void {
  const key = `${name}{${labelsToKey(labels)}}`;

  let metric = store.histograms.get(key);
  if (!metric) {
    const buckets = new Map<number, number>();
    for (const bucket of DEFAULT_HISTOGRAM_BUCKETS) {
      buckets.set(bucket, 0);
    }

    metric = {
      name,
      labels,
      buckets,
      values: [],
      sum: 0,
      count: 0,
      lastUpdated: new Date().toISOString(),
    };
    store.histograms.set(key, metric);
  }

  // Update buckets
  for (const [bucket, count] of metric.buckets) {
    if (value <= bucket) {
      metric.buckets.set(bucket, count + 1);
    }
  }

  // Store value for percentile calculation
  metric.values.push(value);
  metric.sum += value;
  metric.count += 1;
  metric.lastUpdated = new Date().toISOString();

  // Trim values if too many
  if (metric.values.length > 10000) {
    metric.values = metric.values.slice(-5000);
  }
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;

  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Get histogram snapshot
 */
export function getHistogramSnapshot(metric: HistogramMetric): HistogramSnapshot {
  const sortedValues = [...metric.values].sort((a, b) => a - b);

  return {
    count: metric.count,
    sum: metric.sum,
    min: sortedValues[0] ?? 0,
    max: sortedValues[sortedValues.length - 1] ?? 0,
    p50: calculatePercentile(sortedValues, 50),
    p90: calculatePercentile(sortedValues, 90),
    p95: calculatePercentile(sortedValues, 95),
    p99: calculatePercentile(sortedValues, 99),
  };
}

// =============================================================================
// TIMER OPERATIONS
// =============================================================================

/** Active timers */
const activeTimers: Map<string, number> = new Map();

/**
 * Start a timer
 */
export function startTimer(name: string, labels: MetricLabels = {}): string {
  const key = `${name}{${labelsToKey(labels)}}`;
  const timerId = `${key}:${Date.now()}:${Math.random()}`;
  activeTimers.set(timerId, Date.now());
  return timerId;
}

/**
 * Stop a timer and record the duration
 */
export function stopTimer(timerId: string): number | null {
  const startTime = activeTimers.get(timerId);
  if (!startTime) {
    return null;
  }

  activeTimers.delete(timerId);

  // Extract name and labels from timerId
  const colonIndex = timerId.lastIndexOf(':');
  const key = timerId.substring(0, colonIndex);

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Parse key back to name and labels
  const braceIndex = key.indexOf('{');
  const name = braceIndex === -1 ? key : key.substring(0, braceIndex);
  const labelsStr = braceIndex === -1 ? '' : key.substring(braceIndex);
  const labels: MetricLabels = {};

  if (labelsStr) {
    const labelPairs = labelsStr.slice(1, -1).split(',');
    for (const pair of labelPairs) {
      const [k, v] = pair.split('=');
      if (k && v) {
        labels[k] = v.replace(/"/g, '');
      }
    }
  }

  // Record as histogram
  observeHistogram(name, labels, duration);

  return duration;
}

/**
 * Time a function execution (async)
 */
export async function timeAsync<T>(
  name: string,
  labels: MetricLabels,
  fn: () => Promise<T>
): Promise<T> {
  const timerId = startTimer(name, labels);
  try {
    return await fn();
  } finally {
    stopTimer(timerId);
  }
}

/**
 * Time a function execution (sync)
 */
export function time<T>(
  name: string,
  labels: MetricLabels,
  fn: () => T
): T {
  const timerId = startTimer(name, labels);
  try {
    return fn();
  } finally {
    stopTimer(timerId);
  }
}

// =============================================================================
// SNAPSHOT & FLUSH
// =============================================================================

/**
 * Take a metrics snapshot
 */
export function takeSnapshot(): MetricsSnapshot {
  const timestamp = new Date().toISOString();

  // Convert counters
  const counters: Record<string, number> = {};
  for (const [key, metric] of store.counters) {
    counters[key] = metric.value;
  }

  // Convert gauges
  const gauges: Record<string, number> = {};
  for (const [key, metric] of store.gauges) {
    gauges[key] = metric.value;
  }

  // Convert histograms
  const histograms: Record<string, HistogramSnapshot> = {};
  for (const [key, metric] of store.histograms) {
    histograms[key] = getHistogramSnapshot(metric);
  }

  // Timers are stored in histograms
  const timers: Record<string, HistogramSnapshot> = {};
  for (const [key, metric] of store.timers) {
    timers[key] = getHistogramSnapshot(metric);
  }

  return {
    timestamp,
    metrics: [],
    counters,
    gauges,
    histograms,
    timers,
  };
}

/**
 * Set flush callback
 */
export function onFlush(callback: (snapshot: MetricsSnapshot) => void): void {
  flushCallback = callback;
}

/**
 * Force flush metrics
 */
export function flush(): MetricsSnapshot {
  const snapshot = takeSnapshot();

  if (flushCallback) {
    flushCallback(snapshot);
  }

  lastFlushTime = Date.now();
  return snapshot;
}

/**
 * Reset all metrics
 */
export function reset(): void {
  store.counters.clear();
  store.gauges.clear();
  store.histograms.clear();
  store.timers.clear();
  activeTimers.clear();
}

/**
 * Check if flush is needed
 */
export function shouldFlush(): boolean {
  const now = Date.now();
  const timeSinceFlush = now - lastFlushTime;

  // Check time-based flush
  if (timeSinceFlush >= METRICS_FLUSH_INTERVAL_MS) {
    return true;
  }

  // Check count-based flush
  const totalMetrics =
    store.counters.size + store.gauges.size + store.histograms.size + store.timers.size;

  return totalMetrics >= METRICS_MAX_IN_MEMORY;
}

/**
 * Get current metrics count
 */
export function getMetricsCount(): number {
  return (
    store.counters.size +
    store.gauges.size +
    store.histograms.size +
    store.timers.size
  );
}

/**
 * Start automatic flush interval
 */
let flushInterval: NodeJS.Timeout | null = null;

export function startAutoFlush(): void {
  if (flushInterval) return;

  flushInterval = setInterval(() => {
    if (shouldFlush()) {
      flush();
    }
  }, METRICS_FLUSH_INTERVAL_MS);
}

export function stopAutoFlush(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}
