function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function sigmoid(x: number) {
  // numerically safe-ish
  const z = Math.max(-12, Math.min(12, x));
  return 1 / (1 + Math.exp(-z));
}

/**
 * Reliability score for Ops dashboards.
 * 0..100 (higher is better)
 *
 * Inputs are normalized rates (0..1) except avgMinutesOverdue.
 */
export function computeOpsReliabilityScore(input: {
  outboxSuccessRate: number; // 0..1
  overdueApprovalsRate: number; // 0..1
  avgMinutesOverdue: number; // 0..∞
  escalationsPerOpenApproval: number; // 0..∞ (rough noise indicator)
}): number {
  const outbox = clamp01(input.outboxSuccessRate);
  const overdue = clamp01(1 - clamp01(input.overdueApprovalsRate));

  // Convert minutes to penalty 0..1 with soft saturation (1h ~ noticeable)
  const timePenalty = clamp01(sigmoid((Number(input.avgMinutesOverdue || 0) - 60) / 30));
  const time = 1 - timePenalty;

  // Escalation noise: beyond 0.5 escalations per open approval in the window is penalized
  const noisePenalty = clamp01(sigmoid((Number(input.escalationsPerOpenApproval || 0) - 0.5) / 0.25));
  const noise = 1 - noisePenalty;

  // Weighted blend: delivery is king, then SLA, then timeliness, then noise
  const score01 = 0.45 * outbox + 0.25 * overdue + 0.20 * time + 0.10 * noise;
  return Math.round(score01 * 100);
}

export function computePolicyComplexityIndex(input: {
  escalationLevelsApprovals: number;
  escalationLevelsWorkflows: number;
  hasExternalChannels: boolean;
}): number {
  const base = input.escalationLevelsApprovals + input.escalationLevelsWorkflows;
  const ext = input.hasExternalChannels ? 1 : 0;
  const idx = base * 0.8 + ext * 1.2;
  return Math.round(idx * 10) / 10;
}
