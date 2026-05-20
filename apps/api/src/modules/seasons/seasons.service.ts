import { BadRequestException, Injectable } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { generateSaudiCultureIdeaCards, filterIdeaCards } from '@madar/culture-sa-kernel';
import { ProgramsService } from '../programs/programs.service';
import { ProjectsService } from '../projects/projects.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { ComplianceService } from '../compliance/compliance.service';
import { ApprovalPacketsService } from '../approval-packets/approval-packets.service';
import { ExportsService } from '../exports/exports.service';

function seedFromString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mdEscape(s: any) {
  return String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function mdTable(headers: string[], rows: string[][]) {
  const h = `| ${headers.map(mdEscape).join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(mdEscape).join(' | ')} |`).join('\n');
  return [h, sep, body].filter(Boolean).join('\n');
}

function buildSeasonPacketMarkdown(input: { seasonNameAr: string; seasonCode: string; plan: any; created: any[]; organizationId: string }) {
  const plan = input.plan || {};
  const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];
  const kpis = Array.isArray(plan.kpis) ? plan.kpis : [];

  const scheduleRows = schedule.slice(0, 60).map((e: any) => [
    String(e.dayIndex || ''),
    String(e.date || '').slice(0, 10),
    String(e.titleAr || ''),
    String(e.region || plan.region || ''),
    String(e.format || ''),
    String(e.suggestedBudgetSar || ''),
  ]);

  const deck = [
    `# عرض الموسم: ${input.seasonNameAr}`,
    '',
    `## ملخص تنفيذي`,
    `- كود الموسم: ${input.seasonCode}`,
    `- المنطقة: ${plan.region || 'السعودية'}`,
    `- مدة الموسم: ${plan.durationDays || ''} يوم`,
    `- عدد الفعاليات: ${plan.eventsCount || ''}`,
    `- الميزانية التقديرية: ${plan.budgetSar || ''} ريال`,
    '',
    `## مؤشرات مستهدفة`,
    ...kpis.map((k: any) => `- ${k.key}: ${k.target}`),
    '',
    `## رزنامة مختصرة`,
    mdTable(['اليوم', 'التاريخ', 'الفعالية', 'المنطقة', 'النوع', 'الميزانية'], scheduleRows),
  ].join('\n');

  const strategy = [
    `# استراتيجية الموسم: ${input.seasonNameAr}`,
    '',
    `## لماذا هذا الموسم`,
    `- تحويل المخزون الثقافي إلى برامج قابلة للتنفيذ وقياس الأثر`,
    `- ضبط الحوكمة قبل العرض الرسمي وربط القرارات بالمخرجات`,
    '',
    `## فلسفة البناء`,
    `- دليل قبل السردية`,
    `- تجربة قبل التنفيذ`,
    `- قياس أثر قبل تكرار`,
    '',
    `## خريطة التشغيل`,
    `- توليد برامج + مشاريع تشغيلية`,
    `- إنشاء موافقات للجهات`,
    `- إنشاء Checklists للتراخيص حسب المنطقة/النوع`,
    `- تحويل النتائج إلى حزم اعتماد قابلة للتصدير`,
  ].join('\n');

  const ops = [
    `# الدراسة التشغيلية للموسم: ${input.seasonNameAr}`,
    '',
    `## ما الذي تم توليده داخل النظام`,
    `- مشاريع تشغيلية: ${input.created?.filter((x) => x.projectId).length || 0}`,
    `- طلبات موافقة: ${input.created?.filter((x) => x.approvalId).length || 0}`,
    `- Workflows: ${input.created?.filter((x) => x.workflowExecutionId).length || 0}`,
    `- Checklists تراخيص: ${input.created?.filter((x) => x.licensingChecklistId).length || 0}`,
    '',
    `## مخاطر تشغيلية مختصرة`,
    `- التراخيص: اختلاف المتطلبات حسب المدينة/الجهة`,
    `- الحشود والسلامة: تزداد التعقيدات مع الحضور المتوقع`,
    `- المحتوى: يحتاج دليل ومراجعة قبل النشر`,
    '',
    `## خطة متابعة`,
    `- تحديث الالتزامات تلقائيًا من الكراسات أو من قوائم التراخيص`,
    `- جدولة تذكيرات قبل المواعيد`,
    `- سجل تغييرات وأثر لكل فعالية`,
  ].join('\n');

  const packet = [
    `# حزمة اعتماد تشغيل موسم: ${input.seasonNameAr}`,
    '',
    `## قرار اعتماد`,
    `هذه الحزمة وثيقة تشغيلية داخلية قابلة للتقديم للجهات لاعتماد الموسم أو اعتماد أجزاء منه، مع إتاحة التصدير بصيغة PDF و PPTX.`,
    '',
    `## بيانات أساسية`,
    `- الجهة: ${input.organizationId}`,
    `- كود الموسم: ${input.seasonCode}`,
    `- المنطقة: ${plan.region || 'السعودية'}`,
    '',
    `## المخرجات`,
    `- عرض الموسم (PPTX)`,
    `- وثائق داعمة (PDF)`,
    `- Bundle ZIP للتسليم`,
  ].join('\n');

  return { deck, strategy, ops, packet };
}

