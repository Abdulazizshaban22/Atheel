import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Project } from '@prisma/client';
import { PrismaService } from '@madar/db';
import { buildAuditLogPayload } from '../../common/audit/audit-log-payload.util';
import { getRequestContext } from '../../common/request-context';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS } from '../../common/contracts/resource-action.catalog';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository, type ProjectDbClient } from './projects.repository';

type PrismaTx = Prisma.TransactionClient & ProjectDbClient;
type TransactionCapablePrisma = PrismaService & {
  $transaction<T>(callback: (tx: PrismaTx) => Promise<T>): Promise<T>;
};

@Injectable()
export class ProjectsApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ProjectsRepository,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(dto: CreateProjectDto) {
    try {
      return await this.prismaClient.$transaction(async (tx: PrismaTx) => {
        const project = await this.repository.create(this.toCreateData(dto), tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId: project.organizationId,
            action: CORE_MUTATION_ACTIONS.projectCreate,
            entityType: AUDIT_ENTITY_TYPES.project,
            entityId: project.id,
            message: 'Project created',
            after: project,
          }),
        });
        return project;
      });
    } catch (err) {
      const row = await this.repository.create(this.toCreateData(dto));
      await this.auditLogs.recordAction({
        organizationId: row.organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.projectCreate,
        entityType: AUDIT_ENTITY_TYPES.project,
        entityId: row.id,
        message: 'Project created',
        after: row,
      });
      return row;
    }
  }

  async update(id: string, dto: UpdateProjectDto) {
    try {
      return await this.prismaClient.$transaction(async (tx: PrismaTx) => {
        const before = await this.repository.findById(id, tx);
        this.assertOrganizationImmutable(before.organizationId, dto.organizationId, 'project');
        const updated = await this.repository.update(id, this.toUpdateData(dto), tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId: updated.organizationId,
            action: CORE_MUTATION_ACTIONS.projectUpdate,
            entityType: AUDIT_ENTITY_TYPES.project,
            entityId: updated.id,
            message: 'Project updated',
            before,
            after: updated,
          }),
        });
        return updated;
      });
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      const before = await this.repository.findById(id);
      this.assertOrganizationImmutable(before.organizationId, dto.organizationId, 'project');
      const updated = await this.repository.update(id, this.toUpdateData(dto));
      await this.auditLogs.recordAction({
        organizationId: updated.organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.projectUpdate,
        entityType: AUDIT_ENTITY_TYPES.project,
        entityId: updated.id,
        message: 'Project updated',
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
            action: CORE_MUTATION_ACTIONS.projectDelete,
            entityType: AUDIT_ENTITY_TYPES.project,
            entityId: before.id,
            message: 'Project deleted',
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
        action: CORE_MUTATION_ACTIONS.projectDelete,
        entityType: AUDIT_ENTITY_TYPES.project,
        entityId: before.id,
        message: 'Project deleted',
        before,
        after: result,
      });
      return result;
    }
  }

  private toCreateData(dto: CreateProjectDto): Prisma.ProjectUncheckedCreateInput {
    return {
      organizationId: dto.organizationId,
      code: dto.code,
      nameAr: dto.nameAr,
      status: dto.status ?? 'draft',
      progressPercent: dto.progressPercent ?? 0,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    };
  }

  private toUpdateData(dto: UpdateProjectDto): Prisma.ProjectUncheckedUpdateInput {
    return {
      code: dto.code,
      nameAr: dto.nameAr,
      status: dto.status,
      progressPercent: dto.progressPercent,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
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
