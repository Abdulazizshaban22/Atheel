import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { Prisma } from '@prisma/client';
import { buildAuditLogPayload } from '../../common/audit/audit-log-payload.util';
import { buildDomainMutationEvent } from '../../common/events/domain-mutation-event.util';
import { AUDIT_ENTITY_TYPES, CORE_EVENT_TYPES, CORE_MUTATION_ACTIONS, MUTATION_SUBJECT_KINDS, buildMutationSubject } from '../../common/contracts/resource-action.catalog';
import { throwIfProdDbError } from '../../common/db-fallback';
import { getRequestContext } from '../../common/request-context';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ExperiencesRepository, type ExperienceDbClient } from './experiences.repository';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { OperationalEventOutboxService } from '../outbox/operational-event-outbox.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { ExperienceTwinOrchestratorService } from './experience-twin-orchestrator.service';
import type { ExperienceCreateData, ExperienceDeleteResult, ExperienceRecord, ExperienceUpdateData } from './experience-core.types';

type ExperienceWriteTx = ExperienceDbClient & {
  auditLog: { create(args: { data: ReturnType<typeof buildAuditLogPayload> }): Promise<unknown> };
};
type ExperiencePrismaFacade = PrismaService & {
  $transaction<T>(fn: (tx: ExperienceWriteTx) => Promise<T>): Promise<T>;
};

