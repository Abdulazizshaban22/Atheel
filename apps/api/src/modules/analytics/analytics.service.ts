import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess, isSuperAdmin } from '../../common/access';
import { throwIfProdDbError } from '../../common/db-fallback';
import { computeCulturalImpactScore, computeContentQualityIndex, computeOpsReliabilityScore } from '@madar/shared';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
  dashboard() {
    const orgs = this.db.getOrganizations().length;
    const projects = this.db.getProjects().length;
    const content = this.db.getContentItems().length;
    const experiences = this.db.getExperiences().length;

    return {
      counts: { orgs, projects, content, experiences },
      metrics: {
        contentQualityIndex: computeContentQualityIndex({
          factualAccuracy: 0.90, languageClarity: 0.88, narrativeDepth: 0.76,
          culturalFit: 0.92, interactivityReadiness: 0.70, mediaCompleteness: 0.66
        }),
        culturalImpactScore: computeCulturalImpactScore({
          routeCompletion: 0.68, stopEngagement: 0.61, ratingsQuality: 0.84,
          returnRate: 0.27, sharingRate: 0.16, qualityTime: 0.57
        })
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Wave44: Innovation recommendations engine (heuristic, ops-driven).
   * هدفه تحويل فجوات التشغيل إلى backlog قابل للتنفيذ.
   */
  async innovation(params: { organizationId?: string; hours?: number } = {}, user?: RequestUser) {
    const hours = Number(params.hours ?? 168);
    const safeHours = Number.isFinite(hours) && hours > 0 && hours <= 720 ? hours : 168;
    const since = new Date(Date.now() - safeHours * 3600_000);

    const orgId = (params.organizationId || '').trim() || undefined;
    if (orgId) assertOrgAccess(user, orgId);
    const orgWhere = orgId ? orgId : (isSuperAdmin(user) ? undefined : { in: (user?.orgIds || []) });

    try {
      const [events, outbox, overdueApprovals, openApprovals] = await Promise.all([
        (this.prisma as Record<string, unknown>).operationalEvent.findMany({
          where: { createdAt: { gte: since }, organizationId: orgWhere },
          take: 5000,
          orderBy: { createdAt: 'desc' },
        }),
        (this.prisma as Record<string, unknown>).outboxMessage.findMany({
          where: { createdAt: { gte: since }, organizationId: orgWhere },
          take: 5000,
          orderBy: { createdAt: 'desc' },
        }),
        (this.prisma as Record<string, unknown>).approvalRequest.findMany({
          where: { organizationId: orgWhere, dueAt: { lt: new Date() }, status: { in: ['submitted', 'in_review', 'changes_requested'] } },
          take: 5000,
        }),
        (this.prisma as Record<string, unknown>).approvalRequest.findMany({
          where: { organizationId: orgWhere, status: { in: ['submitted', 'in_review', 'changes_requested'] } },
          take: 5000,
        }),
      ]);

      const outboxByStatus: Record<string, number> = {};
      outbox.forEach((m: any) => {
        const st = String(m.status || 'pending');
        outboxByStatus[st] = (outboxByStatus[st] || 0) + 1;
      });
      const sent = outboxByStatus.sent || 0;
      const failed = outboxByStatus.failed || 0;
      const outboxSuccess = sent + failed > 0 ? sent / (sent + failed) : 1;

      const overdueCount = overdueApprovals.length;
      const openCount = openApprovals.length;
      const overdueRate = openCount > 0 ? overdueCount / openCount : 0;
      const avgMinutesOverdue = overdueCount
        ? Math.round(overdueApprovals.reduce((s: number, a: any) => {
            const due = a.dueAt ? new Date(a.dueAt).getTime() : Date.now();
            return s + Math.max(0, Math.floor((Date.now() - due) / 60000));
          }, 0) / overdueCount)
        : 0;

      const escEvents = events.filter((e: any) => String(e.eventType || '').startsWith('sla.escalation'));
      const noise = openCount ? escEvents.length / openCount : 0;

      const reliability0to100 = computeOpsReliabilityScore({
        outboxSuccessRate: outboxSuccess,
        overdueApprovalsRate: overdueRate,
        avgMinutesOverdue,
        escalationsPerOpenApproval: noise,
      });

      // Produce a prioritized backlog
      const recs: Array<{ id: string; titleAr: string; whyAr: string; impact: 'high'|'medium'|'low'; effort: 'high'|'medium'|'low'; score: number; actions: string[] }> = [];

      if (failed > 0) {
        recs.push({
          id: 'outbox-retry-policy',
          titleAr: 'تحسين موثوقية Outbox: backoff + dead-letter + dashboard للـ failures',
          whyAr: `تم رصد ${failed} رسائل فاشلة في Outbox خلال آخر ${safeHours} ساعة. نمط Outbox يفترض إعادة محاولات مضبوطة ومراقبة مستمرة.`,
          impact: 'high',
          effort: 'medium',
          score: 90,
          actions: [
            'إضافة backoff هندسي (exponential + jitter) حسب attempts',
            'نقل الرسائل التي تتجاوز محاولات محددة إلى dead-letter',
            'إضافة صفحة Web لإدارة Outbox failures وإعادة إرسال يدوية',
          ],
        });
      }

      if (overdueRate > 0.15) {
        recs.push({
          id: 'approval-routing-optimizer',
          titleAr: 'مُحسّن توزيع الموافقات Auto-Routing حسب حمل المعتمدين',
          whyAr: `معدل تأخر الموافقات مرتفع (${Math.round(overdueRate*100)}%). هذا غالبًا نتيجة تركّز الطلبات على معتمد واحد أو سياسة غير مناسبة.`,
          impact: 'high',
          effort: 'high',
          score: 88,
          actions: [
            'إضافة مفهوم reviewer pools لكل entityType',
            'حساب حمل كل معتمد من الأحداث + الطلبات المفتوحة',
            'اختيار المعتمد بالـ score الأعلى (مهارة + توفر + عدالة)',
          ],
        });
      }

      if (noise > 0.6) {
        recs.push({
          id: 'alert-fatigue-controls',
          titleAr: 'تقليل ضوضاء التصعيد: dedup + quiet hours + alert grouping',
          whyAr: `تم رصد ضوضاء تصعيد مرتفعة (≈ ${noise.toFixed(2)} تصعيد/طلب مفتوح). هذه علامة على إرهاق تنبيهات أو thresholds غير مناسبة.`,
          impact: 'medium',
          effort: 'medium',
          score: 75,
          actions: [
            'إضافة grouping حسب subject + نافذة زمنية',
            'سياسة quiet hours لكل جهة',
            'قواعد suppression عند وجود incident مفتوح',
          ],
        });
      }

      if (reliability0to100 < 70) {
        recs.push({
          id: 'ops-slo-sla-pack',
          titleAr: 'تحويل مؤشرات التشغيل إلى SLOs رسمية + تنبيهات Prometheus',
          whyAr: `درجة الاعتمادية الحالية ${reliability0to100}/100. لتحسينها يجب تثبيت SLOs واضحة وربطها بإنذارات وتعامل incident.`,
          impact: 'high',
          effort: 'medium',
          score: 80,
          actions: [
            'تعريف SLO: outbox_success_rate ≥ 99%',
            'تعريف SLO: approvals_overdue_rate ≤ 5%',
            'إضافة alert rules من نفس metrics المستخدمة في لوحة ops',
          ],
        });
      }

      recs.sort((a, b) => b.score - a.score);

      return {
        ok: true,
        range: { hours: safeHours, sinceIso: since.toISOString(), nowIso: new Date().toISOString() },
        snapshot: {
          outbox: { sent, failed, successRate: Number(outboxSuccess.toFixed(4)) },
          approvals: { open: openCount, overdue: overdueCount, overdueRate: Number(overdueRate.toFixed(4)), avgMinutesOverdue },
          escalations: { events: escEvents.length, noisePerOpen: Number(noise.toFixed(4)) },
          reliability0to100,
        },
        recommendations: recs,
      };
    } catch (err) {
      throwIfProdDbError(err, 'AnalyticsService.innovation');
      return {
        ok: true,
        degraded: true,
        noteAr: 'تعذر تحليل التشغيل من قاعدة البيانات؛ تم إرجاع توصيات افتراضية (Dev فقط).',
        recommendations: [
          { id: 'baseline', titleAr: 'تفعيل لوحة التشغيل والامتثال', whyAr: 'ابدأ أولًا بإعداد OperationalEvent + Outbox + Escalations ثم أضف SLOs.', impact: 'high', effort: 'low', score: 70, actions: ['تشغيل docker-compose.ai-stack', 'تفعيل Slack/Email/WhatsApp webhooks'] },
        ],
      };
    }
  }
}
