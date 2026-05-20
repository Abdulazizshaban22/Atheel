import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { assertWorkerTokenValue } from '../../common/security/worker-token';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { QueueService } from '../queue/queue.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { detectSafetyCompliance } from '@madar/engines-kernel';

function norm(s?: any) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function mapTopicToType(topicKey: string): string {
  const k = String(topicKey || '').toLowerCase();
  if (k.includes('crowd')) return 'crowd_safety';
  if (k.includes('sustain')) return 'sustainability';
  if (k.includes('licens')) return 'licensing';
  if (k.includes('access')) return 'accessibility';
  if (k.includes('insur')) return 'insurance';
  if (k.includes('security')) return 'security';
  return 'compliance';
}

function detectCompliance(requirements: Array<{ id?: string; textAr?: string; sourceRefJson?: any }>) {
  const topics: Array<{ key: string; labelAr: string; keywords: string[] }> = [
    { key: 'sustainability', labelAr: 'استدامة الفعالية (ISO 20121 وما شابه)', keywords: ['استدامة', 'ISO 20121', 'مخلفات', 'نفايات', 'طاقة', 'مياه', 'انبعاث', 'waste', 'energy', 'water'] },
    { key: 'crowd_safety', labelAr: 'سلامة الحشود والإخلاء', keywords: ['حشود', 'إخلاء', 'مخارج', 'سعة', 'ازدحام', 'حواجز', 'طوارئ', 'الدفاع المدني', 'إطفاء', 'NFPA'] },
    { key: 'security', labelAr: 'الأمن والحراسة والتفتيش', keywords: ['أمن', 'حراسة', 'تفتيش', 'بوابات أمنية', 'كاميرات'] },
    { key: 'accessibility', labelAr: 'إتاحة وذوو الإعاقة', keywords: ['ذوي الإعاقة', 'إتاحة', 'accessibility', 'منحدر', 'كرسي متحرك'] },
    { key: 'licensing', labelAr: 'التراخيص والتصاريح', keywords: ['ترخيص', 'تصاريح', 'تصريح', 'رخصة', 'اعتماد', 'اشتراطات'] },
    { key: 'insurance', labelAr: 'التأمين والمسؤولية', keywords: ['تأمين', 'مسؤولية', 'liability', 'insurance'] },
  ];

  const out: any[] = [];
  for (const r of requirements || []) {
    const text = String((r as Record<string, unknown>).textAr || '');
    const lower = text.toLowerCase();
    for (const t of topics) {
      if (t.keywords.some((k) => lower.includes(String(k).toLowerCase()))) {
        out.push({
          topicKey: t.key,
          topicLabelAr: t.labelAr,
          requirementId: (r as Record<string, unknown>).id || null,
          textAr: text.slice(0, 260),
          page: (r as Record<string, unknown>).sourceRefJson?.page ?? null,
        });
      }
    }
  }

  const uniq: any[] = [];
  const seen = new Set<string>();
  for (const x of out) {
    const k = `${x.topicKey}:${x.requirementId}:${x.textAr}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(x);
  }
  return uniq;
}

function stableKey(parts: Array<string | number | null | undefined>) {
  return parts
    .map((p) => String(p ?? ''))
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function computeDefaultReminders(dueAt?: Date | null) {
  if (!dueAt) return [];
  const due = dueAt.getTime();
  const mk = (daysBefore: number) => {
    const t = new Date(due - daysBefore * 24 * 60 * 60 * 1000);
    // bias to 09:00 KSA
    t.setHours(9, 0, 0, 0);
    return t;
  };
  const now = Date.now();
  const candidates = [mk(7), mk(2), mk(0)].filter((d) => d.getTime() > now + 60_000);
  return candidates;
}

@Injectable()
export class ObligationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly queue: QueueService,
    private readonly workflows: WorkflowsService,
  ) {}

  async list(params: { competitionId?: string; organizationId?: string; status?: string; type?: string; ownerUserId?: string }, user?: RequestUser) {
    const where: any = {
      ...(params.competitionId ? { competitionId: params.competitionId } : {}),
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.ownerUserId ? { ownerUserId: params.ownerUserId } : {}),
    };

    const rows = await (this.prisma as Record<string, unknown>).obligation
      .findMany({ where, orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }], include: { owner: { select: { id: true, displayName: true, email: true } }, reminders: true } })
      .catch(() => []);

    // If organizationId is provided, enforce access; otherwise infer from first row if possible
    const orgId = params.organizationId || rows?.[0]?.organizationId;
    assertOrgAccess(user, orgId);

    return { ok: true, count: rows.length, items: rows };
  }

  async get(id: string, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).obligation.findUnique({ where: { id }, include: { owner: { select: { id: true, displayName: true, email: true } }, reminders: true } }).catch(() => null);
    if (!row) throw new NotFoundException('Obligation not found');
    assertOrgAccess(user, row.organizationId);
    return { ok: true, item: row };
  }

  async refreshFromCompetition(competitionId: string, user?: RequestUser) {
    const comp = await (this.prisma as Record<string, unknown>).competition.findUnique({ where: { id: competitionId } }).catch(() => null);
    if (!comp) throw new NotFoundException('Competition not found');
    if (user) assertOrgAccess(user, comp.organizationId);

    const requirements = await (this.prisma as Record<string, unknown>).competitionRequirement
      .findMany({ where: { competitionId }, orderBy: [{ createdAt: 'asc' }] })
      .catch(() => []);

    const compliance = detectSafetyCompliance(requirements as any);

    // Owners by category (use out_of_scope for operational topics)
    const catRows = await (this.prisma as Record<string, unknown>).competitionCategoryAssignment
      .findMany({ where: { competitionId, isOwner: true }, include: { user: { select: { id: true, displayName: true, email: true } } } })
      .catch(() => []);

    const catOwnerId = (cat: string) => {
      const r = catRows.find((x: any /* typed */) => String(x.category) === cat && x.isOwner);
      return r?.userId || null;
    };

    const defaultOpsOwner = catOwnerId('out_of_scope') || null;
    const defaultUxOwner = catOwnerId('overall_direction') || null;

    let upserted = 0;
    let remindersScheduled = 0;

    for (const c of compliance) {
      const type = (c as any)?.obligationSuggestion?.type || mapTopicToType((c as Record<string, unknown>).topicKey);
      const reqId = c.requirementId || null;
      const key = stableKey(['competition', competitionId, reqId || 'none', type, (c as Record<string, unknown>).snippetAr]);

      const ownerUserId = (type === 'accessibility') ? (defaultUxOwner || defaultOpsOwner) : defaultOpsOwner;

      const titleAr = `${(c as Record<string, unknown>).topicLabelAr}`;
      const descriptionAr = `${(c as Record<string, unknown>).textAr || (c as Record<string, unknown>).snippetAr || ''}${c.page != null ? `\nمرجع: ص${c.page}` : ''}`;

      const existing = await (this.prisma as Record<string, unknown>).obligation.findUnique({ where: { obligationKey: key } }).catch(() => null);

      const dueAtBase = comp.dueAt ? new Date(comp.dueAt) : null;

      const offsetDays = Number((c as any)?.obligationSuggestion?.dueOffsetDaysBeforeSubmission ?? 0);
      const dueAt = (() => {
        if (!dueAtBase) return null;
        const d = new Date(dueAtBase.getTime() - Math.max(0, offsetDays) * 24 * 60 * 60 * 1000);
        d.setHours(9, 0, 0, 0);
        return d;
      })();

      const row = await (this.prisma as Record<string, unknown>).obligation.upsert({
        where: { obligationKey: key },
        update: {
          competitionId,
          requirementId: reqId,
          type,
          titleAr,
          descriptionAr,
          dueAt,
          ownerUserId: existing?.ownerUserId || ownerUserId,
          metaJson: { ...(existing?.metaJson || {}), topicKey: (c as Record<string, unknown>).topicKey, page: (c as Record<string, unknown>).page ?? null, standardRefs: (c as Record<string, unknown>).standardRefs || null },
        },
        create: {
          organizationId: comp.organizationId,
          competitionId,
          requirementId: reqId,
          obligationKey: key,
          type,
          status: 'open',
          titleAr,
          descriptionAr,
          dueAt,
          ownerUserId,
          metaJson: { topicKey: (c as Record<string, unknown>).topicKey, page: (c as Record<string, unknown>).page ?? null, standardRefs: (c as Record<string, unknown>).standardRefs || null },
        },
      }).catch(() => null);

      if (row) {
        upserted += 1;

        // Link a workflow execution once (best-effort) for follow-up.
        if (!row.workflowExecutionId) {
          try {
            const exec = await this.workflows.enqueueExecution({
              templateId: 'wf_events_obligation_followup_manual_request',
              organizationId: comp.organizationId,
              projectId: comp.projectId || undefined,
              priority: 'normal',
              inputs: {
                brief: `متابعة التزام: ${titleAr}`,
                organizationId: comp.organizationId,
                projectId: comp.projectId || null,
                metadata: { obligationId: row.id, competitionId, requirementId: reqId, type },
                deadline: dueAt ? dueAt.toISOString() : null,
              },
              autoStart: false,
              hasKnowledge: true,
              hasApprovalActor: false,
            } as any);

            const execId = (exec as any)?.execution?.id || (exec as any)?.executionId || null;
            if (execId) {
              await (this.prisma as Record<string, unknown>).obligation.update({ where: { id: row.id }, data: { workflowExecutionId: execId } }).catch(() => void 0);
            }
          } catch {
            // ignore
          }
        }

        // Default reminders: only if there are none
        try {
          const hasAny = await (this.prisma as Record<string, unknown>).obligationReminder.findFirst({ where: { obligationId: row.id } }).catch(() => null);
          if (!hasAny && dueAt) {
            for (const d of computeDefaultReminders(dueAt)) {
              const rem = await (this.prisma as Record<string, unknown>).obligationReminder.create({ data: { obligationId: row.id, remindAt: d, channel: 'in_app', status: 'pending' } }).catch(() => null);
              if (rem) {
                remindersScheduled += 1;
                await this.queue.scheduleObligationReminder({ obligationId: row.id, reminderId: rem.id, remindAtIso: d.toISOString() }).catch(() => void 0);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    await this.auditLogs.create({
      organizationId: comp.organizationId,
      action: 'competition.obligations.refreshed',
      entityType: 'Competition',
      entityId: competitionId,
      message: 'تحديث الالتزامات من مصفوفة الامتثال',
      after: { upserted, remindersScheduled, complianceCount: compliance.length },
    }, user?.sub);

    return { ok: true, competitionId, complianceCount: compliance.length, upserted, remindersScheduled };
  }



  private mapChecklistItemStatusToObligationStatus(status: string): string {
    const s = String(status || 'open');
    if (s === 'done') return 'done';
    if (s === 'waived') return 'waived';
    if (s === 'blocked') return 'in_progress';
    return 'open';
  }

  async refreshFromComplianceChecklist(checklistId: string, user?: RequestUser) {
    const chk = await (this.prisma as Record<string, unknown>).complianceChecklist.findUnique({ where: { id: checklistId }, include: { items: true } }).catch(() => null);
    if (!chk) throw new NotFoundException('Checklist not found');
    assertOrgAccess(user, chk.organizationId);

    // Try to infer an event date for sensible dueAt defaults (project-based checklists).
    let projectStart: Date | null = null;
    try {
      if (String(chk.subjectType) === 'project' && chk.subjectId) {
        const prj = await (this.prisma as Record<string, unknown>).project.findUnique({ where: { id: String(chk.subjectId) } }).catch(() => null);
        if (prj?.startDate) projectStart = new Date(prj.startDate);
      }
    } catch {
      // ignore
    }

    let upserted = 0;
    let remindersScheduled = 0;
    let linkedItems = 0;

    for (const it of (chk.items || [])) {
      const key = stableKey(['checklist', chk.id, it.id]);
      const type = String(chk.authorityKey || '').includes('moc_abdea') ? 'licensing' : 'compliance';

      const dueAt = (() => {
        if (it.dueAt) return new Date(it.dueAt);
        if (!projectStart) return null;
        const isCritical = String(it.severity || '').toLowerCase() === 'critical';
        const days = isCritical ? 21 : 14;
        const d = new Date(projectStart.getTime() - days * 24 * 60 * 60 * 1000);
        d.setHours(9, 0, 0, 0);
        return d;
      })();

      const description = [it.descriptionAr || '', it.externalUrl ? `رابط: ${it.externalUrl}` : ''].filter(Boolean).join('\n');

      const existing = await (this.prisma as Record<string, unknown>).obligation.findUnique({ where: { obligationKey: key } }).catch(() => null);
      const row = await (this.prisma as Record<string, unknown>).obligation.upsert({
        where: { obligationKey: key },
        update: {
          titleAr: String(it.titleAr || ''),
          descriptionAr: description || null,
          type,
          status: this.mapChecklistItemStatusToObligationStatus(it.status),
          dueAt: dueAt,
          metaJson: {
            ...(existing?.metaJson || {}),
            checklistId: chk.id,
            checklistItemId: it.id,
            subjectType: chk.subjectType,
            subjectId: chk.subjectId,
            authorityKey: chk.authorityKey || null,
          },
        },
        create: {
          organizationId: chk.organizationId,
          competitionId: null,
          requirementId: null,
          obligationKey: key,
          type,
          status: this.mapChecklistItemStatusToObligationStatus(it.status),
          titleAr: String(it.titleAr || ''),
          descriptionAr: description || null,
          ownerUserId: null,
          dueAt: dueAt,
          metaJson: {
            checklistId: chk.id,
            checklistItemId: it.id,
            subjectType: chk.subjectType,
            subjectId: chk.subjectId,
            authorityKey: chk.authorityKey || null,
          },
        },
      }).catch(() => null);

      if (row) {
        upserted += 1;

        // Link obligation id back into checklist item metaJson (best-effort).
        try {
          const meta = { ...(it.metaJson || {}), obligationId: row.id, obligationKey: key };
          await (this.prisma as Record<string, unknown>).complianceChecklistItem.update({ where: { id: it.id }, data: { metaJson: meta, dueAt: dueAt } }).catch(() => void 0);
          linkedItems += 1;
        } catch {
          // ignore
        }

        // Default reminders if dueAt exists and no reminders exist.
        try {
          const hasAny = await (this.prisma as Record<string, unknown>).obligationReminder.findFirst({ where: { obligationId: row.id } }).catch(() => null);
          if (!hasAny && dueAt) {
            for (const d of computeDefaultReminders(dueAt)) {
              const rem = await (this.prisma as Record<string, unknown>).obligationReminder.create({ data: { obligationId: row.id, remindAt: d, channel: 'in_app', status: 'pending' } }).catch(() => null);
              if (rem) {
                remindersScheduled += 1;
                await this.queue.scheduleObligationReminder({ obligationId: row.id, reminderId: rem.id, remindAtIso: d.toISOString() }).catch(() => void 0);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    await this.auditLogs.create({
      organizationId: chk.organizationId,
      action: 'checklist.obligations.refreshed',
      entityType: 'ComplianceChecklist',
      entityId: checklistId,
      message: 'ربط عناصر قائمة الامتثال بالالتزامات وجدولة التذكيرات',
      after: { upserted, linkedItems, remindersScheduled, checklistId },
    }, user?.sub);

    return { ok: true, checklistId, upserted, linkedItems, remindersScheduled };
  }

  async syncFromComplianceChecklistItem(checklistId: string, itemId: string, nextStatus: string, user?: RequestUser) {
    const chk = await (this.prisma as Record<string, unknown>).complianceChecklist.findUnique({ where: { id: checklistId } }).catch(() => null);
    if (!chk) throw new NotFoundException('Checklist not found');
    assertOrgAccess(user, chk.organizationId);

    const item = await (this.prisma as Record<string, unknown>).complianceChecklistItem.findUnique({ where: { id: itemId } }).catch(() => null);
    if (!item || item.checklistId !== checklistId) throw new NotFoundException('Checklist item not found');

    const key = stableKey(['checklist', checklistId, itemId]);
    const obligation = await (this.prisma as Record<string, unknown>).obligation.findUnique({ where: { obligationKey: key } }).catch(() => null);

    if (obligation) {
      await (this.prisma as Record<string, unknown>).obligation.update({
        where: { id: obligation.id },
        data: { status: this.mapChecklistItemStatusToObligationStatus(nextStatus) as any },
      }).catch(() => void 0);
    }
    return { ok: true, checklistId, itemId, obligationId: obligation?.id || null };
  }

  async update(id: string, dto: any, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).obligation.findUnique({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('Obligation not found');
    assertOrgAccess(user, row.organizationId);

    const patch: any = {};
    if (dto.titleAr != null) patch.titleAr = norm(dto.titleAr);
    if (dto.descriptionAr != null) patch.descriptionAr = dto.descriptionAr ? String(dto.descriptionAr) : null;
    if (dto.status) patch.status = String(dto.status);
    if (dto.ownerUserId !== undefined) patch.ownerUserId = dto.ownerUserId || null;
    if (dto.dueAt !== undefined) patch.dueAt = dto.dueAt ? new Date(String(dto.dueAt)) : null;

    const updated = await (this.prisma as Record<string, unknown>).obligation.update({ where: { id }, data: patch, include: { owner: { select: { id: true, displayName: true, email: true } }, reminders: true } });

    await this.auditLogs.create({ organizationId: row.organizationId, action: 'obligation.updated', entityType: 'Obligation', entityId: id, message: 'تحديث التزام', after: patch }, user?.sub);
    return { ok: true, item: updated };
  }

  async scheduleReminder(id: string, dto: any, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).obligation.findUnique({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('Obligation not found');
    assertOrgAccess(user, row.organizationId);

    const remindAt = new Date(String(dto.remindAt || '') || '');
    if (!Number.isFinite(remindAt.getTime())) throw new BadRequestException('remindAt is invalid');

    const created = await (this.prisma as Record<string, unknown>).obligationReminder.create({
      data: { obligationId: id, remindAt, channel: dto.channel === 'email' ? 'email' : 'in_app', status: 'pending' },
    });

    await this.queue.scheduleObligationReminder({ obligationId: id, reminderId: created.id, remindAtIso: remindAt.toISOString() });

    await this.auditLogs.create({ organizationId: row.organizationId, action: 'obligation.reminder.scheduled', entityType: 'Obligation', entityId: id, message: 'جدولة تذكير', after: { remindAt: remindAt.toISOString(), channel: created.channel, reminderId: created.id } }, user?.sub);

    return { ok: true, reminder: created };
  }

  async sendReminderFromWorker(obligationId: string, reminderId: string, workerToken?: string) {
    assertWorkerTokenValue(workerToken);

    const reminder = await (this.prisma as Record<string, unknown>).obligationReminder.findUnique({ where: { id: reminderId }, include: { obligation: true } }).catch(() => null);
    if (!reminder || reminder.obligationId !== obligationId) throw new NotFoundException('Reminder not found');

    // Mark as sent
    await (this.prisma as Record<string, unknown>).obligationReminder.update({ where: { id: reminderId }, data: { status: 'sent', sentAt: new Date() } }).catch(() => void 0);

    // Best-effort: if due passed and not done, mark overdue
    try {
      const ob = reminder.obligation;
      if (ob?.dueAt && new Date(ob.dueAt).getTime() < Date.now() && !['done', 'waived'].includes(String(ob.status))) {
        await (this.prisma as Record<string, unknown>).obligation.update({ where: { id: obligationId }, data: { status: 'overdue' } }).catch(() => void 0);
      }
    } catch {
      // ignore
    }

    await this.auditLogs.create({
      organizationId: reminder.obligation?.organizationId,
      action: 'obligation.reminder.sent',
      entityType: 'Obligation',
      entityId: obligationId,
      message: 'تم إرسال تذكير التزام (In-app)',
      after: { reminderId },
    }, undefined);

    return { ok: true };
  }
}
