import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { throwIfProdDbError } from '../../common/db-fallback';

function clampInt(n: any, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure an incident exists for (org, incidentKey). Updates lastSeenAt and optionally severity/title.
   */
  async ensureIncident(params: { organizationId: string; incidentKey: string; severity?: string | null; title?: string | null; metaJson?: any }) {
    const organizationId = String(params.organizationId || '').trim();
    const incidentKey = String(params.incidentKey || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentKey) throw new BadRequestException('incidentKey مطلوب');

    const severity = (params.severity ? String(params.severity) : 'warning').toLowerCase();
    const title = params.title ? String(params.title).slice(0, 200) : null;

    try {
      const inc = await (this.prisma as Record<string, unknown>).incident.upsert({
        where: { organizationId_incidentKey: { organizationId, incidentKey } },
        create: {
          organizationId,
          incidentKey,
          title,
          severity,
          status: 'open',
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          eventCount: 0,
          metaJson: params.metaJson ?? undefined,
        },
        update: {
          lastSeenAt: new Date(),
          ...(title ? { title } : {}),
          ...(severity ? { severity } : {}),
        },
      });

      // Auto-reopen if previously closed and a new event arrives.
      if (String(inc.status) === 'closed') {
        return await (this.prisma as Record<string, unknown>).incident.update({
          where: { id: inc.id },
          data: { status: 'open', closedAt: null, closedByUserId: null, updatedAt: new Date() },
        });
      }

      // If muted but mutedUntil already passed, reopen.
      if (String(inc.status) === 'muted' && inc.mutedUntil && new Date(inc.mutedUntil).getTime() <= Date.now()) {
        return await (this.prisma as Record<string, unknown>).incident.update({
          where: { id: inc.id },
          data: { status: 'open', mutedUntil: null, updatedAt: new Date() },
        });
      }

      return inc;
    } catch (err) {
      throwIfProdDbError(err, 'IncidentsService.ensureIncident');
      throw err;
    }
  }

  async appendEvent(params: {
    organizationId: string;
    incidentId: string;
    eventType: string;
    actorType?: 'user' | 'worker' | 'system';
    actorUserId?: string | null;
    message?: string | null;
    payload?: any;
  }) {
    const organizationId = String(params.organizationId || '').trim();
    const incidentId = String(params.incidentId || '').trim();
    const eventType = String(params.eventType || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    if (!eventType) throw new BadRequestException('eventType مطلوب');

    try {
      const ev = await (this.prisma as Record<string, unknown>).incidentEvent.create({
        data: {
          organizationId,
          incidentId,
          eventType,
          actorType: params.actorType || 'system',
          actorUserId: params.actorUserId || null,
          message: params.message ? String(params.message).slice(0, 500) : null,
          payload: params.payload ?? undefined,
        },
      });

      await (this.prisma as Record<string, unknown>).incident.update({
        where: { id: incidentId },
        data: { lastSeenAt: new Date(), eventCount: { increment: 1 }, updatedAt: new Date() },
      }).catch(() => null);

      return ev;
    } catch (err) {
      throwIfProdDbError(err, 'IncidentsService.appendEvent');
      throw err;
    }
  }

  async list(params: { organizationId: string; status?: string; limit?: number }) {
    const organizationId = String(params.organizationId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');

    const take = clampInt(params.limit ?? 100, 1, 200);
    const status = params.status ? String(params.status).toLowerCase() : '';

    try {
      const items = await (this.prisma as Record<string, unknown>).incident.findMany({
        where: {
          organizationId,
          ...(status ? { status } : {}),
        },
        orderBy: [{ lastSeenAt: 'desc' }],
        take,
      });
      return { ok: true, organizationId, count: items.length, items };
    } catch (err) {
      throwIfProdDbError(err, 'IncidentsService.list');
      return { ok: true, organizationId, count: 0, items: [] };
    }
  }

  async timeline(params: { organizationId: string; incidentId: string; limit?: number }) {
    const organizationId = String(params.organizationId || '').trim();
    const incidentId = String(params.incidentId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');

    const take = clampInt(params.limit ?? 200, 1, 500);

    const incident = await (this.prisma as Record<string, unknown>).incident.findUnique({ where: { id: incidentId } }).catch(() => null);
    if (!incident || String(incident.organizationId) !== organizationId) throw new NotFoundException('Incident غير موجود');

    const events = await (this.prisma as Record<string, unknown>).incidentEvent.findMany({
      where: { incidentId, organizationId },
      orderBy: [{ createdAt: 'desc' }],
      take,
    }).catch(() => []);

    return { ok: true, organizationId, incident, count: events.length, events };
  }

  async ack(params: { organizationId: string; incidentId: string; userId: string }) {
    const organizationId = String(params.organizationId || '').trim();
    const incidentId = String(params.incidentId || '').trim();
    const userId = String(params.userId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    if (!userId) throw new BadRequestException('userId مطلوب');

    const incident = await (this.prisma as Record<string, unknown>).incident.findUnique({ where: { id: incidentId } }).catch(() => null);
    if (!incident || String(incident.organizationId) !== organizationId) throw new NotFoundException('Incident غير موجود');

    const updated = await (this.prisma as Record<string, unknown>).incident.update({
      where: { id: incidentId },
      data: { status: 'ack', ackedAt: new Date(), ackedByUserId: userId, updatedAt: new Date() },
    });

    await this.appendEvent({ organizationId, incidentId, eventType: 'incident.ack', actorType: 'user', actorUserId: userId, message: 'تم الإقرار بالحادثة' }).catch(() => null);
    return { ok: true, incident: updated };
  }

  async close(params: { organizationId: string; incidentId: string; userId: string; note?: string | null }) {
    const organizationId = String(params.organizationId || '').trim();
    const incidentId = String(params.incidentId || '').trim();
    const userId = String(params.userId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    if (!userId) throw new BadRequestException('userId مطلوب');

    const incident = await (this.prisma as Record<string, unknown>).incident.findUnique({ where: { id: incidentId } }).catch(() => null);
    if (!incident || String(incident.organizationId) !== organizationId) throw new NotFoundException('Incident غير موجود');

    const updated = await (this.prisma as Record<string, unknown>).incident.update({
      where: { id: incidentId },
      data: { status: 'closed', closedAt: new Date(), closedByUserId: userId, mutedUntil: null, updatedAt: new Date() },
    });

    await this.appendEvent({ organizationId, incidentId, eventType: 'incident.close', actorType: 'user', actorUserId: userId, message: params.note ? String(params.note).slice(0, 200) : 'تم إغلاق الحادثة' }).catch(() => null);
    return { ok: true, incident: updated };
  }

  async mute(params: { organizationId: string; incidentId: string; userId: string; minutes: number }) {
    const organizationId = String(params.organizationId || '').trim();
    const incidentId = String(params.incidentId || '').trim();
    const userId = String(params.userId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    if (!userId) throw new BadRequestException('userId مطلوب');

    const minutes = clampInt(params.minutes, 5, 7 * 24 * 60);
    const until = new Date(Date.now() + minutes * 60_000);

    const incident = await (this.prisma as Record<string, unknown>).incident.findUnique({ where: { id: incidentId } }).catch(() => null);
    if (!incident || String(incident.organizationId) !== organizationId) throw new NotFoundException('Incident غير موجود');

    const updated = await (this.prisma as Record<string, unknown>).incident.update({
      where: { id: incidentId },
      data: { status: 'muted', mutedUntil: until, updatedAt: new Date() },
    });

    await this.appendEvent({ organizationId, incidentId, eventType: 'incident.mute', actorType: 'user', actorUserId: userId, message: `تم كتم الحادثة لمدة ${minutes} دقيقة`, payload: { minutes, mutedUntil: until.toISOString() } }).catch(() => null);
    return { ok: true, incident: updated };
  }

  async unmute(params: { organizationId: string; incidentId: string; userId: string }) {
    const organizationId = String(params.organizationId || '').trim();
    const incidentId = String(params.incidentId || '').trim();
    const userId = String(params.userId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    if (!userId) throw new BadRequestException('userId مطلوب');

    const incident = await (this.prisma as Record<string, unknown>).incident.findUnique({ where: { id: incidentId } }).catch(() => null);
    if (!incident || String(incident.organizationId) !== organizationId) throw new NotFoundException('Incident غير موجود');

    const updated = await (this.prisma as Record<string, unknown>).incident.update({
      where: { id: incidentId },
      data: { status: 'open', mutedUntil: null, updatedAt: new Date() },
    });

    await this.appendEvent({ organizationId, incidentId, eventType: 'incident.unmute', actorType: 'user', actorUserId: userId, message: 'تم إلغاء كتم الحادثة' }).catch(() => null);
    return { ok: true, incident: updated };
  }
}
