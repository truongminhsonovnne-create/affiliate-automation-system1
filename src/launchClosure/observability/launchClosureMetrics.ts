/**
 * Launch Closure Metrics
 */

const metrics = {
  reviewCreated: 0,
  reviewCompleted: 0,
  reviewFinalized: 0,
  checklistCompleted: 0,
  riskRegistered: 0,
  riskResolved: 0,
  signoffCompleted: 0,
  goDecision: 0,
  noGoDecision: 0,
  watchPlanCreated: 0,
};

export function incrementMetric(name: keyof typeof metrics, value = 1) {
  if (name in metrics) metrics[name] += value;
}

export function getMetric(name: keyof typeof metrics) {
  return metrics[name];
}

export function getAllMetrics() {
  return { ...metrics };
}

export function resetMetrics() {
  Object.keys(metrics).forEach((k) => { metrics[k as keyof typeof metrics] = 0; });
}
