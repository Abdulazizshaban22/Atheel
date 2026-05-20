import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { throwIfProdDbError } from '../../common/db-fallback';

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function dimKey(kind: string, value: string | null | undefined) {
  const v = String(value || '').trim();
  if (!v) return null;
  return `${kind}:${v}`;
}

function evidenceWeight(evidenceCount: number) {
  // Confidence increases quickly up to ~20 samples then saturates.
  const ev = Math.max(0, Number(evidenceCount || 0));
  const w = Math.log1p(ev) / Math.log(21);
  return clamp01(w);
}

@Injectable()
export class ApprovalsRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  private async workloadMap(organizationId: string) {
    try {
      const approvals = await (this.prisma as Record<string, unknown>).approvalRequest.findMany({
        where: { organizationId, status: { in: ['submitted', 'in_review'] } },
        select: { currentApproverId: true, dueAt: true },
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
      return byUser;
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalsRoutingService.workloadMap');
      return {};
    }
  }

  private async skillsMap(organizationId: string, dimensions: string[]) {
    try {
      const items = await (this.prisma as Record<string, unknown>).approvalReviewerSkill.findMany({ where: { organizationId, dimension: { in: dimensions } } });
      const m: Record<string, Record<string, unknown>> = {};
      for (const it of items) {
        const uid = String(it.userId);
        m[uid] = m[uid] || {};
        m[uid][String(it.dimension)] = it;
      }
      return m;
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalsRoutingService.skillsMap');
      return {} as any;
    }
  }

  private async routingStateMap(organizationId: string, userIds: string[]) {
    try {
      const rows = await (this.prisma as Record<string, unknown>).approvalRoutingState.findMany({
        where: { organizationId, userId: { in: userIds } },
        select: { userId: true, lastAssignedAt: true, assignedCount: true },
      });
      const m: Record<string, unknown> = {};
      for (const r of rows) m[String(r.userId)] = r;
      return m;
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalsRoutingService.routingStateMap');
      return {};
    }
  }

  private async routingTuning(organizationId: string) {
    try {
      const row = await (this.prisma as Record<string, unknown>).opsSettings.findUnique({ where: { organizationId } });
      return {
        cooldownMinutes: Math.max(0, Number(row?.approvalsReviewerCooldownMinutes ?? 5)),
        maxActive: Math.max(1, Number(row?.approvalsMaxActivePerReviewer ?? 10)),
      };
    } catch {
      return { cooldownMinutes: 5, maxActive: 10 };
    }
  }

  /**
   * Picks the best approver for an approval submission.
   * This is intentionally deterministic, explainable, and safe (fallback to org_admin).
   */
  async pickApprover(params: { organizationId: string; entityType: string; dueAt?: Date | null; contextViolationType?: string | null; contextDomain?: string | null; contextRegion?: string | null }) {
    const organizationId = params.organizationId;
    const entityType = String(params.entityType || 'content');

    const dimensions = [
      dimKey('entityType', entityType),
      dimKey('violationType', params.contextViolationType || null),
      dimKey('domain', params.contextDomain || null),
      dimKey('region', params.contextRegion || null),
    ].filter(Boolean) as string[];

    // Candidates: org_admin + project_manager + curator (can be extended later via settings/policy)
    const roles = ['org_admin', 'project_manager', 'curator'];

    let members: any[] = [];
    try {
      members = await (this.prisma as Record<string, unknown>).organizationMember.findMany({ where: { organizationId, role: { in: roles } }, select: { userId: true, role: true } });
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalsRoutingService.pickApprover.members');
      members = [];
    }

    const userIds = Array.from(new Set(members.map((m) => String(m.userId || '')).filter(Boolean)));

    const workload = await this.workloadMap(organizationId);
    const skills = await this.skillsMap(organizationId, dimensions);
    const state = await this.routingStateMap(organizationId, userIds);
    const tuning = await this.routingTuning(organizationId);

    const now = Date.now();
    const dueAtMs = params.dueAt ? new Date(params.dueAt).getTime() : null;
    const urgency = dueAtMs ? clamp01(1 - Math.max(0, dueAtMs - now) / (24 * 60_000)) : 0.5;

    const scored = userIds.map((uid) => {
      // Skill composite: weighted by evidence and by dimension importance.
      const perDim = skills[uid] || {};
      const baseWeights: Record<string, number> = {
        [`entityType:${entityType}`]: 0.45,
      };
      if (params.contextViolationType) baseWeights[`violationType:${String(params.contextViolationType)}`] = 0.30;
      if (params.contextDomain) baseWeights[`domain:${String(params.contextDomain)}`] = 0.15;
      if (params.contextRegion) baseWeights[`region:${String(params.contextRegion)}`] = 0.10;

      let num = 0;
      let den = 0;
      const dimBreakdown: any[] = [];
      for (const d of dimensions) {
        const rec = perDim[d];
        const score = clamp01(Number(rec?.score ?? 0.5));
        const ev = Number(rec?.evidenceCount ?? 0);
        const conf = evidenceWeight(ev);
        const w = (baseWeights[d] ?? 0.10) * (0.25 + 0.75 * conf);
        num += score * w;
        den += w;
        dimBreakdown.push({ dimension: d, score, evidenceCount: ev, weight: w });
      }
      const skill = den > 0 ? clamp01(num / den) : 0.5;

      const active = Number(workload[uid]?.active ?? 0);
      const overdue = Number(workload[uid]?.overdue ?? 0);
      const normLoad = Math.min(1, active / Math.max(1, tuning.maxActive));

      const lastAssignedAt = state[uid]?.lastAssignedAt ? new Date(state[uid].lastAssignedAt).getTime() : null;
      const minutesSinceAssigned = lastAssignedAt ? Math.max(0, (now - lastAssignedAt) / 60_000) : 10_000;
      const cooldownMinutes = Math.max(0, Number(tuning.cooldownMinutes || 0));
      const inCooldown = cooldownMinutes > 0 && minutesSinceAssigned < cooldownMinutes;

      // Hard guard: if not urgent and still in cooldown, penalize heavily.
      const cooldownPenalty = inCooldown && urgency < 0.8 ? 0.35 : 0;
      const fairnessBoost = cooldownMinutes > 0 ? clamp01(minutesSinceAssigned / (cooldownMinutes * 2)) : clamp01(minutesSinceAssigned / 30);

      const score =
        0.45 * skill +
        0.25 * (1 - normLoad) +
        0.20 * urgency +
        0.10 * fairnessBoost -
        0.20 * Math.min(1, overdue / 3) -
        cooldownPenalty;

      return {
        userId: uid,
        score,
        breakdown: {
          skill,
          dimensions: dimBreakdown,
          active,
          overdue,
          normLoad,
          urgency,
          fairnessBoost,
          lastAssignedAt: lastAssignedAt ? new Date(lastAssignedAt).toISOString() : null,
          minutesSinceAssigned,
          cooldownMinutes,
          inCooldown,
        },
      };
    });

    // Deterministic order: score, then least recently assigned, then userId
    scored.sort((a, b) => {
      const ds = b.score - a.score;
      if (Math.abs(ds) > 1e-9) return ds;
      const aa = Number(a.breakdown?.minutesSinceAssigned ?? 0);
      const bb = Number(b.breakdown?.minutesSinceAssigned ?? 0);
      if (aa !== bb) return bb - aa;
      return String(a.userId).localeCompare(String(b.userId));
    });

    // If none, fallback to org_admin first member.
    if (!scored.length) {
      const fallback = members.find((m) => String(m.role) === 'org_admin') || members[0];
      return { selectedUserId: fallback?.userId || null, dimensions, candidates: [] };
    }

    // Persist routing state for fairness / cooldown
    try {
      await (this.prisma as Record<string, unknown>).approvalRoutingState.upsert({
        where: { organizationId_userId: { organizationId, userId: scored[0].userId } },
        create: { organizationId, userId: scored[0].userId, lastAssignedAt: new Date(), assignedCount: 1 },
        update: { lastAssignedAt: new Date(), assignedCount: { increment: 1 }, updatedAt: new Date() },
      });
    } catch {
      // ignore
    }

    return { selectedUserId: scored[0].userId, dimensions, candidates: scored };
  }

  /**
   * Updates reviewer skill based on decision outcome (EMA update).
   */
  async recordDecision(params: {
    organizationId: string;
    reviewerUserId: string;
    entityType: string;
    contextViolationType?: string | null;
    contextDomain?: string | null;
    contextRegion?: string | null;
    submittedAt?: Date | null;
    decidedAt?: Date | null;
    dueAt?: Date | null;
  }) {
    const organizationId = params.organizationId;
    const reviewerUserId = params.reviewerUserId;
    const entityType = String(params.entityType || 'content');
    const dimensions = [
      dimKey('entityType', entityType),
      dimKey('violationType', params.contextViolationType || null),
      dimKey('domain', params.contextDomain || null),
      dimKey('region', params.contextRegion || null),
    ].filter(Boolean) as string[];

    // Score signal: faster-than-due and not overdue => higher.
    const decidedAt = params.decidedAt ? new Date(params.decidedAt).getTime() : Date.now();
    const submittedAt = params.submittedAt ? new Date(params.submittedAt).getTime() : decidedAt;
    const dueAt = params.dueAt ? new Date(params.dueAt).getTime() : null;

    const decisionMinutes = Math.max(0, Math.floor((decidedAt - submittedAt) / 60_000));
    const overdueMinutes = dueAt ? Math.max(0, Math.floor((decidedAt - dueAt) / 60_000)) : 0;

    // Base quality: start at 0.7, penalize overdue and extreme slowness
    let delta = 0.7;
    if (overdueMinutes > 0) delta -= Math.min(0.5, overdueMinutes / 240); // cap penalty
    if (decisionMinutes > 0) delta -= Math.min(0.2, decisionMinutes / 720);
    delta = clamp01(delta);

    try {
      const table = (this.prisma as Record<string, unknown>).approvalReviewerSkill;
      const updatedDims: any[] = [];
      for (const dimension of dimensions) {
        const existing = await table.findUnique({
          where: { organizationId_userId_dimension: { organizationId, userId: reviewerUserId, dimension } },
        }).catch(() => null);

        const prev = existing ? clamp01(Number(existing.score ?? 0)) : 0.5;
        const ev = existing ? Number(existing.evidenceCount ?? 0) : 0;

        // EMA weights: first 20 samples heavier, later stabilizes.
        const alpha = ev < 20 ? 0.25 : 0.10;
        const next = clamp01(prev * (1 - alpha) + delta * alpha);

        await table.upsert({
          where: { organizationId_userId_dimension: { organizationId, userId: reviewerUserId, dimension } },
          create: { organizationId, userId: reviewerUserId, dimension, score: next, evidenceCount: 1, lastUpdatedAt: new Date() },
          update: { score: next, evidenceCount: { increment: 1 }, lastUpdatedAt: new Date() },
        });
        updatedDims.push({ dimension, score: next });
      }

      return { ok: true, organizationId, reviewerUserId, dimensions: updatedDims, delta, decisionMinutes, overdueMinutes };
    } catch (err) {
      throwIfProdDbError(err, 'ApprovalsRoutingService.recordDecision');
      return { ok: false };
    }
  }
}
