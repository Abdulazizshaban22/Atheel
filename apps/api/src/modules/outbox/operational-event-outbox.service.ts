import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@madar/db';
import { QueueService } from '../queue/queue.service';
import { OutboxService } from './outbox.service';
import { OPERATIONAL_EVENT_OUTBOX_CHANNEL, buildOperationalEventOutboxPayload } from '../../common/events/operational-event-outbox.util';

type DbClient = PrismaService | (Prisma.TransactionClient & { outboxMessage?: { create(args: { data: unknown }): Promise<{ id: string }> | Promise<Record<string, unknown>> } }) | Record<string, unknown>;

type EventInput = ReturnType<typeof import('../../common/events/domain-mutation-event.util').buildDomainMutationEvent>;

@Injectable()
export class OperationalEventOutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly outbox: OutboxService,
  ) {}

  async stageEvent(event: EventInput, client?: DbClient) {
    const db = client ?? this.prisma;
    return await (db as Record<string, unknown>).outboxMessage.create({
      data: {
        organizationId: event.organizationId ?? null,
        channel: OPERATIONAL_EVENT_OUTBOX_CHANNEL,
        payload: buildOperationalEventOutboxPayload(event),
        status: 'pending',
        attempts: 0,
        nextAttemptAt: null,
      },
    });
  }

  async dispatchStaged(id: string) {
    const mode = this.queue.getMode();
    if (mode.mode === 'redis') {
      await this.queue.enqueueOutbox(id).catch(() => null);
      return { ok: true, mode: 'redis', enqueued: true };
    }

    return await this.outbox.dispatchNow(id).catch(() => ({ ok: false, mode: mode.mode, dispatched: false }));
  }
}
