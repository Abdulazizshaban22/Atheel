import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { randomUUID } from 'crypto';

import { QueueService } from '../queue/queue.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AiService } from '../ai/ai.service';
import { ObligationsService } from '../obligations/obligations.service';
import { buildPdfFromMarkdown, type GovTemplateMeta } from '@madar/doc-kernel';
import { classifyOpportunity, generateExperienceBlueprint, detectSafetyCompliance, materializeExperienceBlueprint, recommendOwners } from '@madar/engines-kernel';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { assertWorkerTokenValue } from '../../common/security/worker-token';

function nowIso() {
  return new Date().toISOString();
}

function norm(s?: any) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function guessCategoryAndDiscipline(text: string): { category: any; discipline: any; inStudioScope: boolean } {
  const t = text.toLowerCase();
  const has = (k: string) => t.includes(k);

  const outScopeKeys = ['تشغيل', 'المالية', 'محاسبة', 'ميزانية', 'تأمين', 'حراسة', 'نقل', 'توريد', 'شراء', 'عقود', 'تعاقد', 'توظيف', 'رواتب', 'تسويق', 'اعلان', 'إعلان', 'حملات'];
  for (const k of outScopeKeys) {
    if (has(k.toLowerCase())) {
      const discipline = has('مال') || has('ميزانية') || has('محاسبة') ? 'finance' : has('مشروع') || has('جدولة') ? 'project_management' : 'operations';
      return { category: 'out_of_scope', discipline, inStudioScope: false };
    }
  }

  const graphicKeys = ['مطبوع', 'بوستر', 'ملصق', 'لافت', 'لوحة', 'هوية', 'جرافيك', 'social', 'سوشال', 'digital', 'تصميم رقمي', 'موشن', 'فيديو', 'قوالب', 'نشرات', 'brochure', 'qr', 'رمز'];
  if (graphicKeys.some((k) => has(k.toLowerCase()))) return { category: 'graphic_design', discipline: 'graphic', inStudioScope: true };

  const archKeys = ['بوث', 'جناح', 'مسرح', 'منصة', 'بوابة', 'أجنحة', 'اكشاك', 'أكشاك', 'خيمة', 'جلسات', 'ديكور', 'تصميم معماري', 'مساحة', 'متر', 'واجهة', 'موقع الفعالية', 'مخطط'];
  if (archKeys.some((k) => has(k.toLowerCase()))) return { category: 'event_architecture', discipline: 'architecture', inStudioScope: true };

  const directionKeys = ['مسار', 'مسارات', 'برنامج', 'تقسيم', 'تجربة', 'رحلة', 'رحلة الزائر', 'سيناريو', 'تدفق', 'توزيع الفعاليات', 'جدول الفعاليات', 'التوجه العام', 'منطقة', 'مناطق', 'خارطة'];
  if (directionKeys.some((k) => has(k.toLowerCase()))) return { category: 'overall_direction', discipline: 'visitor_experience', inStudioScope: true };

  return { category: 'general_scope', discipline: 'content_experience', inStudioScope: true };
}

function extractRequirementsFromText(extractedText: string): Array<{ textAr: string; category: any; discipline: any; inStudioScope: boolean; sourceRefJson: any }> {
  const raw = String(extractedText || '').replace(/\r/g, '\n');
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  const candidates: string[] = [];

  for (const line of lines) {
    const l = line.replace(/^\uFEFF/, '').trim();
    if (!l) continue;

    // Skip obvious page headers/footers
    if (l.length < 8) continue;
    if (/^\d+\s*\/?\s*\d+$/.test(l)) continue;

    const isBullet = /^[-*•\u2022]\s+/.test(l) || /^\d+[\).:-]\s+/.test(l);
    const isMust = /(يجب|يلزم|مطلوب|لا يقل|لا يزيد|يتضمن|يشمل)/.test(l);

    if ((isBullet || isMust) && l.length <= 500) {
      candidates.push(l.replace(/^[-*•\u2022]\s+/, '').trim());
    }
  }

  // Dedup
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = c.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || key.length < 12) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(c);
  }

  return uniq.slice(0, 300).map((textAr) => {
    const g = guessCategoryAndDiscipline(textAr);
    return {
      textAr,
      category: g.category,
      discipline: g.discipline,
      inStudioScope: g.inStudioScope,
      sourceRefJson: { page: null, snippet: textAr.slice(0, 180) },
    };
  });
}

function extractRequirementsFromPages(pages: Array<{ pageNumber: number; text: string }>, attachmentId: string) {
  const out: Array<{ textAr: string; category: any; discipline: any; inStudioScope: boolean; sourceRefJson: any }> = [];

  for (const p of pages || []) {
    const pageNumber = Number((p as any)?.pageNumber || (p as any)?.page || 0) || 0;
    const pageText = String((p as any)?.text || '');
    if (!pageText.trim()) continue;

    const items = extractRequirementsFromText(pageText).map((r) => ({
      ...r,
      sourceRefJson: { ...(r.sourceRefJson || {}), attachmentId, page: pageNumber || null },
    }));

    for (const it of items) {
      const sr = it.sourceRefJson || {};
      if (sr.page == null) sr.page = pageNumber || null;
      if (!sr.snippet) sr.snippet = String(it.textAr || '').slice(0, 180);
      out.push({ ...it, sourceRefJson: sr });
    }
  }

  const uniq: any[] = [];
  const seen = new Set<string>();
  for (const r of out) {
    const key = String(r.textAr || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || key.length < 12) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(r);
  }

  return uniq.slice(0, 400);
}

