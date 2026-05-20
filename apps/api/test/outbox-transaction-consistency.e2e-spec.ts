import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ApprovalsModule } from '../src/modules/approvals/approvals.module';
import { ApprovalsRepository } from '../src/modules/approvals/approvals.repository';
import { AttachmentsModule } from '../src/modules/attachments/attachments.module';
import { AttachmentsRepository } from '../src/modules/attachments/attachments.repository';
import { OutboxModule } from '../src/modules/outbox/outbox.module';
import { OperationalEventOutboxService } from '../src/modules/outbox/operational-event-outbox.service';
import {
  OPERATIONAL_EVENT_OUTBOX_CHANNEL,
  OPERATIONAL_EVENT_OUTBOX_KIND,
  buildOperationalEventOutboxPayload,
  isOperationalEventOutboxPayload,
} from '../src/common/events/operational-event-outbox.util';

describe('Wave97 outbox and transaction consistency hardening', () => {
  it('builds a typed outbox payload for internal operational events', () => {
    const payload = buildOperationalEventOutboxPayload({
      organizationId: 'org_demo_1',
      actorUserId: 'usr_1',
      actorType: 'user',
      eventType: 'approval.approved',
      subject: 'ApprovalRequest/apr_1',
      severity: 'critical',
      correlationId: 'corr_1',
      requestId: 'req_1',
      data: { ok: true },
    });

    expect(OPERATIONAL_EVENT_OUTBOX_CHANNEL).toBe('operational_event');
    expect(payload.kind).toBe(OPERATIONAL_EVENT_OUTBOX_KIND);
    expect(isOperationalEventOutboxPayload(payload)).toBe(true);
    expect(payload.event).toMatchObject({
      eventType: 'approval.approved',
      subject: 'ApprovalRequest/apr_1',
      severity: 'critical',
    });
  });

  it('registers the new repository and outbox boundary providers in their modules', () => {
    const approvalsProviders = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ApprovalsModule) || [];
    const attachmentsProviders = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AttachmentsModule) || [];
    const outboxProviders = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, OutboxModule) || [];

    expect(approvalsProviders).toContain(ApprovalsRepository);
    expect(attachmentsProviders).toContain(AttachmentsRepository);
    expect(outboxProviders).toContain(OperationalEventOutboxService);
  });
});