@Injectable()
export class ExperiencesApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ExperiencesRepository,
    private readonly auditLogs: AuditLogsService,
    private readonly twinOrchestrator: ExperienceTwinOrchestratorService,
    private readonly events: OperationalEventsService,
    private readonly eventOutbox: OperationalEventOutboxService,
  ) {}

  async create(dto: CreateExperienceDto) {
    const createData: ExperienceCreateData = {
      projectId: dto.projectId,
      titleAr: dto.titleAr,
      experienceType: dto.experienceType,
      durationMinutesDefault: dto.durationMinutesDefault,
      publishStatus: dto.publishStatus ?? 'draft',
    };

    try {
      const organizationId = await this.repository.resolveOrganizationIdForProject(dto.projectId);
      const result = await (this.prisma as ExperiencePrismaFacade).$transaction(async (tx: ExperienceWriteTx) => {
        const created = await this.repository.create(createData, tx);
        await this.writeAudit(tx, {
          organizationId,
          action: CORE_MUTATION_ACTIONS.experienceCreate,
          entityId: created.id,
          message: 'Experience created',
          after: created,
        });

        const staged = await this.eventOutbox.stageEvent(buildDomainMutationEvent({
          organizationId,
          eventType: CORE_EVENT_TYPES.experienceCreated,
          subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, created.id),
          data: {
            projectId: created.projectId,
            publishStatus: created.publishStatus,
          },
        }), tx as unknown as Prisma.TransactionClient);

        return { created, outboxId: staged.id };
      });

      await this.eventOutbox.dispatchStaged(result.outboxId);
      const twinSync = await this.twinOrchestrator.enqueueEnsureLinked(result.created.id, { reason: 'create', recordQueueAudit: false });
      const finalExperience = await this.reloadExperience(result.created.id, result.created);
      return { ...finalExperience, twinSync };
    } catch (err) {
      throwIfProdDbError(err, 'ExperiencesApplicationService.create');
      const created = await this.repository.create({ ...createData, id: `exp_${Date.now()}` });
      const organizationId = await this.repository.resolveOrganizationIdForProject(created.projectId);

      await this.auditLogs.recordAction({
        organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.experienceCreate,
        entityType: AUDIT_ENTITY_TYPES.experience,
        entityId: created.id,
        message: 'Experience created',
        after: created,
      });

      await this.events.emit(buildDomainMutationEvent({
        organizationId,
        eventType: CORE_EVENT_TYPES.experienceCreated,
        subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, created.id),
        data: {
          projectId: created.projectId,
          publishStatus: created.publishStatus,
        },
      })).catch(() => null);

      const twinSync = await this.twinOrchestrator.enqueueEnsureLinked(created.id, { reason: 'create', recordQueueAudit: false });
      const finalExperience = await this.reloadExperience(created.id, created);
      return { ...finalExperience, twinSync };
    }
  }

  async update(id: string, dto: UpdateExperienceDto) {
    const updateData: ExperienceUpdateData = {
      titleAr: dto.titleAr,
      experienceType: dto.experienceType,
      durationMinutesDefault: dto.durationMinutesDefault,
      publishStatus: dto.publishStatus,
    };

    try {
      const result = await (this.prisma as ExperiencePrismaFacade).$transaction(async (tx: ExperienceWriteTx) => {
        const before = await this.repository.findById(id, tx);
        this.assertProjectImmutable(before.projectId, dto.projectId);
        const updated = await this.repository.update(id, updateData, tx);
        const organizationId = await this.repository.resolveOrganizationIdForProject(updated.projectId);

        await this.writeAudit(tx, {
          organizationId,
          action: CORE_MUTATION_ACTIONS.experienceUpdate,
          entityId: updated.id,
          message: 'Experience updated',
          before,
          after: updated,
        });

        const staged = await this.eventOutbox.stageEvent(buildDomainMutationEvent({
          organizationId,
          eventType: CORE_EVENT_TYPES.experienceUpdated,
          subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, updated.id),
          data: {
            projectId: updated.projectId,
            fromPublishStatus: before.publishStatus,
            toPublishStatus: updated.publishStatus,
          },
        }), tx as unknown as Prisma.TransactionClient);

        return { updated, outboxId: staged.id };
      });

      await this.eventOutbox.dispatchStaged(result.outboxId);
      return result.updated;
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throwIfProdDbError(err, 'ExperiencesApplicationService.update');
      const before = await this.repository.findById(id);
      this.assertProjectImmutable(before.projectId, dto.projectId);
      const updated = await this.repository.update(id, updateData);
      const organizationId = await this.repository.resolveOrganizationIdForProject(updated.projectId);

      await this.auditLogs.recordAction({
        organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.experienceUpdate,
        entityType: AUDIT_ENTITY_TYPES.experience,
        entityId: id,
        message: 'Experience updated',
        before,
        after: updated,
      });

      await this.events.emit(buildDomainMutationEvent({
        organizationId,
        eventType: CORE_EVENT_TYPES.experienceUpdated,
        subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, id),
        data: {
          projectId: updated.projectId,
          fromPublishStatus: before.publishStatus,
          toPublishStatus: updated.publishStatus,
        },
      })).catch(() => null);

      return updated;
    }
  }

  async remove(id: string): Promise<ExperienceDeleteResult> {
    try {
      const result = await (this.prisma as ExperiencePrismaFacade).$transaction(async (tx: ExperienceWriteTx) => {
        const before = await this.repository.findById(id, tx);
        const deleted = await this.repository.delete(id, tx);
        const organizationId = await this.repository.resolveOrganizationIdForProject(before.projectId);

        await this.writeAudit(tx, {
          organizationId,
          action: CORE_MUTATION_ACTIONS.experienceDelete,
          entityId: before.id,
          message: 'Experience deleted',
          before,
          after: deleted,
        });

        const staged = await this.eventOutbox.stageEvent(buildDomainMutationEvent({
          organizationId,
          eventType: CORE_EVENT_TYPES.experienceDeleted,
          subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, before.id),
          severity: 'warning',
          data: { projectId: before.projectId },
        }), tx as unknown as Prisma.TransactionClient);

        return { deleted, outboxId: staged.id };
      });

      await this.eventOutbox.dispatchStaged(result.outboxId);
      return result.deleted;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwIfProdDbError(err, 'ExperiencesApplicationService.remove');
      const before = await this.repository.findById(id);
      const result = await this.repository.delete(id);
      const organizationId = await this.repository.resolveOrganizationIdForProject(before.projectId);

      await this.auditLogs.recordAction({
        organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.experienceDelete,
        entityType: AUDIT_ENTITY_TYPES.experience,
        entityId: id,
        message: 'Experience deleted',
        before,
        after: result,
      });

      await this.events.emit(buildDomainMutationEvent({
        organizationId,
        eventType: CORE_EVENT_TYPES.experienceDeleted,
        subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.experience, id),
        severity: 'warning',
        data: { projectId: before.projectId },
      })).catch(() => null);

      return result;
    }
  }

  async ensureTwin(id: string) {
    const result = await this.twinOrchestrator.enqueueEnsureLinked(id, { reason: 'manual', recordQueueAudit: true });
    if (!result.ok && !result.experience) {
      throw new NotFoundException('التجربة غير موجودة');
    }
    return result;
  }

  private async reloadExperience(id: string, fallback: ExperienceRecord): Promise<ExperienceRecord> {
    return this.repository.findById(id).catch(() => fallback);
  }

  private async writeAudit(
    tx: ExperienceWriteTx,
    input: { organizationId?: string; action: string; entityId: string; message: string; before?: unknown; after?: unknown },
  ) {
    await tx.auditLog.create({
      data: buildAuditLogPayload({
        organizationId: input.organizationId,
        action: input.action,
        entityType: AUDIT_ENTITY_TYPES.experience,
        entityId: input.entityId,
        message: input.message,
        before: input.before,
        after: input.after,
      }),
    });
  }

  private assertProjectImmutable(currentProjectId: string, nextProjectId?: string) {
    if (!nextProjectId || nextProjectId === currentProjectId) return;
    throw new BadRequestException('لا يمكن نقل التجربة إلى مشروع آخر عبر هذا المسار. استخدم workflow نقل معتمد.');
  }
}
