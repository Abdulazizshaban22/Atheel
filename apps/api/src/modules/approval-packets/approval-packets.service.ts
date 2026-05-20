import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { randomUUID } from 'crypto';
import { AttachmentsApplicationService } from '../attachments/attachments.application-service';
import { ContentApplicationService } from '../content/content.application-service';
import { AiService } from '../ai/ai.service';
import { buildApprovalPacketSections } from '@madar/packet-kernel';
import { throwIfProdDbError } from '../../common/db-fallback';

function nowIso(){ return new Date().toISOString(); }
function safeJson(s: string){ try { return JSON.parse(s); } catch { return {}; } }

type ManualContentCreateInput = {
  organizationId: string;
  projectId?: string;
  title: string;
  languageCode: 'ar' | 'en';
  contentType: 'article' | 'stop_text' | 'audio_script' | 'label' | 'educational' | 'campaign' | 'presentation' | 'strategy' | 'feasibility' | 'approval_packet';
  status?: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
  summary: string;
};

type MarkdownAttachmentResult = { id: string };

type MarkdownUploadInput = {
  organizationId: string;
  entityId: string;
  filename: string;
  markdown: string;
};

@Injectable()
export class ApprovalPacketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: AttachmentsApplicationService,
    private readonly content: ContentApplicationService,
    private readonly ai: AiService,
  ) {}

  async list(params?: { organizationId?: string; projectId?: string; experienceId?: string; twinId?: string }) {
    try {
      const rows = await (this.prisma as Record<string, unknown>).approvalPacket.findMany({
        where: {
          ...(params?.organizationId ? { organizationId: params.organizationId } : {}),
          ...(params?.projectId ? { projectId: params.projectId } : {}),
          ...(params?.experienceId ? { experienceId: params.experienceId } : {}),
          ...(params?.twinId ? { twinId: params.twinId } : {}),
        },
        orderBy: { generatedAt: 'desc' },
        take: 200,
      });
      const items = (rows || []).map((r: any) => ({
        id: r.id,
        organizationId: r.organizationId || undefined,
        projectId: r.projectId || undefined,
        experienceId: r.experienceId || undefined,
        twinId: r.twinId || undefined,
        simulationRunId: r.simulationRunId,
        scenarioKey: r.scenarioKey,
        title: r.title,
        status: r.status,
        version: r.version,
        sections: safeJson(r.sectionsJson || '{}'),
        artifacts: safeJson(r.artifactsJson || '{}'),
        generatedAt: r.generatedAt ? new Date(r.generatedAt).toISOString() : nowIso(),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : nowIso(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : nowIso(),
      }));
      return { count: items.length, items };
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalPacketsService.list');
      const rows = await this.prisma.approvalPacket.findMany({}).filter((p) =>
        (!params?.organizationId || p.organizationId === params.organizationId) &&
        (!params?.projectId || p.projectId === params.projectId) &&
        (!params?.experienceId || p.experienceId === params.experienceId) &&
        (!params?.twinId || p.twinId === params.twinId)
      );
      return { count: rows.length, items: rows };
    }
  }

  async get(id: string) {
    try {
      const r = await (this.prisma as Record<string, unknown>).approvalPacket.findUnique({ where: { id } });
      if (!r) throw new NotFoundException('Approval packet not found');
      const item: ApprovalPacketRecord = {
        id: r.id,
        organizationId: r.organizationId || undefined,
        projectId: r.projectId || undefined,
        experienceId: r.experienceId || undefined,
        twinId: r.twinId || undefined,
        simulationRunId: r.simulationRunId,
        scenarioKey: r.scenarioKey,
        title: r.title,
        status: r.status,
        version: r.version,
        sections: safeJson(r.sectionsJson || '{}') as any,
        artifacts: safeJson(r.artifactsJson || '{}') as any,
        generatedAt: r.generatedAt ? new Date(r.generatedAt).toISOString() : nowIso(),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : nowIso(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : nowIso(),
      };
      return { ok: true, item };
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalPacketsService.get');
      const row = await this.prisma.approvalPacket.findUnique({ where: { id: id } });
      if (!row) throw new NotFoundException('Approval packet not found');
      return { ok: true, item: row };
    }
  }

  
  /** Wave49: Generate a packet from provided markdown (season/program bundles, manual packs). */
  async generateManualPacket(dto: { organizationId: string; projectId?: string; titleAr: string; deckMarkdown: string; strategyMarkdown: string; opsMarkdown: string; packetMarkdown: string; metaJson?: any }) {
    const orgId = dto.organizationId || 'org_demo_1';
    const projId = dto.projectId;

    const id = `apk_${randomUUID().slice(0, 8)}`;
    const ts = nowIso();
    const artifactsMeta: any = { contentItemIds: [], attachmentIds: [] };

    const deckContent = await this.createContentItem({
      organizationId: orgId,
      projectId: projId || undefined,
      title: `عرض — ${dto.titleAr}`,
      languageCode: 'ar',
      contentType: 'presentation',
      status: 'draft',
      summary: 'Outline مولّد للحزمة',
    });

    const strategyContent = await this.createContentItem({
      organizationId: orgId,
      projectId: projId || undefined,
      title: `استراتيجية — ${dto.titleAr}`,
      languageCode: 'ar',
      contentType: 'strategy',
      status: 'draft',
      summary: 'محاور استراتيجية للحزمة',
    });

    const opsContent = await this.createContentItem({
      organizationId: orgId,
      projectId: projId || undefined,
      title: `الدراسة التشغيلية — ${dto.titleAr}`,
      languageCode: 'ar',
      contentType: 'feasibility',
      status: 'draft',
      summary: 'تشغيل ومخاطر وخطة متابعة',
    });

    const packetContent = await this.createContentItem({
      organizationId: orgId,
      projectId: projId || undefined,
      title: `حزمة الاعتماد الرسمية — ${dto.titleAr}`,
      languageCode: 'ar',
      contentType: 'approval_packet',
      status: 'draft',
      summary: 'وثيقة قرار واعتماد للحزمة',
    });

    artifactsMeta.contentItemIds.push(deckContent.id, strategyContent.id, opsContent.id, packetContent.id);

    const uploadedDeck = await this.uploadMarkdownAttachment({ organizationId: orgId, entityId: deckContent.id, filename: `pack_deck_${id}.md`, markdown: dto.deckMarkdown });

    const uploadedStrategy = await this.uploadMarkdownAttachment({ organizationId: orgId, entityId: strategyContent.id, filename: `pack_strategy_${id}.md`, markdown: dto.strategyMarkdown });

    const uploadedOps = await this.uploadMarkdownAttachment({ organizationId: orgId, entityId: opsContent.id, filename: `pack_ops_${id}.md`, markdown: dto.opsMarkdown });

    const uploadedPacket = await this.uploadMarkdownAttachment({ organizationId: orgId, entityId: packetContent.id, filename: `pack_packet_${id}.md`, markdown: dto.packetMarkdown });

    artifactsMeta.attachmentIds.push(uploadedDeck.id, uploadedStrategy.id, uploadedOps.id, uploadedPacket.id);

    const record: ApprovalPacketRecord = {
      id,
      organizationId: orgId,
      projectId: projId || undefined,
      experienceId: undefined,
      twinId: undefined,
      simulationRunId: `manual_${id}`,
      scenarioKey: 'manual',
      title: dto.titleAr,
      status: 'draft',
      version: 1,
      sections: { kind: 'manual', metaJson: dto.metaJson || null },
      artifacts: artifactsMeta,
      generatedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    };

    await this.prisma.approvalPacket.upsert({ where: { id: (record).id }, update: record, create: record });
    return { ok: true, packet: record, contentItemIds: artifactsMeta.contentItemIds, attachmentIds: artifactsMeta.attachmentIds };
  }


/** Generate formal approval packet + artifacts (deck outline, strategy, ops study) and link to ContentItems + Attachments. */
  async generate(dto: { organizationId?: string; projectId?: string; experienceId?: string; twinId: string; simulationRunId: string; scenarioKey?: string; workspaceId?: string; providerId?: string }) {
    let sim: any = null;
    let t: any = null;
    try {
      sim = await (this.prisma as Record<string, unknown>).twinSimulationRun.findUnique({ where: { id: dto.simulationRunId } });
      if (!sim) throw new NotFoundException('Twin simulation run not found');
      if (String(sim.twinId) !== String(dto.twinId)) throw new NotFoundException('Simulation does not belong to the supplied twin');

      t = await (this.prisma as Record<string, unknown>).twin.findUnique({ where: { id: dto.twinId } });
      if (!t) throw new NotFoundException('Twin not found');
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalPacketsService.generate.loadTwinSim');
      sim = await this.prisma.twinSimulationRun.findUnique({ where: { id: dto.simulationRunId } });
      if (!sim) throw new NotFoundException('Twin simulation run not found');
      if (sim.twinId !== dto.twinId) throw new NotFoundException('Simulation does not belong to the supplied twin');
      t = await this.prisma.twin.findUnique({ where: { id: dto.twinId } });
      if (!t) throw new NotFoundException('Twin not found');
    }

    const simResult = safeJson(sim.resultJson);
    const scenarioKey = dto.scenarioKey || 'baseline';

    const baseline = (simResult && simResult.baseline && simResult.baseline.kpis) ? simResult.baseline : simResult;
    const kpis = {
      congestionScore0to100: Number(baseline?.kpis?.congestionScore0to100 ?? 0),
      completionRatePct: Number(baseline?.kpis?.completionRatePct ?? 0),
      predictedSatisfaction0to100: Number(baseline?.kpis?.predictedSatisfaction0to100 ?? 0),
      visitorsSimulated: Number(baseline?.totals?.visitorsSimulated ?? 0),
      completedVisitors: Number(baseline?.totals?.completedVisitors ?? 0),
      avgTotalTimeSeconds: Number(baseline?.totals?.avgTotalTimeSeconds ?? 0),
      avgWaitSeconds: Number(baseline?.totals?.avgWaitSeconds ?? 0),
      avgTravelSeconds: Number(baseline?.totals?.avgTravelSeconds ?? 0),
    };

    const bottlenecks = Array.isArray(baseline?.bottlenecks) ? baseline.bottlenecks.map((b: any) => ({
      nodeId: String(b.nodeId),
      nameAr: String(b.nameAr),
      peakUtilizationPct: Number(b.peakUtilizationPct ?? 0),
      avgWaitSeconds: Number(b.avgWaitSeconds ?? 0),
      capacity: Number(b.capacity ?? 0),
      peakOccupancy: Number(b.peakOccupancy ?? 0),
    })) : [];

    const profile = baseline?.profile || safeJson(sim.profileJson);

    const experienceId = dto.experienceId || (t.metadata as Record<string, unknown>)?.experienceId;
    let experience: any = undefined;
    try {
      if (experienceId) {
        experience = await (this.prisma as Record<string, unknown>).visitorExperience.findUnique({ where: { id: String(experienceId) } });
      } else {
        experience = await (this.prisma as Record<string, unknown>).visitorExperience.findFirst({ where: { twinId: String(t.id) } });
      }
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalPacketsService.generate.loadExperience');
      experience = experienceId ? await this.prisma.visitorExperience.findUnique({ where: { id: experienceId as any } }) : undefined;
    }

    const orgId = dto.organizationId || t.organizationId || 'org_demo_1';
    const projId = dto.projectId || t.projectId;

    // Wave55: unify official delivery with: Risks + Visitor Guide + Impact + Simulation KPIs
    const { risks, guides, impact } = await this.loadUnifiedDeliverySignals({ organizationId: orgId, projectId: projId, experienceId: experience?.id || experienceId, twinId: t.id });

    // Retrieve-only RAG contexts to provide citations (no hallucination). If none exists, it returns empty.
    const rag = await this.ai.ragQuery({
      query: `مصادر موثوقة للسردية الثقافية المرتبطة بتجربة ${experience?.titleAr || t.nameAr}`,
      organizationId: orgId,
      projectId: projId,
      topK: 5,
      synthesize: false,
    } as any);

    const citations = Array.isArray((rag as any)?.contexts)
      ? (rag as Record<string, unknown>).contexts.slice(0, 5).map((c: any) => ({
          titleAr: String(c.title || c.documentId || 'مرجع داخلي'),
          url: undefined,
          noteAr: `chunk ${c.chunkId} (score ${c.score})`,
        }))
      : [];

    const titleAr = `حزمة اعتماد: ${experience?.titleAr || t.nameAr}`;

    const sections = buildApprovalPacketSections({
      titleAr,
      projectNameAr: dto.projectId,
      experienceTitleAr: experience?.titleAr,
      twinNameAr: t.nameAr,
      scenarioKey,
      generatedAtIso: nowIso(),
      kpis,
      bottlenecks,
      profile,
      citations,
      scenarioNotesAr: (simResult?.scenarios && Array.isArray(simResult.scenarios)) ? ['تم تضمين سيناريوهات متعددة في هذا التشغيل.'] : undefined,
    });

    // Append unified signals into the operational feasibility + packet docs
    sections.artifacts.operationalFeasibilityMarkdown = String(sections.artifacts.operationalFeasibilityMarkdown || '') + '\n\n' + this.buildUnifiedOpsAppendix({ risks, impact, guides });
    sections.artifacts.packetMarkdown = String(sections.artifacts.packetMarkdown || '') + '\n\n' + this.buildUnifiedPacketAppendix({ risks, impact, guides });

    const id = `apk_${randomUUID().slice(0, 8)}`;
    const ts = nowIso();

    const artifactsMeta: any = { contentItemIds: [], attachmentIds: [] };

    // Create ContentItems + attach generated markdown artifacts
    // orgId/projId defined earlier

    const deckContent = await this.createContentItem({
      organizationId: orgId,
      projectId: projId || undefined,
      title: `عرض الفعالية — ${experience?.titleAr || t.nameAr}`,
      languageCode: 'ar',
      contentType: 'presentation',
      status: 'draft',
      summary: `Outline تلقائي مبني على المحاكاة: رضا ${kpis.predictedSatisfaction0to100}/100، ازدحام ${kpis.congestionScore0to100}/100، إكمال ${kpis.completionRatePct}%.`,
    });

    const strategyContent = await this.createContentItem({
      organizationId: orgId,
      projectId: projId || undefined,
      title: `استراتيجية التجربة — ${experience?.titleAr || t.nameAr}`,
      languageCode: 'ar',
      contentType: 'strategy',
      status: 'draft',
      summary: `إطار استراتيجي مبني على نتائج المحاكاة مع أهداف وقياس وتحسين.`,
    });

    const opsContent = await this.createContentItem({
      organizationId: orgId,
      projectId: projId || undefined,
      title: `الدراسة التشغيلية — ${experience?.titleAr || t.nameAr}`,
      languageCode: 'ar',
      contentType: 'feasibility',
      status: 'draft',
      summary: `دراسة تشغيلية مبسطة: افتراضات + موارد + مخاطر + توصيات قبل الإطلاق.`,
    });

    const packetContent = await this.createContentItem({
      organizationId: orgId,
      projectId: projId || undefined,
      title: `حزمة الاعتماد الرسمية — ${experience?.titleAr || t.nameAr}`,
      languageCode: 'ar',
      contentType: 'approval_packet',
      status: 'draft',
      summary: `ملخص رسمي وقرار اعتماد مبني على محاكاة التوأم الرقمي.`,
    });

    artifactsMeta.contentItemIds.push(deckContent.id, strategyContent.id, opsContent.id, packetContent.id);

    const uploadedDeck = await this.uploadMarkdownAttachment({ organizationId: orgId, entityId: deckContent.id, filename: `event_deck_outline_${id}.md`, markdown: sections.artifacts.eventDeckOutlineMarkdown });

    const uploadedStrategy = await this.uploadMarkdownAttachment({ organizationId: orgId, entityId: strategyContent.id, filename: `event_strategy_${id}.md`, markdown: sections.artifacts.strategyMarkdown });

    const uploadedOps = await this.uploadMarkdownAttachment({ organizationId: orgId, entityId: opsContent.id, filename: `operational_feasibility_${id}.md`, markdown: sections.artifacts.operationalFeasibilityMarkdown });

    const uploadedPacket = await this.uploadMarkdownAttachment({ organizationId: orgId, entityId: packetContent.id, filename: `approval_packet_${id}.md`, markdown: sections.artifacts.packetMarkdown });

    artifactsMeta.attachmentIds.push(uploadedDeck.id, uploadedStrategy.id, uploadedOps.id, uploadedPacket.id);

    const record: ApprovalPacketRecord = {
      id,
      organizationId: orgId,
      projectId: projId || undefined,
      experienceId: experienceId || undefined,
      twinId: t.id,
      simulationRunId: dto.simulationRunId,
      scenarioKey,
      title: titleAr,
      status: 'draft',
      version: 1,
      sections: sections as any,
      artifacts: artifactsMeta,
      generatedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    };

    await this.prisma.approvalPacket.upsert({ where: { id: (record).id }, update: record, create: record });

    // Link back to Twin metadata for easy discovery in UI/approvals
    try {
      const twin = await this.prisma.twin.findUnique({ where: { id: t.id } });
      if (twin) {
        const md = { ...(twin.metadata || {}), latestApprovalPacketId: record.id, latestSimulationRunId: dto.simulationRunId };
        await this.prisma.twin.upsert({ where: { id: ({ ...twin, metadata: md, updatedAt: nowIso().id }, update: { ...twin, metadata: md, updatedAt: nowIso(, create: { ...twin, metadata: md, updatedAt: nowIso( }) } as any);
        await this.safePrismaUpsert('twin', {
          where: { id: twin.id },
          update: { metadata: md },
          create: {
            id: twin.id,
            organizationId: (twin as Record<string, unknown>).organizationId ?? null,
            projectId: (twin as Record<string, unknown>).projectId ?? null,
            kind: (twin as Record<string, unknown>).kind,
            nameAr: (twin as Record<string, unknown>).nameAr,
            status: (twin as Record<string, unknown>).status ?? 'draft',
            coordinateSystem: (twin as Record<string, unknown>).coordinateSystem ?? 'local_xy',
            bboxJson: (twin as Record<string, unknown>).bboxJson ?? JSON.stringify({}),
            metadata: md,
          }
        });
      }
    } catch {
      // ignore
    }

    await this.safePrismaUpsert('approvalPacket', {
      where: { id: record.id },
      update: {
        organizationId: record.organizationId ?? null,
        projectId: record.projectId ?? null,
        experienceId: record.experienceId ?? null,
        twinId: record.twinId ?? null,
        simulationRunId: record.simulationRunId,
        scenarioKey: record.scenarioKey,
        title: record.title,
        status: record.status,
        version: record.version,
        sectionsJson: JSON.stringify(record.sections),
        artifactsJson: JSON.stringify(record.artifacts),
      },
      create: {
        id: record.id,
        organizationId: record.organizationId ?? null,
        projectId: record.projectId ?? null,
        experienceId: record.experienceId ?? null,
        twinId: record.twinId ?? null,
        simulationRunId: record.simulationRunId,
        scenarioKey: record.scenarioKey,
        title: record.title,
        status: record.status,
        version: record.version,
        sectionsJson: JSON.stringify(record.sections),
        artifactsJson: JSON.stringify(record.artifacts),
        // Keep DB generatedAt consistent with the canonical issuance timestamp used across exports/manifests.
        generatedAt: new Date(record.generatedAt),
      }
    });

    // Government-grade traceability: record an audit log entry for issuance/persistence.
    // (Actor may be null for automated runs; upstream can enrich actorUserId via a dedicated service later.)
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: record.organizationId ?? null,
          action: 'approval_packet_issued',
          entityType: 'ApprovalPacket',
          entityId: record.id,
          severity: 'info',
          message: 'Approval packet issued/persisted',
          after: {
            id: record.id,
            organizationId: record.organizationId ?? null,
            projectId: record.projectId ?? null,
            experienceId: record.experienceId ?? null,
            twinId: record.twinId ?? null,
            simulationRunId: record.simulationRunId,
            scenarioKey: record.scenarioKey,
            title: record.title,
            status: record.status,
            version: record.version,
            generatedAt: record.generatedAt,
          },
        } as any,
      });
    } catch {
      // ignore
    }

    return {
      ok: true,
      packet: record,
      artifacts: {
        contentItems: [deckContent, strategyContent, opsContent, packetContent],
        attachments: [uploadedDeck, uploadedStrategy, uploadedOps, uploadedPacket],
      },
      summary: {
        kpis,
        bottlenecks: bottlenecks.slice(0, 3),
      }
    };
  }

  private async safePrismaUpsert(model: string, args: any) {
    try {
      const m = (this.prisma as any)[model];
      if (!m?.upsert) return null;
      return await m.upsert(args);
    } catch {
      return null;
    }
  }

  private async loadUnifiedDeliverySignals(input: { organizationId: string; projectId?: string | null; experienceId?: string | null; twinId?: string | null }) {
    const whereOr: any[] = [];
    if (input.organizationId) whereOr.push({ organizationId: input.organizationId });
    if (input.projectId) whereOr.push({ projectId: input.projectId });
    if (input.experienceId) whereOr.push({ experienceId: input.experienceId });
    if (input.twinId) whereOr.push({ twinId: input.twinId });

    try {
      const risks = await (this.prisma as Record<string, unknown>).risk?.findMany?.({
        where: { OR: whereOr.length ? whereOr : undefined },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }) || [];
      const guides = input.experienceId
        ? (await (this.prisma as Record<string, unknown>).visitorGuide?.findMany?.({ where: { experienceId: String(input.experienceId) }, orderBy: { createdAt: 'desc' }, take: 6 })) || []
        : [];
      const impact = await (this.prisma as Record<string, unknown>).impactSnapshot?.findFirst?.({
        where: {
          OR: [
            ...(input.experienceId ? [{ experienceId: String(input.experienceId) }] : []),
            ...(input.twinId ? [{ twinId: String(input.twinId) }] : []),
            ...(input.projectId ? [{ projectId: String(input.projectId) }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      return { risks: risks || [], guides: guides || [], impact: impact || null };
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalPacketsService.loadUnifiedDeliverySignals');
      return { risks: [], guides: [], impact: null };
    }
  }

  private buildUnifiedOpsAppendix(input: { risks: any[]; guides: any[]; impact: any | null }) {
    const lines: string[] = [];
    lines.push('## ملحق: المخاطر والمرشد والأثر (مولّد تلقائيًا)');
    lines.push('');

    // Risks
    lines.push('### 1) سجل مخاطر مختصر');
    if (!input.risks?.length) {
      lines.push('- لا توجد مخاطر مسجلة حتى الآن لهذه التجربة/التوأم.');
    } else {
      lines.push('| المستوى | العنوان | الاحتمالية | الأثر | الدرجة | المعالجة |');
      lines.push('| --- | --- | --- | --- | --- | --- |');
      for (const r of input.risks.slice(0, 10)) {
        lines.push(`| ${String(r.level || '')} | ${String(r.titleAr || '')} | ${String(r.likelihood1to5 || '')} | ${String(r.impact1to5 || '')} | ${String(r.score ?? '')} | ${String(r.mitigationAr || '').slice(0, 80)} |`);
      }
    }
    lines.push('');

    // Visitor guides
    lines.push('### 2) مرشد الزائر (ملخص)');
    if (!input.guides?.length) {
      lines.push('- لا توجد أدلة زائر مولدة حتى الآن.');
    } else {
      for (const g of input.guides.slice(0, 6)) {
        lines.push(`- ${String(g.persona || 'persona')}: ${String(g.summaryAr || '').trim()}`);
      }
    }
    lines.push('');

    // Impact
    lines.push('### 3) الأثر الثقافي (آخر Snapshot)');
    if (!input.impact) {
      lines.push('- لم يتم تسجيل Impact Snapshot بعد.');
    } else {
      const score = Number(input.impact.score0to100 ?? 0);
      lines.push(`- درجة الأثر (0-100): ${score}`);
      try {
        const breakdown = safeJson(String(input.impact.breakdownJson || '{}'));
        const keys = Object.keys(breakdown || {}).slice(0, 8);
        if (keys.length) {
          lines.push('');
          lines.push('| المؤشر | القيمة |');
          lines.push('| --- | --- |');
          for (const k of keys) lines.push(`| ${k} | ${String((breakdown as any)[k])} |`);
        }
      } catch {
        // ignore
      }
    }
    return lines.join('\n');
  }

  private buildUnifiedPacketAppendix(input: { risks: any[]; guides: any[]; impact: any | null }) {
    const lines: string[] = [];
    lines.push('## ملاحق رسمية');
    lines.push('- تم تضمين سجل مخاطر مختصر + ملخص مرشد الزائر + آخر Snapshot للأثر ضمن الدراسة التشغيلية لهذه الحزمة.');
    lines.push('- في حال وجود ملاحظات من الجهة، يتم فتح دورة تحسين: تحديث المخاطر/الأثر ثم إعادة إصدار الحزمة بإصدار جديد.');
    return lines.join('\n');
  }


  private createContentItem(input: ManualContentCreateInput) {
    return this.content.create({
      organizationId: input.organizationId,
      projectId: input.projectId,
      title: input.title,
      languageCode: input.languageCode,
      contentType: input.contentType,
      status: input.status,
      summary: input.summary,
    });
  }

  private uploadMarkdownAttachment(input: MarkdownUploadInput): Promise<MarkdownAttachmentResult> {
    return this.attachments.upload({
      organizationId: input.organizationId,
      entityType: 'content',
      entityId: input.entityId,
      file: {
        originalname: input.filename,
        mimetype: 'text/markdown',
        size: Buffer.byteLength(input.markdown),
        buffer: Buffer.from(input.markdown, 'utf8'),
      },
    }) as Promise<MarkdownAttachmentResult>;
  }
}
