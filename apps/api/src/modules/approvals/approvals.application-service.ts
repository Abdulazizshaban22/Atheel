import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { buildAuditLogPayload } from '../../common/audit/audit-log-payload.util';
import { buildDomainMutationEvent } from '../../common/events/domain-mutation-event.util';
import { AUDIT_ENTITY_TYPES, CORE_EVENT_TYPES, CORE_MUTATION_ACTIONS, MUTATION_SUBJECT_KINDS, buildMutationSubject, resolveApprovalEventType } from '../../common/contracts/resource-action.catalog';
import { assertOrgAccess, isOrgAdmin } from '../../common/access';
import { getRequestContext } from '../../common/request-context';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GovernanceService } from '../governance/governance.service';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { QueueService } from '../queue/queue.service';
import { OperationalEventOutboxService } from '../outbox/operational-event-outbox.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ApprovalsRoutingService } from './approvals-routing.service';
import { ApprovalsRepository } from './approvals.repository';


@Injectable()
export class ApprovalsApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ApprovalsRepository,
    private readonly auditLogs: AuditLogsService,
    private readonly governance: GovernanceService,
    private readonly queue: QueueService,
    private readonly events: OperationalEventsService,
    private readonly eventOutbox: OperationalEventOutboxService,
    private readonly routing: ApprovalsRoutingService,
  ) {}

  async create(dto: CreateApprovalDto, user?: RequestUser) {
    const organizationId = dto.organizationId || (user?.orgIds || [])[0];
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const payload = {
      organizationId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      title: dto.title,
      status: 'draft',
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      contextViolationType: dto.contextViolationType ? String(dto.contextViolationType) : null,
      contextDomain: dto.contextDomain ? String(dto.contextDomain) : null,
      contextRegion: dto.contextRegion ? String(dto.contextRegion) : null,
      payloadSnapshot: dto.payloadSnapshot,
    };

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const row = await this.repository.create(payload, tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId,
            action: CORE_MUTATION_ACTIONS.approvalCreate,
            entityType: AUDIT_ENTITY_TYPES.approvalRequest,
            entityId: row.id,
            message: `Approval request created: ${dto.title}`,
            after: row,
          }),
        });
        const staged = await this.eventOutbox.stageEvent(buildDomainMutationEvent({
          organizationId,
          eventType: CORE_EVENT_TYPES.approvalCreated,
          subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.approvalRequest, row.id),
          data: { entityType: row.entityType, entityId: row.entityId, status: row.status },
        }), tx);
        return { row, outboxId: staged.id };
      });

      await this.eventOutbox.dispatchStaged(result.outboxId);
      return result.row;
    } catch {
      const row = await this.repository.create(payload);
      await this.auditLogs.recordAction({
        organizationId,
        actorUserId: getRequestContext().userId,
        action: CORE_MUTATION_ACTIONS.approvalCreate,
        entityType: AUDIT_ENTITY_TYPES.approvalRequest,
        entityId: row.id,
        message: `Approval request created: ${dto.title}`,
        after: row,
      });
      await this.events.emit(buildDomainMutationEvent({
        organizationId,
        eventType: CORE_EVENT_TYPES.approvalCreated,
        subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.approvalRequest, row.id),
        data: { entityType: row.entityType, entityId: row.entityId, status: row.status },
      })).catch(() => null);
      return row;
    }
  }

  async submit(id: string, user?: RequestUser, currentApproverId?: string) {
    const before = await this.repository.findById(id);
    assertOrgAccess(user, before.organizationId);

    const policy = await this.governance.getActivePolicy(before.organizationId);
    let approverId = currentApproverId;
    const dueAt = before.dueAt ? new Date(before.dueAt) : this.governance.computeApprovalDueAt(policy, new Date());

    const routingMode = (process.env.APPROVALS_ROUTING_MODE || 'auto').toLowerCase();
    if (!approverId && routingMode !== 'default') {
      const pick = await this.routing.pickApprover({
        organizationId: before.organizationId,
        entityType: before.entityType,
        dueAt,
        contextViolationType: before.contextViolationType || null,
        contextDomain: before.contextDomain || null,
        contextRegion: before.contextRegion || null,
      });
      approverId = pick.selectedUserId || null;
    }

    if (!approverId) {
      approverId = (await this.governance.resolveDefaultApproverId(before.organizationId, policy)) ?? undefined;
      if (!approverId) throw new BadRequestException('لم يتم العثور على معتمد افتراضي وفق سياسة الحوكمة');
    }

    const after = await this.transition(
      id,
      'submitted',
      { submittedByUserId: user?.sub, submittedAt: new Date(), currentApproverId: approverId, dueAt },
      user,
      CORE_MUTATION_ACTIONS.approvalSubmit,
    );

    await this.queue.scheduleEscalationTask({ kind: 'approval', id, dueAt: dueAt.toISOString() }).catch(() => null);
    return after;
  }

  async approve(id: string, user?: RequestUser, note?: string) {
    if (!note) throw new BadRequestException('decisionNote مطلوب عند الاعتماد');
    return this.transition(id, 'approved', { decidedAt: new Date(), decisionNote: note, currentApproverId: user?.sub }, user, CORE_MUTATION_ACTIONS.approvalApprove);
  }

  async reject(id: string, user?: RequestUser, note?: string) {
    if (!note) throw new BadRequestException('decisionNote مطلوب عند الرفض');
    return this.transition(id, 'rejected', { decidedAt: new Date(), decisionNote: note, currentApproverId: user?.sub }, user, CORE_MUTATION_ACTIONS.approvalReject);
  }

  async requestChanges(id: string, user?: RequestUser, changes?: string) {
    if (!changes) throw new BadRequestException('requestedChanges مطلوب عند طلب التعديلات');
    return this.transition(id, 'changes_requested', { requestedChanges: changes, currentApproverId: user?.sub }, user, CORE_MUTATION_ACTIONS.approvalRequestChanges);
  }

  async cancel(id: string, user?: RequestUser, note?: string) {
    return this.transition(id, 'cancelled', { decidedAt: new Date(), decisionNote: note }, user, CORE_MUTATION_ACTIONS.approvalCancel);
  }

  private async transition(id: string, nextStatus: string, patch: Record<string, unknown>, user: RequestUser | undefined, action: string) {
    const valid = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'changes_requested', 'cancelled'];
    if (!valid.includes(nextStatus)) throw new BadRequestException('حالة غير مدعومة');

    const allowed: Record<string, string[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['in_review', 'approved', 'rejected', 'changes_requested', 'cancelled'],
      in_review: ['approved', 'rejected', 'changes_requested', 'cancelled'],
      changes_requested: ['submitted', 'cancelled'],
      approved: [],
      rejected: [],
      cancelled: [],
    };

    const before = await this.repository.findById(id);
    assertOrgAccess(user, before.organizationId);

    const fromStatus = String(before.status || 'draft');
    const allowedNext = allowed[fromStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      throw new BadRequestException(`انتقال غير مسموح من ${fromStatus} إلى ${nextStatus}`);
    }

    const isDecision = ['approved', 'rejected', 'changes_requested'].includes(nextStatus);
    if (isDecision) {
      const isPrivileged = isOrgAdmin(user);
      const isCurrentApprover = before.currentApproverId ? before.currentApproverId === user?.sub : false;
      if (!isPrivileged && !isCurrentApprover) {
        throw new ForbiddenException('لا تملك صلاحية اتخاذ القرار على هذا الطلب');
      }
    }

    if (nextStatus === 'cancelled') {
      const isPrivileged = isOrgAdmin(user);
      const isSubmitter = before.submittedByUserId ? before.submittedByUserId === user?.sub : false;
      if (!isPrivileged && !isSubmitter) {
        throw new ForbiddenException('لا تملك صلاحية إلغاء هذا الطلب');
      }
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const after = await this.repository.update(id, { status: nextStatus, ...patch }, tx);
        await tx.auditLog.create({
          data: buildAuditLogPayload({
            organizationId: after.organizationId,
            action,
            entityType: AUDIT_ENTITY_TYPES.approvalRequest,
            entityId: id,
            message: `Approval transitioned to ${nextStatus}`,
            before,
            after,
          }),
        });
        const staged = await this.eventOutbox.stageEvent(buildDomainMutationEvent({
          organizationId: after.organizationId,
          actorUserId: user?.sub || null,
          eventType: resolveApprovalEventType(nextStatus),
          subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.approvalRequest, id),
          severity: ['approved', 'rejected'].includes(nextStatus) ? 'critical' : 'info',
          data: { fromStatus, toStatus: nextStatus },
        }), tx);
        return { after, outboxId: staged.id };
      });

      await this.eventOutbox.dispatchStaged(result.outboxId);
      await this.tryRecordRoutingSkill(result.after, before, user, nextStatus);
      return result.after;
    } catch {
      const after = await this.repository.update(id, { status: nextStatus, ...patch });
      await this.auditLogs.recordAction({
        organizationId: after.organizationId,
        actorUserId: getRequestContext().userId,
        action,
        entityType: AUDIT_ENTITY_TYPES.approvalRequest,
        entityId: id,
        message: `Approval transitioned to ${nextStatus}`,
        before,
        after,
      });
      await this.events.emit(buildDomainMutationEvent({
        organizationId: after.organizationId,
        actorUserId: user?.sub || null,
        eventType: resolveApprovalEventType(nextStatus),
        subject: buildMutationSubject(MUTATION_SUBJECT_KINDS.approvalRequest, id),
        severity: ['approved', 'rejected'].includes(nextStatus) ? 'critical' : 'info',
        data: { fromStatus, toStatus: nextStatus },
      })).catch(() => null);
      await this.tryRecordRoutingSkill(after, before, user, nextStatus);
      return after;
    }
  }

  private async tryRecordRoutingSkill(after: any, before: any, user: RequestUser | undefined, nextStatus: string) {
    try {
      const isDecisionUpdate = ['approved', 'rejected', 'changes_requested'].includes(String(nextStatus));
      if (isDecisionUpdate && user?.sub) {
        await this.routing.recordDecision({
          organizationId: after.organizationId,
          reviewerUserId: user.sub,
          entityType: String(after.entityType || 'content'),
          contextViolationType: after.contextViolationType || null,
          contextDomain: after.contextDomain || null,
          contextRegion: after.contextRegion || null,
          submittedAt: before.submittedAt ? new Date(before.submittedAt) : null,
          decidedAt: after.decidedAt ? new Date(after.decidedAt) : new Date(),
          dueAt: after.dueAt ? new Date(after.dueAt) : null,
        });
      }
    } catch {
      // ignore skill update failures
    }
  }
}
