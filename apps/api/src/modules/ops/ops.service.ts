import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess, isSuperAdmin } from '../../common/access';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboxService } from '../outbox/outbox.service';
import { IncidentsService } from '../incidents/incidents.service';
import { throwIfProdDbError } from '../../common/db-fallback';

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
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
  // if range crosses midnight
  if (s === e) return false;
  if (s < e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e;
}


type RoutingSkillRecord = { score?: number; evidenceCount?: number };
type WorkloadItem = { userId: string; activeApprovals: number; overdueApprovals: number };
type RoutingStateRecord = { lastAssignedAt?: string | Date | null; assignedCount?: number | null };
type IncidentPayloadRecord = { severity?: string; titleAr?: string; title?: string };

function isIncidentPayloadRecord(value: unknown): value is IncidentPayloadRecord {
  return Boolean(value) && typeof value === 'object';
}

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly outbox: OutboxService,
    private readonly incidents: IncidentsService,
  ) {}

  async getSettings(params: { organizationId?: string }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    try {
      const row = await (this.prisma as Record<string, unknown>).opsSettings.findUnique({ where: { organizationId } });
      return { ok: true, settings: row || null };
    } catch (err) {
      throwIfProdDbError(err, 'OpsService.getSettings');
      return { ok: true, settings: null };
    }
  }

  async upsertSettings(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const quietHoursStart = (body?.quietHoursStart ?? null) as string | null;
    const quietHoursEnd = (body?.quietHoursEnd ?? null) as string | null;
    const tz = String(body?.quietHoursTz || 'Asia/Riyadh');
    const outboxDedupWindowMinutes = Math.max(1, Math.min(24 * 60, Number(body?.outboxDedupWindowMinutes || 30)));

    const approvalsReviewerCooldownMinutes = Math.max(0, Math.min(24 * 60, Number(body?.approvalsReviewerCooldownMinutes ?? 5)));
    const approvalsMaxActivePerReviewer = Math.max(1, Math.min(200, Number(body?.approvalsMaxActivePerReviewer ?? 10)));

    try {
      const settings = await (this.prisma as Record<string, unknown>).opsSettings.upsert({
        where: { organizationId },
        create: { organizationId, quietHoursStart, quietHoursEnd, quietHoursTz: tz, outboxDedupWindowMinutes, approvalsReviewerCooldownMinutes, approvalsMaxActivePerReviewer },
        update: { quietHoursStart, quietHoursEnd, quietHoursTz: tz, outboxDedupWindowMinutes, approvalsReviewerCooldownMinutes, approvalsMaxActivePerReviewer },
      });
      return { ok: true, settings };
    } catch (err) {
      throwIfProdDbError(err, 'OpsService.upsertSettings');
      throw err;
    }
  }

  private async getQuietHours(organizationId: string) {
    try {
      const row = await (this.prisma as Record<string, unknown>).opsSettings.findUnique({ where: { organizationId } });
      const start = parseHHMM(row?.quietHoursStart || process.env.ESCALATION_QUIET_HOURS?.split('-')?.[0]);
      const end = parseHHMM(row?.quietHoursEnd || process.env.ESCALATION_QUIET_HOURS?.split('-')?.[1]);
      return { start, end, tz: row?.quietHoursTz || 'Asia/Riyadh' };
    } catch {
      const start = parseHHMM(process.env.ESCALATION_QUIET_HOURS?.split('-')?.[0]);
      const end = parseHHMM(process.env.ESCALATION_QUIET_HOURS?.split('-')?.[1]);
      return { start, end, tz: 'Asia/Riyadh' };
    }
  }

  async getApprovalWorkload(params: { organizationId?: string }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    try {
      const approvals = await (this.prisma as Record<string, unknown>).approvalRequest.findMany({
        where: { organizationId, status: { in: ['submitted', 'in_review'] } },
        select: { id: true, currentApproverId: true, dueAt: true, status: true },
      });
      const byUser: Record<string, { active: number; overdue: number }> = {};
      const now = Date.now();
      for (const a of approvals) {
        const uid = String(a.currentApproverId || '');
        if (!uid) continue;
        byUser[uid] = byUser[uid] || { active: 0, overdue: 0 };
        byUser[uid].active += 1;
        const dueAt = a.dueAt ? new Date(a.dueAt).getTime() : null;
        if (dueAt && now > dueAt) byUser[uid].overdue += 1;
      }
      const items = Object.entries(byUser).map(([userId, v]) => ({ userId, activeApprovals: v.active, overdueApprovals: v.overdue }));
      items.sort((a, b) => (b.overdueApprovals - a.overdueApprovals) || (b.activeApprovals - a.activeApprovals));
      return { ok: true, organizationId, items };
    } catch (err) {
      throwIfProdDbError(err, 'OpsService.getApprovalWorkload');
      return { ok: true, organizationId, items: [] };
    }
  }

  async listApprovalSkills(params: { organizationId?: string }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    try {
      const skills = await (this.prisma as Record<string, unknown>).approvalReviewerSkill.findMany({
        where: { organizationId },
        orderBy: [{ dimension: 'asc' }, { score: 'desc' }],
      });
      return { ok: true, organizationId, count: skills.length, items: skills };
    } catch (err) {
      throwIfProdDbError(err, 'OpsService.listApprovalSkills');
      return { ok: true, organizationId, count: 0, items: [] };
    }
  }

  async upsertApprovalSkill(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const userId = String(body?.userId || '').trim();
    const dimension = String(body?.dimension || '').trim();
    const score = clamp01(Number(body?.score ?? 0));
    const evidenceCount = Math.max(0, Number(body?.evidenceCount ?? 0));
    if (!userId) throw new BadRequestException('userId مطلوب');
    if (!dimension) throw new BadRequestException('dimension مطلوب');

    try {
      const row = await (this.prisma as Record<string, unknown>).approvalReviewerSkill.upsert({
        where: { organizationId_userId_dimension: { organizationId, userId, dimension } },
        create: { organizationId, userId, dimension, score, evidenceCount, lastUpdatedAt: new Date() },
        update: { score, evidenceCount, lastUpdatedAt: new Date() },
      });
      return { ok: true, item: row };
    } catch (err) {
      throwIfProdDbError(err, 'OpsService.upsertApprovalSkill');
      throw err;
    }
  }

  async simulateApprovalRouting(params: { organizationId?: string; entityType?: string; entityId?: string; contextViolationType?: string; contextDomain?: string; contextRegion?: string }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const entityType = String(params.entityType || 'content');
    const dimensions = [
      `entityType:${entityType}`,
      params.contextViolationType ? `violationType:${String(params.contextViolationType)}` : null,
      params.contextDomain ? `domain:${String(params.contextDomain)}` : null,
      params.contextRegion ? `region:${String(params.contextRegion)}` : null,
    ].filter(Boolean) as string[];

    // Candidates: default roles (org_admin + project_manager + curator) within org
    const roles = ['org_admin', 'project_manager', 'curator'];

    const members = await (this.prisma as Record<string, unknown>).organizationMember.findMany({
      where: { organizationId, role: { in: roles } },
      select: { userId: true, role: true },
    }).catch(() => []);

    const userIds: string[] = Array.from(new Set(
      members
        .map((m: { userId?: string | null }) => (typeof m.userId === 'string' ? m.userId : ''))
        .filter((value: unknown): value is string => Boolean(value)),
    ));

    // Load workload and skill scores
    const workload = await this.getApprovalWorkload({ organizationId }, user);
    const loadMap: Record<string, WorkloadItem> = {};
    const workloadItems: WorkloadItem[] = Array.isArray((workload as { items?: unknown }).items) ? ((workload as { items?: WorkloadItem[] }).items ?? []) : [];
    for (const it of workloadItems) loadMap[it.userId] = it;

    const skills = await (this.prisma as Record<string, unknown>).approvalReviewerSkill.findMany({ where: { organizationId, dimension: { in: dimensions } } }).catch(() => []);
    const skillMap: Record<string, Record<string, RoutingSkillRecord>> = {};
    for (const s of skills) {
      const uid = String(s.userId);
      skillMap[uid] = skillMap[uid] || {};
      skillMap[uid][String(s.dimension)] = s;
    }

    const stateRows = await (this.prisma as Record<string, unknown>).approvalRoutingState.findMany({ where: { organizationId, userId: { in: userIds } }, select: { userId: true, lastAssignedAt: true, assignedCount: true } }).catch(() => []);
    const stateMap: Record<string, RoutingStateRecord> = {};
    for (const r of stateRows) stateMap[String(r.userId)] = r;

    const settings = await (this.prisma as Record<string, unknown>).opsSettings.findUnique({ where: { organizationId } }).catch(() => null);
    const cooldownMinutes = Math.max(0, Number(settings?.approvalsReviewerCooldownMinutes ?? 5));
    const maxActive = Math.max(1, Number(settings?.approvalsMaxActivePerReviewer ?? 10));

    const scored = userIds.map((uid) => {
      // composite skill
      const perDim = skillMap[uid] || {};
      const baseWeights: Record<string, number> = { [`entityType:${entityType}`]: 0.45 };
      if (params.contextViolationType) baseWeights[`violationType:${String(params.contextViolationType)}`] = 0.30;
      if (params.contextDomain) baseWeights[`domain:${String(params.contextDomain)}`] = 0.15;
      if (params.contextRegion) baseWeights[`region:${String(params.contextRegion)}`] = 0.10;

      let num = 0;
      let den = 0;
      const dimsDbg: Array<{ dimension: string; score: number; evidenceCount: number; weight: number }> = [];
      for (const d of dimensions) {
        const rec = perDim[d];
        const s = Number(rec?.score ?? 0.5);
        const ev = Number(rec?.evidenceCount ?? 0);
        const conf = Math.min(1, Math.log1p(ev) / Math.log(21));
        const w = (baseWeights[d] ?? 0.10) * (0.25 + 0.75 * conf);
        num += s * w;
        den += w;
        dimsDbg.push({ dimension: d, score: s, evidenceCount: ev, weight: w });
      }
      const skill = den > 0 ? Math.max(0, Math.min(1, num / den)) : 0.5;

      const active = Number(loadMap[uid]?.activeApprovals ?? 0);
      const overdue = Number(loadMap[uid]?.overdueApprovals ?? 0);
      // normalized load: cap at 10 active
      const normLoad = Math.min(1, active / maxActive);
      const urgency = 0.5; // placeholder, can be derived from dueAt

      const lastAssignedAt = stateMap[uid]?.lastAssignedAt ? new Date(stateMap[uid].lastAssignedAt).getTime() : null;
      const minutesSinceAssigned = lastAssignedAt ? Math.max(0, (Date.now() - lastAssignedAt) / 60_000) : 10_000;
      const inCooldown = cooldownMinutes > 0 && minutesSinceAssigned < cooldownMinutes;
      const cooldownPenalty = inCooldown ? 0.35 : 0;
      const fairnessBoost = cooldownMinutes > 0 ? Math.max(0, Math.min(1, minutesSinceAssigned / (cooldownMinutes * 2))) : Math.max(0, Math.min(1, minutesSinceAssigned / 30));

      const score = 0.45 * skill + 0.25 * (1 - normLoad) + 0.20 * urgency + 0.10 * fairnessBoost - 0.20 * Math.min(1, overdue / 3) - cooldownPenalty;
      return {
        userId: uid,
        score,
        breakdown: { skill, dimensions: dimsDbg, active, overdue, normLoad, urgency, fairnessBoost, cooldownMinutes, inCooldown, minutesSinceAssigned },
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored[0] || null;

    return {
      ok: true,
      organizationId,
      entityType,
      dimensions,
      candidates: scored,
      selected,
    };
  }

  async listSloPolicies(params: { organizationId?: string }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const isSuper = isSuperAdmin(user);
    const where: any = isSuper ? { OR: [{ organizationId }, { organizationId: null }] } : { organizationId };

    try {
      const items = await (this.prisma as Record<string, unknown>).sloPolicy.findMany({ where, orderBy: [{ updatedAt: 'desc' }] });
      return { ok: true, count: items.length, items };
    } catch (err) {
      throwIfProdDbError(err, 'OpsService.listSloPolicies');
      return { ok: true, count: 0, items: [] };
    }
  }

  async createSloPolicy(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const name = String(body?.name || '').trim();
    const indicator = String(body?.indicator || 'outbox_delivery').trim();
    if (!name) throw new BadRequestException('name مطلوب');

    const objectivePercent = Number(body?.objectivePercent ?? 99.9);
    const errorBudgetWindowDays = Math.max(1, Math.min(365, Number(body?.errorBudgetWindowDays ?? 30)));
    const shortWindowMinutes = Math.max(1, Math.min(24 * 60, Number(body?.shortWindowMinutes ?? 5)));
    const longWindowMinutes = Math.max(shortWindowMinutes, Math.min(24 * 60, Number(body?.longWindowMinutes ?? 60)));

    const metaJson = body?.metaJson ?? {
      alertBurnRateShort: 2,
      alertBurnRateLong: 1,
      severity: 'warning',
      channels: ['in_app'],
    };

    try {
      const row = await (this.prisma as Record<string, unknown>).sloPolicy.create({
        data: {
          organizationId,
          name,
          indicator,
          objectivePercent,
          errorBudgetWindowDays,
          shortWindowMinutes,
          longWindowMinutes,
          isEnabled: true,
          metaJson,
        },
      });
      return { ok: true, policy: row };
    } catch (err) {
      throwIfProdDbError(err, 'OpsService.createSloPolicy');
      throw err;
    }
  }

  private async computeOutboxRates(organizationId: string, windowMinutes: number) {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const where: any = {
      organizationId,
      lastEmittedAt: { gte: since },
      status: { in: ['sent', 'failed'] },
    };
    const outbox = (this.prisma as Record<string, unknown>).outboxMessage;
    const rows = await outbox.findMany({ where, select: { status: true } }).catch(() => []);
    const total = rows.length;
    const errors = rows.filter((r: any) => r.status === 'failed').length;
    const errorRate = total ? errors / total : 0;
    return { total, errors, errorRate };
  }

  private async computeWorkflowRates(organizationId: string, windowMinutes: number) {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const total = await (this.prisma as Record<string, unknown>).workflowExecution.count({ where: { organizationId, completedAt: { gte: since } } }).catch(() => 0);
    const breaches = await (this.prisma as Record<string, unknown>).operationalEvent.count({ where: { organizationId, eventType: 'sla.escalation.workflow', createdAt: { gte: since } } }).catch(() => 0);
    const errorRate = total ? breaches / total : 0;
    return { total, errors: breaches, errorRate };
  }

  private async computeApprovalRates(organizationId: string, windowMinutes: number) {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const total = await (this.prisma as Record<string, unknown>).approvalRequest.count({ where: { organizationId, decidedAt: { gte: since } } }).catch(() => 0);
    const breaches = await (this.prisma as Record<string, unknown>).operationalEvent.count({ where: { organizationId, eventType: 'sla.escalation.approval', createdAt: { gte: since } } }).catch(() => 0);
    const errorRate = total ? breaches / total : 0;
    return { total, errors: breaches, errorRate };
  }

  private burnRate(objectivePercent: number, errorRate: number) {
    const allowed = Math.max(1e-9, 1 - objectivePercent / 100);
    return errorRate / allowed;
  }

  private defaultSloRules(errorBudgetWindowDays: number) {
    // Defaults follow the multi-window multi-burn-rate pattern.
    // For a 30-day SLO window these match common guidance: 14.4 (1h/5m), 6 (6h/30m), 3 (24h/2h), 1 (72h/6h)
    // We scale the thresholds to other windows by keeping the same budget-consumption targets (2%, 5%, 10%).
    // burnRate = (budget_fraction * window_days * 24h) / long_window
    const W = Math.max(1, Math.min(365, Number(errorBudgetWindowDays || 30)));
    const minutesInWindow = W * 24 * 60;
    const br = (budgetFraction: number, longWindowMinutes: number) => (budgetFraction * minutesInWindow) / Math.max(1, longWindowMinutes);

    return {
      fast: [
        { id: 'fast_1', severity: 'critical', threshold: br(0.02, 60), shortWindowMinutes: 5, longWindowMinutes: 60, channels: ['in_app', 'slack'] },
        { id: 'fast_2', severity: 'critical', threshold: br(0.05, 360), shortWindowMinutes: 30, longWindowMinutes: 360, channels: ['in_app', 'slack'] },
      ],
      slow: [
        { id: 'slow_1', severity: 'warning', threshold: br(0.10, 1440), shortWindowMinutes: 120, longWindowMinutes: 1440, channels: ['in_app'] },
        { id: 'slow_2', severity: 'warning', threshold: br(0.10, 4320), shortWindowMinutes: 360, longWindowMinutes: 4320, channels: ['in_app'] },
      ],
    };
  }

  async computeBurnRates(params: { organizationId?: string }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    let policies: any[] = [];
    try {
      policies = await (this.prisma as Record<string, unknown>).sloPolicy.findMany({ where: { organizationId, isEnabled: true }, orderBy: [{ updatedAt: 'desc' }] });
    } catch {
      policies = [];
    }

    // If no policies exist, return computed defaults (without persisting)
    if (!policies.length) {
      const defaults = this.defaultSloRules(30);
      policies = [
        { id: 'default_outbox', organizationId, name: 'Outbox Delivery SLO', indicator: 'outbox_delivery', objectivePercent: 99.9, errorBudgetWindowDays: 30, metaJson: { rules: [...defaults.fast, ...defaults.slow] } },
        { id: 'default_workflows', organizationId, name: 'Workflow SLA SLO', indicator: 'workflow_sla', objectivePercent: 99.0, errorBudgetWindowDays: 30, metaJson: { rules: [...defaults.fast, ...defaults.slow] } },
      ];
    }

    const results: any[] = [];

    for (const p of policies) {
      const objective = Number(p.objectivePercent || 99.9);
      const windowDays = Number(p.errorBudgetWindowDays || 30);

      const rulesFromMeta: any[] = Array.isArray(p.metaJson?.rules) ? p.metaJson.rules : [];
      const defaults = this.defaultSloRules(windowDays);
      const rules = rulesFromMeta.length ? rulesFromMeta : [...defaults.fast, ...defaults.slow];

      // Collect all unique windows for this policy
      const windows = Array.from(new Set(rules.flatMap((r) => [Number(r.shortWindowMinutes), Number(r.longWindowMinutes)]).filter((x) => Number.isFinite(x) && x > 0)));
      const statsByWindow: Record<number, any> = {};
      for (const w of windows) {
        if (p.indicator === 'outbox_delivery') statsByWindow[w] = await this.computeOutboxRates(organizationId, w);
        else if (p.indicator === 'workflow_sla') statsByWindow[w] = await this.computeWorkflowRates(organizationId, w);
        else if (p.indicator === 'approvals_sla') statsByWindow[w] = await this.computeApprovalRates(organizationId, w);
        else statsByWindow[w] = { total: 0, errors: 0, errorRate: 0 };
      }

      const ruleResults = rules.map((r: any) => {
        const shortW = Number(r.shortWindowMinutes);
        const longW = Number(r.longWindowMinutes);
        const thr = Number(r.threshold);
        const short = statsByWindow[shortW] || { total: 0, errors: 0, errorRate: 0 };
        const long = statsByWindow[longW] || { total: 0, errors: 0, errorRate: 0 };
        const burnRateShort = this.burnRate(objective, short.errorRate);
        const burnRateLong = this.burnRate(objective, long.errorRate);
        const fired = burnRateShort >= thr && burnRateLong >= thr;
        return {
          id: String(r.id || `${shortW}_${longW}_${thr}`),
          severity: String(r.severity || 'warning'),
          channels: Array.isArray(r.channels) ? r.channels : ['in_app'],
          threshold: thr,
          shortWindowMinutes: shortW,
          longWindowMinutes: longW,
          short,
          long,
          burnRateShort,
          burnRateLong,
          fired,
        };
      });

      results.push({
        policy: { id: p.id, name: p.name, indicator: p.indicator, objectivePercent: objective, errorBudgetWindowDays: windowDays, metaJson: p.metaJson || null },
        ruleResults,
      });
    }

    return { ok: true, organizationId, count: results.length, items: results };
  }

  async evaluateSloAndNotify(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const res: any = await this.computeBurnRates({ organizationId }, user);
    const alerts: any[] = [];

    for (const item of res.items || []) {
      const policyId = String(item.policy.id);
      const policyName = String(item.policy.name);

      for (const r of item.ruleResults || []) {
        if (!r.fired) continue;

        const severity = String(r.severity || 'warning');
        const channels: string[] = Array.isArray(r.channels) ? r.channels : ['in_app'];

        const titleAr = `تنبيه SLO: ${policyName}`;
        const messageAr = `Multi-window burn-rate مرتفع. threshold=${Number(r.threshold).toFixed(2)}. burn(short ${r.shortWindowMinutes}m)=${Number(r.burnRateShort).toFixed(2)} و burn(long ${r.longWindowMinutes}m)=${Number(r.burnRateLong).toFixed(2)}.`;

        // Persist alert if policy exists in DB (skip for defaults)
        if (String(policyId || '').startsWith('default_') === false) {
          try {
            const row = await (this.prisma as Record<string, unknown>).sloAlert.create({
              data: {
                organizationId,
                policyId,
                burnRateShort: r.burnRateShort,
                burnRateLong: r.burnRateLong,
                errorRateShort: r.short.errorRate,
                errorRateLong: r.long.errorRate,
                windowShortMinutes: r.shortWindowMinutes,
                windowLongMinutes: r.longWindowMinutes,
                status: 'open',
                metaJson: { rule: r, policy: item.policy },
              },
            });
            alerts.push(row);
          } catch {
            // ignore
          }
        }

        if (channels.includes('in_app')) {
          const members = await (this.prisma as Record<string, unknown>).organizationMember.findMany({ where: { organizationId, role: { in: ['org_admin'] } }, select: { userId: true } }).catch(() => []);
          const uids = Array.from(new Set(members.map((m: any) => m.userId).filter(Boolean)));
          for (const uid of uids) {
            await this.notifications.create({ organizationId, userId: uid, severity, titleAr, messageAr, entityType: 'SloPolicy', entityId: String(policyId) }).catch(() => null);
          }
        }

        for (const ch of channels.filter((c) => c !== 'in_app')) {
          await this.outbox.create({
            organizationId,
            channel: ch,
            payload: { titleAr, messageAr, severity, text: `⚠️ ${titleAr}\n${messageAr}\nOrg: ${organizationId}` },
            dedupKey: `slo:${organizationId}:${policyId}:${r.id}:${ch}`,
            incidentKey: `slo:${organizationId}:${policyId}`,
            respectQuietHours: { severity },
          } as any).catch(() => null);
        }
      }
    }

    return { ok: true, organizationId, alerted: alerts.length, alerts };
  }

  async listIncidents(params: { organizationId?: string; status?: string; limit?: number }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    // Light backfill: if incidents table is empty but outbox has incidentKey, create incidents for recent keys.
    try {
      const existingCount = await (this.prisma as Record<string, unknown>).incident.count({ where: { organizationId } }).catch(() => 0);
      if (existingCount === 0) {
        const since = new Date(Date.now() - 14 * 24 * 60_000);
        const rows = await (this.prisma as Record<string, unknown>).outboxMessage.findMany({
          where: { organizationId, incidentKey: { not: null }, createdAt: { gte: since } },
          select: { incidentKey: true, payload: true },
          orderBy: [{ createdAt: 'desc' }],
          take: 200,
        }).catch(() => []);
        const keys: string[] = Array.from(new Set(rows.map((r: any) => String(r.incidentKey || '')).filter(Boolean)));
        for (const k of keys) {
          const rawPayload = rows.find((r: any) => String(r.incidentKey) === k)?.payload;
          const payload = isIncidentPayloadRecord(rawPayload) ? rawPayload : {};
          await this.incidents.ensureIncident({
            organizationId,
            incidentKey: k,
            severity: typeof payload.severity === 'string' ? payload.severity : 'warning',
            title: typeof payload.titleAr === 'string' ? payload.titleAr : (typeof payload.title === 'string' ? payload.title : null),
          }).catch(() => null);
        }
      }
    } catch {
      // ignore
    }

    return this.incidents.list({ organizationId, status: params.status, limit: params.limit });
  }

  async incidentTimeline(params: { organizationId?: string; incidentId?: string; limit?: number }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    const incidentId = String(params.incidentId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    assertOrgAccess(user, organizationId);
    return this.incidents.timeline({ organizationId, incidentId, limit: params.limit });
  }

  async ackIncident(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    const incidentId = String(body?.incidentId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    assertOrgAccess(user, organizationId);
    return this.incidents.ack({ organizationId, incidentId, userId: String(user?.sub || '') });
  }

  async closeIncident(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    const incidentId = String(body?.incidentId || '').trim();
    const note = body?.note ? String(body.note) : null;
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    assertOrgAccess(user, organizationId);
    return this.incidents.close({ organizationId, incidentId, userId: String(user?.sub || ''), note });
  }

  async muteIncident(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    const incidentId = String(body?.incidentId || '').trim();
    const minutes = Number(body?.minutes ?? 60);
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    assertOrgAccess(user, organizationId);
    return this.incidents.mute({ organizationId, incidentId, userId: String(user?.sub || ''), minutes });
  }

  async unmuteIncident(body: any, user?: RequestUser) {
    const organizationId = String(body?.organizationId || user?.activeOrgId || '').trim();
    const incidentId = String(body?.incidentId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!incidentId) throw new BadRequestException('incidentId مطلوب');
    assertOrgAccess(user, organizationId);
    return this.incidents.unmute({ organizationId, incidentId, userId: String(user?.sub || '') });
  }
}
