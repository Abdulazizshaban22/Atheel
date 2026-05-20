import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import QRCode from 'qrcode';

import { PrismaService } from '@madar/db';
import { AttachmentsService } from '../attachments/attachments.service';
import { ContentService } from '../content/content.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { QueueService } from '../queue/queue.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ServiceOutboxService } from '../service-outbox/service-outbox.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { throwIfProdDbError } from '../../common/db-fallback';
import { getRequestContext } from '../../common/request-context';

import { buildPdfFromMarkdown, buildPptxFromMarkdown, buildZip, type GovTemplateMeta } from '@madar/doc-kernel';
import type { GenerateExportDto } from './dto/generate-export.dto';

type ExportStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ExportJobRecord = {
  id: string;
  organizationId: string;
  approvalPacketId: string;
  requestedByUserId?: string;
  correlationId?: string;
  traceparent?: string;
  status: ExportStatus;
  request: {
    includePptx: boolean;
    includePdf: boolean;
    includeBundleZip: boolean;
    includeSignatures: boolean;
    refineWithLlm: boolean;
    pageSize: 'A4' | 'Letter';

    // Wave50: قالب حكومي حسب نوع الجهة المستلمة
    recipientNameAr?: string;
    recipientNameEn?: string;
    recipientKind?: string;
  };
  result?: {
    pptxAttachmentId?: string;
    pdfAttachmentIds?: string[];
    bundleAttachmentId?: string;
  };
  warnings?: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function sha256Hex(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

@Injectable()
export class ExportsService {
  private jobs: ExportJobRecord[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: AttachmentsService,
    private readonly content: ContentService,
    private readonly approvals: ApprovalsService,
    private readonly queue: QueueService,
    private readonly realtime: RealtimeService,
    private readonly auditLogs: AuditLogsService,
    private readonly serviceOutbox: ServiceOutboxService,
  ) {}

  async listJobs(filter?: { approvalPacketId?: string }) {
    try {
      const where: any = {
        ...(filter?.approvalPacketId ? { approvalPacketId: filter.approvalPacketId } : {}),
      };
      const rows = await (this.prisma as Record<string, unknown>).exportJob.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      });
      const items: ExportJobRecord[] = (rows || []).map((r: any) => ({
        id: r.id,
        organizationId: r.organizationId,
        approvalPacketId: r.approvalPacketId,
        requestedByUserId: r.requestedByUserId || undefined,
        status: r.status,
        request: r.request || {},
        result: r.result || undefined,
        warnings: r.warnings || [],
        error: r.error || undefined,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : nowIso(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : nowIso(),
      }));
      return { count: items.length, items };
    } catch (err) {
      throwIfProdDbError(err as any, 'ExportsService.listJobs');
      const items = this.jobs.filter((j) => (!filter?.approvalPacketId || j.approvalPacketId === filter.approvalPacketId));
      return { count: items.length, items };
    }
  }

  async getJob(id: string) {
    try {
      const r = await (this.prisma as Record<string, unknown>).exportJob.findUnique({ where: { id } });
      if (!r) throw new NotFoundException('Export job not found');
      const job: ExportJobRecord = {
        id: r.id,
        organizationId: r.organizationId,
        approvalPacketId: r.approvalPacketId,
        requestedByUserId: r.requestedByUserId || undefined,
        status: r.status,
        request: r.request || {},
        result: r.result || undefined,
        warnings: r.warnings || [],
        error: r.error || undefined,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : nowIso(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : nowIso(),
      };
      return { ok: true, job };
    } catch (err) {
      throwIfProdDbError(err as any, 'ExportsService.getJob');
      const job = (await (this.prisma as Record<string, unknown>).exportJob.findUnique({ where: { id } }).catch(() => null)) as any || this.jobs.find((j) => j.id === id);
      if (!job) throw new NotFoundException('Export job not found');
      return { ok: true, job };
    }
  }

  async requestExportForApprovalPacket(approvalPacketId: string, dto: GenerateExportDto, user?: RequestUser) {
    const packet = await this.getApprovalPacket(approvalPacketId);
    const orgId = dto.organizationId || packet.organizationId || 'org_demo_1';
    assertOrgAccess(user, orgId);

    const req = {
      includePptx: dto.includePptx !== false,
      includePdf: dto.includePdf !== false,
      includeBundleZip: dto.includeBundleZip !== false,
      includeSignatures: dto.includeSignatures !== false,
      refineWithLlm: Boolean(dto.refineWithLlm),
      pageSize: (dto.pageSize || 'A4') as 'A4' | 'Letter',

      recipientNameAr: (dto as Record<string, unknown>).recipientNameAr,
      recipientNameEn: (dto as Record<string, unknown>).recipientNameEn,
      recipientKind: (dto as Record<string, unknown>).recipientKind,
    };

    const ctx = getRequestContext();
    const id = `exp_${randomUUID().slice(0, 10)}`;
    const job: ExportJobRecord = {
      id,
      organizationId: orgId,
      approvalPacketId,
      requestedByUserId: user?.sub,
      correlationId: ctx.correlationId,
      traceparent: ctx.traceparent,
      status: 'queued',
      request: req,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.upsertJob(job);
    await this.auditLogs.create({ organizationId: orgId, action: 'exports.job.requested', entityType: 'ExportJob', entityId: job.id, message: `طلب تصدير للحزمة ${approvalPacketId}`, after: { ...job, request: req } }, user?.sub);

    const canAsync = this.queue.getMode().mode === 'redis';
    const wantsAsync = dto.async === true || (dto.async == null && canAsync);
    if (wantsAsync && canAsync) {
      const enq = await this.queue.enqueueExport(job.id);
      this.realtime.emit('exports.job.queued', { jobId: job.id, approvalPacketId, ts: nowIso() });
      return { ok: true, mode: 'async', job, queue: enq };
    }

    const out = await this.runJob(job.id, { forceSync: true });
    return { ok: true, mode: 'sync', job: out.job, artifacts: out.artifacts };
  }

  async runJob(id: string, opts?: { forceSync?: boolean }) {
    const job = (await (this.prisma as Record<string, unknown>).exportJob.findUnique({ where: { id } }).catch(() => null)) as any || this.jobs.find((j) => j.id === id);
    if (!job) throw new NotFoundException('Export job not found');
    if (job.status === 'running') return { ok: true, job };

    await this.upsertJob({ ...job, status: 'running', updatedAt: nowIso() });
    await this.auditLogs.create({ organizationId: job.organizationId, action: 'exports.job.running', entityType: 'ExportJob', entityId: id, message: 'بدء توليد المخرجات', after: { status: 'running' } }, job.requestedByUserId);
    this.realtime.emit('exports.job.running', { jobId: id, approvalPacketId: job.approvalPacketId, ts: nowIso() });

    try {
      const gen = await this.generateArtifacts(job as any, { mode: opts?.forceSync ? 'sync' : 'enqueue' });
      const mode = gen.mode;
      const artifacts = gen.artifacts;
      const serviceOutboxId = gen.serviceOutboxId;

      const isCompleted = mode === 'sync';

      const updated: ExportJobRecord = {
        ...(this.jobs.find((x) => x.id === id) || job),
        status: isCompleted ? 'completed' : 'running',
        ...(isCompleted ? { result: artifacts } : {}),
        updatedAt: nowIso(),
      };
      await this.upsertJob(updated);

      if (isCompleted) {
        await this.auditLogs
          .create(
            { organizationId: updated.organizationId, action: 'exports.job.completed', entityType: 'ExportJob', entityId: id, message: 'اكتمال توليد المخرجات', after: { status: 'completed', result: artifacts } },
            updated.requestedByUserId,
          )
          .catch(() => null);
        this.realtime.emit('exports.job.completed', { jobId: id, approvalPacketId: job.approvalPacketId, artifacts, ts: nowIso() });
      } else {
        await this.auditLogs
          .create(
            { organizationId: updated.organizationId, action: 'exports.job.render.queued', entityType: 'ExportJob', entityId: id, message: 'تمت جدولة التوليد عبر Service Outbox', after: { status: 'running', serviceOutboxId } },
            updated.requestedByUserId,
          )
          .catch(() => null);
        this.realtime.emit('exports.job.render.queued', { jobId: id, approvalPacketId: job.approvalPacketId, serviceOutboxId, ts: nowIso() });
      }

      return { ok: true, job: updated, artifacts, serviceOutboxId, mode };

    } catch (e: any) {
      const updated: ExportJobRecord = {
        ...(this.jobs.find((x) => x.id === id) || job),
        status: 'failed',
        error: e?.message || 'unknown_error',
        updatedAt: nowIso(),
      };
      await this.upsertJob(updated);
      await this.auditLogs.create({ organizationId: updated.organizationId, action: 'exports.job.failed', entityType: 'ExportJob', entityId: id, severity: 'warning', message: 'فشل توليد المخرجات', after: { status: 'failed', error: updated.error } }, updated.requestedByUserId);
      this.realtime.emit('exports.job.failed', { jobId: id, approvalPacketId: job.approvalPacketId, error: updated.error, ts: nowIso() });
      throw e;
    }
  }

  async resolveAttachmentFile(attachmentId: string, user?: RequestUser) {
    const { attachment, absPath } = await this.attachments.resolveFile(attachmentId, user);
    await this.auditLogs.create(
      {
        organizationId: (attachment as Record<string, unknown>).organizationId,
        action: 'exports.download',
        entityType: 'Attachment',
        entityId: attachmentId,
        message: `تحميل مرفق صادر: ${attachment.originalName || attachmentId}`,
        after: { attachmentId, storagePath: (attachment as Record<string, unknown>).storagePath },
      },
      user?.sub,
    );
    return { absPath, filename: attachment.originalName || `${attachmentId}`, mimeType: attachment.mimeType };
  }

  private async persistJobToDb(job: ExportJobRecord) {
    try {
      const payloadHash = sha256Hex(Buffer.from(JSON.stringify(job.request || {}), 'utf8'));
      await (this.prisma as Record<string, unknown>).exportJob.upsert({
        where: { id: job.id },
        create: {
          id: job.id,
          organizationId: job.organizationId,
          approvalPacketId: job.approvalPacketId,
          requestedByUserId: job.requestedByUserId || null,
          status: job.status,
          request: job.request || {},
          payloadHash,
          result: job.result || null,
          warnings: job.warnings || [],
          error: job.error || null,
          correlationId: job.correlationId || null,
          traceparent: job.traceparent || null,
        },
        update: {
          status: job.status,
          request: job.request || {},
          payloadHash,
          result: job.result || null,
          warnings: job.warnings || [],
          error: job.error || null,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      // Best-effort persistence; in production we can hard-fail by setting ALLOW_IN_MEMORY_FALLBACK=false
      throwIfProdDbError(err as any, 'ExportsService.persistJobToDb');
    }
  }

  private async upsertJob(job: ExportJobRecord) {
    const i = this.jobs.findIndex((x) => x.id === job.id);
    if (i >= 0) this.jobs[i] = { ...this.jobs[i], ...job };
    else this.jobs.unshift(job);

    await this.persistJobToDb(job);
    return job;
  }

  private async getApprovalPacket(id: string): Promise<ApprovalPacketRecord> {
    try {
      const r = await (this.prisma as Record<string, unknown>).approvalPacket.findUnique({ where: { id } });
      if (r) {
        return {
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
          sections: (() => { try { return JSON.parse(r.sectionsJson || '{}'); } catch { return {}; } })(),
          artifacts: (() => { try { return JSON.parse(r.artifactsJson || '{}'); } catch { return {}; } })(),
          generatedAt: r.generatedAt ? new Date(r.generatedAt).toISOString() : nowIso(),
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : nowIso(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : nowIso(),
        } as any;
      }
    } catch (err) {
      throwIfProdDbError(err, 'ExportsService.getApprovalPacket');
    }

    const row = await this.prisma.approvalPacket.findUnique({ where: { id: id } });
    if (!row) throw new NotFoundException('Approval packet not found');
    return row;
  }

  private findApprovalLinkedToPacket(packetId: string): ApprovalRecord | undefined {
    const approvals = await this.prisma.approvalRequest.findMany({});
    const linked = approvals.filter((a) => (a.payloadSnapshot as any)?.approvalPacketId === packetId);
    return linked.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  }

  private async safeGetAttachment(id: string): Promise<AttachmentRecord | undefined> {
    // First, try datastore.
    const ds = await this.prisma.attachment.findUnique({ where: { id: id } });
    if (ds) return ds;
    // Then, try prisma via list.
    try {
      const rows: any[] = await (this.attachments as Record<string, unknown>).findAll?.({});
      return rows?.find((x) => x.id === id);
    } catch {
      return undefined;
    }
  }

  private async loadMarkdownForContent(contentId: string) {
    const atts = await this.attachments.findAll({ entityType: 'content', entityId: contentId } as any);
    const mdAtt = (atts || []).find((a: any) => (a.mimeType || '').includes('markdown') || (a.extension || '').toLowerCase() === '.md' || (a.originalName || '').endsWith('.md'))
      || (atts || [])[0];
    if (!mdAtt) throw new NotFoundException(`لا يوجد مرفق Markdown لعنصر المحتوى ${contentId}`);
    const absPath = join(process.cwd(), mdAtt.storagePath);
    const markdown = await fs.readFile(absPath, 'utf8');
    return { markdown, attachment: mdAtt };
  }

  private async generateArtifacts(job: ExportJobRecord, opts: { mode: 'sync' | 'enqueue' }) {
    const packet = await this.getApprovalPacket(job.approvalPacketId);
    const approval = this.findApprovalLinkedToPacket(packet.id);

    const artifactsMeta = packet.artifacts as any;
    const contentIds: string[] = Array.isArray(artifactsMeta?.contentItemIds) ? artifactsMeta.contentItemIds : [];
    if (contentIds.length < 4) throw new Error('Approval packet artifacts missing contentItemIds');

    const deckId = contentIds[0];
    const strategyId = contentIds[1];
    const opsId = contentIds[2];
    const packetDocId = contentIds[3];

    const deck = await this.content.findOne(deckId);
    const strategy = await this.content.findOne(strategyId);
    const ops = await this.content.findOne(opsId);
    const packetContent = await this.content.findOne(packetDocId);

    const orgId = packet.organizationId || job.organizationId || 'org_demo_1';
    let org: any = await this.prisma.organization.findUnique({ where: { id: orgId } });
    try {
      const pOrg = await (this.prisma as Record<string, unknown>).organization?.findUnique?.({ where: { id: orgId } });
      if (pOrg) org = pOrg;
    } catch (err) {
      throwIfProdDbError(err, 'ExportsService.loadOrganization');
    }
    let project: any = undefined;
    let experience: any = undefined;
    try {
      project = packet.projectId ? await (this.prisma as Record<string, unknown>).project?.findUnique?.({ where: { id: String(packet.projectId) } }) : undefined;
      experience = packet.experienceId ? await (this.prisma as Record<string, unknown>).visitorExperience?.findUnique?.({ where: { id: String(packet.experienceId) } }) : undefined;
    } catch (err) {
      throwIfProdDbError(err, 'ExportsService.loadProjectExperience');
      project = packet.projectId ? await this.prisma.project.findUnique({ where: { id: packet.projectId } }) : undefined;
      experience = packet.experienceId ? await this.prisma.visitorExperience.findUnique({ where: { id: packet.experienceId } }) : undefined;
    }

    const publicUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verificationUrl = `${publicUrl}/verify/approval-packets/${encodeURIComponent(packet.id)}`;
    const qrPngDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 220 });
    const verificationCode = createHash('sha256')
      .update(`${packet.id}|${packet.generatedAt}|${orgId}`)
      .digest('hex')
      .slice(0, 12)
      .toUpperCase();

    const issuerNameAr = (org as any)?.nameAr || 'الجهة المُصدرة';
    const metaBase: GovTemplateMeta = {
      orgNameAr: issuerNameAr,
      orgNameEn: (org as any)?.nameEn,
      recipientNameAr: job.request.recipientNameAr || issuerNameAr,
      recipientNameEn: job.request.recipientNameEn,
      recipientKind: (job.request.recipientKind as any) || ((org as any)?.sector === 'museum' ? 'museum' : (org as any)?.sector === 'semi_government' ? 'semi_government' : (org as any)?.sector === 'ngo' ? 'ngo' : (org as any)?.sector === 'private' ? 'private' : 'government'),
      reportTitleAr: packet.title,
      reportSubtitleAr: 'مخرجات رسمية تولدت تلقائيًا من نتائج محاكاة التوأم الرقمي',
      projectNameAr: project?.nameAr,
      experienceTitleAr: (experience as any)?.titleAr,
      versionLabel: `v${packet.version}`,
      confidentialityLabelAr: 'داخلي للاستخدام الرسمي',
      generatedAtIso: packet.generatedAt,
      verificationUrl,
      qrPngDataUrl,
      verificationCode,
      documentId: packet.id,
      verificationNoteAr: 'للتحقق: افتح رابط التحقق أو امسح QR. رمز التحقق يظهر في هذه الصفحة. عند الاستلام عبر Bundle ZIP استخدم manifest.json لمطابقة بصمات الملفات.',
      approvals: {
        statusAr: approval?.status === 'approved' ? 'معتمد' : approval?.status === 'rejected' ? 'مرفوض' : approval?.status === 'changes_requested' ? 'يتطلب تعديلات' : approval?.status === 'submitted' ? 'مرفوع للمراجعة' : 'قيد المراجعة',
        approvalId: approval?.id,
        dueAtIso: approval?.dueAt,
        decidedAtIso: approval?.decidedAt,
        decisionNote: approval?.decisionNote,
        signers: approval?.currentApproverId ? [{ nameAr: 'المعتمد الحالي', roleAr: 'الاعتماد', statusAr: 'قيد الإجراء' }] : undefined,
      },
    };

    // Load markdown sources
    const deckMd = await this.loadMarkdownForContent(deck.id);
    const strategyMd = await this.loadMarkdownForContent(strategy.id);
    const opsMd = await this.loadMarkdownForContent(ops.id);
    const packetMd = await this.loadMarkdownForContent(packetContent.id);

    // Wave57: offload heavy rendering to exports microservice
    const rendererToken = process.env.EXPORTS_RENDERER_TOKEN || '';
    if (!rendererToken) {
      // Fallback (local/in-process) if token is not configured.
      const pdfAttachmentIds: string[] = [];
      let pptxAttachmentId: string | undefined;
      let bundleAttachmentId: string | undefined;

      const filesForZip: Array<{ name: string; buffer: Buffer }> = [];

      if (job.request.includePptx) {
        const pptxBuf = await buildPptxFromMarkdown(String(deckMd.markdown), { templateMeta: { ...metaBase, reportTitleAr: deck.title }, addSignatureSlide: job.request.includeSignatures });
        const att = await this.attachments.upload({
          organizationId: job.organizationId,
          entityType: 'content',
          entityId: packetContent.id,
          file: {
            originalname: `ATHEEL_${packet.id}_EventDeck.pptx`,
            mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            size: pptxBuf.length,
            buffer: pptxBuf,
          },
        } as any);
        pptxAttachmentId = att.id;
        filesForZip.push({ name: 'Event_Deck.pptx', buffer: pptxBuf });
      }

      if (job.request.includePdf) {
        const strategyPdf = await buildPdfFromMarkdown(String(strategyMd.markdown), { templateMeta: { ...metaBase, reportTitleAr: strategy.title }, addSignaturePage: job.request.includeSignatures, pageSize: job.request.pageSize });
        const opsPdf = await buildPdfFromMarkdown(String(opsMd.markdown), { templateMeta: { ...metaBase, reportTitleAr: ops.title }, addSignaturePage: job.request.includeSignatures, pageSize: job.request.pageSize });
        const packetPdf = await buildPdfFromMarkdown(String(packetMd.markdown), { templateMeta: { ...metaBase, reportTitleAr: packetContent.title }, addSignaturePage: job.request.includeSignatures, pageSize: job.request.pageSize });

        const sAtt = await this.attachments.upload({
          organizationId: job.organizationId,
          entityType: 'content',
          entityId: packetContent.id,
          file: { originalname: `ATHEEL_${packet.id}_Strategy.pdf`, mimetype: 'application/pdf', size: strategyPdf.length, buffer: strategyPdf },
        } as any);
        pdfAttachmentIds.push(sAtt.id);
        filesForZip.push({ name: 'Strategy.pdf', buffer: strategyPdf });

        const oAtt = await this.attachments.upload({
          organizationId: job.organizationId,
          entityType: 'content',
          entityId: packetContent.id,
          file: { originalname: `ATHEEL_${packet.id}_OperationalStudy.pdf`, mimetype: 'application/pdf', size: opsPdf.length, buffer: opsPdf },
        } as any);
        pdfAttachmentIds.push(oAtt.id);
        filesForZip.push({ name: 'Operational_Study.pdf', buffer: opsPdf });

        const pAtt = await this.attachments.upload({
          organizationId: job.organizationId,
          entityType: 'content',
          entityId: packetContent.id,
          file: { originalname: `ATHEEL_${packet.id}_ApprovalPacket.pdf`, mimetype: 'application/pdf', size: packetPdf.length, buffer: packetPdf },
        } as any);
        pdfAttachmentIds.push(pAtt.id);
        filesForZip.push({ name: 'Approval_Packet.pdf', buffer: packetPdf });
      }

      if (job.request.includeBundleZip) {
        const generatedAt = nowIso();
        const bundleMeta = { packetId: packet.id, approvalId: approval?.id, generatedAt, verificationUrl, schema: 'atheel.bundle.meta.v1' };
        const metaJson = Buffer.from(JSON.stringify(bundleMeta, null, 2), 'utf8');
        filesForZip.push({ name: 'bundle_meta.json', buffer: metaJson });

        const provenance = {
          schema: 'atheel.bundle.provenance.v1',
          generatedAt,
          agent: { userId: job.requestedByUserId || null, system: 'atheel.exports' },
          subject: { packetId: packet.id, simulationRunId: packet.simulationRunId, twinId: packet.twinId, scenarioKey: packet.scenarioKey },
          decision: approval ? { approvalId: approval.id, status: approval.status, decidedAt: approval.decidedAt || null, decisionNote: approval.decisionNote || null } : null,
          sources: (packet.sections as any)?.citations || [],
        };
        const provJson = Buffer.from(JSON.stringify(provenance, null, 2), 'utf8');
        filesForZip.push({ name: 'provenance.json', buffer: provJson });

        const filesForManifest = filesForZip.filter((f) => f.name !== 'manifest.json' && f.name !== 'manifest.sha256');
        const manifest = {
          schema: 'atheel.bundle.manifest.v1',
          packetId: packet.id,
          approvalId: approval?.id,
          generatedAt,
          verificationUrl,
          verificationCode,
          algorithm: 'sha256',
          files: filesForManifest.map((f) => ({ name: f.name, sizeBytes: f.buffer.length, sha256: sha256Hex(f.buffer) })),
          totalFiles: filesForManifest.length,
        };

        const manifestJson = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
        const manifestSha = sha256Hex(manifestJson);
        const manifestShaFile = Buffer.from(`${manifestSha}  manifest.json\n`, 'utf8');

        filesForZip.push({ name: 'manifest.json', buffer: manifestJson });
        filesForZip.push({ name: 'manifest.sha256', buffer: manifestShaFile });

        const zipBuf = await buildZip(filesForZip);
        const zAtt = await this.attachments.upload({
          organizationId: job.organizationId,
          entityType: 'content',
          entityId: packetContent.id,
          file: { originalname: `ATHEEL_${packet.id}_DeliveryBundle.zip`, mimetype: 'application/zip', size: zipBuf.length, buffer: zipBuf },
        } as any);
        bundleAttachmentId = zAtt.id;
      }

      return { mode: 'sync' as const, artifacts: { pptxAttachmentId, pdfAttachmentIds, bundleAttachmentId } };
    }

    const renderRequest = {
      jobId: job.id,
      packetId: packet.id,
      includePptx: job.request.includePptx,
      includePdf: job.request.includePdf,
      includeBundleZip: job.request.includeBundleZip,
      includeSignatures: job.request.includeSignatures,
      pageSize: job.request.pageSize,
      titles: {
        deckTitle: deck.title,
        strategyTitle: strategy.title,
        opsTitle: ops.title,
        packetTitle: packetContent.title,
      },
      templateMeta: metaBase,
      markdown: {
        deck: deckMd.markdown,
        strategy: strategyMd.markdown,
        ops: opsMd.markdown,
        packet: packetMd.markdown,
      },
      bundle: {
        verificationUrl,
        verificationCode,
        approvalId: approval?.id,
        provenance: {
          schema: 'atheel.bundle.provenance.v1',
          generatedAt: nowIso(),
          agent: { userId: job.requestedByUserId || null, system: 'atheel.exports' },
          subject: { packetId: packet.id, simulationRunId: packet.simulationRunId, twinId: packet.twinId, scenarioKey: packet.scenarioKey },
          decision: approval ? { approvalId: approval.id, status: approval.status, decidedAt: approval.decidedAt || null, decisionNote: approval.decisionNote || null } : null,
          sources: (packet.sections as any)?.citations || [],
        },
      },
    };

    // Wave58: enqueue mode uses Service Outbox (reliable + idempotent dispatch)
    if (opts.mode === 'enqueue') {
      const dedupKey = `exports_render_${job.id}_${sha256Hex(Buffer.from(JSON.stringify(renderRequest), 'utf8')).slice(0, 16)}`;
      const ev = await this.serviceOutbox.createExportsRender({
        exportJobId: job.id,
        organizationId: job.organizationId,
        packetContentId: packetContent.id,
        renderRequest,
        dedupKey,
        enqueue: true,
      });
      return { mode: 'enqueue' as const, serviceOutboxId: ev.id };
    }

    // Sync mode: create an outbox event without enqueue, then dispatch immediately.
    // This keeps a single reliable path for both async and sync.
    const dedupKey = `exports_render_${job.id}_${sha256Hex(Buffer.from(JSON.stringify(renderRequest), 'utf8')).slice(0, 16)}`;
    const ev = await this.serviceOutbox.createExportsRender({
      exportJobId: job.id,
      organizationId: job.organizationId,
      packetContentId: packetContent.id,
      renderRequest,
      dedupKey,
      enqueue: false,
    });

    const dispatched: any = await this.serviceOutbox.dispatch(ev.id, { actor: 'api' });
    const result = dispatched?.result || dispatched?.data?.result || dispatched?.payload?.result || dispatched?.artifacts;
    if (!result) throw new Error('exports_renderer_missing_result');

    return { mode: 'sync' as const, artifacts: result, serviceOutboxId: ev.id };
  }
}
