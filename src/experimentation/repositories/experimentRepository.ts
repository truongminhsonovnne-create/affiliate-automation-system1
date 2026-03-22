/**
 * Experiment Repository
 */

import { randomUUID } from 'crypto';
import { ExperimentDefinition, ExperimentStatus } from '../types/index.js';

const experiments = new Map<string, ExperimentDefinition>();

export async function createExperiment(exp: Omit<ExperimentDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExperimentDefinition> {
  const experiment: ExperimentDefinition = {
    ...exp,
    id: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  experiments.set(experiment.experimentKey, experiment);
  return experiment;
}

export async function getExperimentByKey(key: string): Promise<ExperimentDefinition | null> {
  return experiments.get(key) || null;
}

export async function getExperimentById(id: string): Promise<ExperimentDefinition | null> {
  for (const exp of experiments.values()) {
    if (exp.id === id) return exp;
  }
  return null;
}

export async function updateExperiment(id: string, updates: Partial<ExperimentDefinition>): Promise<ExperimentDefinition | null> {
  const exp = await getExperimentById(id);
  if (!exp) return null;

  const updated = { ...exp, ...updates, updatedAt: new Date() };
  experiments.set(exp.experimentKey, updated);
  return updated;
}

export async function getActiveExperiments(): Promise<ExperimentDefinition[]> {
  return Array.from(experiments.values()).filter(e => e.status === ExperimentStatus.RUNNING);
}

export async function deleteExperiment(key: string): Promise<boolean> {
  return experiments.delete(key);
}
