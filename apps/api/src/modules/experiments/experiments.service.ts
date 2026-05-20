import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { randomUUID } from 'node:crypto';
import { impactScore } from '@madar/innovation-kernel';

function nowIso() {
  return new Date().toISOString();
}

@Injectable()
export class ExperimentsService {
  // Fallback stores for local scaffolding when DB is not configured.
  private impactModelsMem: any[] = [];
  private experimentsMem: any[] = [];
  private variantsMem: any[] = [];
  private eventsMem: any[] = [];

  constructor(private readonly prisma: PrismaService) {}

  private prismaOrThrow(modelName: string) {
    const m = (this.prisma as any)?.[modelName];
    if (!m) throw new Error(`${modelName} unavailable`);
    return m;
  }

  async listImpactModels(orgId?: string) {
    try {
      const impactModel = this.prismaOrThrow('impactModel');
      const items = await impactModel.findMany({
        where: { organizationId: orgId || undefined },
        orderBy: { updatedAt: 'desc' },
      });
      return { count: items.length, items };
    } catch {
      const items = this.impactModelsMem.filter((m) => (!orgId || m.organizationId === orgId));
      return { count: items.length, items };
    }
  }

  async createImpactModel(input: { organizationId?: string; code: string; nameAr: string; descriptionAr?: string; modelJson?: any }) {
    const model = input.modelJson || {
      dimensions: ['completionRate', 'predictedSatisfaction', 'engagementMinutes', 'learningMoments', 'shareIntent', 'revisitIntent'],
      weights: {
        completionRate: 0.22,
        predictedSatisfaction: 0.22,
        engagementMinutes: 0.18,
        learningMoments: 0.16,
        shareIntent: 0.12,
        revisitIntent: 0.10,
      },
    };

    const id = `im_${randomUUID().slice(0, 10)}`;
    const organizationId = input.organizationId || 'org_demo_1';

    try {
      const impactModel = this.prismaOrThrow('impactModel');
      const existing = await impactModel.findFirst({ where: { organizationId, code: input.code } });
      const row = existing
        ? await impactModel.update({
            where: { id: existing.id },
            data: {
              nameAr: input.nameAr,
              descriptionAr: input.descriptionAr || null,
              modelJson: model,
            },
          })
        : await impactModel.create({
            data: {
              id,
              organizationId,
              code: input.code,
              nameAr: input.nameAr,
              descriptionAr: input.descriptionAr || null,
              modelJson: model,
            },
          });
      return { ok: true, impactModel: row };
    } catch {
      const rec = {
        id,
        organizationId,
        code: input.code,
        nameAr: input.nameAr,
        descriptionAr: input.descriptionAr,
        modelJson: model,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      this.impactModelsMem.unshift(rec);
      return { ok: true, impactModel: rec, note: 'fallback_in_memory' };
    }
  }

  async getImpactModel(id: string) {
    try {
      const impactModel = this.prismaOrThrow('impactModel');
      const row = await impactModel.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Impact model not found');
      return row;
    } catch {
      const row = this.impactModelsMem.find((x) => x.id === id);
      if (!row) throw new NotFoundException('Impact model not found');
      return row;
    }
  }

  async listExperiments(orgId?: string, projectId?: string) {
    try {
      const experiment = this.prismaOrThrow('experiment');
      const items = await experiment.findMany({
        where: {
          organizationId: orgId || undefined,
          projectId: projectId || undefined,
        },
        orderBy: { updatedAt: 'desc' },
      });
      return { count: items.length, items };
    } catch {
      let items = this.experimentsMem.slice();
      if (orgId) items = items.filter((x) => x.organizationId === orgId);
      if (projectId) items = items.filter((x) => x.projectId === projectId);
      return { count: items.length, items };
    }
  }

  async createExperiment(input: { organizationId?: string; projectId?: string; nameAr: string; objectiveAr?: string; impactModelId?: string }) {
    const id = `ab_${randomUUID().slice(0, 10)}`;
    const organizationId = input.organizationId || 'org_demo_1';

    try {
      const experiment = this.prismaOrThrow('experiment');
      const row = await experiment.create({
        data: {
          id,
          organizationId,
          projectId: input.projectId || null,
          nameAr: input.nameAr,
          objectiveAr: input.objectiveAr || null,
          status: 'draft',
          impactModelId: input.impactModelId || null,
        },
      });
      return { ok: true, experiment: row };
    } catch {
      const rec = {
        id,
        organizationId,
        projectId: input.projectId,
        nameAr: input.nameAr,
        objectiveAr: input.objectiveAr,
        status: 'draft',
        impactModelId: input.impactModelId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      this.experimentsMem.unshift(rec);
      return { ok: true, experiment: rec, note: 'fallback_in_memory' };
    }
  }

  async getExperiment(id: string) {
    try {
      const experiment = this.prismaOrThrow('experiment');
      const row = await experiment.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Experiment not found');
      return row;
    } catch {
      const row = this.experimentsMem.find((x) => x.id === id);
      if (!row) throw new NotFoundException('Experiment not found');
      return row;
    }
  }

  async setStatus(id: string, status: any) {
    try {
      const experiment = this.prismaOrThrow('experiment');
      const row = await experiment.update({ where: { id }, data: { status } });
      return { ok: true, experiment: row };
    } catch {
      const i = this.experimentsMem.findIndex((x) => x.id === id);
      if (i < 0) throw new NotFoundException('Experiment not found');
      this.experimentsMem[i] = { ...this.experimentsMem[i], status, updatedAt: nowIso() };
      return { ok: true, experiment: this.experimentsMem[i], note: 'fallback_in_memory' };
    }
  }

  async listVariants(experimentId: string) {
    try {
      const variant = this.prismaOrThrow('experimentVariant');
      const items = await variant.findMany({ where: { experimentId }, orderBy: { createdAt: 'asc' } });
      return { count: items.length, items };
    } catch {
      const items = this.variantsMem.filter((v) => v.experimentId === experimentId);
      return { count: items.length, items };
    }
  }

  async addVariant(experimentId: string, input: { key: string; labelAr: string; payloadJson?: any }) {
    await this.getExperiment(experimentId);

    const id = `var_${randomUUID().slice(0, 10)}`;

    try {
      const variant = this.prismaOrThrow('experimentVariant');
      const existing = await variant.findFirst({ where: { experimentId, key: input.key } });
      if (existing) return { ok: true, variant: existing, note: 'exists' };

      const row = await variant.create({
        data: {
          id,
          experimentId,
          key: input.key,
          labelAr: input.labelAr,
          payloadJson: input.payloadJson || null,
        },
      });
      return { ok: true, variant: row };
    } catch {
      const exists = this.variantsMem.find((v) => v.experimentId === experimentId && v.key === input.key);
      if (exists) return { ok: true, variant: exists, note: 'exists_fallback' };

      const rec = {
        id,
        experimentId,
        key: input.key,
        labelAr: input.labelAr,
        payloadJson: input.payloadJson,
        createdAt: nowIso(),
      };
      this.variantsMem.push(rec);
      return { ok: true, variant: rec, note: 'fallback_in_memory' };
    }
  }

  async recordEvent(experimentId: string, input: { variantKey: string; kind: string; metricsJson?: any; userId?: string }) {
    await this.getExperiment(experimentId);

    const id = `evt_${randomUUID().slice(0, 10)}`;

    try {
      const variant = this.prismaOrThrow('experimentVariant');
      const event = this.prismaOrThrow('experimentEvent');

      const v = await variant.findFirst({ where: { experimentId, key: input.variantKey } });
      if (!v) throw new NotFoundException('Variant not found');

      const row = await event.create({
        data: {
          id,
          experimentId,
          variantId: v.id,
          variantKey: v.key,
          kind: input.kind,
          metricsJson: input.metricsJson || null,
          userId: input.userId || null,
          ts: new Date(),
        },
      });

      return { ok: true, event: row };
    } catch {
      const v = this.variantsMem.find((x) => x.experimentId === experimentId && x.key === input.variantKey);
      if (!v) throw new NotFoundException('Variant not found');

      const rec = {
        id,
        experimentId,
        variantKey: input.variantKey,
        kind: input.kind,
        metricsJson: input.metricsJson,
        userId: input.userId,
        ts: nowIso(),
      };
      this.eventsMem.unshift(rec);
      return { ok: true, event: rec, note: 'fallback_in_memory' };
    }
  }

  async summary(experimentId: string) {
    const exp: any = await this.getExperiment(experimentId);

    const variantsRes: any = await this.listVariants(experimentId);
    const variants: any[] = variantsRes.items || variantsRes;

    let events: any[] = [];
    try {
      const event = this.prismaOrThrow('experimentEvent');
      events = await event.findMany({ where: { experimentId }, orderBy: { ts: 'desc' } });
    } catch {
      events = this.eventsMem.filter((e) => e.experimentId === experimentId);
    }

    const byVar: Record<string, any[]> = {};
    for (const v of variants) byVar[v.key] = [];
    for (const e of events) {
      byVar[e.variantKey] = byVar[e.variantKey] || [];
      byVar[e.variantKey].push(e);
    }

    const rows = variants.map((v) => {
      const evs = byVar[v.key] || [];

      const metrics: any = {
        events: evs.length,
        views: evs.filter((e) => e.kind === 'view').length,
      };

      const satisfaction = avg(evs, 'satisfaction', 'score0to100');
      const completionRatePct = avg(evs, 'completion', 'completionRatePct');
      const engagementMinutes = avg(evs, 'dwell', 'minutes');
      const learningMoments = avg(evs, 'learning', 'count');

      if (satisfaction != null) metrics.avgSatisfaction0to100 = satisfaction;
      if (completionRatePct != null) metrics.avgCompletionRatePct = completionRatePct;
      if (engagementMinutes != null) metrics.avgEngagementMinutes = engagementMinutes;
      if (learningMoments != null) metrics.avgLearningMoments = learningMoments;

      let impact: any = undefined;
      if (satisfaction != null || completionRatePct != null || engagementMinutes != null) {
        const score = impactScore({
          completionRate: (Number(completionRatePct || 0) || 0) / 100,
          predictedSatisfaction: Number(satisfaction || 0) || 0,
          engagementMinutes: Number(engagementMinutes || 0) || 0,
          learningMoments: Number(learningMoments || 2) || 2,
          shareIntent: Math.max(0, Math.min(100, Number(satisfaction || 0) - 5)),
          revisitIntent: Math.max(0, Math.min(100, Number(satisfaction || 0) - 10)),
        });
        impact = { score0to100: score.score, breakdown: score.breakdown };
      }

      return {
        key: v.key,
        labelAr: v.labelAr,
        metrics,
        impact,
      };
    });

    const winner = rows
      .filter((r) => r.impact?.score0to100 != null)
      .slice()
      .sort((a, b) => (b.impact?.score0to100 || 0) - (a.impact?.score0to100 || 0))[0];

    return {
      ok: true,
      experiment: exp,
      variants: rows,
      winner: winner ? { key: winner.key, score0to100: winner.impact.score0to100 } : null,
      totals: {
        events: events.length,
      },
    };
  }

  async projectLessons(projectId: string, organizationId?: string) {
    const experiments = (await this.listExperiments(organizationId, projectId)).items || [];
    const experimentIds = experiments.map((x: any /* typed */) => x.id);
    const allSummaries = [] as any[];
    for (const id of experimentIds) {
      allSummaries.push(await this.summary(id));
    }

    const winners = allSummaries.filter((x) => x?.winner?.key).map((x) => ({
      experimentId: x.experiment?.id,
      experimentNameAr: x.experiment?.nameAr,
      winnerKey: x.winner?.key,
      winnerScore0to100: x.winner?.score0to100 || 0,
    }));

    const strengths = [] as string[];
    if (winners.some((x) => x.winnerScore0to100 >= 75)) strengths.push('يوجد نمط تجارب سابق حقق أثرًا مرتفعًا ويمكن إعادة استخدامه.');
    if (allSummaries.some((x) => (x.totals?.events || 0) >= 10)) strengths.push('توجد بيانات سلوكية كافية نسبيًا لاستخلاص دروس أولية.');

    const risks = [] as string[];
    if (!winners.length) risks.push('لا توجد نتائج حاسمة لاختيار تركيبة تجربة فائزة حتى الآن.');
    if (allSummaries.every((x) => (x.totals?.events || 0) < 5)) risks.push('حجم البيانات منخفض وقد يحد من دقة التوصيات.');

    const reusablePatterns = winners.slice(0, 5).map((x) => ({
      sourceExperimentId: x.experimentId,
      sourceExperimentNameAr: x.experimentNameAr,
      recommendedPattern: x.winnerKey,
      confidence: x.winnerScore0to100 >= 80 ? 'high' : x.winnerScore0to100 >= 65 ? 'medium' : 'low',
    }));

    return {
      ok: true,
      projectId,
      organizationId: organizationId || null,
      experimentsCount: experiments.length,
      strengths,
      risks,
      reusablePatterns,
      summaries: allSummaries.map((x) => ({
        experimentId: x.experiment?.id,
        experimentNameAr: x.experiment?.nameAr,
        totals: x.totals,
        winner: x.winner,
      })),
    };
  }

  async buildEventGenome(input: {
    organizationId?: string;
    projectId?: string;
    experimentId?: string;
    eventType?: string;
    audienceType?: string;
    venueType?: string;
    heritageSensitivity?: string;
    operatingIntensity?: string;
    predictedVisitors?: number;
    engagementSignals?: Record<string, unknown>;
    legacySignals?: Record<string, unknown>;
  }) {
    const id = `gen_${randomUUID().slice(0, 10)}`;
    const predictedVisitors = Number(input.predictedVisitors || 0);
    const heritageSensitivity = String(input.heritageSensitivity || 'medium');
    const operatingIntensity = String(input.operatingIntensity || (predictedVisitors > 1200 ? 'high' : predictedVisitors > 300 ? 'medium' : 'light'));
    const audienceType = String(input.audienceType || 'mixed');
    const engagement = input.engagementSignals || {};
    const legacy = input.legacySignals || {};
    const genome = {
      id,
      organizationId: input.organizationId || 'org_demo_1',
      projectId: input.projectId || null,
      experimentId: input.experimentId || null,
      eventType: input.eventType || 'cultural_program',
      audienceType,
      venueType: input.venueType || 'destination_site',
      heritageSensitivity,
      operatingIntensity,
      predictedVisitors,
      engagementSignals: engagement,
      legacySignals: legacy,
      genome: {
        crowdProfile: predictedVisitors > 2000 ? 'mass' : predictedVisitors > 500 ? 'managed' : 'boutique',
        heritageProfile: heritageSensitivity,
        operatingProfile: operatingIntensity,
        narrativeDepth: Number((engagement as Record<string, unknown>).learningMoments || 0) >= 3 ? 'deep' : 'standard',
        legacyIntent: Number((legacy as Record<string, unknown>).communityTrainingCount || 0) > 0 || Boolean((legacy as Record<string, unknown>).permanentInstall),
      },
      recommendationsAr: [
        heritageSensitivity === 'high' ? 'فعّل مسار موافقات تراثية أكثر صرامة قبل اعتماد أي تدخل.' : 'يكفي مسار مراجعة تراثي قياسي في هذه المرحلة.',
        predictedVisitors > 1200 ? 'ارفع جاهزية التشغيل والحشود والدخول والخروج قبل الإطلاق.' : 'يمكن تشغيل النموذج الحالي مع تحسينات محدودة على إدارة التدفق.',
        audienceType === 'families' ? 'أضف نقاط استراحة وخدمات إرشاد عائلية داخل الرحلة.' : 'فعّل مسارات محتوى مخصصة حسب الشرائح داخل التجربة.',
      ],
      createdAt: nowIso(),
    };
    this.eventsMem.unshift({ id: `evtg_${randomUUID().slice(0, 10)}`, experimentId: input.experimentId || 'genome_virtual', variantKey: 'genome', kind: 'genome_built', metricsJson: genome.genome, ts: nowIso() });
    (this as Record<string, unknown>).eventGenomesMem = (this as Record<string, unknown>).eventGenomesMem || [];
    (this as Record<string, unknown>).eventGenomesMem.unshift(genome);
    return { ok: true, genome };
  }

  async getEventGenome(id: string) {
    const rows = ((this as Record<string, unknown>).eventGenomesMem || []) as any[];
    const genome = rows.find((x) => x.id === id);
    if (!genome) throw new NotFoundException('Event genome not found');
    return { ok: true, genome };
  }

  async recommendFromMemory(input: {
    organizationId?: string;
    projectId?: string;
    destinationType?: string;
    eventType?: string;
    desiredOutcomes?: string[];
    targetProfile?: Record<string, unknown>;
  }) {
    const rows = (((this as Record<string, unknown>).eventGenomesMem || []) as any[])
      .filter((x) => !input.organizationId || x.organizationId === input.organizationId)
      .filter((x) => !input.projectId || x.projectId === input.projectId)
      .filter((x) => !input.eventType || x.eventType === input.eventType);

    const lessons = input.projectId ? await this.projectLessons(input.projectId, input.organizationId) : { reusablePatterns: [] } as any;
    const topGenome = rows[0] || null;
    const desiredOutcomes = input.desiredOutcomes || [];
    const recommendations = [
      desiredOutcomes.includes('legacy') ? 'اربط التجربة بمخرج دائم مثل أرشيف أو مسار أو برنامج مجتمعي.' : 'حدد مخرجًا واحدًا قابلًا للقياس لكل تجربة رئيسية.',
      topGenome?.genome?.heritageProfile === 'high' ? 'استبق مخاطر الأصل بحدود سعة واضحة ونقاط منع تشغيلية.' : 'استخدم خط تشغيل مرن مع مراقبة مؤشرات الازدحام.',
      lessons.reusablePatterns?.length ? 'أعد استخدام النمط التجريبي الأعلى أثرًا من الذاكرة المؤسسية.' : 'ابنِ تجربة مرجعية صغيرة ثم سجّل نتائجها لتغذية الذاكرة المؤسسية.',
    ];

    return {
      ok: true,
      organizationId: input.organizationId || null,
      projectId: input.projectId || null,
      matchedGenomes: rows.length,
      topGenome,
      reusablePatterns: lessons.reusablePatterns || [],
      recommendationsAr: recommendations,
    };
  }
}

function avg(events: any[], kind: string, field: string): number | null {
  const vals = events
    .filter((e) => e.kind === kind)
    .map((e) => Number(((e.metricsJson || e.metrics || {}) as any)[field]))
    .filter((x) => Number.isFinite(x));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
