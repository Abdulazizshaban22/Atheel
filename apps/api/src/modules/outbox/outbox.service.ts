import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { QueueService } from '../queue/queue.service';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { IncidentsService } from '../incidents/incidents.service';
import { MetricsService } from '../metrics/metrics.service';
import { throwIfProdDbError } from '../../common/db-fallback';
import { isOperationalEventOutboxPayload, OPERATIONAL_EVENT_OUTBOX_CHANNEL } from '../../common/events/operational-event-outbox.util';

const CHANNEL_ENV: Record<string, string> = {
  slack: 'SLACK_WEBHOOK_URL',
  email: 'EMAIL_WEBHOOK_URL',
  whatsapp: 'WHATSAPP_WEBHOOK_URL',
};

function nowPlus(ms: number) {
  return new Date(Date.now() + ms);
}

function parseHHMM(s: string | null | undefined) {
  const v = String(s || '').trim();
  if (!v) return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(v);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function isWithinQuietHours(now: Date, start: { h: number; m: number }, end: { h: number; m: number }) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const s = start.h * 60 + start.m;
  const e = end.h * 60 + end.m;
  if (s === e) return false;
  if (s < e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e;
}

function computeQuietHoursEnd(now: Date, end: { h: number; m: number }) {
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(end.h, end.m, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

@Injectable()
export class OutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly events: OperationalEventsService,
    private readonly incidents: IncidentsService,
    private readonly metrics: MetricsService,
  ) {}

  private async ensureIncidentForOutbox(params: { organizationId: string | null; incidentKey: string | null; severity?: string | null; title?: string | null }) {
    const organizationId = params.organizationId ? String(params.organizationId) : '';
    const incidentKey = params.incidentKey ? String(params.incidentKey) : '';
    if (!organizationId || !incidentKey) return null;
    try {
      return await this.incidents.ensureIncident({
        organizationId,
        incidentKey,
        severity: params.severity || 'warning',
        title: params.title || null,
      });
    } catch {
      return null;
    }
  }

  async list(params: any) {
    const take = Math.max(1, Math.min(200, Number(params.limit || 50)));
    const where: any = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.channel ? { channel: params.channel } : {}),
      ...(params.incidentKey ? { incidentKey: params.incidentKey } : {}),
    };
    try {
      const outbox = (this.prisma as Record<string, unknown>).outboxMessage;
      const items = await outbox.findMany({ where, orderBy: [{ createdAt: 'desc' }], take });
      return { count: items.length, items };
    } catch (err) {
      throwIfProdDbError(err, 'OutboxService.list');
      return { count: 0, items: [] };
    }
  }

  private async getOpsSettings(organizationId: string | null | undefined) {
    if (!organizationId) return null;
    try {
      return await (this.prisma as Record<string, unknown>).opsSettings.findUnique({ where: { organizationId } });
    } catch {
      return null;
    }
  }

  private async shouldSuppressForQuietHours(params: { organizationId?: string | null; severity?: string }) {
    const severity = String(params.severity || '').toLowerCase();
    if (!params.organizationId) return null;
    // critical is never suppressed
    if (severity === 'critical') return null;

    const settings = await this.getOpsSettings(params.organizationId);
    const env = String(process.env.ESCALATION_QUIET_HOURS || '').trim();
    const envStart = env.includes('-') ? env.split('-')[0] : '';
    const envEnd = env.includes('-') ? env.split('-')[1] : '';

    const start = parseHHMM(settings?.quietHoursStart || envStart);
    const end = parseHHMM(settings?.quietHoursEnd || envEnd);
    if (!start || !end) return null;

    const now = new Date();
    if (!isWithinQuietHours(now, start, end)) return null;
    return computeQuietHoursEnd(now, end);
  }

  private resolveWebhook(channel: string): string {
    const env = CHANNEL_ENV[channel];
    return env ? (process.env[env] || '').toString().trim() : '';
  }

  async create(input: { organizationId?: string | null; channel: string; payload: any; nextAttemptAt?: Date | null; dedupKey?: string | null; incidentKey?: string | null; respectQuietHours?: { severity?: string } | null }) {
    const channel = (input.channel || '').toString().trim();
    if (!channel) throw new BadRequestException('channel مطلوب');

    const organizationId = input.organizationId || null;

    // Quiet-hours suppression: delay external channels only.
    let nextAttemptAt = input.nextAttemptAt || null;
    if (input.respectQuietHours?.severity && channel !== 'in_app') {
      const suppressedUntil = await this.shouldSuppressForQuietHours({ organizationId, severity: input.respectQuietHours.severity });
      if (suppressedUntil) nextAttemptAt = suppressedUntil;
    }

    // Dedup: if dedupKey exists and a similar message was created recently, increment groupCount and reuse.
    const dedupKey = input.dedupKey ? String(input.dedupKey) : null;
    const incidentKey = input.incidentKey ? String(input.incidentKey) : null;
    const incidentTitle = (input.payload?.titleAr || input.payload?.title || input.payload?.subject || null) as any;
    const severity = input.respectQuietHours?.severity ? String(input.respectQuietHours.severity) : (input.payload?.severity ? String(input.payload.severity) : null);

    try {
      const outbox = (this.prisma as Record<string, unknown>).outboxMessage;

      const inc = await this.ensureIncidentForOutbox({ organizationId, incidentKey, severity, title: incidentTitle });

      if (dedupKey) {
        const settings = await this.getOpsSettings(organizationId);
        const windowMin = Math.max(1, Math.min(24 * 60, Number(settings?.outboxDedupWindowMinutes || 30)));
        const since = new Date(Date.now() - windowMin * 60_000);
        const existing = await outbox.findFirst({
          where: { dedupKey, createdAt: { gte: since }, organizationId, channel },
          orderBy: [{ createdAt: 'desc' }],
        }).catch(() => null);

        if (existing) {
          const updated = await outbox.update({
            where: { id: existing.id },
            data: {
              groupCount: { increment: 1 },
              // keep latest message merged into payload meta
              payload: {
                ...(existing.payload || {}),
                _dedup: { key: dedupKey, bumpedAt: new Date().toISOString(), count: Number(existing.groupCount || 1) + 1 },
              },
              updatedAt: new Date(),
            },
          }).catch(() => existing);

          // Wave46: incident timeline event for dedup bumps
          if (inc?.id) {
            await this.incidents.appendEvent({
              organizationId: String(organizationId),
              incidentId: String(inc.id),
              eventType: 'outbox.dedup_bumped',
              actorType: 'system',
              message: `Dedup bump on channel=${channel}`,
              payload: { outboxId: existing.id, dedupKey, incidentKey, channel },
            }).catch(() => null);
          }

          return updated;
        }
      }

      const row = await outbox.create({
        data: {
          organizationId,
          channel,
          payload: input.payload ?? {},
          status: 'pending',
          attempts: 0,
          nextAttemptAt,
          dedupKey,
          incidentKey,
          groupCount: 1,
          suppressedUntil: nextAttemptAt,
        },
      });

      // Wave46: incident timeline event on creation
      if (inc?.id) {
        await this.incidents.appendEvent({
          organizationId: String(organizationId),
          incidentId: String(inc.id),
          eventType: 'outbox.created',
          actorType: 'system',
          message: `Outbox message created (${channel})`,
          payload: { outboxId: row.id, channel, status: row.status, nextAttemptAt, dedupKey, incidentKey },
        }).catch(() => null);

        if (nextAttemptAt && new Date(nextAttemptAt).getTime() > Date.now()) {
          await this.incidents.appendEvent({
            organizationId: String(organizationId),
            incidentId: String(inc.id),
            eventType: 'outbox.suppressed',
            actorType: 'system',
            message: 'Suppressed by quiet hours / delayed schedule',
            payload: { suppressedUntil: new Date(nextAttemptAt).toISOString(), channel },
          }).catch(() => null);
        }
      }

      // In Redis mode, schedule respecting nextAttemptAt.
      const mode = this.queue.getMode();
      if (mode.mode === 'redis') {
        if (nextAttemptAt && new Date(nextAttemptAt).getTime() > Date.now()) {
          await this.queue.scheduleOutboxRetry(row.id, new Date(nextAttemptAt));
        } else {
          await this.queue.enqueueOutbox(row.id);
        }
      } else {
        // sync mode
        if (!nextAttemptAt || new Date(nextAttemptAt).getTime() <= Date.now()) {
          await this.dispatchNow(row.id).catch(() => null);
        }
      }

      return row;
    } catch (err) {
      throwIfProdDbError(err, 'OutboxService.create');
      throw err;
    }
  }

  async get(id: string) {
    try {
      const outbox = (this.prisma as Record<string, unknown>).outboxMessage;
      const row = await outbox.findUnique({ where: { id } });
      return row;
    } catch (err) {
      throwIfProdDbError(err, 'OutboxService.get');
      return null;
    }
  }

  async markSent(id: string) {
    try {
      const outbox = (this.prisma as Record<string, unknown>).outboxMessage;
      const row = await outbox.update({ where: { id }, data: { status: 'sent', sentAt: new Date(), lastEmittedAt: new Date(), updatedAt: new Date() } });
      try { this.metrics.incOutboxSent(String(row.channel || 'unknown')); } catch {}
      await this.events.emit({
        organizationId: row.organizationId,
        actorType: 'worker',
        eventType: 'outbox.sent',
        severity: 'info',
        subject: `OutboxMessage/${id}`,
        data: { channel: row.channel, incidentKey: row.incidentKey || null, dedupKey: row.dedupKey || null },
      }).catch(() => null);

      // Wave46: incident timeline event
      if (row.organizationId && row.incidentKey) {
        const inc = await this.ensureIncidentForOutbox({ organizationId: row.organizationId, incidentKey: row.incidentKey, severity: (row.payload as any)?.severity || null, title: (row.payload as any)?.titleAr || null });
        if (inc?.id) {
          await this.incidents.appendEvent({
            organizationId: String(row.organizationId),
            incidentId: String(inc.id),
            eventType: 'outbox.sent',
            actorType: 'worker',
            message: `Outbox sent (${row.channel})`,
            payload: { outboxId: id, channel: row.channel },
          }).catch(() => null);
        }
      }
      return row;
    } catch (err) {
      throwIfProdDbError(err, 'OutboxService.markSent');
      throw err;
    }
  }

  async markFailed(id: string, error: string) {
  try {
    const outbox = (this.prisma as Record<string, unknown>).outboxMessage;
    const row = await outbox.update({
      where: { id },
      data: {
        status: 'failed',
        attempts: { increment: 1 },
        lastError: String(error || '').slice(0, 2000),
        nextAttemptAt: nowPlus(60_000),
        lastEmittedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    try { this.metrics.incOutboxFailed(String(row.channel || 'unknown')); } catch {}

    await this.events.emit({
      organizationId: row.organizationId,
      actorType: 'worker',
      eventType: 'outbox.failed',
      severity: 'warning',
      subject: `OutboxMessage/${id}`,
      data: { channel: row.channel, error: String(error || '').slice(0, 300), incidentKey: row.incidentKey || null, dedupKey: row.dedupKey || null },
    }).catch(() => null);

    // Wave46: incident timeline event
    if (row.organizationId && row.incidentKey) {
      const inc = await this.ensureIncidentForOutbox({ organizationId: row.organizationId, incidentKey: row.incidentKey, severity: 'warning', title: (row.payload as any)?.titleAr || null });
      if (inc?.id) {
        await this.incidents.appendEvent({
          organizationId: String(row.organizationId),
          incidentId: String(inc.id),
          eventType: 'outbox.failed',
          actorType: 'worker',
          message: `Outbox failed (${row.channel})`,
          payload: { outboxId: id, channel: row.channel, error: String(error || '').slice(0, 300) },
        }).catch(() => null);
      }
    }

    return row;
  } catch (err) {
    throwIfProdDbError(err, 'OutboxService.markFailed');
    throw err;
  }
}

async dispatchNow(id: string) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException('Outbox message not found');
    if (row.status === 'sent') return { ok: true, already: true };

    const nextAttemptAt = row.nextAttemptAt ? new Date(row.nextAttemptAt) : null;
    if (nextAttemptAt && nextAttemptAt.getTime() > Date.now()) {
      // Not due yet. In Redis mode, re-schedule to the actual due time.
      try {
        const mode = this.queue.getMode();
        if (mode.mode === 'redis') await this.queue.scheduleOutboxRetry(id, nextAttemptAt);
      } catch {
        // ignore
      }
      return { ok: false, reason: 'not_due', nextAttemptAt };
    }

    const channel = String(row.channel || '');
    const payload = row.payload || {};

    if (channel === OPERATIONAL_EVENT_OUTBOX_CHANNEL || isOperationalEventOutboxPayload(payload)) {
      const event = isOperationalEventOutboxPayload(payload) ? payload.event : null;
      if (!event?.eventType) {
        const failed = await this.markFailed(id, 'Missing operational event payload');
        return { ok: false, error: 'missing_operational_event_payload', nextAttemptAt: failed?.nextAttemptAt || null };
      }

      await this.events.emit({
        organizationId: event.organizationId ?? row.organizationId ?? null,
        actorType: event.actorType || 'system',
        actorUserId: event.actorUserId ?? null,
        eventType: event.eventType,
        source: event.source || 'atheel.api',
        subject: event.subject || null,
        correlationId: event.correlationId ?? null,
        requestId: event.requestId ?? null,
        severity: event.severity || 'info',
        data: event.data ?? null,
      }).catch(() => null);

      await this.markSent(id);
      return { ok: true, internal: true, channel };
    }

    const url = this.resolveWebhook(channel);
    if (!url) {
      const failed = await this.markFailed(id, `Missing webhook for channel=${channel}`);
      // schedule delayed retry
      try {
        const mode = this.queue.getMode();
        const nextAt = failed?.nextAttemptAt ? new Date(failed.nextAttemptAt) : null;
        if (mode.mode === 'redis' && nextAt) {
          await this.queue.scheduleOutboxRetry(id, nextAt);
        }
      } catch {
        // ignore
      }
      return { ok: false, error: 'missing_webhook' };
    }

    // Mark sending
    try {
      await (this.prisma as Record<string, unknown>).outboxMessage.update({ where: { id }, data: { status: 'sending', updatedAt: new Date() } });
    } catch {}

    const body = payload && channel === 'slack'
      ? { text: payload.text || payload.messageAr || payload.titleAr || 'تنبيه' }
      : payload;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const txt = await res.text().catch(() => '');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);

      await this.markSent(id);
      return { ok: true };
    } catch (err: any) {
      const failed = await this.markFailed(id, err?.message || 'dispatch failed');

      // Redis-mode: schedule next attempt at the persisted nextAttemptAt.
      try {
        const mode = this.queue.getMode();
        const nextAt = failed?.nextAttemptAt ? new Date(failed.nextAttemptAt) : null;
        if (mode.mode === 'redis' && nextAt) {
          await this.queue.scheduleOutboxRetry(id, nextAt);
        }
      } catch {
        // ignore
      }

      return { ok: false, error: err?.message || 'dispatch failed', nextAttemptAt: failed?.nextAttemptAt || null };
    }
  }
}
