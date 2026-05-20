import { Injectable, NotFoundException } from '@nestjs/common';
import { impactScore } from '@madar/innovation-kernel';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

@Injectable()
export class ImpactService {
  constructor(private readonly prisma: PrismaService) {}

  listSnapshots(params?: { projectId?: string; experienceId?: string }) {
    let items = await this.prisma.impactSnapshot.findMany({});
    if (params?.projectId) items = items.filter((x) => x.projectId === params.projectId);
    if (params?.experienceId) items = items.filter((x) => x.experienceId === params.experienceId);
    return { returned: items.length, items: items.slice(0, 200) };
  }

  leaderboard(limit = 20) {
    const items = this.store
      .listImpactSnapshots()
      .slice()
      .sort((a, b) => b.score0to100 - a.score0to100)
      .slice(0, Math.max(1, Math.min(200, limit)));
    return { returned: items.length, items };
  }

  scoreFromSimulation(input: {
    organizationId?: string;
    projectId?: string;
    experienceId?: string;
    twinId?: string;
    simulationRunId: string;
    narrativeId?: string;
  }) {
    const sim = await this.prisma.twinSimulationRun.findUnique({ where: { id: input.simulationRunId } });
    if (!sim) throw new NotFoundException('Simulation run not found');

    const result = safeJson(sim.resultJson) || {};
    const kpis = result.kpis || {};
    const totals = result.totals || {};

    const completionRate = (Number(kpis.completionRatePct || 0) || 0) / 100;
    const predictedSatisfaction = Number(kpis.predictedSatisfaction0to100 || 0) || 0;
    const engagementMinutes = (Number(totals.avgTotalTimeSeconds || 0) || 0) / 60;
    const learningMoments = Math.max(1, Math.min(10, (result.bottlenecks?.length || 0) + 2));
    const shareIntent = Math.max(0, Math.min(100, predictedSatisfaction - 5));
    const revisitIntent = Math.max(0, Math.min(100, predictedSatisfaction - 10));

    const score = impactScore({ completionRate, predictedSatisfaction, engagementMinutes, learningMoments, shareIntent, revisitIntent });

    const now = new Date().toISOString();
    const row: ImpactSnapshotRecord = {
      id: uid('imp'),
      organizationId: input.organizationId,
      projectId: input.projectId,
      experienceId: input.experienceId,
      twinId: input.twinId || sim.twinId,
      simulationRunId: input.simulationRunId,
      narrativeId: input.narrativeId,
      score0to100: score.score,
      breakdownJson: JSON.stringify({ ...score.breakdown, source: { completionRate, predictedSatisfaction, engagementMinutes, learningMoments } }),
      createdAt: now,
    };

    await this.prisma.impactSnapshot.create({ data: row);
    return { ok: true, snapshot: row };
  }

  createFramework(input: { organizationId?: string; code: string; nameAr: string; dimensions?: string[] }) {
    const row = {
      id: uid('ifw'),
      organizationId: input.organizationId || 'org_demo_1',
      code: input.code,
      nameAr: input.nameAr,
      dimensions: Array.isArray(input.dimensions) && input.dimensions.length
        ? input.dimensions
        : ['cultural_impact', 'tourism_pull', 'local_economic_value', 'heritage_safety', 'community_participation'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.prisma.impactFramework.create({ data: row as any);
    return { ok: true, framework: row };
  }

  projectImpact(projectId: string) {
    const snapshots = await this.prisma.impactSnapshot.findMany({}).filter((x) => x.projectId === projectId);
    const avgScore = snapshots.length ? Number((snapshots.reduce((s, x) => s + x.score0to100, 0) / snapshots.length).toFixed(1)) : 0;
    const legacy = await this.prisma.impactSnapshot.findMany({ where: { projectId } });
    return {
      ok: true,
      projectId,
      snapshotCount: snapshots.length,
      avgScore0to100: avgScore,
      legacyCount: legacy.length,
      readinessAr: avgScore >= 75 ? 'الأثر المبدئي قوي.' : avgScore >= 50 ? 'الأثر متوسط ويحتاج تحسين.' : 'الأثر ضعيف أو البيانات غير كافية.',
      dimensions: {
        culturalImpact: avgScore >= 70 ? 'strong' : avgScore >= 50 ? 'moderate' : 'weak',
        operationalLearning: snapshots.length >= 3 ? 'maturing' : 'early',
        legacySignal: legacy.length ? 'present' : 'missing',
      },
    };
  }

  createLegacyOutcome(input: { organizationId?: string; seasonId?: string; projectId: string; outcomes?: string[]; localEconomicValueBand?: string; culturalImpactLevel?: string }) {
    const row = {
      id: uid('leg'),
      organizationId: input.organizationId || 'org_demo_1',
      seasonId: input.seasonId || null,
      projectId: input.projectId,
      outcomes: Array.isArray(input.outcomes) ? input.outcomes : [],
      localEconomicValueBand: input.localEconomicValueBand || 'unrated',
      culturalImpactLevel: input.culturalImpactLevel || 'emerging',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    /* Wave123: legacy outcome create */ ({} as any /* TODO: add model */row as any);
    return { ok: true, legacyOutcome: row };
  }

  seasonLegacyReport(seasonId: string) {
    const items = await this.prisma.impactSnapshot.findMany({ where: seasonId ? { metadata: { path: ["seasonId"], equals: seasonId } } : {} });
    const totals = {
      outcomes: items.reduce((s, x) => s + ((x.outcomes || []).length), 0),
      premiumLocalValue: items.filter((x) => x.localEconomicValueBand === 'high').length,
      strongCulturalImpact: items.filter((x) => x.culturalImpactLevel === 'strong').length,
    };
    return { ok: true, seasonId, count: items.length, totals, items };
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s || 'null');
  } catch {
    return null;
  }
}
