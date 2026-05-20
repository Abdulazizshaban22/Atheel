export type CategoryKey = 'general_scope' | 'event_architecture' | 'graphic_design' | 'overall_direction';

export type StaffCandidate = {
  userId: string;
  displayName?: string | null;
  department?: string | null;
  skills: string[];
  weeklyCapacityHours?: number | null;
  // lightweight performance signals
  completedObligations?: number;
  completedAssignments?: number;
  openObligations?: number;
};

export type CategoryOwnerRecommendation = {
  category: CategoryKey;
  recommendedUserId: string | null;
  score: number;
  reasonsAr: string[];
  breakdown: { skillMatch: number; experience: number; workload: number };
};

function normSkill(s: any) {
  return String(s || '').toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniq(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = normSkill(x);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

// Heuristic mapping inspired by sector skill frameworks: translate each studio category into expected skills.
// You can refine the dictionary per your internal HR framework (department + skill tags).
const REQUIRED_SKILLS: Record<CategoryKey, string[]> = {
  general_scope: ['brief', 'scope', 'requirements', 'content', 'cultural programming', 'strategy', 'writing', 'research'],
  event_architecture: ['architecture', 'event design', 'booth', 'pavilion', 'stage', 'layout', 'site plan', '3d', 'bim', 'space planning'],
  graphic_design: ['graphic', 'branding', 'identity', 'print', 'digital', 'motion', 'signage', 'wayfinding', 'visual'],
  overall_direction: ['experience', 'visitor journey', 'programming', 'wayfinding', 'operations', 'flow', 'storytelling', 'service design'],
};

function overlapScore(skills: string[], required: string[]) {
  const sset = new Set(uniq(skills));
  const req = uniq(required);
  if (!req.length) return 0;
  let hit = 0;
  for (const r of req) {
    // partial includes
    for (const s of sset) {
      if (s === r || s.includes(r) || r.includes(s)) {
        hit += 1;
        break;
      }
    }
  }
  return hit / req.length; // 0..1
}

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function recommendOwners(input: { candidates: StaffCandidate[]; categories?: CategoryKey[] }): CategoryOwnerRecommendation[] {
  const categories: CategoryKey[] = (input.categories && input.categories.length ? input.categories : ['general_scope', 'event_architecture', 'graphic_design', 'overall_direction']);
  const candidates = input.candidates || [];

  const maxCompleted = Math.max(1, ...candidates.map((c) => (c.completedAssignments || 0) + (c.completedObligations || 0)));
  const maxOpen = Math.max(1, ...candidates.map((c) => (c.openObligations || 0)));

  const recs: CategoryOwnerRecommendation[] = [];

  for (const category of categories) {
    let best: { userId: string; score: number; reasons: string[]; breakdown: any } | null = null;

    for (const c of candidates) {
      const skillMatch = overlapScore(c.skills || [], REQUIRED_SKILLS[category] || []); // 0..1

      const completed = (c.completedAssignments || 0) + (c.completedObligations || 0);
      const experience = clamp01(completed / maxCompleted);

      const open = c.openObligations || 0;
      const workload = 1 - clamp01(open / maxOpen); // 1 is better (less loaded)

      const score = 0.6 * skillMatch + 0.25 * experience + 0.15 * workload;

      const reasons: string[] = [];
      if (skillMatch >= 0.4) reasons.push('تطابق مهارات جيد مع متطلبات الخانة.');
      else if (skillMatch >= 0.2) reasons.push('تطابق مهارات متوسط مع متطلبات الخانة.');
      else reasons.push('تطابق مهارات منخفض ويحتاج تحقق يدوي.');

      if (experience >= 0.5) reasons.push('سجل إنجاز قوي في مهام مشابهة داخل النظام.');
      else if (experience >= 0.25) reasons.push('سجل إنجاز جيد لكنه ليس الأعلى.');

      if (workload >= 0.7) reasons.push('العبء الحالي منخفض نسبيًا ويمكنه قيادة الخانة.');
      else if (workload <= 0.35) reasons.push('العبء الحالي مرتفع وقد يؤثر على الالتزام بالمواعيد.');

      const breakdown = { skillMatch: Number(skillMatch.toFixed(3)), experience: Number(experience.toFixed(3)), workload: Number(workload.toFixed(3)) };

      if (!best || score > best.score) {
        best = { userId: c.userId, score, reasons, breakdown };
      }
    }

    recs.push({
      category,
      recommendedUserId: best?.userId || null,
      score: Number((best?.score || 0).toFixed(3)),
      reasonsAr: best?.reasons || ['لا يوجد مرشح مناسب بناء على البيانات المتاحة.'],
      breakdown: best?.breakdown || { skillMatch: 0, experience: 0, workload: 0 },
    });
  }

  return recs;
}
