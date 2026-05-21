import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { GovernanceService } from '../governance/governance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboxService } from '../outbox/outbox.service';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { QueueService } from '../queue/queue.service';
import { throwIfProdDbError } from '../../common/db-fallback';

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

@Injectable()
export class EscalationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governance: GovernanceService,
    private readonly notifications: NotificationsService,
    private readonly outbox: OutboxService,
    private readonly events: OperationalEventsService,
    private readonly queue: QueueService,
  ) {}

  private async getMembersByRoles(organizationId: string, roles: string[]) {
    const clean = uniq(roles.map((r) => r.trim()).filter(Boolean));
    if (!clean.length) return [];
    try {
      const members = await (this.prisma as Record<string, unknown>).organizationMember.findMany({
        where: { organizationId, role: { in: clean } },
      });
      return members.map((m: any) => m.userId).filter(Boolean);
    } catch (err) {
      throwIfProdDbError(err, 'EscalationsService.getMembersByRoles');
      return [];
    }
  }

  private async upsertState(params: { organizationId: string; entityType: string; entityId: string; lastLevel: number }) {
    try {
      const st = (this.prisma as Record<string, unknown>).escalationState;
      const existing = await st.findFirst({ where: { organizationId: params.organizationId, entityType: params.entityType, entityId: params.entityId } });
      if (!existing) {
        return await st.create({ data: { organizationId: params.organizationId, entityType: params.entityType, entityId: params.entityId, lastLevel: params.lastLevel, lastNotifiedAt: new Date() } });
      }
      return await st.update({ where: { id: existing.id }, data: { lastLevel: params.lastLevel, lastNotifiedAt: new Date() } });
    } catch (err) {
      throwIfProdDbError(err, 'EscalationsService.upsertState');
      return null;
    }
  }

  async escalateApproval(approvalId: string) {
    // Load approval
    let approval: any;
    try {
      approval = await (this.prisma as Record<string, unknown>).approvalRequest.findUnique({ where: { id: approvalId } });
    } catch (err) {
      throwIfProdDbError(err, 'EscalationsService.escalateApproval.load');
      throw err;
    }
    if (!approval) throw new NotFoundException('Approval not found');

    const organizationId = approval.organizationId;
    if (['approved','rejected','cancelled'].includes(String(approval.status || ''))) {
      return { ok: true, escalated: false, reason: 'final_state', status: approval.status };
    }

    const dueAt = approval.dueAt ? new Date(approval.dueAt) : null;
    if (!dueAt) return { ok: true, escalated: false, reason: 'no_dueAt' };

    const now = new Date();
    const minutesOverdue = Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / 60000));
    if (minutesOverdue <= 0) {
      // Schedule the first check at dueAt if in Redis mode
      await this.queue.scheduleEscalationTask({ kind: 'approval', id: approvalId, dueAt: dueAt.toISOString() }).catch(() => null);
      return { ok: true, escalated: false, reason: 'not_overdue' };
    }

    const policy = await this.governance.getActivePolicy(organizationId);
    const plan = this.governance.computeApprovalEscalationPlan(policy);
    if (!plan.length) return { ok: true, escalated: false, reason: 'no_plan' };

    // Determine highest applicable level
    let targetLevel = 0;
    for (let i = 0; i < plan.length; i++) {
      if (minutesOverdue >= plan[i].afterMinutes) targetLevel = i + 1;
    }
    if (targetLevel <= 0) return { ok: true, escalated: false, reason: 'no_threshold' };

    // Read state to avoid duplicate alerts
    let state: any = null;
    try {
      state = await (this.prisma as Record<string, unknown>).escalationState.findFirst({ where: { organizationId, entityType: 'ApprovalRequest', entityId: approvalId } });
    } catch (err) {
      throwIfProdDbError(err, 'EscalationsService.escalateApproval.stateLoad');
    }
    const lastLevel = Number(state?.lastLevel || 0);
    if (targetLevel <= lastLevel) {
      // Ensure next job is scheduled if more levels exist
      await this.scheduleNextApprovalLevel(approval, plan, lastLevel);
      return { ok: true, escalated: false, reason: 'already_notified', lastLevel, targetLevel };
    }

    const levelDef = plan[targetLevel - 1];
    const titleAr = levelDef.titleAr || 'تصعيد';
    const messageAr = levelDef.messageAr || 'تم تصعيد عنصر متأخر وفق سياسة SLA.';
    const severity = levelDef.severity || 'warning';

    // Resolve recipients
    const notify = Array.isArray(levelDef.notify) ? levelDef.notify : [];
    const userIds: string[] = [];

    if (notify.includes('current_approver') && approval.currentApproverId) userIds.push(approval.currentApproverId);
    const roleNotifies = notify.filter((n: string) => !['current_approver'].includes(n));
    userIds.push(...(await this.getMembersByRoles(organizationId, roleNotifies)));

    const recipients = uniq(userIds).filter(Boolean);

    // In-app notifications
    const channels = Array.isArray(levelDef.channels) ? levelDef.channels : ['in_app'];
    if (channels.includes('in_app')) {
      for (const uid of recipients) {
        await this.notifications.create({
          organizationId,
          userId: uid,
          severity,
          titleAr,
          messageAr,
          entityType: 'ApprovalRequest',
          entityId: approvalId,
          metaJson: { level: targetLevel, minutesOverdue, dueAt: dueAt.toISOString() },
        }).catch(() => null);
      }
    }

    // External channels via outbox (org-level broadcast)
    const external = channels.filter((c: string) => c !== 'in_app');
    for (const ch of external) {
      await this.outbox.create({ organizationId, channel: ch, payload: {
          titleAr,
          messageAr,
          severity,
          entityType: 'ApprovalRequest',
          entityId: approvalId,
          minutesOverdue,
          dueAt: dueAt.toISOString(),
          text: `⚠️ ${titleAr}\n${messageAr}\nApproval: ${approvalId}\nOrg: ${organizationId}`,
        }, dedupKey: `sla:approval:${approvalId}:level:${targetLevel}:ch:${ch}`, incidentKey: `sla:approval:${approvalId}`, respectQuietHours: { severity } } as any).catch(() => null);
    }

    await this.upsertState({ organizationId, entityType: 'ApprovalRequest', entityId: approvalId, lastLevel: targetLevel });

    await this.events.emit({
      organizationId,
      actorType: 'worker',
      eventType: 'sla.escalation.approval',
      severity: severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info',
      subject: `ApprovalRequest/${approvalId}`,
      data: { level: targetLevel, minutesOverdue, dueAt: dueAt.toISOString(), channels, recipientsCount: recipients.length },
    });

    // Schedule next level check if exists
    await this.scheduleNextApprovalLevel(approval, plan, targetLevel);

    return { ok: true, escalated: true, level: targetLevel, minutesOverdue, recipientsCount: recipients.length, channels };
  }

  private async scheduleNextApprovalLevel(approval: any, plan: any[], lastLevel: number) {
    const dueAt = approval.dueAt ? new Date(approval.dueAt) : null;
    if (!dueAt) return;
    const next = plan[lastLevel]; // next index
    if (!next) return;
    const at = new Date(dueAt.getTime() + Math.max(0, Number(next.afterMinutes || 0)) * 60_000);
    await this.queue.scheduleEscalationTask({ kind: 'approval', id: approval.id, dueAt: at.toISOString() }).catch(() => null);
  }
}
