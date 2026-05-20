import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess, isSuperAdmin } from '../../common/access';
import { throwIfProdDbError } from '../../common/db-fallback';
import { computeOpsReliabilityScore } from '@madar/shared';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  workflows(params?: { organizationId?: string; projectId?: string }) {
    const executions = await this.prisma.workflowExecution.findMany({}).filter((x) => {
      if (params?.organizationId && x.organizationId !== params.organizationId) return false;
      if (params?.projectId && x.projectId !== params.projectId) return false;
      return true;
    });

    const decoded = executions.map((e) => ({
      ...e,
      metrics: safeJson(e.metricsJson),
      sla: safeJson(e.slaJson),
    }));

    const byStatus: Record<string, number> = {};
    const breached = decoded.filter((x) => Boolean(x.sla?.breached)).length;
    decoded.forEach((x) => {
      byStatus[x.status] = (byStatus[x.status] || 0) + 1;
    });

    const avgProgress = decoded.length
      ? Math.round(decoded.reduce((sum, x) => sum + (Number(x.metrics?.progressPercent) || 0), 0) / decoded.length)
      : 0;

    return {
      counts: {
        total: decoded.length,
        breached,
        byStatus,
      },
      averages: {
        progressPercent: avgProgress,
      },
      top: {
        queued: decoded
          .filter((x) => x.status === 'queued')
          .sort((a, b) => (b.queueScore || 0) - (a.queueScore || 0))
          .slice(0, 10)
          .map((x) => ({ id: x.id, templateId: x.templateId, queueScore: x.queueScore })),
      },
      noteAr: 'هذه لوحة تشغيل سريعة (Production Runtime) وتعتمد على بيانات executions + SLA + events.',
    };
  }

  programs(params?: { organizationId?: string }) {
    let programs = await this.prisma.program.findMany({});
    if (params?.organizationId) programs = programs.filter((p) => p.organizationId === params.organizationId);

    const byStatus: Record<string, number> = {};
    programs.forEach((p) => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    });

    return {
      counts: { total: programs.length, byStatus },
      items: programs.slice(0, 50),
      noteAr: 'لوحة برامج عالية المستوى (High Programs) — تُظهر الحالة العامة والتقدم على مستوى المحفظة.',
    };
  }

  twin(params?: { organizationId?: string; projectId?: string }) {
    let twins = await this.prisma.twin.findMany({});
    if (params?.organizationId) twins = twins.filter((t) => t.organizationId === params.organizationId);
    if (params?.projectId) twins = twins.filter((t) => t.projectId === params.projectId);

    const sims = await this.prisma.twinSimulationRun.findMany({});
    const simsForTwins = sims.filter((s) => twins.some((t) => t.id === s.twinId));

    const byStatus: Record<string, number> = {};
    simsForTwins.forEach((s) => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });

    const latestPerTwin = twins.map((t) => {
      const latest = simsForTwins
        .filter((s) => s.twinId === t.id && s.status === 'completed')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      const kpis = latest ? safeJson(latest.resultJson)?.kpis : null;
      return { twinId: t.id, nameAr: t.nameAr, status: t.status, latestSimulationId: latest?.id, kpis };
    });

    const avgSat = avg(latestPerTwin.map((x) => Number(x.kpis?.predictedSatisfaction0to100 || 0)).filter((n) => n > 0));
    const avgCong = avg(latestPerTwin.map((x) => Number(x.kpis?.congestionScore0to100 || 0)).filter((n) => n > 0));

    return {
      counts: {
        twins: twins.length,
        activeTwins: twins.filter((t) => t.status === 'active').length,
        simulations: simsForTwins.length,
        simulationsByStatus: byStatus,
      },
      averages: {
        predictedSatisfaction0to100: Math.round(avgSat),
        congestionScore0to100: Math.round(avgCong),
      },
      latest: latestPerTwin.slice(0, 20),
      noteAr: 'لوحة Twin تتابع المحاكاة والازدحام المتوقع. استخدم WebSocket events twin.* لعرض بث حي للنتائج والـ telemetry.',
    };
  }

  async ops(params: { organizationId?: string; hours?: number }, user?: RequestUser) {
    const hours = Number(params.hours ?? 24);
    const safeHours = Number.isFinite(hours) && hours > 0 && hours <= 720 ? hours : 24;
    const since = new Date(Date.now() - safeHours * 3600_000);

    const orgId = (params.organizationId || '').trim() || undefined;
    if (orgId) assertOrgAccess(user, orgId);
    if (!orgId && !isSuperAdmin(user)) {
      // org_admin must scope
      const first = (user?.orgIds || [])[0];
      if (!first) throw new Error('organizationId مطلوب');
    }

    const orgWhere = orgId ? orgId : (isSuperAdmin(user) ? undefined : { in: (user?.orgIds || []) });

    try {
      const [events, outbox, escStates, overdueApprovals, openApprovals] = await Promise.all([
        (this.prisma as Record<string, unknown>).operationalEvent.findMany({
          where: {
            createdAt: { gte: since },
            organizationId: orgWhere,
          },
          orderBy: { createdAt: 'desc' },
          take: 2000,
        }),
        (this.prisma as Record<string, unknown>).outboxMessage.findMany({
          where: {
            createdAt: { gte: since },
            organizationId: orgWhere,
          },
          orderBy: { createdAt: 'desc' },
          take: 2000,
        }),
        (this.prisma as Record<string, unknown>).escalationState.findMany({
          where: {
            organizationId: orgWhere,
          },
          take: 2000,
        }),
        (this.prisma as Record<string, unknown>).approvalRequest.findMany({
          where: {
            organizationId: orgWhere,
            dueAt: { lt: new Date() },
            status: { in: ['submitted', 'in_review', 'changes_requested'] },
          },
          take: 5000,
        }),
        (this.prisma as Record<string, unknown>).approvalRequest.findMany({
          where: {
            organizationId: orgWhere,
            status: { in: ['submitted', 'in_review', 'changes_requested'] },
          },
          take: 5000,
        }),
      ]);

      const bySeverity: Record<string, number> = {};
      const byType: Record<string, number> = {};
      const escalationEvents = events.filter((e: any) => String(e.eventType || '').startsWith('sla.escalation'));
      events.forEach((e: any) => {
        const sev = String(e.severity || 'info');
        const typ = String(e.eventType || 'unknown');
        bySeverity[sev] = (bySeverity[sev] || 0) + 1;
        byType[typ] = (byType[typ] || 0) + 1;
      });

      const outboxByStatus: Record<string, number> = {};
      const outboxByChannel: Record<string, { sent: number; failed: number; pending: number; sending: number }> = {};
      outbox.forEach((m: any) => {
        const st = String(m.status || 'pending');
        outboxByStatus[st] = (outboxByStatus[st] || 0) + 1;
        const ch = String(m.channel || 'unknown');
        if (!outboxByChannel[ch]) outboxByChannel[ch] = { sent: 0, failed: 0, pending: 0, sending: 0 };
        (outboxByChannel[ch] as any)[st] = ((outboxByChannel[ch] as any)[st] || 0) + 1;
      });

      const sent = outboxByStatus.sent || 0;
      const failed = outboxByStatus.failed || 0;
      const deliverySuccessRate = sent + failed > 0 ? sent / (sent + failed) : 1;

      const overdueCount = overdueApprovals.length;
      const openCount = openApprovals.length;
      const overdueRate = openCount > 0 ? overdueCount / openCount : 0;
      const avgMinutesOverdue = overdueCount
        ? Math.round(overdueApprovals.reduce((s: number, a: any) => {
            const due = a.dueAt ? new Date(a.dueAt).getTime() : Date.now();
            return s + Math.max(0, Math.floor((Date.now() - due) / 60000));
          }, 0) / overdueCount)
        : 0;

      const reliabilityScore0to100 = computeOpsReliabilityScore({
        outboxSuccessRate: deliverySuccessRate,
        overdueApprovalsRate: overdueRate,
        avgMinutesOverdue,
        escalationsPerOpenApproval: openCount ? escalationEvents.length / openCount : 0,
      });

      return {
        ok: true,
        range: { hours: safeHours, sinceIso: since.toISOString(), nowIso: new Date().toISOString() },
        counts: {
          operationalEvents: events.length,
          operationalEventsBySeverity: bySeverity,
          operationalEventsByType: topN(byType, 20),
          outbox: outbox.length,
          outboxByStatus,
          escalationsEvents: escalationEvents.length,
          escalationStates: escStates.length,
          approvalsOpen: openCount,
          approvalsOverdue: overdueCount,
        },
        rates: {
          outboxDeliverySuccessRate: round4(deliverySuccessRate),
          approvalsOverdueRate: round4(overdueRate),
        },
        averages: {
          approvalsMinutesOverdueAvg: avgMinutesOverdue,
        },
        top: {
          outboxChannels: Object.entries(outboxByChannel)
            .map(([channel, stats]) => ({ channel, ...stats, total: (stats.sent + stats.failed + stats.pending + stats.sending) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10),
          lastEvents: events.slice(0, 25).map((e: any) => ({ id: e.id, eventType: e.eventType, severity: e.severity, subject: e.subject, createdAt: e.createdAt })),
        },
        scores: { reliability0to100: reliabilityScore0to100 },
        noteAr: 'لوحة تشغيل وامتثال مبنية على OperationalEvent + Outbox + Escalations + Approval SLA. تستخدم لإدارة الضوضاء وتحسين الاستجابة وفق أفضل الممارسات.',
      };
    } catch (err) {
      throwIfProdDbError(err, 'DashboardsService.ops');
      return {
        ok: true,
        degraded: true,
        noteAr: 'تعذر قراءة بيانات التشغيل من قاعدة البيانات؛ يتم عرض لوحة مبسطة من الذاكرة (Dev فقط).',
        fallback: this.programs({ organizationId: orgId }),
      };
    }
  }


  async commandCenter(params?: { organizationId?: string; projectId?: string }) {
    const jobs = await this.prisma.asyncJob.findMany({}) /* Wave123: add where clause */;
    const ai = jobs.filter((x) => x.kind === 'ai_decision');
    const twin = jobs.filter((x) => x.kind === 'twin_simulation');
    const studio = jobs.filter((x) => x.kind === 'studio_refresh');
    const byStatus: Record<string, number> = {};
    jobs.forEach((j) => { byStatus[j.status] = (byStatus[j.status] || 0) + 1; });
    const queueStats = await this.queues.getQueueStats();
    return {
      ok: true,
      counts: { totalJobs: jobs.length, aiJobs: ai.length, twinJobs: twin.length, studioJobs: studio.length, byStatus },
      latest: jobs.slice(0, 20),
      queueStats,
      health: { recommendationLatencyMode: ai.length ? 'tracked' : 'cold_start', simulationPosture: twin.length ? 'active' : 'idle', creativeRefreshPosture: studio.length ? 'active' : 'idle' },
      noteAr: 'لوحة موحدة للقيادة التشغيلية تجمع قرارات الذكاء، محاكاة التوأم، وتحديثات الاستديو الإبداعي.',
    };
  }

  async creativeStudio(params?: { projectId?: string }) {
    const projectId = params?.projectId || 'prj_1';
    const jobs = await this.prisma.asyncJob.findMany({}) /* Wave123: add where clause */;
    const latest = jobs[0] || null;
    const queueStats = await this.queues.getQueueStats();
    return {
      ok: true,
      projectId,
      counts: { refreshJobs: jobs.length, completed: jobs.filter((x) => x.status === 'completed').length },
      latest,
      queueStats,
      boardHint: { pillars: ['concept', 'narrative', 'experience', 'assets', 'consistency'], nextActions: ['refresh creative board', 'review consistency', 'approve asset pack'] },
    };
  }

  async readiness(params?: { organizationId?: string }) {
    const jobs = await this.prisma.asyncJob.findMany({}) /* Wave123: add where clause */;
    const queueStats = await this.queues.getQueueStats();
    const failedJobs = jobs.filter((x) => x.status === 'failed').length;
    const blocked = jobs.filter((x) => String(x.status) === 'blocked').length;
    const active = jobs.filter((x) => x.status === 'running' || x.status === 'queued').length;
    const readinessScore0to100 = Math.max(0, 100 - failedJobs * 10 - blocked * 15 - Math.min(25, active));
    return {
      ok: true,
      counts: {
        totalJobs: jobs.length,
        failedJobs,
        blockedJobs: blocked,
        activeOrQueuedJobs: active,
      },
      readiness: {
        score0to100: readinessScore0to100,
        posture: failedJobs > 0 || blocked > 0 ? 'watch' : 'nominal',
      },
      queueStats,
      noteAr: 'لوحة جاهزية تنفيذية تربط أوضاع الطوابير مع حالات المهام غير المتزامنة لرصد التدهور قبل أن يتحول إلى حادثة.'
    };
  }

}

function round4(n: number) {
  return Number((Number(n) || 0).toFixed(4));
}

function topN(map: Record<string, number>, n: number) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .reduce((acc: any, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});
}

function avg(arr: number[]) {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
}

function safeJson(input?: string) {
  try {
    return input ? JSON.parse(input) : {};
  } catch {
    return {};
  }
}
