import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { throwIfProdDbError } from '../../common/db-fallback';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeJsonParse<T>(s: any, fallback: T): T {
  try {
    if (!s) return fallback;
    return JSON.parse(String(s)) as T;
  } catch {
    return fallback;
  }
}

function encodeJson(v: any) {
  try {
    return JSON.stringify(v ?? {});
  } catch {
    return '{}';
  }
}


const DEFAULT_THEME_COVERAGE = [
  'culture',
  'heritage',
  'family',
  'night',
  'learning',
  'community',
];

function normalizeMonthRange(metadata: any) {
  const seasonStartMonth = Number(metadata?.seasonStartMonth ?? metadata?.startMonth ?? metadata?.monthStart ?? 0) || 0;
  const seasonEndMonth = Number(metadata?.seasonEndMonth ?? metadata?.endMonth ?? metadata?.monthEnd ?? 0) || 0;
  return { seasonStartMonth, seasonEndMonth };
}

function normalizeThemes(metadata: any): string[] {
  const raw = Array.isArray(metadata?.themes)
    ? metadata.themes
    : Array.isArray(metadata?.categories)
      ? metadata.categories
      : [];
  return Array.from(new Set(raw.map((x: any /* typed */) => String(x || '').trim().toLowerCase()).filter(Boolean)));
}

function monthOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private decodeProgram(row: any) {
    return {
      ...row,
      metadata: safeJsonParse(row.metadataJson, {}),
      projectIds: safeJsonParse<string[]>(row.projectIdsJson, []),
      workflowInstanceIds: safeJsonParse<string[]>(row.workflowInstanceIdsJson, []),
      // keep raw fields for debugging
      metadataJson: undefined,
      projectIdsJson: undefined,
      workflowInstanceIdsJson: undefined,
    };
  }

  private async recalcDb(id: string) {
    const row = await (this.prisma as Record<string, unknown>).program.findUnique({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('Program not found');
    // Placeholder for future: compute readiness from linked projects/workflows.
    return this.decodeProgram(row);
  }

  async list(query?: { organizationId?: string; status?: string; q?: string }) {
    const q = String(query?.q || '').trim();
    try {
      const rows = await (this.prisma as Record<string, unknown>).program.findMany({
        where: {
          organizationId: query?.organizationId || undefined,
          status: (query?.status as any) || undefined,
          ...(q ? { OR: [{ nameAr: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
      return rows.map((r: any) => this.decodeProgram(r));
    } catch (err) {
      throwIfProdDbError(err, 'ProgramsService.list');
      const lower = q.toLowerCase();
      return this.store
        .listPrograms()
        .filter((x) =>
          (!query?.organizationId || x.organizationId === query.organizationId) &&
          (!query?.status || x.status === query.status) &&
          (!q || x.nameAr.toLowerCase().includes(lower) || x.code.toLowerCase().includes(lower) || (x.description || '').toLowerCase().includes(lower)),
        );
    }
  }

  async getById(id: string) {
    try {
      return await this.recalcDb(id);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwIfProdDbError(err, 'ProgramsService.getById');
      const p = await this.prisma.program.findUnique({ where: { id: id } });
      if (!p) throw new NotFoundException('Program not found');
      return p;
    }
  }

  async create(body: any, user?: RequestUser) {
    const now = new Date();
    const id = uid('prog');
    const payload = {
      id,
      organizationId: body.organizationId || user?.activeOrgId || body.organizationId,
      code: String(body.code || `PROG-${Date.now()}`),
      nameAr: String(body.nameAr || 'برنامج جديد'),
      description: body.description ? String(body.description) : null,
      status: body.status || 'draft',
      strategicValueScore: Math.max(0, Math.min(100, Number(body.strategicValueScore ?? 70))),
      readinessScore: Math.max(0, Math.min(100, Number(body.readinessScore ?? 0))),
      portfolioValueSar: body.portfolioValueSar != null ? Number(body.portfolioValueSar) : null,
      metadataJson: encodeJson(body.metadata || {}),
      projectIdsJson: encodeJson(Array.isArray(body.projectIds) ? body.projectIds.map(String) : []),
      workflowInstanceIdsJson: encodeJson(Array.isArray(body.workflowInstanceIds) ? body.workflowInstanceIds.map(String) : []),
      createdByUserId: user?.sub || null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const row = await (this.prisma as Record<string, unknown>).program.create({ data: payload });
      return this.decodeProgram(row);
    } catch (err) {
      throwIfProdDbError(err, 'ProgramsService.create');
      const row = await this.prisma.program.create({ data: {
        id: payload.id,
        organizationId: payload.organizationId,
        code: payload.code,
        nameAr: payload.nameAr,
        description: payload.description || undefined,
        status: payload.status,
        strategicValueScore: payload.strategicValueScore,
        readinessScore: payload.readinessScore,
        portfolioValueSar: payload.portfolioValueSar || undefined,
        metadata: safeJsonParse(payload.metadataJson, {}),
        projectIds: safeJsonParse(payload.projectIdsJson, []),
        workflowInstanceIds: safeJsonParse(payload.workflowInstanceIdsJson, []),
        createdByUserId: payload.createdByUserId || undefined,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } as any);
      return row;
    }
  }

  async update(id: string, body: any) {
    const patch: any = {
      ...(body.code !== undefined ? { code: String(body.code) } : {}),
      ...(body.nameAr !== undefined ? { nameAr: String(body.nameAr) } : {}),
      ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.strategicValueScore !== undefined ? { strategicValueScore: Number(body.strategicValueScore) } : {}),
      ...(body.readinessScore !== undefined ? { readinessScore: Number(body.readinessScore) } : {}),
      ...(body.portfolioValueSar !== undefined ? { portfolioValueSar: body.portfolioValueSar != null ? Number(body.portfolioValueSar) : null } : {}),
      ...(body.metadata !== undefined ? { metadataJson: encodeJson(body.metadata || {}) } : {}),
      ...(body.projectIds !== undefined ? { projectIdsJson: encodeJson(Array.isArray(body.projectIds) ? body.projectIds.map(String) : []) } : {}),
      ...(body.workflowInstanceIds !== undefined ? { workflowInstanceIdsJson: encodeJson(Array.isArray(body.workflowInstanceIds) ? body.workflowInstanceIds.map(String) : []) } : {}),
      updatedAt: new Date(),
    };

    try {
      const row = await (this.prisma as Record<string, unknown>).program.update({ where: { id }, data: patch });
      return this.decodeProgram(row);
    } catch (err) {
      throwIfProdDbError(err, 'ProgramsService.update');
      return await this.prisma.program.update({ where: { id: id }, data: body as any);
    }
  }

  async attachProject(programId: string, projectId: string) {
    const p = await this.getById(programId);
    const projectIds = Array.isArray((p as Record<string, unknown>).projectIds) ? (p as Record<string, unknown>).projectIds.map(String) : [];
    if (!projectIds.includes(projectId)) projectIds.push(projectId);
    return this.update(programId, { projectIds });
  }

  async attachWorkflowInstance(programId: string, instanceId: string) {
    const p = await this.getById(programId);
    const workflowInstanceIds = Array.isArray((p as Record<string, unknown>).workflowInstanceIds) ? (p as Record<string, unknown>).workflowInstanceIds.map(String) : [];
    if (!workflowInstanceIds.includes(instanceId)) workflowInstanceIds.push(instanceId);
    return this.update(programId, { workflowInstanceIds });
  }

  async portfolioSummary(organizationId?: string) {
    const list = await this.list({ organizationId });
    const totalValue = list.reduce((s: number, x: any) => s + (Number(x.portfolioValueSar) || 0), 0);
    const avgReadiness = list.length ? Math.round(list.reduce((s: number, x: any) => s + (Number(x.readinessScore) || 0), 0) / list.length) : 0;
    return {
      totalPrograms: list.length,
      activePrograms: list.filter((x: any /* typed */) => x.status === 'active').length,
      totalPortfolioValueSar: totalValue,
      avgReadinessScore: avgReadiness,
      topPrograms: [...list].sort((a: any, b: any) => (Number(b.strategicValueScore) + Number(b.readinessScore)) - (Number(a.strategicValueScore) + Number(a.readinessScore))).slice(0, 5),
    };
  }

  async destinationBrainSummary(params?: { organizationId?: string; city?: string; destinationType?: string }) {
    const list = await this.list({ organizationId: params?.organizationId, status: undefined, q: undefined });
    const programs = list.filter((x: any /* typed */) => {
      const metadata = x.metadata || {};
      if (params?.city && String(metadata.city || '').trim() !== String(params.city).trim()) return false;
      if (params?.destinationType && String(metadata.destinationType || '').trim() !== String(params.destinationType).trim()) return false;
      return true;
    });

    const themes = new Set<string>();
    const cityCoverage = new Set<string>();
    const activePrograms = programs.filter((x: any /* typed */) => x.status === 'active');
    for (const p of programs) {
      const metadata = p.metadata || {};
      normalizeThemes(metadata).forEach((t) => themes.add(t));
      if (metadata.city) cityCoverage.add(String(metadata.city));
    }

    return {
      ok: true,
      organizationId: params?.organizationId || null,
      destinationType: params?.destinationType || null,
      city: params?.city || null,
      totalPrograms: programs.length,
      activePrograms: activePrograms.length,
      averageReadinessScore: programs.length ? Math.round(programs.reduce((s: number, x: any) => s + (Number(x.readinessScore) || 0), 0) / programs.length) : 0,
      averageStrategicValueScore: programs.length ? Math.round(programs.reduce((s: number, x: any) => s + (Number(x.strategicValueScore) || 0), 0) / programs.length) : 0,
      coveredThemes: Array.from(themes),
      cityCoverage: Array.from(cityCoverage),
      quickInsights: [
        activePrograms.length === 0 ? 'لا توجد برامج نشطة حاليًا' : `يوجد ${activePrograms.length} برامج نشطة`,
        themes.size < 4 ? 'التنوع الموضوعي منخفض ويحتاج إلى توسيع البرمجة' : 'التنوع الموضوعي مقبول مبدئيًا',
      ],
    };
  }

  async destinationBrainGaps(params?: { organizationId?: string; city?: string; destinationType?: string }) {
    const summary = await this.destinationBrainSummary(params);
    const missingThemes = DEFAULT_THEME_COVERAGE.filter((t) => !summary.coveredThemes.includes(t));
    const gaps: any[] = [];
    if (summary.activePrograms === 0) {
      gaps.push({ key: 'no_active_programs', severity: 'critical', messageAr: 'لا توجد برامج نشطة داخل الوجهة حاليًا' });
    }
    if (summary.averageReadinessScore < 55) {
      gaps.push({ key: 'readiness_low', severity: 'high', messageAr: 'متوسط الجاهزية منخفض ويحتاج إلى ضبط تشغيلي' });
    }
    for (const theme of missingThemes) {
      gaps.push({ key: `missing_theme_${theme}`, severity: theme === 'heritage' || theme === 'culture' ? 'high' : 'medium', messageAr: `هناك فجوة في محور ${theme}` });
    }
    return { ...summary, gapCount: gaps.length, gaps };
  }

  async destinationBrainConflicts(params?: { organizationId?: string; city?: string; destinationType?: string }) {
    const list = await this.list({ organizationId: params?.organizationId });
    const programs = list.filter((x: any /* typed */) => x.status === 'active').filter((x: any /* typed */) => {
      const metadata = x.metadata || {};
      if (params?.city && String(metadata.city || '').trim() !== String(params.city).trim()) return false;
      if (params?.destinationType && String(metadata.destinationType || '').trim() !== String(params.destinationType).trim()) return false;
      return true;
    });

    const conflicts: any[] = [];
    for (let i = 0; i < programs.length; i++) {
      for (let j = i + 1; j < programs.length; j++) {
        const a = programs[i];
        const b = programs[j];
        const aMeta = a.metadata || {};
        const bMeta = b.metadata || {};
        const aRange = normalizeMonthRange(aMeta);
        const bRange = normalizeMonthRange(bMeta);
        const sameCity = String(aMeta.city || '') && String(aMeta.city || '') === String(bMeta.city || '');
        const sameVenue = String(aMeta.venueId || '') && String(aMeta.venueId || '') === String(bMeta.venueId || '');
        if ((sameCity || sameVenue) && monthOverlap(aRange.seasonStartMonth, aRange.seasonEndMonth, bRange.seasonStartMonth, bRange.seasonEndMonth)) {
          conflicts.push({
            type: sameVenue ? 'venue_overlap' : 'city_overlap',
            severity: sameVenue ? 'high' : 'medium',
            messageAr: `يوجد تداخل زمني بين ${a.nameAr} و ${b.nameAr}`,
            programs: [a.id, b.id],
            city: aMeta.city || bMeta.city || null,
            venueId: aMeta.venueId || bMeta.venueId || null,
            months: [aRange.seasonStartMonth, aRange.seasonEndMonth, bRange.seasonStartMonth, bRange.seasonEndMonth],
          });
        }
      }
    }

    return { ok: true, organizationId: params?.organizationId || null, city: params?.city || null, destinationType: params?.destinationType || null, count: conflicts.length, conflicts };
  }

  async generateDestinationRecommendations(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    const gaps = await this.destinationBrainGaps({ organizationId, city: body?.city, destinationType: body?.destinationType });
    const conflicts = await this.destinationBrainConflicts({ organizationId, city: body?.city, destinationType: body?.destinationType });
    const preferredThemes = Array.isArray(body?.preferredThemes) ? body.preferredThemes.map((x: any /* typed */) => String(x).toLowerCase()) : [];

    const recommendations: any[] = [];
    for (const gap of gaps.gaps) {
      if (String(gap.key).startsWith('missing_theme_')) {
        const theme = String(gap.key).replace('missing_theme_', '');
        recommendations.push({
          key: `program_${theme}`,
          priority: preferredThemes.includes(theme) ? 'critical' : gap.severity,
          type: 'new_program',
          titleAr: `إطلاق برنامج يعالج محور ${theme}`,
          rationaleAr: `تم رصد فجوة في محور ${theme} داخل الوجهة الحالية`,
          suggestedMetadata: { theme, city: body?.city || null, destinationType: body?.destinationType || null },
        });
      }
    }
    if (gaps.gaps.some((x: any /* typed */) => x.key === 'readiness_low')) {
      recommendations.push({
        key: 'readiness_boost',
        priority: 'high',
        type: 'operational_fix',
        titleAr: 'رفع جاهزية البرامج الحالية قبل التوسع',
        rationaleAr: 'متوسط الجاهزية منخفض وقد يؤثر في التجربة والتشغيل',
      });
    }
    if (conflicts.count > 0) {
      recommendations.push({
        key: 'calendar_rebalance',
        priority: 'high',
        type: 'calendar_fix',
        titleAr: 'إعادة توزيع الجدولة لتقليل التعارضات',
        rationaleAr: `تم رصد ${conflicts.count} تعارضات في المدينة أو الموقع نفسه`,
      });
    }

    return {
      ok: true,
      organizationId,
      city: body?.city || null,
      destinationType: body?.destinationType || null,
      generatedAt: new Date().toISOString(),
      recommendations,
      inputs: { preferredThemes, blockedMonths: Array.isArray(body?.blockedMonths) ? body.blockedMonths : [] },
      supportingSignals: { gaps: gaps.gaps, conflicts: conflicts.conflicts },
    };
  }
}