function buildEventPacketMarkdown(input: { seasonNameAr: string; seasonCode: string; event: any; createdRow: any; organizationId: string }) {
  const e = input.event || {};
  const deck = [
    `# عرض فعالية ضمن الموسم: ${input.seasonNameAr}`,
    '',
    `## تعريف الفعالية`,
    `- العنوان: ${e.titleAr || ''}`,
    `- التاريخ: ${String(e.date || '').slice(0,10)}`,
    `- المنطقة: ${e.region || ''}`,
    `- النوع: ${e.format || ''}`,
    `- الميزانية التقديرية: ${e.suggestedBudgetSar || ''} ريال`,
    '',
    `## أصول مقترحة`,
    ...(Array.isArray(e.assetsSuggested) ? e.assetsSuggested.slice(0, 12).map((a: any) => `- ${a}`) : []),
  ].join('\n');

  const strategy = [
    `# استراتيجية الفعالية`,
    '',
    `## السردية المبنية على دليل`,
    `- لا يتم اعتماد نص العرض النهائي قبل إرفاق Evidence Pack`,
    '',
    `## الجمهور`,
    `- ${e.audience || 'حسب تحديد الجهة'}`,
    '',
    `## مؤشرات`,
    ...(Array.isArray(e.kpis) ? e.kpis.map((k: any) => `- ${k.key}: ${k.target || ''}`) : []),
  ].join('\n');

  const ops = [
    `# دراسة تشغيلية مختصرة`,
    '',
    `## نقاط تشغيل`,
    `- جاهزية الموقع والطاقم والمواد`,
    `- سلامة الحشود والطوارئ`,
    `- التراخيص والتصاريح`,
    '',
    `## روابط داخل النظام`,
    input.createdRow?.licensingChecklistId ? `- Checklist تراخيص: ${input.createdRow.licensingChecklistId}` : `- Checklist تراخيص: غير متوفر`,
    input.createdRow?.approvalId ? `- طلب موافقة: ${input.createdRow.approvalId}` : `- طلب موافقة: غير متوفر`,
  ].join('\n');

  const packet = [
    `# حزمة اعتماد تشغيل فعالية`,
    '',
    `## بيانات`,
    `- كود الموسم: ${input.seasonCode}`,
    `- الفعالية: ${e.titleAr || ''}`,
    `- التاريخ: ${String(e.date || '').slice(0,10)}`,
    '',
    `## مخرجات التسليم`,
    `- عرض PPTX`,
    `- PDF تشغيل`,
    `- Bundle ZIP`,
  ].join('\n');

  return { deck, strategy, ops, packet };
}


@Injectable()
export class SeasonsService {
  constructor(
    private readonly programs: ProgramsService,
    private readonly projects: ProjectsService,
    private readonly workflows: WorkflowsService,
    private readonly approvals: ApprovalsService,
    private readonly compliance: ComplianceService,
    private readonly approvalPackets: ApprovalPacketsService,
    private readonly exports: ExportsService,
  ) {}

