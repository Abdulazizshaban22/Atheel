import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { RealtimeService } from '../realtime/realtime.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

function norm(v: any) {
  return String(v ?? '').trim();
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  /**
   * Secure listing rules:
   * - Non-admin: can only list their own notifications (userId forced to current user).
   * - org_admin/super_admin: may list another user's notifications, but only inside activeOrgId.
   */
  async listForUser(params: {
    organizationId?: string;
    targetUserId: string;
    unread?: boolean;
    limit?: number;
    requestedBy?: RequestUser;
  }) {
    const orgId = String(params.organizationId || '').trim();
    const targetUserId = String(params.targetUserId || '').trim();
    if (!targetUserId) throw new BadRequestException('targetUserId مطلوب');

    const requester = params.requestedBy;
    const isAdmin = Boolean(requester?.roles?.includes('org_admin') || requester?.roles?.includes('super_admin'));

    // For non-admin, force targetUserId = self
    const effectiveUserId = !isAdmin ? String(requester?.sub || targetUserId) : targetUserId;
    if (!isAdmin && effectiveUserId !== String(requester?.sub || '')) {
      throw new ForbiddenException('لا يمكن عرض تنبيهات مستخدم آخر');
    }

    // If admin requests other user, verify membership in same org
    if (isAdmin && requester?.sub && effectiveUserId !== requester.sub) {
      if (!orgId) throw new BadRequestException('organizationId مطلوب');
      const m = await (this.prisma as Record<string, unknown>).organizationMember
        .findFirst({ where: { organizationId: orgId, userId: effectiveUserId } })
        .catch(() => null);
      if (!m) throw new ForbiddenException('المستخدم غير عضو في هذه الجهة');
    }

    const where: any = {
      ...(orgId ? { organizationId: orgId } : {}),
      userId: effectiveUserId,
      ...(params.unread ? { isRead: false } : {}),
    };
    const take = Math.max(1, Math.min(200, Number(params.limit || 50)));
    const items = await (this.prisma as Record<string, unknown>).internalNotification
      .findMany({ where, orderBy: [{ createdAt: 'desc' }], take })
      .catch(() => []);
    return { count: items.length, items };
  }

  async markReadForUser(id: string, user: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).internalNotification.findUnique({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('Notification not found');

    const uid = String(user?.sub || '');
    const isAdmin = Boolean(user?.roles?.includes('org_admin') || user?.roles?.includes('super_admin'));

    // Per-user notification: only owner can mark read (even if viewer).
    if (row.userId) {
      if (String(row.userId) !== uid) throw new ForbiddenException('لا تملك صلاحية تعديل هذا التنبيه');
    } else {
      // Org-wide (if ever used): restrict to admins to avoid one user affecting others.
      if (!isAdmin) throw new ForbiddenException('لا تملك صلاحية تعديل هذا التنبيه');
    }

    const updated = await (this.prisma as Record<string, unknown>).internalNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return { ok: true, notification: updated };
  }

  private async validateMemberIfProvided(organizationId?: string | null, userId?: string | null) {
    const orgId = String(organizationId || '').trim();
    const uid = String(userId || '').trim();
    if (!orgId || !uid) return;
    const m = await (this.prisma as Record<string, unknown>).organizationMember
      .findFirst({ where: { organizationId: orgId, userId: uid } })
      .catch(() => null);
    if (!m) throw new BadRequestException('userId ليس عضوًا في organizationId');
  }

  async createFromAdmin(body: any, user: RequestUser) {
    const titleAr = norm(body.titleAr);
    if (!titleAr) throw new BadRequestException('titleAr is required');

    const orgId = String(body.organizationId || user?.activeOrgId || '').trim() || null;
    const userId = body.userId ? String(body.userId).trim() : null;
    await this.validateMemberIfProvided(orgId, userId);

    const created = await (this.prisma as Record<string, unknown>).internalNotification.create({
      data: {
        organizationId: orgId,
        userId,
        severity: body.severity || 'info',
        titleAr,
        messageAr: body.messageAr || '',
        entityType: body.entityType || null,
        entityId: body.entityId || null,
        metaJson: body.metaJson || null,
      },
    });

    // Emit realtime broadcast (simple global event)
    this.realtime.emit('notifications.created', { id: created.id, organizationId: created.organizationId, severity: created.severity });
    return { ok: true, notification: created };
  }

  async createFromWorker(body: any) {
    const titleAr = norm(body.titleAr);
    if (!titleAr) throw new BadRequestException('titleAr is required');

    const orgId = body.organizationId ? String(body.organizationId).trim() : null;
    const userId = body.userId ? String(body.userId).trim() : null;
    await this.validateMemberIfProvided(orgId, userId);

    const created = await (this.prisma as Record<string, unknown>).internalNotification.create({
      data: {
        organizationId: orgId,
        userId,
        severity: body.severity || 'info',
        titleAr,
        messageAr: body.messageAr || '',
        entityType: body.entityType || null,
        entityId: body.entityId || null,
        metaJson: body.metaJson || null,
      },
    });

    this.realtime.emit('notifications.created', { id: created.id, organizationId: created.organizationId, severity: created.severity });
    return { ok: true, notification: created };
  }

  // Backwards-compatible internal API (used by other services).
  async create(body: any) {
    return this.createFromWorker(body);
  }
}
