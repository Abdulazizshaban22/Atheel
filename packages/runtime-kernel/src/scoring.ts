import type { RuntimePriority } from './types';

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function priorityWeight(priority: RuntimePriority): number {
  switch (priority) {
    case 'urgent': return 1;
    case 'high': return 0.75;
    case 'normal': return 0.45;
    default: return 0.2;
  }
}

export function computeQueueScore(input: {
  priority: RuntimePriority;
  complexity?: 'starter' | 'standard' | 'advanced';
  minutesToDue?: number;
  backlogDepth?: number;
  strategicValue?: number;
}) {
  const p = priorityWeight(input.priority);
  const complexityPenalty = input.complexity === 'advanced' ? 0.18 : input.complexity === 'standard' ? 0.1 : 0.04;
  const dueBoost = input.minutesToDue == null ? 0.18 : clamp((1440 - input.minutesToDue) / 1440, 0, 1) * 0.55;
  const backlogPenalty = clamp((input.backlogDepth ?? 0) / 100, 0, 1) * 0.12;
  const strategicBoost = clamp((input.strategicValue ?? 50) / 100, 0, 1) * 0.25;
  const score = clamp(p + dueBoost + strategicBoost - complexityPenalty - backlogPenalty, 0, 1);
  return Number(score.toFixed(4));
}

export function estimateExecutionCostUsd(input: {
  aiCalls: number;
  modelClass: 'fast' | 'balanced' | 'reasoning';
  avgPromptTokens?: number;
  avgCompletionTokens?: number;
}) {
  const prompt = Math.max(200, input.avgPromptTokens ?? 700);
  const completion = Math.max(100, input.avgCompletionTokens ?? 400);
  const per1k = input.modelClass === 'reasoning' ? { in: 0.01, out: 0.03 } : input.modelClass === 'balanced' ? { in: 0.004, out: 0.012 } : { in: 0.0015, out: 0.004 };
  const oneCall = (prompt / 1000) * per1k.in + (completion / 1000) * per1k.out;
  return Number((oneCall * Math.max(0, input.aiCalls)).toFixed(4));
}

export function estimateLatencyMs(input: { stepCount: number; aiCalls: number; modelClass: 'fast' | 'balanced' | 'reasoning' }) {
  const base = input.stepCount * 220;
  const aiPerCall = input.modelClass === 'reasoning' ? 2200 : input.modelClass === 'balanced' ? 1200 : 700;
  return Math.round(base + input.aiCalls * aiPerCall);
}

export function computeProgressPercent(done: number, total: number) {
  if (!total) return 0;
  return Math.round(clamp(done / total, 0, 1) * 100);
}