  async generate(dto: any, user?: RequestUser) {
    const organizationId = String(dto.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const durationDays = Math.max(7, Math.min(180, Number(dto.durationDays || 30)));
    const eventsCount = Math.max(5, Math.min(60, Number(dto.eventsCount || 12)));
    const budgetSar = Math.max(10000, Math.min(200000000, Number(dto.budgetSar || 250000)));

    const all = generateSaudiCultureIdeaCards(400);
    const filtered = filterIdeaCards(all, {
      region: dto.region || undefined,
      theme: dto.theme || undefined,
      format: dto.format || undefined,
      audience: dto.audience || undefined,
      limit: 200,
    });

    if (!filtered.length) throw new BadRequestException('لا توجد أفكار مطابقة للفلاتر الحالية');

    const rnd = mulberry32(seedFromString(JSON.stringify({ organizationId, ...dto })));

    const picks: any[] = [];
    for (let i = 0; i < eventsCount; i++) {
      const idx = Math.floor(rnd() * filtered.length);
      picks.push(filtered[idx]);
    }

    const start = new Date();
    const schedule = picks.map((c, i) => {
      const day = Math.floor((i * durationDays) / eventsCount);
      const date = new Date(start.getTime() + day * 24 * 3600 * 1000);
      const cost = Math.round((budgetSar / eventsCount) * (0.6 + rnd() * 0.8));
      return {
        dayIndex: day + 1,
        date: date.toISOString().slice(0, 10),
        titleAr: c.titleAr,
        descriptionAr: c.descriptionAr,
        format: c.format,
        theme: c.theme,
        audience: c.audience,
        region: c.region,
        suggestedBudgetSar: cost,
        kpis: c.kpis,
        assetsSuggested: c.assetsSuggested,
        workflowHints: c.workflowHints,
      };
    });

    // KPIs aggregation
    const kpiKeys = new Set<string>();
    for (const e of schedule) for (const k of e.kpis || []) kpiKeys.add(k.key);
    const kpis = Array.from(kpiKeys).map((key) => ({ key, target: key === 'visitors' ? 5000 : key === 'revenue' ? Math.round(budgetSar * 1.2) : 85 }));

    return {
      ok: true,
      organizationId,
      plan: {
        region: dto.region || null,
        durationDays,
        eventsCount,
        budgetSar,
        kpis,
        schedule,
      },
    };
  }

  async generatePrograms(dto: any, user?: RequestUser) {
    const generated = await this.generate(dto, user);
    const organizationId = String((generated as Record<string, unknown>).organizationId);
    assertOrgAccess(user, organizationId);

    const plan = (generated as Record<string, unknown>).plan;
    const now = new Date();
    const seasonCode = String(dto.seasonCode || `SEASON-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(plan.region || 'KSA').slice(0, 6)}`);
    const seasonNameAr = String(dto.seasonNameAr || `موسم ثقافي ${plan.region || 'السعودية'} ${now.getFullYear()}`);

    const autoCreateProjects = dto.autoCreateProjects !== false;
    const autoCreateApprovals = dto.autoCreateApprovals !== false;
    const autoSubmitApprovals = dto.autoSubmitApprovals === true;
    const autoEnqueueWorkflows = dto.autoEnqueueWorkflows !== false;
    const autoGenerateLicensingChecklist = dto.autoGenerateLicensingChecklist !== false;

    // 1) Create season program
    const seasonProgram = await this.programs.create(
      {
        organizationId,
        code: seasonCode,
        nameAr: seasonNameAr,
        description: `خطة موسم ثقافي مولّدة آليًا (${plan.durationDays} يوم / ${plan.eventsCount} فعالية)`,
        status: 'draft',
        strategicValueScore: 85,
        readinessScore: 0,
        portfolioValueSar: Number(plan.budgetSar || 0),
        metadata: {
          kind: 'season_program',
          region: plan.region,
          theme: dto.theme || null,
          format: dto.format || null,
          audience: dto.audience || null,
          kpis: plan.kpis,
          schedule: plan.schedule,
          generatedAt: now.toISOString(),
        },
        projectIds: [],
        workflowInstanceIds: [],
      },
      user,
    );

    const created: any[] = [];

    const visitorsTargetSeason = (plan.kpis || []).find((k: any) => k.key === 'visitors')?.target || 0;
    const visitorsPerEvent = plan.eventsCount ? Math.round(Number(visitorsTargetSeason || 0) / Number(plan.eventsCount || 1)) : 0;

    // 2) Create operational programs as projects + workflow executions + approvals
    for (let i = 0; i < (plan.schedule || []).length; i++) {
      const e = plan.schedule[i];
      const eventCode = `EVT-${seasonCode}-${String(i + 1).padStart(2, '0')}`;
      const due = new Date(new Date(e.date).getTime() + 7 * 24 * 3600 * 1000);

      let project: any = null;
      if (autoCreateProjects) {
        project = await this.projects.create({
          organizationId,
          code: eventCode,
          nameAr: String(e.titleAr || `فعالية ${i + 1}`),
          status: 'draft',
          progressPercent: 0,
          startDate: e.date,
          endDate: e.date,
        } as any);
        await this.programs.attachProject(seasonProgram.id, project.id).catch(() => void 0);
      }

      let approval: any = null;
      if (autoCreateApprovals && project?.id) {
        approval = await this.approvals.create(
          {
            organizationId,
            entityType: 'project',
            entityId: project.id,
            title: `اعتماد تشغيل فعالية: ${String(e.titleAr || eventCode)}`,
            dueAt: due.toISOString(),
            contextDomain: 'events',
            contextRegion: e.region || plan.region || null,
            payloadSnapshot: {
              seasonCode,
              eventCode,
              schedule: e,
              budgetSar: e.suggestedBudgetSar,
            },
          } as any,
          user,
        );
        if (approval?.id && autoSubmitApprovals) {
          await this.approvals.submit(approval.id, user).catch(() => void 0);
        }
      }

      let workflowExecution: any = null;
      if (autoEnqueueWorkflows && project?.id) {
        workflowExecution = await this.workflows.enqueueExecution({
          templateId: 'wf_events_operations_readiness_event_created',
          organizationId,
          projectId: project.id,
          priority: 'normal',
          inputs: {
            organizationId,
            projectId: project.id,
            brief: `جاهزية تشغيل فعالية ضمن الموسم: ${seasonNameAr}\nالفعالية: ${e.titleAr}\nالمنطقة: ${e.region || plan.region || 'غير محدد'}\nالتاريخ: ${e.date}`,
            deadline: e.date,
            metadata: {
              seasonProgramId: seasonProgram.id,
              seasonCode,
              eventCode,
              theme: e.theme,
              format: e.format,
              audience: e.audience,
              suggestedBudgetSar: e.suggestedBudgetSar,
              kpis: e.kpis,
              assetsSuggested: e.assetsSuggested,
              workflowHints: e.workflowHints,
              approvalId: approval?.id || null,
            },
          },
          autoStart: false,
          hasKnowledge: true,
          hasApprovalActor: true,
        } as any);
      }

      let licensing: any = null;
      if (autoGenerateLicensingChecklist && project?.id) {
        licensing = await this.compliance.generateKsaEventLicensingChecklist(
          {
            organizationId,
            subjectType: 'project',
            subjectId: project.id,
            region: e.region || plan.region || undefined,
            city: undefined,
            eventFormat: e.format || undefined,
            expectedAttendance: visitorsPerEvent,
            hasFood: false,
            usesAmplifiedSound: false,
            includesFilming: false,
          } as any,
          user,
        ).catch(() => null);
      }

      created.push({
        index: i + 1,
        eventCode,
        projectId: project?.id || null,
        approvalId: approval?.id || null,
        workflowExecutionId: (workflowExecution as any)?.execution?.id || (workflowExecution as any)?.executionId || (workflowExecution as any)?.execution?.id || null,
        licensingChecklistId: licensing?.checklist?.id || null,
      });
    }

    const updatedSeasonProgram = await this.programs.update(seasonProgram.id, {
      metadata: {
        ...(seasonProgram as Record<string, unknown>).metadata,
        created,
      },
    }).catch(() => seasonProgram);

    // Wave49: تحويل الموسم إلى تشغيل كامل مع Packets جاهزة للتصدير (PDF/PPTX)
    const autoGenerateSeasonPacket = dto.autoGenerateSeasonPacket === true;
    const autoExportSeasonPacket = dto.autoExportSeasonPacket === true;
    const autoGenerateEventPackets = dto.autoGenerateEventPackets === true;
    const autoExportEventPackets = dto.autoExportEventPackets === true;
    const maxEventPackets = Math.max(1, Math.min(60, Number(dto.maxEventPackets || 12)));

    let seasonPacket: any = null;
    let seasonExport: any = null;

    if (autoGenerateSeasonPacket) {
      const md = buildSeasonPacketMarkdown({ seasonNameAr, seasonCode, plan, created, organizationId });
      const packRes = await this.approvalPackets.generateManualPacket({
        organizationId,
        titleAr: `تشغيل موسم: ${seasonNameAr}`,
        deckMarkdown: md.deck,
        strategyMarkdown: md.strategy,
        opsMarkdown: md.ops,
        packetMarkdown: md.packet,
        metaJson: { kind: 'season_packet', seasonProgramId: updatedSeasonProgram.id, seasonCode, created },
      } as any);

      seasonPacket = (packRes as any)?.packet || null;

      // Create an approval draft linked to this packet (best-effort)
      try {
        const packetContentId = ((seasonPacket as any)?.artifacts?.contentItemIds || [])[3];
        if (seasonPacket?.id && packetContentId) {
          await this.approvals.create({
            organizationId,
            entityType: 'content',
            entityId: packetContentId,
            title: `اعتماد تشغيل موسم: ${seasonNameAr}`,
            dueAt: null,
            contextDomain: 'events',
            contextRegion: plan.region || null,
            payloadSnapshot: { approvalPacketId: seasonPacket.id, approvalPacketContentId: packetContentId, seasonProgramId: updatedSeasonProgram.id, seasonCode },
          } as any, user).catch(() => null);
        }
      } catch {
        // ignore
      }

      if (autoExportSeasonPacket && seasonPacket?.id) {
        seasonExport = await this.exports.requestExportForApprovalPacket(
          seasonPacket.id,
          {
            organizationId,
            includePptx: true,
            includePdf: true,
            includeBundleZip: true,
            includeSignatures: true,
            refineWithLlm: false,
            pageSize: 'A4',
            async: false,
            recipientNameAr: (dto as Record<string, unknown>).recipientNameAr,
            recipientNameEn: (dto as Record<string, unknown>).recipientNameEn,
            recipientKind: (dto as Record<string, unknown>).recipientKind,
          } as any,
          user,
        ).catch(() => null);
      }
    }

    const eventPackets: any[] = [];
    if (autoGenerateEventPackets) {
      for (let i = 0; i < Math.min(maxEventPackets, created.length); i++) {
        const cr = created[i];
        if (!cr?.projectId) continue;
        const e = (plan.schedule || [])[i] || {};
        const md = buildEventPacketMarkdown({ seasonNameAr, seasonCode, event: e, createdRow: cr, organizationId });

        const packRes = await this.approvalPackets.generateManualPacket({
          organizationId,
          projectId: cr.projectId,
          titleAr: `تشغيل فعالية: ${String(e.titleAr || cr.eventCode)}`,
          deckMarkdown: md.deck,
          strategyMarkdown: md.strategy,
          opsMarkdown: md.ops,
          packetMarkdown: md.packet,
          metaJson: { kind: 'event_packet', seasonProgramId: updatedSeasonProgram.id, seasonCode, eventCode: cr.eventCode, createdRow: cr },
        } as any);

        const pkt = (packRes as any)?.packet || null;

        // Create an approval draft linked to this event packet (best-effort)
        try {
          const packetContentId = ((pkt as any)?.artifacts?.contentItemIds || [])[3];
          if (pkt?.id && packetContentId) {
            await this.approvals.create({
              organizationId,
              entityType: 'content',
              entityId: packetContentId,
              title: `اعتماد تشغيل فعالية: ${String(e.titleAr || cr.eventCode)}`,
              dueAt: null,
              contextDomain: 'events',
              contextRegion: e.region || plan.region || null,
              payloadSnapshot: { approvalPacketId: pkt.id, approvalPacketContentId: packetContentId, projectId: cr.projectId, seasonCode, eventCode: cr.eventCode },
            } as any, user).catch(() => null);
          }
        } catch {
          // ignore
        }

        let exp: any = null;
        if (autoExportEventPackets && pkt?.id) {
          exp = await this.exports.requestExportForApprovalPacket(
            pkt.id,
            {
              organizationId,
              includePptx: true,
              includePdf: true,
              includeBundleZip: true,
              includeSignatures: true,
              refineWithLlm: false,
              pageSize: 'A4',
              async: false,
              recipientNameAr: (dto as Record<string, unknown>).recipientNameAr,
              recipientNameEn: (dto as Record<string, unknown>).recipientNameEn,
              recipientKind: (dto as Record<string, unknown>).recipientKind,
            } as any,
            user,
          ).catch(() => null);
        }

        eventPackets.push({ index: cr.index, eventCode: cr.eventCode, projectId: cr.projectId, approvalId: cr.approvalId, licensingChecklistId: cr.licensingChecklistId, packet: pkt, export: exp });
      }
    }

    return {
      ok: true,
      organizationId,
      seasonProgram: updatedSeasonProgram,
      plan,
      created,
      seasonPacket,
      seasonExport,
      eventPackets,
    };
  }
}
