export function createCitationId(params: { sourceKind?: string; year?: number; seed: string }) {
  const year = params.year || new Date().getFullYear();
  const kind = (params.sourceKind || 'other').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 10) || 'OTHER';
  const seed = params.seed.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(-10) || 'x';
  // Example: CIT-SA-2026-UNESCO-9f3a1b2c
  const checksum = simpleHash(`${kind}|${seed}|${year}`).toString(16).slice(0, 8);
  return `CIT-SA-${year}-${kind}-${checksum}`;
}

export function normalizeArabic(text: string) {
  return (text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string) {
  const t = normalizeArabic(text);
  if (!t) return [];
  return t.split(' ').filter((x) => x.length >= 2).slice(0, 200);
}

export function jaccardSimilarity(a: string, b: string) {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function impactScore(params: {
  completionRate: number; // 0..1
  predictedSatisfaction: number; // 0..100
  engagementMinutes: number;
  learningMoments: number;
  shareIntent: number; // 0..100
  revisitIntent: number; // 0..100
}) {
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const clamp100 = (x: number) => Math.max(0, Math.min(100, x));

  const completion = clamp01(params.completionRate);
  const sat = clamp100(params.predictedSatisfaction) / 100;
  const engagement = clamp01(params.engagementMinutes / 60);
  const learning = clamp01(params.learningMoments / 8);
  const share = clamp100(params.shareIntent) / 100;
  const revisit = clamp100(params.revisitIntent) / 100;

  // Weights tuned for cultural experiences: learning + completion + satisfaction dominate.
  const score01 =
    0.24 * completion +
    0.26 * sat +
    0.16 * engagement +
    0.18 * learning +
    0.08 * share +
    0.08 * revisit;

  return {
    score: Math.round(score01 * 1000) / 10,
    breakdown: {
      completion,
      satisfaction: sat,
      engagement,
      learning,
      share,
      revisit,
    },
  };
}

export function riskScore(params: {
  congestionScore: number; // 0..100
  hazardNodes: number;
  closedNodes: number;
  complianceMissing: number;
  crowdPeakOccupancy: number;
}) {
  const clamp100 = (x: number) => Math.max(0, Math.min(100, x));
  const congestion = clamp100(params.congestionScore) / 100;
  const hazard = Math.max(0, Math.min(1, params.hazardNodes / 5));
  const closure = Math.max(0, Math.min(1, params.closedNodes / 5));
  const compliance = Math.max(0, Math.min(1, params.complianceMissing / 6));
  const peak = Math.max(0, Math.min(1, params.crowdPeakOccupancy / 400));

  // Higher is riskier
  const score01 = 0.30 * congestion + 0.18 * hazard + 0.14 * closure + 0.22 * compliance + 0.16 * peak;
  const level = score01 >= 0.7 ? 'high' : score01 >= 0.4 ? 'medium' : 'low';

  return {
    score: Math.round(score01 * 1000) / 10,
    level,
    factors: { congestion, hazard, closure, compliance, peak },
  };
}

function simpleHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}
