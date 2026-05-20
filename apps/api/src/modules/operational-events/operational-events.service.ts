import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { throwIfProdDbError } from '../../common/db-fallback';

function cuidLike(prefix = 'evt') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

@Injectable()
export class OperationalEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: any) {
    const take = Math.max(1, Math.min(500, Number(params.limit || 100)));
    const where: any = {
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.eventType ? { eventType: params.eventType } : {}),
      ...(params.subject ? { subject: params.subject } : {}),
      ...(params.correlationId ? { correlationId: params.correlationId } : {}),
      ...(params.requestId ? { requestId: params.requestId } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
    };

    try {
      const ev = (this.prisma as Record<string, unknown>).operationalEvent;
      if (!ev?.findMany) throw new Error('operationalEvent unavailable');
      const items = await ev.findMany({ where, orderBy: [{ createdAt: 'desc' }], take });
      return { count: items.length, items };
    } catch (err) {
      throwIfProdDbError(err, 'OperationalEventsService.list');
      return { count: 0, items: [] };
    }
  }

  async emit(input: {
    organizationId?: string | null;
    actorType?: 'user'|'service'|'worker'|'system';
    actorUserId?: string | null;
    eventType: string;
    source?: string | null;
    subject?: string | null;
    correlationId?: string | null;
    requestId?: string | null;
    severity?: 'info'|'warning'|'critical';
    data?: any;
  }) {
    const source = (input.source || 'atheel.api').toString();
    const type = input.eventType;
    const subject = input.subject || null;
    const timeIso = new Date().toISOString();
    const cloudEvent = {
      specversion: '1.0',
      id: cuidLike('ce'),
      source,
      type,
      subject: subject || undefined,
      time: timeIso,
      datacontenttype: 'application/json',
      data: input.data ?? undefined,
      // extensions
      organizationid: input.organizationId || undefined,
      correlationid: input.correlationId || undefined,
      requestid: input.requestId || undefined,
      severity: input.severity || 'info',
      actortype: input.actorType || 'user',
      actoruserid: input.actorUserId || undefined,
    };

    try {
      const ev = (this.prisma as Record<string, unknown>).operationalEvent;
      if (!ev?.create) throw new Error('operationalEvent unavailable');
      const row = await ev.create({
        data: {
          organizationId: input.organizationId || null,
          actorType: input.actorType || 'user',
          actorUserId: input.actorUserId || null,
          eventType: type,
          source,
          subject,
          correlationId: input.correlationId || null,
          requestId: input.requestId || null,
          severity: input.severity || 'info',
          data: input.data ?? null,
          cloudEvent,
        },
      });
      return row;
    } catch (err) {
      throwIfProdDbError(err, 'OperationalEventsService.emit');
      return null;
    }
  }
}
