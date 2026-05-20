import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createReadStream } from 'node:fs';
import { extname, join } from 'node:path';
import { buildAuditLogPayload } from '../../common/audit/audit-log-payload.util';
import { buildDomainMutationEvent } from '../../common/events/domain-mutation-event.util';
import { AUDIT_ENTITY_TYPES, CORE_EVENT_TYPES, CORE_MUTATION_ACTIONS, MUTATION_SUBJECT_KINDS, buildMutationSubject } from '../../common/contracts/resource-action.catalog';
import { getRequestContext } from '../../common/request-context';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { OperationalEventOutboxService } from '../outbox/operational-event-outbox.service';
import { AttachmentsRepository } from './attachments.repository';

type PrismaTx = Prisma.TransactionClient;

type UploadedFileInput = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer | Uint8Array | string;
  encoding?: string;
};

@Injectable()
export class AttachmentsApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly repository: AttachmentsRepository,
    private readonly auditLogs: AuditLogsService,
    private readonly events: OperationalEventsService,
    private readonly eventOutbox: OperationalEventOutboxService,
  ) {}

  async upload(params: { file: UploadedFileInput; organizationId?: string; entityType?: string; entityId?: string; uploaderUserId?: string }) {
    const file = params.file;
    if (!file) throw new NotFoundException('لم يتم إرسال ملف في الحقل file');

    const organizationId = params.organizationId || 'org_demo_1';
    const uploadDir = this.config.get<string>('ATHEEL_UPLOAD_DIR') || 'runtime_uploads';
    const absDir = join(process.cwd(), uploadDir);
    await fs.mkdir(absDir, { recursive: true });

    const ext = extname(file.originalname || '') || '';
    const filename = `${Date.now()}_${(file.originalname || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const absPath = join(absDir, filename);
    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer ?? '');
    await fs.writeFile(absPath, buffer);

    const checksumSha256 = createHash('sha256').update(buffer).digest('hex');
    const payload = {
      organizationId,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      originalName: file.originalname || filename,
      mimeType: file.mimetype || null,
      extension: ext || null,
      sizeBytes: Number(file.size || buffer.length || 0),
      storageProvider: 'local',
      storagePath: `${uploadDir}/${filename}`,
      checksumSha256,
      uploadedByUserId: params.uploaderUserId || null,
      metadata: { encoding: file.encoding || null },
    };

    return this.createAttachmentRecord({
      payload,
      organizationId,
      actorUserId: params.uploaderUserId || null,
      auditAction: CORE_MUTATION_ACTIONS.attachmentUpload,
      eventType: CORE_EVENT_TYPES.attachmentUploaded,
      message: `Attachment uploaded: ${payload.originalName}`,
      eventData: { entityType: payload.entityType, entityId: payload.entityId, sizeBytes: payload.sizeBytes },
    });
  }

  async createFromBuffer(params: {
    buffer: Buffer;
    originalName: string;
    mimeType?: string;
    organizationId?: string;
    entityType?: string;
    entityId?: string;
    uploaderUserId?: string;
    metadata?: Record<string, unknown> | null;
  }) {
    const organizationId = params.organizationId || 'org_demo_1';
    const uploadDir = this.config.get<string>('ATHEEL_UPLOAD_DIR') || 'runtime_uploads';
    const absDir = join(process.cwd(), uploadDir);
    await fs.mkdir(absDir, { recursive: true });

    const ext = extname(params.originalName || '') || '';
    const filename = `${Date.now()}_${(params.originalName || 'artifact').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const absPath = join(absDir, filename);
    await fs.writeFile(absPath, params.buffer);

    const checksumSha256 = createHash('sha256').update(params.buffer).digest('hex');
    const payload = {
      organizationId,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      originalName: params.originalName || filename,
      mimeType: params.mimeType || null,
      extension: ext || null,
      sizeBytes: Number(params.buffer.length || 0),
      storageProvider: 'local',
      storagePath: `${uploadDir}/${filename}`,
      checksumSha256,
      uploadedByUserId: params.uploaderUserId || null,
      metadata: params.metadata || null,
    };

    return this.createAttachmentRecord({
      payload,
      organizationId,
      actorUserId: params.uploaderUserId || null,
      auditAction: CORE_MUTATION_ACTIONS.attachmentCreateFromBuffer,
      eventType: CORE_EVENT_TYPES.attachmentSystemCreated,
      message: `Attachment created from buffer: ${params.originalName}`,
      eventData: { via: 'buffer', entityType: payload.entityType, entityId: payload.entityId },
    });
  }

  async createFromFilePath(params: {
    absPath: string;
    originalName: string;
    mimeType?: string;
    organizationId?: string;
    entityType?: string;
    entityId?: string;
    uploaderUserId?: string;
    metadata?: Record<string, unknown> | null;
    removeSourceAfter?: boolean;
  }) {
    const organizationId = params.organizationId || 'org_demo_1';
    const uploadDir = this.config.get<string>('ATHEEL_UPLOAD_DIR') || 'runtime_uploads';
    const absDir = join(process.cwd(), uploadDir);
    await fs.mkdir(absDir, { recursive: true });

    const ext = extname(params.originalName || '') || '';
    const filename = `${Date.now()}_${(params.originalName || 'artifact').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const absDest = join(absDir, filename);

    const stat = await fs.stat(params.absPath);
    const hash = createHash('sha256');
    await new Promise<void>((resolveP, rejectP) => {
      const rs = createReadStream(params.absPath);
      rs.on('data', (chunk: Buffer) => hash.update(chunk));
      rs.on('error', rejectP);
      rs.on('end', () => resolveP());
    });
    const checksumSha256 = hash.digest('hex');

    await fs.copyFile(params.absPath, absDest);
    if (params.removeSourceAfter) {
      await fs.rm(params.absPath, { force: true }).catch(() => null);
    }

    const payload = {
      organizationId,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      originalName: params.originalName || filename,
      mimeType: params.mimeType || null,
      extension: ext || null,
      sizeBytes: Number(stat.size || 0),
      storageProvider: 'local',
      storagePath: `${uploadDir}/${filename}`,
      checksumSha256,
      uploadedByUserId: params.uploaderUserId || null,
      metadata: params.metadata || null,
    };

    return this.createAttachmentRecord({
      payload,
      organizationId,
      actorUserId: params.uploaderUserId || null,
      auditAction: CORE_MUTATION_ACTIONS.attachmentCreateFromFilePath,
      eventType: CORE_EVENT_TYPES.attachmentSystemCreated,
      message: `Attachment created from file path: ${params.originalName}`,
      eventData: { via: 'file_path', entityType: payload.entityType, entityId: payload.entityId },
    });
  }

  async link(id: string, payload: { organizationId?: string; entityType: string; entityId: string }, actorUserId?: string) {
    const before = await this.repository.findById(id);

    try {
      const result = await this.prisma.$transaction(async (tx: PrismaTx) => {
        const row = await this.repository.update(id, {
          organizationId: payload.organizationId ?? before.organizationId,
          entityType: payload.entityType,
          entityId: payload.entityId,
        }, tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId: row.organizationId,
            action: CORE_MUTATION_ACTIONS.attachmentLink,
            entityType: AUDIT_ENTITY_TYPES.attachment,
            entityId: row.id,
            message: `Attachment linked: ${id}`,
            before,
            after: row,
          }),
        });
        const staged = await this.eventOutbox.stageEvent(buildDomainMutationEvent({
          organizationId: row.organizationId,
          actorUserId: actorUserId || null,
          eventType: CORE_EVENT_TYPES.attachmentLinked,
          subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.attachment, row.id),
          data: { entityType: row.entityType, entityId: row.entityId },
        }), tx);
        return { row, outboxId: staged.id };
      });

      await this.eventOutbox.dispatchStaged(result.outboxId);
      return result.row;
    } catch {
      const row = await this.repository.update(id, {
        organizationId: payload.organizationId || before.organizationId,
        entityType: payload.entityType,
        entityId: payload.entityId,
      });
      await this.auditLogs.recordAction({
        organizationId: row.organizationId,
        actorUserId: actorUserId || getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.attachmentLink,
        entityType: AUDIT_ENTITY_TYPES.attachment,
        entityId: row.id,
        message: `Attachment linked: ${id}`,
        before,
        after: row,
      });
      await this.events.emit(buildDomainMutationEvent({
        organizationId: row.organizationId,
        actorUserId: actorUserId || null,
        eventType: CORE_EVENT_TYPES.attachmentLinked,
        subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.attachment, row.id),
        data: { entityType: row.entityType, entityId: row.entityId },
      })).catch(() => null);
      return row;
    }
  }

  private async createAttachmentRecord(input: {
    payload: Record<string, unknown>;
    organizationId: string;
    actorUserId?: string | null;
    auditAction: string;
    eventType: string;
    message: string;
    eventData?: Record<string, unknown>;
  }) {
    try {
      const result = await this.prisma.$transaction(async (tx: PrismaTx) => {
        const row = await this.repository.create(input.payload, tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId: input.organizationId,
            action: input.auditAction,
            entityType: AUDIT_ENTITY_TYPES.attachment,
            entityId: row.id,
            message: input.message,
            after: row,
          }),
        });
        const staged = await this.eventOutbox.stageEvent(buildDomainMutationEvent({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId || null,
          eventType: input.eventType as any,
          subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.attachment, row.id),
          data: input.eventData ?? null,
        }), tx);
        return { row, outboxId: staged.id };
      });

      await this.eventOutbox.dispatchStaged(result.outboxId);
      return result.row;
    } catch {
      const row = await this.repository.create(input.payload);
      await this.auditLogs.recordAction({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId || getRequestContext().userId,
        action: input.auditAction,
        entityType: AUDIT_ENTITY_TYPES.attachment,
        entityId: row.id,
        message: input.message,
        after: row,
      });
      await this.events.emit(buildDomainMutationEvent({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId || null,
        eventType: input.eventType as any,
        subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.attachment, row.id),
        data: input.eventData ?? null,
      })).catch(() => null);
      return row;
    }
  }
}
