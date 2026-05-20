import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';

import { QueueService } from '../queue/queue.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RealtimeService } from '../realtime/realtime.service';
import { throwIfProdDbError } from '../../common/db-fallback';
import { getRequestContext } from '../../common/request-context';

import { ExportsRendererService } from '../../integrations/exports-renderer/exports-renderer.service';
import { createObjectStoreFromEnv, findRepoRootSync, type ObjectStore } from '@madar/object-store';
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';

type ServiceOutboxKind = 'exports_render';

type ServiceOutboxStatus = 'pending' | 'processing' | 'dispatched' | 'failed' | 'dead';

type ExportsRenderPayload = {
  exportJobId: string;
  organizationId: string;
  packetContentId: string;
  renderRequest: any;
};

function now() {
  return new Date();
}

function nowIso() {
  return new Date().toISOString();
}

function backoffMs(attempt: number) {
  // Exponential backoff with cap: 2s, 4s, 8s... max 5min
  const base = 2000;
  const max = 5 * 60_000;
  const pow = Math.min(10, Math.max(0, attempt));
  return Math.min(max, base * Math.pow(2, pow));
}

@Injectable()
export class ServiceOutboxService {
  private readonly objectStore: ObjectStore = createObjectStoreFromEnv();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly attachments: AttachmentsService,
    private readonly auditLogs: AuditLogsService,
    private readonly realtime: RealtimeService,
    private readonly exportsRenderer: ExportsRendererService,
  ) {}

  async createExportsRender(params: { exportJobId: string; organizationId: string; packetContentId: string; renderRequest: any; dedupKey?: string | null; enqueue?: boolean }) {
    const ctx = getRequestContext();

    const row = await (this.prisma as Record<string, unknown>).serviceOutboxEvent
      .create({
        data: {
          kind: 'exports_render' as ServiceOutboxKind,
          status: 'pending' as ServiceOutboxStatus,
          organizationId: params.organizationId,
          aggregateType: 'ExportJob',
          aggregateId: params.exportJobId,
          payload: {
            exportJobId: params.exportJobId,
            organizationId: params.organizationId,
            packetContentId: params.packetContentId,
            renderRequest: params.renderRequest,
          } satisfies ExportsRenderPayload,
          dedupKey: params.dedupKey || null,
          attempts: 0,
          correlationId: ctx.correlationId || null,
          traceparent: ctx.traceparent || null,
        },
      })
      .catch((err: any) => {
        throwIfProdDbError(err, 'ServiceOutboxService.createExportsRender');
        throw err;
      });

    // Enqueue if Redis is enabled; otherwise the caller can call dispatch(id) synchronously.
    if (params.enqueue !== false) {
      await this.queue.enqueueServiceOutbox(row.id).catch(() => null);
    }

    return row;
  }

  private async claimForDispatch(id: string) {
    const nowDt = now();

    // Claim with an atomic state transition (prevents concurrent dispatch)
    const updated = await (this.prisma as Record<string, unknown>).serviceOutboxEvent
      .updateMany({
        where: {
          id,
          status: { in: ['pending', 'failed'] },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: nowDt } }],
        },
        data: {
          status: 'processing',
          lockedAt: nowDt,
          lockedBy: 'worker',
          updatedAt: nowDt,
        },
      })
      .catch(() => ({ count: 0 }));

    return Number(updated?.count || 0) === 1;
  }

  async dispatch(id: string, meta?: { actor?: 'worker' | 'api' }) {
    const claimed = await this.claimForDispatch(id);
    if (!claimed) return { ok: true, skipped: true, reason: 'not_claimed' };

    const row = await (this.prisma as Record<string, unknown>).serviceOutboxEvent.findUnique({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('ServiceOutboxEvent not found');

    const kind = String(row.kind);
    if (kind !== 'exports_render') {
      await (this.prisma as Record<string, unknown>).serviceOutboxEvent.update({ where: { id }, data: { status: 'dead', lastError: `unsupported_kind:${kind}`, updatedAt: now() } }).catch(() => null);
      return { ok: false, dead: true, reason: 'unsupported_kind' };
    }

    const payload = row.payload as ExportsRenderPayload;
    const exportJobId = String(payload.exportJobId || row.aggregateId);

    // If job already completed, mark dispatched and exit (idempotent consumer).
    const existingJob = await (this.prisma as Record<string, unknown>).exportJob.findUnique({ where: { id: exportJobId } }).catch(() => null);
    if (existingJob?.status === 'completed') {
      await (this.prisma as Record<string, unknown>).serviceOutboxEvent.update({ where: { id }, data: { status: 'dispatched', dispatchedAt: now(), updatedAt: now() } }).catch(() => null);
      return { ok: true, alreadyCompleted: true };
    }

    const correlationId = String(row.correlationId || getRequestContext().correlationId || '').trim();
    const traceparent = String(row.traceparent || getRequestContext().traceparent || '').trim();

    try {
      let data: any;

      const channel = this.exportsRenderer.channel;
      if (channel === 'http') {
        const rendererUrl = (process.env.EXPORTS_RENDERER_URL || 'http://localhost:3101').replace(/\/$/, '');
        const rendererToken = String(process.env.EXPORTS_RENDERER_TOKEN || '').trim();
        if (!rendererToken) throw new Error('missing EXPORTS_RENDERER_TOKEN');

        const res = await fetch(`${rendererUrl}/internal/render`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-internal-token': rendererToken,
            ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
            ...(traceparent ? { traceparent } : {}),
            // Idempotency hook for downstream service (even if it stays stateless)
            'x-message-id': id,
          } as any,
          body: JSON.stringify(payload.renderRequest),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`exports_renderer_failed:${res.status}:${txt.slice(0, 300)}`);
        }

        data = await res.json();
      } else {
        data = await this.exportsRenderer.renderViaTransport({
          messageId: id,
          renderRequest: payload.renderRequest,
          correlationId: correlationId || null,
          traceparent: traceparent || null,
        });
      }
      const artifacts = Array.isArray(data?.artifacts) ? data.artifacts : [];

      const removeFromObjectStore = String(process.env.OBJECT_STORE_GC_AFTER_ATTACH || '').trim() === '1';

      const pdfAttachmentIds: string[] = [];
      let pptxAttachmentId: string | undefined;
      let bundleAttachmentId: string | undefined;

      for (const a of artifacts) {
        const name = String(a.name || 'artifact.bin');
        const mimeType = String(a.mimeType || 'application/octet-stream');

        const objectKey = String(a?.object?.key || '').trim();
        const hasObject = Boolean(objectKey);

        let att: any;
        if (hasObject) {
          // Wave61: دعم ObjectStore عبر MinIO/S3. في حالة local نستخدم المسار المباشر،
          // وفي حالة s3 نقوم بتنزيل الملف إلى مسار مؤقت ثم نحوله إلى Attachment.
          let absPath: string;

          if (this.objectStore.provider === 'local' && typeof this.objectStore.resolveAbsPath === 'function') {
            absPath = this.objectStore.resolveAbsPath(objectKey);
          } else {
            const root = findRepoRootSync(process.cwd());
            const tmpBase = String(process.env.OBJECT_STORE_TMP_DIR || 'runtime_object_tmp').trim() || 'runtime_object_tmp';
            const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
            absPath = resolve(root, tmpBase, id, `${Date.now()}_${safeName}`);
            await fs.mkdir(dirname(absPath), { recursive: true });
            await this.objectStore.downloadToFile({ key: objectKey, absPath });
          }

          att = await this.attachments.createFromFilePath({
            absPath,
            originalName: name,
            mimeType,
            organizationId: String(payload.organizationId),
            entityType: 'content',
            entityId: String(payload.packetContentId),
            uploaderUserId: existingJob?.requestedByUserId || null,
            // في حالة s3: حذف الملف المؤقت دائمًا، وفي حالة local: يتبع GC_AFTER_ATTACH
            removeSourceAfter: this.objectStore.provider === 'local' ? removeFromObjectStore : true,
            metadata: { renderer: 'exports-svc', sha256: a.sha256, sizeBytes: a.sizeBytes, serviceOutboxId: id, objectKey },
          });

          if (removeFromObjectStore) {
            await this.objectStore.remove(objectKey).catch(() => null);
          }
        } else {
          const buf = Buffer.from(String(a.base64 || ''), 'base64');
          if (!buf.length) continue;
          att = await this.attachments.createFromBuffer({
            buffer: buf,
            originalName: name,
            mimeType,
            organizationId: String(payload.organizationId),
            entityType: 'content',
            entityId: String(payload.packetContentId),
            uploaderUserId: existingJob?.requestedByUserId || null,
            metadata: { renderer: 'exports-svc', sha256: a.sha256, sizeBytes: a.sizeBytes, serviceOutboxId: id },
          });
        }

        // Persist artifact metadata for auditing / idempotency
        await (this.prisma as Record<string, unknown>).exportArtifact
          .create({
            data: {
              exportJobId,
              attachmentId: att.id,
              name,
              mimeType,
              sha256: String(a.sha256 || ''),
              sizeBytes: Number(a.sizeBytes || att?.sizeBytes || 0),
            },
          })
          .catch(() => null);

        if (name.endsWith('.pptx')) pptxAttachmentId = att.id;
        else if (name.endsWith('.zip')) bundleAttachmentId = att.id;
        else if (name.endsWith('.pdf')) pdfAttachmentIds.push(att.id);
      }

      const result = { pptxAttachmentId, pdfAttachmentIds, bundleAttachmentId };

      // Update job
      await (this.prisma as Record<string, unknown>).exportJob
        .update({
          where: { id: exportJobId },
          data: {
            status: 'completed',
            result,
            updatedAt: now(),
          },
        })
        .catch(() => null);

      await this.auditLogs
        .create(
          {
            organizationId: String(payload.organizationId),
            action: 'exports.job.completed',
            entityType: 'ExportJob',
            entityId: exportJobId,
            message: 'اكتمال توليد المخرجات (service-outbox)',
            after: { status: 'completed', result, serviceOutboxId: id },
          },
          existingJob?.requestedByUserId || undefined,
        )
        .catch(() => null);

      this.realtime.emit('exports.job.completed', { jobId: exportJobId, ts: nowIso(), artifacts: result });

      await (this.prisma as Record<string, unknown>).serviceOutboxEvent.update({ where: { id }, data: { status: 'dispatched', dispatchedAt: now(), updatedAt: now() } }).catch(() => null);

      return { ok: true, dispatched: true, exportJobId, result };
    } catch (e: any) {
      const attempts = Number(row.attempts || 0) + 1;
      const nextAttemptAt = new Date(Date.now() + backoffMs(attempts));
      const lastError = String(e?.message || 'unknown_error').slice(0, 500);

      const terminal = attempts >= Number(process.env.SERVICE_OUTBOX_MAX_ATTEMPTS || 12);
      const status: ServiceOutboxStatus = terminal ? 'dead' : 'failed';

      await (this.prisma as Record<string, unknown>).serviceOutboxEvent
        .update({
          where: { id },
          data: {
            status,
            attempts,
            nextAttemptAt: terminal ? null : nextAttemptAt,
            lastError,
            updatedAt: now(),
          },
        })
        .catch(() => null);

      if (!terminal) {
        await this.queue.scheduleServiceOutboxRetry(id, nextAttemptAt).catch(() => null);
      } else {
        // Mark export job failed too (best-effort)
        await (this.prisma as Record<string, unknown>).exportJob.update({ where: { id: exportJobId }, data: { status: 'failed', error: lastError, updatedAt: now() } }).catch(() => null);
      }

      throw e;
    }
  }
}