function detectComplianceFromRequirementTexts(requirements: Array<{ id?: string; textAr?: string; sourceRefJson?: any }>) {
  const topics: Array<{ key: string; labelAr: string; keywords: string[] }> = [
    { key: 'sustainability', labelAr: 'استدامة الفعالية (ISO 20121 وما شابه)', keywords: ['استدامة', 'ISO 20121', 'مخلفات', 'نفايات', 'طاقة', 'مياه', 'انبعاث', 'waste', 'energy', 'water'] },
    { key: 'crowd_safety', labelAr: 'سلامة الحشود والإخلاء', keywords: ['حشود', 'إخلاء', 'مخارج', 'سعة', 'ازدحام', 'حواجز', 'طوارئ', 'الدفاع المدني', 'إطفاء', 'NFPA'] },
    { key: 'security', labelAr: 'الأمن والحراسة والتفتيش', keywords: ['أمن', 'حراسة', 'تفتيش', 'بوابات أمنية', 'كاميرات'] },
    { key: 'accessibility', labelAr: 'إتاحة وذوو الإعاقة', keywords: ['ذوي الإعاقة', 'إتاحة', 'accessibility', 'منحدر', 'كرسي متحرك'] },
    { key: 'licensing', labelAr: 'التراخيص والتصاريح', keywords: ['ترخيص', 'تصاريح', 'تصريح', 'رخصة', 'اعتماد', 'اشتراطات'] },
    { key: 'insurance', labelAr: 'التأمين والمسؤولية', keywords: ['تأمين', 'مسؤولية', 'liability', 'insurance'] },
  ];

  const out: any[] = [];
  for (const r of requirements || []) {
    const text = String((r as Record<string, unknown>).textAr || '');
    const lower = text.toLowerCase();
    for (const t of topics) {
      if (t.keywords.some((k) => lower.includes(String(k).toLowerCase()))) {
        out.push({
          topicKey: t.key,
          topicLabelAr: t.labelAr,
          requirementId: (r as Record<string, unknown>).id || null,
          textAr: text.slice(0, 260),
          page: (r as Record<string, unknown>).sourceRefJson?.page ?? null,
        });
      }
    }
  }

  const uniq: any[] = [];
  const seen = new Set<string>();
  for (const x of out) {
    const k = `${x.topicKey}:${x.requirementId}:${x.textAr}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(x);
  }
  return uniq;
}

function buildStudioScopeMarkdown(competition: any, requirements: any[], categoryOwners?: Record<string, string>) {
  const title = String(competition?.titleAr || 'منافسة');
  const due = competition?.dueAt ? new Date(competition.dueAt).toISOString().slice(0, 10) : '';

  const byCat: Record<string, any[]> = {
    general_scope: [],
    event_architecture: [],
    graphic_design: [],
    overall_direction: [],
    out_of_scope: [],
  };
  for (const r of requirements || []) {
    const k = String(r.category || 'general_scope');
    (byCat[k] ||= []).push(r);
  }

  const section = (label: string, items: any[]) => {
    const catKey = String((items?.[0] as any)?.category || '');
    const ownerName = categoryOwners ? categoryOwners[catKey] : undefined;
    const ownerLine = ownerName ? `**المسؤول:** ${ownerName}

` : '';
    const rows = (items || []).map((r, idx) => {
      const ref = (r.sourceRefJson && (r.sourceRefJson.page != null)) ? `ص${r.sourceRefJson.page}` : '';
      const line = String(r.textAr || '').trim();
      return `${idx + 1}. ${line}${ref ? `  \\n   مرجع: ${ref}` : ''}`;
    });
    return `## ${label}\n\n${ownerLine}${rows.length ? rows.join('\n') : 'لا يوجد'}\n`;
  };

  const md = `# نطاق الاستوديو | ${title}\n\n` +
    (due ? `- موعد التسليم المتوقع: ${due}\n` : '') +
    `- نسخة: ${new Date().toISOString()}\n\n` +
    section('النطاق العام بشكل مختصر', byCat.general_scope) +
    section('التصميم المعماري للفعالية', byCat.event_architecture) +
    section('التصميم الجرافيكي (مطبوعات + رقمي)', byCat.graphic_design) +
    section('التوجه العام (المسارات وتقسيم الفعاليات)', byCat.overall_direction) +
    (() => {
      const compliance = detectComplianceFromRequirementTexts(requirements);
      if (!compliance.length) {
        return `\n---\n\n## مصفوفة امتثال (سلامة/استدامة/تراخيص)\n\nلا يوجد عناصر امتثال واضحة من النص المستخرج.\n`;
      }
      const byTopic: Record<string, any[]> = {};
      for (const c of compliance) (byTopic[c.topicLabelAr] ||= []).push(c);
      const blocks = Object.entries(byTopic).map(([label, arr]) => {
        const lines = (arr as any[]).slice(0, 30).map((x, idx) => {
          const ref = x.page != null ? `ص${x.page}` : '';
          return `${idx + 1}. ${x.textAr}${ref ? `  \\n   مرجع: ${ref}` : ''}`;
        });
        return `### ${label}\n\n${lines.join('\n')}`;
      });
      return `\n---\n\n## مصفوفة امتثال (سلامة/استدامة/تراخيص)\n\n${blocks.join('\n\n')}\n`;
    })() +
    `\n---\n\n## خارج نطاق الاستوديو (للتوجيه الداخلي فقط)\n\n` +
    ((byCat.out_of_scope || []).length ? (byCat.out_of_scope.map((r, idx) => `${idx + 1}. ${String(r.textAr || '').trim()}`).join('\n')) : 'لا يوجد') +
    `\n`;

  return md;
}

