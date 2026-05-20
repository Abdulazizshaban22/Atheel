import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@madar/db';
import { buildAuditLogPayload } from '../../common/audit/audit-log-payload.util';
import { getRequestContext } from '../../common/request-context';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS } from '../../common/contracts/resource-action.catalog';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { UpdateContentItemDto } from './dto/update-content-item.dto';
import { ContentRepository, type ContentDbClient } from './content.repository';

type PrismaTx = Prisma.TransactionClient & ContentDbClient;
type TransactionCapablePrisma = PrismaService & {
  $transaction<T>(callback: (tx: PrismaTx) => Promise<T>): Promise<T>;
};

@Injectable()
export class ContentApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ContentRepository,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(dto: CreateContentItemDto) {
    try {
      return await this.prismaClient.$transaction(async (tx: PrismaTx) => {
        const item = await this.repository.create(this.toCreateData(dto), tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId: item.organizationId,
            action: CORE_MUTATION_ACTIONS.contentCreate,
            entityType: AUDIT_ENTITY_TYPES.content,
            entityId: item.id,
            message: 'Content item created',
            after: item,
          }),
        });
        return item;
      });
    } catch (err) {
      const row = await this.repository.create(this.toCreateData(dto));
      await this.auditLogs.recordAction({
        organizationId: row.organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.contentCreate,
        entityType: AUDIT_ENTITY_TYPES.content,
        entityId: row.id,
        message: 'Content item created',
        after: row,
      });
      return row;
    }
  }

  async update(id: string, dto: UpdateContentItemDto) {
    try {
      return await this.prismaClient.$transaction(async (tx: PrismaTx) => {
        const before = await this.repository.findById(id, tx);
        this.assertOrganizationImmutable(before.organizationId, dto.organizationId, 'content');
        const updated = await this.repository.update(id, this.toUpdateData(dto, before), tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId: updated.organizationId,
            action: CORE_MUTATION_ACTIONS.contentUpdate,
            entityType: AUDIT_ENTITY_TYPES.content,
            entityId: updated.id,
            message: 'Content item updated',
            before,
            after: updated,
          }),
        });
        return updated;
      });
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      const before = await this.repository.findById(id);
      this.assertOrganizationImmutable(before.organizationId, dto.organizationId, 'content');
      const updated = await this.repository.update(id, this.toUpdateData(dto, before));
      await this.auditLogs.recordAction({
        organizationId: updated.organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.contentUpdate,
        entityType: AUDIT_ENTITY_TYPES.content,
        entityId: updated.id,
        message: 'Content item updated',
        before,
        after: updated,
      });
      return updated;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaClient.$transaction(async (tx: PrismaTx) => {
        const before = await this.repository.findById(id, tx);
        const result = await this.repository.delete(id, tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId: before.organizationId,
            action: CORE_MUTATION_ACTIONS.contentDelete,
            entityType: AUDIT_ENTITY_TYPES.content,
            entityId: before.id,
            message: 'Content item deleted',
            before,
            after: result,
          }),
        });
        return result;
      });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const before = await this.repository.findById(id);
      const result = await this.repository.delete(id);
      await this.auditLogs.recordAction({
        organizationId: before.organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.contentDelete,
        entityType: AUDIT_ENTITY_TYPES.content,
        entityId: before.id,
        message: 'Content item deleted',
        before,
        after: result,
      });
      return result;
    }
  }

  private toCreateData(dto: CreateContentItemDto): Prisma.ContentItemUncheckedCreateInput {
    return {
      organizationId: dto.organizationId,
      projectId: dto.projectId ?? null,
      title: dto.title,
      languageCode: dto.languageCode,
      contentType: dto.contentType,
      status: dto.status ?? 'draft',
      summary: dto.summary,
      versionNo: 1,
    };
  }

  private toUpdateData(dto: UpdateContentItemDto, before: { versionNo?: number | null }): Prisma.ContentItemUncheckedUpdateInput {
    return {
      projectId: dto.projectId,
      title: dto.title,
      languageCode: dto.languageCode,
      contentType: dto.contentType,
      status: dto.status,
      summary: dto.summary,
      versionNo: Number(before?.versionNo || 1) + 1,
    };
  }


  private get prismaClient(): TransactionCapablePrisma {
    return this.prisma as unknown as TransactionCapablePrisma;
  }

  private assertOrganizationImmutable(currentOrganizationId: string, nextOrganizationId: string | undefined, entityType: string) {
    if (!nextOrganizationId || nextOrganizationId === currentOrganizationId) return;
    throw new BadRequestException(`لا يمكن نقل ${entityType} إلى organization أخرى عبر هذا المسار. استخدم workflow نقل معتمد.`);
  }
}