@Injectable()
export class CompetitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly attachments: AttachmentsService,
    private readonly auditLogs: AuditLogsService,
    private readonly ai: AiService,
    private readonly obligations: ObligationsService,
  ) {}

  private async materializeExperiencePlanTables(competitionId: string, blueprint: any) {
    const plan = materializeExperienceBlueprint(blueprint);

    // Clear old
    await (this.prisma as Record<string, unknown>).competitionZone.deleteMany({ where: { competitionId } }).catch(() => void 0);
    await (this.prisma as Record<string, unknown>).competitionScheduleItem.deleteMany({ where: { competitionId } }).catch(() => void 0);
    await (this.prisma as Record<string, unknown>).competitionJourneyStep.deleteMany({ where: { competitionId } }).catch(() => void 0);
    await (this.prisma as Record<string, unknown>).competitionQueueMetric.deleteMany({ where: { competitionId } }).catch(() => void 0);

    // Insert zones
    for (const z of plan.zones) {
      await (this.prisma as Record<string, unknown>).competitionZone
        .create({
          data: {
            competitionId,
            code: z.code,
            nameAr: z.nameAr,
            kind: z.kind,
            notesAr: (z as Record<string, unknown>).notesAr || null,
            metaJson: null,
          },
        })
        .catch(() => void 0);
    }

    // Insert schedule items
    for (const s of plan.scheduleItems) {
      if (!s.titleAr) continue;
      await (this.prisma as Record<string, unknown>).competitionScheduleItem
        .create({
          data: {
            competitionId,
            dayIndex: Number(s.dayIndex) || 0,
            startTime: String(s.startTime || ''),
            endTime: String(s.endTime || ''),
            titleAr: String(s.titleAr || ''),
            zoneCode: s.zoneCode ? String(s.zoneCode) : null,
            notesAr: s.notesAr ? String(s.notesAr) : null,
            metaJson: null,
          },
        })
        .catch(() => void 0);
    }

    // Insert journey steps
    for (const st of plan.journeySteps) {
      if (!st.titleAr) continue;
      await (this.prisma as Record<string, unknown>).competitionJourneyStep
        .create({
          data: {
            competitionId,
            stepOrder: Number(st.stepOrder) || 0,
            titleAr: String(st.titleAr || ''),
            zoneCode: st.zoneCode ? String(st.zoneCode) : null,
            experienceGoalAr: String(st.experienceGoalAr || ''),
            measurementHintAr: String(st.measurementHintAr || ''),
            metaJson: null,
          },
        })
        .catch(() => void 0);
    }

    // Insert queue metrics
    for (const qm of plan.queueMetrics) {
      await (this.prisma as Record<string, unknown>).competitionQueueMetric
        .create({
          data: {
            competitionId,
            metricType: qm.metricType,
            zoneCode: qm.zoneCode ? String(qm.zoneCode) : null,
            targetWaitMinutes: qm.targetWaitMinutes != null ? Number(qm.targetWaitMinutes) : null,
            peakFactor: qm.peakFactor != null ? qm.peakFactor : null,
            avgDwellMinutes: qm.avgDwellMinutes != null ? Number(qm.avgDwellMinutes) : null,
            notesAr: qm.notesAr ? String(qm.notesAr) : null,
            metaJson: null,
          },
        })
        .catch(() => void 0);
    }

    return { zones: plan.zones.length, scheduleItems: plan.scheduleItems.length, journeySteps: plan.journeySteps.length, queueMetrics: plan.queueMetrics.length };
  }

  async listCompetitions(params: { organizationId?: string; projectId?: string; status?: string; q?: string }) {
    const q = norm(params.q);
    const where: any = {
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.projectId ? { projectId: params.projectId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(q ? { titleAr: { contains: q, mode: 'insensitive' } } : {}),
    };

    try {
      const rows = await (this.prisma as Record<string, unknown>).competition.findMany({ where, orderBy: [{ updatedAt: 'desc' }], include: { requirements: { select: { id: true } } } });
      const items = (rows || []).map((c: any) => ({
        ...c,
        requirementsCount: (c.requirements || []).length,
      }));
      return { count: items.length, items };
    } catch {
      const items = await this.prisma.competition.findMany({}).filter((c) =>
        (!params.organizationId || c.organizationId === params.organizationId) &&
        (!params.projectId || c.projectId === params.projectId) &&
        (!params.status || c.status === params.status) &&
        (!q || c.titleAr.toLowerCase().includes(q.toLowerCase()))
      );
      return { count: items.length, items };
    }
  }

  async createCompetition(dto: any, user?: RequestUser) {
    const titleAr = norm(dto.titleAr);
    if (!titleAr) throw new BadRequestException('titleAr is required');
    const organizationId = dto.organizationId || 'org_demo_1';
    assertOrgAccess(user, organizationId);

    const data: any = {
      organizationId,
      projectId: dto.projectId || null,
      titleAr,
      code: dto.code || null,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      status: 'draft',
      sourceSignalId: dto.sourceSignalId || null,
      metaJson: dto.metaJson || null,
    };

    try {
      const row = await (this.prisma as Record<string, unknown>).competition.create({ data });
      await this.auditLogs.create({ organizationId, action: 'competition.created', entityType: 'Competition', entityId: row.id, message: `إنشاء منافسة: ${titleAr}` }, user?.sub);
      return { ok: true, item: row };
    } catch {
      const id = `cmp_${randomUUID().slice(0, 10)}`;
      const now = nowIso();
      const rec: CompetitionRecord = {
        id,
        organizationId,
        projectId: dto.projectId,
        titleAr,
        code: dto.code,
        dueAt: dto.dueAt,
        status: 'draft',
        sourceSignalId: dto.sourceSignalId,
        metaJson: dto.metaJson,
        createdAt: now,
        updatedAt: now,
      };
      await this.prisma.competition.create({ data: rec });
      await this.auditLogs.create({ organizationId, action: 'competition.created', entityType: 'Competition', entityId: rec.id, message: `إنشاء منافسة (Demo): ${titleAr}` }, user?.sub);
      return { ok: true, item: rec, note: 'demo_store' };
    }
  }

  async getCompetition(id: string, user?: RequestUser) {
    let row: any = null;
    try {
      row = await (this.prisma as Record<string, unknown>).competition.findUnique({ where: { id }, include: { requirements: true } });
    } catch {
      row = await this.prisma.competition.findUnique({ where: { id: id } });
      if (row) {
        (row as Record<string, unknown>).requirements = await this.prisma.competitionRequirement.findMany({ where: { competitionId: id } });
      }
    }
    if (!row) throw new NotFoundException('Competition not found');
    assertOrgAccess(user, row.organizationId);

    const attachments = await this.attachments.findAll({ organizationId: row.organizationId, entityType: 'competition', entityId: row.id } as any);
    return { ok: true, item: row, attachments, requirementsCount: (row.requirements || []).length };
  }

  async listRequirements(competitionId: string, user?: RequestUser) {
    const comp = await this.getCompetition(competitionId, user);
    const orgId = (comp.item as Record<string, unknown>).organizationId;

    try {
      const rows = await (this.prisma as Record<string, unknown>).competitionRequirement.findMany({
        where: { competitionId },
        orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
        include: { assignments: true },
      });
      return { ok: true, organizationId: orgId, count: rows.length, items: rows };
    } catch {
      const rows = await this.prisma.competitionRequirement.findMany({ where: { competitionId: competitionId } });
      return { ok: true, organizationId: orgId, count: rows.length, items: rows };
    }
  }

  async updateRequirement(competitionId: string, requirementId: string, dto: any, user?: RequestUser) {
    const comp = await this.getCompetition(competitionId, user);
    const orgId = (comp.item as Record<string, unknown>).organizationId;

    const patch: any = {
      ...(dto.category ? { category: dto.category } : {}),
      ...(dto.discipline ? { discipline: dto.discipline } : {}),
      ...(dto.textAr ? { textAr: dto.textAr } : {}),
      ...(dto.cityOrLocation !== undefined ? { cityOrLocation: dto.cityOrLocation } : {}),
      ...(dto.quantitiesJson !== undefined ? { quantitiesJson: dto.quantitiesJson } : {}),
      ...(dto.constraintsJson !== undefined ? { constraintsJson: dto.constraintsJson } : {}),
      ...(dto.sourceRefJson !== undefined ? { sourceRefJson: dto.sourceRefJson } : {}),
      ...(dto.priority ? { priority: dto.priority } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.inStudioScope !== undefined ? { inStudioScope: Boolean(dto.inStudioScope) } : {}),
    };

    try {
      const row = await (this.prisma as Record<string, unknown>).competitionRequirement.update({ where: { id: requirementId }, data: patch });
      await this.auditLogs.create({ organizationId: orgId, action: 'competition.requirement.updated', entityType: 'CompetitionRequirement', entityId: requirementId, message: 'تحديث بند منافسة', after: patch }, user?.sub);
      return { ok: true, item: row };
    } catch {
      const row = await this.prisma.competitionRequirement.update({ where: { id: requirementId }, data: patch });
      await this.auditLogs.create({ organizationId: orgId, action: 'competition.requirement.updated', entityType: 'CompetitionRequirement', entityId: requirementId, message: 'تحديث بند منافسة (Demo)', after: patch }, user?.sub);
      return { ok: true, item: row, note: 'demo_store' };
    }
  }

  async assignRequirement(competitionId: string, requirementId: string, dto: any, user?: RequestUser) {
    const comp = await this.getCompetition(competitionId, user);
    const orgId = (comp.item as Record<string, unknown>).organizationId;

    const role = dto.role || (dto.isOwner ? 'owner' : 'contributor');
    const isOwner = Boolean(dto.isOwner) || role === 'owner';

    try {
      if (isOwner) {
        // ensure only one owner
        await (this.prisma as Record<string, unknown>).competitionAssignment.updateMany({ where: { requirementId }, data: { isOwner: false, role: 'contributor' } }).catch(() => void 0);
      }
      const row = await (this.prisma as Record<string, unknown>).competitionAssignment.upsert({
        where: { requirementId_userId: { requirementId, userId: dto.userId } },
        update: { role, isOwner },
        create: { requirementId, userId: dto.userId, role, isOwner },
      });
      await this.auditLogs.create({ organizationId: orgId, action: 'competition.requirement.assigned', entityType: 'CompetitionAssignment', entityId: row.id, message: 'إسناد بند منافسة', after: { requirementId, userId: dto.userId, role, isOwner } }, user?.sub);
      return { ok: true, item: row };
    } catch {
      const rec: CompetitionAssignmentRecord = {
        id: `cpa_${randomUUID().slice(0, 10)}`,
        requirementId,
        userId: dto.userId,
        role,
        isOwner,
        createdAt: nowIso(),
      };
      await this.prisma.competitionAssignment.upsert({ where: { id: (rec).id }, update: rec, create: rec });
      await this.auditLogs.create({ organizationId: orgId, action: 'competition.requirement.assigned', entityType: 'CompetitionAssignment', entityId: rec.id, message: 'إسناد بند منافسة (Demo)', after: rec }, user?.sub);
      return { ok: true, item: rec, note: 'demo_store' };
    }
  }

  async requestAnalyze(competitionId: string, dto: any, user?: RequestUser) {
    const comp = await this.getCompetition(competitionId, user);
    const orgId = (comp.item as Record<string, unknown>).organizationId;

    const attachmentId = String(dto.attachmentId || '').trim();
    if (!attachmentId) throw new BadRequestException('attachmentId is required');

    // Ensure attachment is accessible and belongs to org
    const att = await this.attachments.getById(attachmentId);
    if (!att) throw new NotFoundException('Attachment not found');
    if ((att as Record<string, unknown>).organizationId && (att as Record<string, unknown>).organizationId !== orgId) throw new UnauthorizedException('Attachment org mismatch');

    // mark analyzing
    try {
      await (this.prisma as Record<string, unknown>).competition.update({ where: { id: competitionId }, data: { status: 'analyzing', metaJson: { ...(comp.item as Record<string, unknown>).metaJson, analyzing: { attachmentId, at: nowIso() } } } });
    } catch {
      await this.prisma.competition.update({ where: { id: competitionId }, data: { status: 'analyzing' } as any);
    }

    const enq = await this.queue.enqueueCompetitionAnalyze({ competitionId, attachmentId });
    if (!enq.enqueued) {
      return { ok: false, noteAr: 'وضع الطوابير sync لا يدعم تحليل PDF. شغّل Redis + Worker ثم أعد المحاولة.', queue: enq };
    }

    await this.auditLogs.create({ organizationId: orgId, action: 'competition.analyze.requested', entityType: 'Competition', entityId: competitionId, message: `طلب تحليل كراسة المنافسة`, after: { attachmentId } }, user?.sub);
    return { ok: true, queue: enq };
  }

  async completeAnalysisFromWorker(competitionId: string, body: any, workerToken?: string) {
    assertWorkerTokenValue(workerToken);

    const pages = Array.isArray((body as Record<string, unknown>).pages) ? (body as Record<string, unknown>).pages : null;
    const extractedText = pages ? String(pages.map((p: any) => String(p.text || '')).join('\n\n')) : String(body.extractedText || '');
    const attachmentId = String(body.attachmentId || '').trim();
    if (!attachmentId) throw new BadRequestException('attachmentId is required');

    // get competition
    const comp = await (this.prisma as Record<string, unknown>).competition.findUnique({ where: { id: competitionId } }).catch(() => null);
    if (!comp) {
      // demo store
      const ds = await this.prisma.competition.findUnique({ where: { id: competitionId } });
      if (!ds) throw new NotFoundException('Competition not found');
      await this.prisma.competition.update({ where: { id: competitionId }, data: { status: 'ready' } as any);
      return { ok: true, note: 'demo_store_competition_only' };
    }

    // Ingest as knowledge (best-effort)
    try {
      await this.ai.ingestKnowledge(
        {
          organizationId: comp.organizationId,
          projectId: comp.projectId || undefined,
          title: `كراسة منافسة: ${comp.titleAr}`,
          text: extractedText,
          sourceType: 'file',
          sourceRef: `attachment:${attachmentId}`,
          languageCode: 'ar',
          tags: ['competition', 'rfp', comp.id],
          chunkSizeChars: 1200,
          overlapChars: 150,
        } as any,
        undefined,
      );
    } catch {
      // ignore
    }

    const requirements = (pages
      ? extractRequirementsFromPages(pages as any, attachmentId)
      : extractRequirementsFromText(extractedText).map((r) => ({ ...r, sourceRefJson: { ...(r.sourceRefJson || {}), attachmentId } })));

    const complianceMatrix = detectComplianceFromRequirementTexts(requirements as Record<string, unknown>).slice(0, 120);

    const opportunity = classifyOpportunity({ titleAr: comp.titleAr, descriptionAr: extractedText.slice(0, 6000), metaJson: { source: 'competition_rfp', attachmentId } });
    const safetyComplianceMatrix = detectSafetyCompliance(requirements as Record<string, unknown>).slice(0, 180);
    const experienceBlueprint = generateExperienceBlueprint({ titleAr: comp.titleAr, fullTextAr: extractedText.slice(0, 18000), classification: opportunity });

    // Replace requirements
    await (this.prisma as Record<string, unknown>).competitionRequirement.deleteMany({ where: { competitionId } }).catch(() => void 0);
    for (const r of requirements) {
      await (this.prisma as Record<string, unknown>).competitionRequirement
        .create({
          data: {
            competitionId,
            category: r.category,
            discipline: r.discipline,
            textAr: r.textAr,
            cityOrLocation: null,
            quantitiesJson: null,
            constraintsJson: null,
            inStudioScope: r.inStudioScope,
            sourceRefJson: r.sourceRefJson,
            priority: 'normal',
            status: 'new',
          },
        })
        .catch(() => void 0);
    }

    await (this.prisma as Record<string, unknown>).competition.update({
      where: { id: competitionId },
      data: {
        status: 'ready',
        sectorCodes: ((opportunity.sectorCodes || []) as any),
        metaJson: {
          ...(comp.metaJson || {}),
          analysis: {
            attachmentId,
            textLength: extractedText.length,
            pagesCount: pages ? Number((pages as Record<string, unknown>).length) : null,
            extractedAt: nowIso(),
            quality: body.qualityHints || null,
            complianceMatrix,
            opportunity,
            safetyComplianceMatrix,
            experienceBlueprint,
          },
        },
      },
    });

    // Wave32: materialize experience plan into operational tables for reporting/comparison
    try {
      await this.materializeExperiencePlanTables(competitionId, experienceBlueprint);
    } catch {
      // ignore
    }

    await this.auditLogs.create({ organizationId: comp.organizationId, action: 'competition.analyze.completed', entityType: 'Competition', entityId: competitionId, message: 'اكتمال تحليل الكراسة', after: { attachmentId, requirements: requirements.length } }, undefined);
    // Wave29: Convert compliance matrix into real obligations + reminders (best-effort).
    try {
      await this.obligations.refreshFromCompetition(competitionId, undefined);
    } catch {
      // ignore
    }


    return { ok: true, competitionId, attachmentId, requirementsCreated: requirements.length };
  }


  async getExperienceBlueprint(competitionId: string, user?: RequestUser) {
    const compRes = await this.getCompetition(competitionId, user);
    const comp = compRes.item as any;

    const bp = (comp?.metaJson || {})?.analysis?.experienceBlueprint || null;
    return { ok: true, competitionId, blueprint: bp };
  }

  async getExperiencePlan(competitionId: string, user?: RequestUser) {
    await this.getCompetition(competitionId, user);

    const zones = await (this.prisma as Record<string, unknown>).competitionZone.findMany({ where: { competitionId }, orderBy: [{ kind: 'asc' }, { code: 'asc' }] }).catch(() => []);
    const scheduleItems = await (this.prisma as Record<string, unknown>).competitionScheduleItem.findMany({ where: { competitionId }, orderBy: [{ dayIndex: 'asc' }, { startTime: 'asc' }] }).catch(() => []);
    const journeySteps = await (this.prisma as Record<string, unknown>).competitionJourneyStep.findMany({ where: { competitionId }, orderBy: [{ stepOrder: 'asc' }] }).catch(() => []);
    const queueMetrics = await (this.prisma as Record<string, unknown>).competitionQueueMetric.findMany({ where: { competitionId }, orderBy: [{ metricType: 'asc' }] }).catch(() => []);

    return { ok: true, competitionId, zones, scheduleItems, journeySteps, queueMetrics };
  }

  async regenerateExperienceBlueprint(competitionId: string, user?: RequestUser) {
    const compRes = await this.getCompetition(competitionId, user);
    const comp = compRes.item as any;

    const reqs = await (this.prisma as Record<string, unknown>).competitionRequirement.findMany({ where: { competitionId }, orderBy: [{ createdAt: 'asc' }] }).catch(() => []);
    const text = [
      comp.titleAr,
      comp.metaJson?.analysis?.attachmentId ? `attachment:${comp.metaJson.analysis.attachmentId}` : '',
      ...reqs.map((r: any) => r.textAr),
    ].join('\n');

    const opportunity = classifyOpportunity({ titleAr: comp.titleAr, descriptionAr: text.slice(0, 8000), metaJson: { source: 'competition_regen', competitionId } });
    const blueprint = generateExperienceBlueprint({ titleAr: comp.titleAr, fullTextAr: text.slice(0, 20000), classification: opportunity });

    await (this.prisma as Record<string, unknown>).competition.update({
      where: { id: competitionId },
      data: {
        sectorCodes: (opportunity.sectorCodes || []) as any,
        metaJson: {
          ...(comp.metaJson || {}),
          analysis: {
            ...((comp.metaJson || {}).analysis || {}),
            opportunity: opportunity,
            experienceBlueprint: blueprint,
          },
        },
      },
    }).catch(() => void 0);

    // Wave32: re-materialize tables
    try {
      await this.materializeExperiencePlanTables(competitionId, blueprint);
    } catch {
      // ignore
    }

    await this.auditLogs.create({ organizationId: comp.organizationId, action: 'competition.experience_blueprint.regenerated', entityType: 'Competition', entityId: competitionId, message: 'إعادة توليد مخطط تجربة الزائر وبرنامج الفعالية', after: { sectorCodes: opportunity.sectorCodes } }, user?.sub);

    return { ok: true, competitionId, opportunity, blueprint };
  }

  async recommendCategoryOwners(competitionId: string, body: any, user?: RequestUser) {
    const compRes = await this.getCompetition(competitionId, user);
    const comp = compRes.item as any;
    const orgId = comp.organizationId;
    const apply = Boolean(body?.apply);

    // Candidates: org members + optional profiles
    const members = await (this.prisma as Record<string, unknown>).user.findMany({
      where: { memberships: { some: { organizationId: orgId } } },
      select: { id: true, displayName: true, email: true },
      orderBy: [{ displayName: 'asc' }],
    }).catch(() => []);

    const profiles = await (this.prisma as Record<string, unknown>).orgUserProfile.findMany({ where: { organizationId: orgId } }).catch(() => []);
    const profileByUser: Record<string, unknown> = {};
    for (const p of profiles) profileByUser[String(p.userId)] = p;

    // Achievements: completed obligations + completed requirement ownership + open obligations (workload)
    const doneObl = await (this.prisma as Record<string, unknown>).obligation.groupBy({
      by: ['ownerUserId'],
      where: { organizationId: orgId, ownerUserId: { not: null }, status: 'done' },
      _count: { _all: true },
    }).catch(() => []);
    const openObl = await (this.prisma as Record<string, unknown>).obligation.groupBy({
      by: ['ownerUserId'],
      where: { organizationId: orgId, ownerUserId: { not: null }, status: { in: ['open', 'in_progress', 'overdue'] } },
      _count: { _all: true },
    }).catch(() => []);

    const doneReqOwners = await (this.prisma as Record<string, unknown>).competitionCategoryAssignment.groupBy({
      by: ['userId'],
      where: { competition: { organizationId: orgId }, isOwner: true },
      _count: { _all: true },
    }).catch(() => []);

    const doneOblBy: Record<string, number> = {};
    for (const r of doneObl) doneOblBy[String(r.ownerUserId)] = Number(r._count?._all || 0);
    const openOblBy: Record<string, number> = {};
    for (const r of openObl) openOblBy[String(r.ownerUserId)] = Number(r._count?._all || 0);
    const doneAssignBy: Record<string, number> = {};
    for (const r of doneReqOwners) doneAssignBy[String(r.userId)] = Number(r._count?._all || 0);

    const candidates = (members || []).map((m: any) => {
      const p = profileByUser[String(m.id)] || {};
      return {
        userId: String(m.id),
        displayName: m.displayName || m.email || m.id,
        department: p.department || null,
        skills: Array.isArray(p.skills) ? p.skills : [],
        weeklyCapacityHours: p.weeklyCapacityHours ?? 40,
        completedObligations: doneOblBy[String(m.id)] || 0,
        completedAssignments: doneAssignBy[String(m.id)] || 0,
        openObligations: openOblBy[String(m.id)] || 0,
      };
    });

    const recs = recommendOwners({ candidates, categories: ['general_scope', 'event_architecture', 'graphic_design', 'overall_direction'] as any });

    // Persist recommendations (best-effort)
    for (const r of recs) {
      if (!r.recommendedUserId) continue;
      await (this.prisma as Record<string, unknown>).competitionCategoryOwnerRecommendation.upsert({
        where: { competitionId_category: { competitionId, category: r.category } },
        create: {
          competitionId,
          category: r.category,
          recommendedUserId: r.recommendedUserId,
          score: r.score,
          reasonsJson: { reasonsAr: r.reasonsAr, breakdown: r.breakdown },
        },
        update: {
          recommendedUserId: r.recommendedUserId,
          score: r.score,
          reasonsJson: { reasonsAr: r.reasonsAr, breakdown: r.breakdown },
        },
      }).catch(() => void 0);
    }

    // Optional apply
    if (apply) {
      for (const r of recs) {
        if (!r.recommendedUserId) continue;
        await this.setCategoryOwner(competitionId, { category: r.category, userId: r.recommendedUserId }, user).catch(() => void 0);
      }
    }

    await this.auditLogs.create({ organizationId: orgId, action: 'competition.category_owner.recommended', entityType: 'Competition', entityId: competitionId, message: apply ? 'توليد توصيات مسؤولين وتطبيقها' : 'توليد توصيات مسؤولين', after: { apply, recommendations: recs } }, user?.sub);

    return { ok: true, competitionId, apply, recommendations: recs };
  }



  async getStaffCatalog(competitionId: string, user?: RequestUser) {
    const compRes = await this.getCompetition(competitionId, user);
    const comp = compRes.item as any;
    const orgId = comp.organizationId;

    const rows = await (this.prisma as Record<string, unknown>).user
      .findMany({
        where: { memberships: { some: { organizationId: orgId } } },
        select: { id: true, email: true, displayName: true },
        orderBy: [{ displayName: 'asc' }],
      })
      .catch(() => []);

    return { ok: true, organizationId: orgId, items: rows };
  }

  async listCategoryAssignments(competitionId: string, user?: RequestUser) {
    const compRes = await this.getCompetition(competitionId, user);
    const comp = compRes.item as any;

    const rows = await (this.prisma as Record<string, unknown>).competitionCategoryAssignment
      .findMany({
        where: { competitionId },
        include: { user: { select: { id: true, displayName: true, email: true } } },
        orderBy: [{ category: 'asc' }, { isOwner: 'desc' }, { createdAt: 'asc' }],
      })
      .catch(() => []);

    const owners: Record<string, unknown> = {};
    for (const r of rows) {
      if (r.isOwner) owners[String(r.category)] = r;
    }

    // Demo fallback from competition.metaJson.categoryOwners
    const metaOwners = ((comp as any)?.metaJson || {})?.categoryOwners || {};
    for (const [k, v] of Object.entries(metaOwners)) {
      if (!owners[String(k)]) owners[String(k)] = { competitionId, category: k, userId: v, isOwner: true, role: 'owner' };
    }

    return { ok: true, competitionId, owners, items: rows };
  }

  async setCategoryOwner(competitionId: string, body: any, user?: RequestUser) {
    const compRes = await this.getCompetition(competitionId, user);
    const comp = compRes.item as any;
    const orgId = comp.organizationId;

    const category = String(body.category || '').trim();
    const userId = String(body.userId || '').trim();
    if (!category) throw new BadRequestException('category is required');
    if (!userId) throw new BadRequestException('userId is required');

    await (this.prisma as Record<string, unknown>).competitionCategoryAssignment
      .updateMany({ where: { competitionId, category }, data: { isOwner: false, role: 'contributor' } })
      .catch(() => void 0);

    const row = await (this.prisma as Record<string, unknown>).competitionCategoryAssignment.upsert({
      where: { competitionId_category_userId: { competitionId, category, userId } },
      update: { isOwner: true, role: 'owner' },
      create: { competitionId, category, userId, isOwner: true, role: 'owner' },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    await this.auditLogs.create(
      { organizationId: orgId, action: 'competition.category_owner.set', entityType: 'Competition', entityId: competitionId, message: 'تعيين مسؤول خانة', after: { category, userId } },
      user?.sub,
    );

    return { ok: true, item: row };
  }
  async exportStudioScope(competitionId: string, dto: any, user?: RequestUser) {
    const compRes = await this.getCompetition(competitionId, user);
    const comp = compRes.item as any;
    const orgId = comp.organizationId;

    const reqs = await this.listRequirements(competitionId, user);
    const requirements = (reqs as Record<string, unknown>).items || [];

    const catRows = await (this.prisma as Record<string, unknown>).competitionCategoryAssignment
      .findMany({ where: { competitionId }, include: { user: { select: { displayName: true, email: true } } } })
      .catch(() => []);
    const categoryOwners: Record<string, string> = {};
    for (const r of catRows) {
      if (r.isOwner) categoryOwners[String(r.category)] = String(r.user?.displayName || r.user?.email || r.userId);
    }

    
    // Demo fallback from competition.metaJson.categoryOwners
    const metaOwners = ((comp as any)?.metaJson || {})?.categoryOwners || {};
    for (const [k, v] of Object.entries(metaOwners)) {
      if (!categoryOwners[String(k)]) categoryOwners[String(k)] = String(v);
    }
const markdown = buildStudioScopeMarkdown(comp, requirements, categoryOwners);

    const includePdf = dto.includePdf !== false;
    const includeSignatures = dto.includeSignatures !== false;
    const pageSize = dto.pageSize === 'Letter' ? 'Letter' : 'A4';

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mdName = `studio_scope_${stamp}.md`;
    const mdAtt = await (this.attachments as Record<string, unknown>).createFromBuffer?.({
      organizationId: orgId,
      entityType: 'competition',
      entityId: competitionId,
      originalName: mdName,
      mimeType: 'text/markdown',
      buffer: Buffer.from(markdown, 'utf8'),
      uploaderUserId: user?.sub,
      metadata: { kind: 'competition_studio_scope', format: 'markdown' },
    });

    let pdfAtt: any = null;
    let pdfError: string | undefined;

    if (includePdf) {
      const meta: GovTemplateMeta = {
        orgNameAr: 'الجهة',
        reportTitleAr: `نطاق الاستوديو للمنافسة`,
        reportSubtitleAr: comp.titleAr,
        versionLabel: 'v1',
        confidentialityLabelAr: 'داخلي',
        generatedAtIso: new Date().toISOString(),
        approvals: { statusAr: 'مسودة', signers: [] },
      } as any;

      try {
        const pdfBuf = await buildPdfFromMarkdown(markdown, { templateMeta: meta, pageSize, addSignaturePage: includeSignatures } as any);
        const pdfName = `studio_scope_${stamp}.pdf`;
        pdfAtt = await (this.attachments as Record<string, unknown>).createFromBuffer?.({
          organizationId: orgId,
          entityType: 'competition',
          entityId: competitionId,
          originalName: pdfName,
          mimeType: 'application/pdf',
          buffer: pdfBuf,
          uploaderUserId: user?.sub,
          metadata: { kind: 'competition_studio_scope', format: 'pdf' },
        });
      } catch (e: any) {
        pdfError = e?.message || 'pdf_build_failed';
      }
    }

    await this.auditLogs.create({ organizationId: orgId, action: 'competition.export.studio_scope', entityType: 'Competition', entityId: competitionId, message: 'تصدير نطاق الاستوديو', after: { mdAttachmentId: mdAtt?.id, pdfAttachmentId: pdfAtt?.id, pdfError } }, user?.sub);

    return { ok: true, markdownAttachment: mdAtt, pdfAttachment: pdfAtt, pdfError };
  }
}
