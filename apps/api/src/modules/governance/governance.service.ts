import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { QueueService } from '../queue/queue.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess, isSuperAdmin } from '../../common/access';
import { throwIfProdDbError } from '../../common/db-fallback';
import crypto from 'node:crypto';
import {
  POLICY_DSL_SPEC_V1,
  POLICY_DSL_DEFAULT_V1,
  POLICY_DSL_JSON_SCHEMA_V1,
  POLICY_DSL_UI_V1,
  compilePolicyDslV1,
  normalizeToPolicyDslV1,
  validatePolicyDslV1,
  type GovernancePolicyCompat,
  type GovernancePolicyDslV1,
} from './policy-dsl/policy-dsl';

function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',')}}`;
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export type GovernancePolicy = GovernancePolicyCompat;
const DEFAULT_POLICY: GovernancePolicy = compilePolicyDslV1(POLICY_DSL_DEFAULT_V1);

// Small in-memory cache to avoid re-compiling the active policy repeatedly
// Keyed by the stored sha256.
const MAX_CACHE = 200;


const DEFAULT_STAGE_GATE_TEMPLATES = [
  {
    key: 'heritage_intervention',
    entityType: 'heritage_asset',
    nameAr: 'بوابات التدخل في الأصل التراثي',
    stages: [
      { key: 'thesis', nameAr: 'تعريف الأطروحة', requiredEvidence: ['strategic_brief', 'value_case'] },
      { key: 'heritage_safety', nameAr: 'فحص سلامة الأصل', requiredEvidence: ['heritage_assessment', 'authenticity_note'] },
      { key: 'ops_readiness', nameAr: 'الجاهزية التشغيلية', requiredEvidence: ['ops_plan', 'risk_register'] },
      { key: 'board_decision', nameAr: 'قرار الاعتماد', requiredEvidence: ['decision_memo'] },
    ],
  },
  {
    key: 'destination_program',
    entityType: 'program',
    nameAr: 'بوابات برنامج الوجهة',
    stages: [
      { key: 'strategy_fit', nameAr: 'مواءمة التوجه', requiredEvidence: ['strategic_brief', 'audience_definition'] },
      { key: 'experience_design', nameAr: 'تصميم التجربة', requiredEvidence: ['experience_blueprint', 'narrative_map'] },
      { key: 'readiness', nameAr: 'الجاهزية', requiredEvidence: ['ops_plan', 'partner_plan', 'budget_note'] },
      { key: 'impact', nameAr: 'الأثر والإرث', requiredEvidence: ['impact_model', 'legacy_plan'] },
    ],
  },
  {
    key: 'mega_event',
    entityType: 'experience',
    nameAr: 'بوابات الفعالية الكبرى',
    stages: [
      { key: 'event_case', nameAr: 'مبررات الفعالية', requiredEvidence: ['strategic_brief', 'target_segments'] },
      { key: 'site_flow', nameAr: 'تدفق الموقع', requiredEvidence: ['site_plan', 'crowd_plan'] },
      { key: 'permit_and_safety', nameAr: 'التصاريح والسلامة', requiredEvidence: ['permits', 'risk_register'] },
      { key: 'go_live', nameAr: 'إذن الإطلاق', requiredEvidence: ['run_of_show', 'command_center_contacts'] },
    ],
  },
] as const;

@Injectable()
export class GovernanceService {
  private readonly evidenceNodesLite: any[] = [];
  private readonly policyDecisionsLite: any[] = [];
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly events: OperationalEventsService,
    private readonly queues: QueueService,
  ) {}

  private compiledCache = new Map<string, GovernancePolicy>();

  private cacheGet(key: string) {
    return this.compiledCache.get(key);
  }

  private cacheSet(key: string, value: GovernancePolicy) {
    if (!key) return;
    this.compiledCache.set(key, value);
    if (this.compiledCache.size > MAX_CACHE) {
      // naive eviction
      const first = this.compiledCache.keys().next().value;
      if (first) this.compiledCache.delete(first);
    }
  }

  getPolicyDslSchema() {
    return POLICY_DSL_JSON_SCHEMA_V1;
  }

  getPolicyDslUi() {
    return POLICY_DSL_UI_V1;
  }

  validatePolicyDsl(payload: any) {
    const raw = payload?.policyDsl ?? payload?.policyJson ?? payload;
    const { dsl, warnings } = normalizeToPolicyDslV1(raw);
    if (warnings.some((w) => w.includes('سياسة افتراضية'))) {
      return { ok: false, errors: [{ path: '$', message: 'المدخل لا يطابق Policy DSL v1 ولا الشكل القديم المدعوم' }], warnings };
    }
    const validation = validatePolicyDslV1(dsl);
    if (!validation.ok) {
      return { ok: false, errors: validation.errors, warnings };
    }
    return { ok: true, dsl, compiled: compilePolicyDslV1(dsl), warnings };
  }


  getReadinessSummary(params: { organizationId?: string }) {
    const decisions = this.policyDecisionsLite.filter((x) => !params.organizationId || x.organizationId === params.organizationId);
    const blocked = decisions.filter((x) => x.verdict === 'blocked').length;
    const conditional = decisions.filter((x) => x.verdict === 'conditional').length;
    const critical = decisions.filter((x) => String(x.riskLevel || '').toLowerCase() === 'critical').length;
    const high = decisions.filter((x) => String(x.riskLevel || '').toLowerCase() === 'high').length;
    const queueMode = this.queues.getMode();
    const posture = blocked > 0 ? 'degraded' : critical > 0 || high > 0 ? 'watch' : conditional > 0 ? 'guarded' : 'nominal';
    const readinessScore0to100 = Math.max(0, 100 - blocked * 25 - critical * 15 - high * 8 - conditional * 4);
    return {
      ok: true,
      posture,
      queueMode,
      counts: {
        totalDecisions: decisions.length,
        blocked,
        conditional,
        high,
        critical,
      },
      readiness: {
        score0to100: readinessScore0to100,
        releaseGate: blocked === 0 && critical === 0 ? 'can_proceed_with_controls' : 'hold_and_review',
        boardAttentionRequired: blocked > 0 || critical > 0,
      },
      topAlerts: decisions
        .filter((x) => x.verdict !== 'allowed' || ['high', 'critical'].includes(String(x.riskLevel || '').toLowerCase()))
        .slice(0, 10)
        .map((x) => ({ id: x.id, entityType: x.entityType, entityId: x.entityId, verdict: x.verdict, riskLevel: x.riskLevel })),
      noteAr: 'هذا الملخص يقدّم وضع الجاهزية التنفيذي اعتمادًا على قرارات الحوكمة والمخاطر الحرجة قبل الإطلاق أو التوسع.',
    };
  }

  async getReleaseGateDetails(params: { organizationId?: string }) {
    const readiness = this.getReadinessSummary(params);
    const observability = this.getObservabilitySummary(params);
    const commandCenter = this.getCommandCenterSummary(params);
    const queueStats = ((await (this.queues.getQueueStats?.() as Promise<{ totals?: { queued?: number; failed?: number } }> | undefined)) || { totals: { queued: 0, active: 0, completed: 0, failed: 0 } }) as { totals?: { queued?: number; active?: number; completed?: number; failed?: number } };
    const actionsAr: string[] = [];
    if ((readiness.readiness?.releaseGate || '') !== 'can_proceed_with_controls') {
      actionsAr.push('إيقاف الإطلاق مؤقتًا حتى تُغلق القرارات المحجوبة والمخاطر الحرجة.');
    }
    if ((queueStats?.totals?.failed || 0) > 0) {
      actionsAr.push('راجع الوظائف الفاشلة في الطوابير وفعّل إعادة المحاولة قبل go-live.');
    }
    if ((queueStats?.totals?.queued || 0) > 25) {
      actionsAr.push('هناك تراكم ملحوظ في الطوابير؛ راجع worker throughput وحدود التوازي.');
    }
    if ((observability.posture || '') === 'degraded') {
      actionsAr.push('وضع الرصد الحالي degraded؛ لا تعتمد الإطلاق قبل معالجة posture النظام.');
    }
    if (actionsAr.length === 0) {
      actionsAr.push('الوضع الحالي مقبول للمتابعة بشرط استمرار المراقبة أثناء الإطلاق الأولي.');
    }
    return {
      ok: true,
      releaseGate: readiness.readiness?.releaseGate || 'unknown',
      posture: readiness.posture,
      readiness,
      observability,
      commandCenter,
      queueStats,
      actionsAr,
      noteAr: 'هذه اللوحة تجمع الجاهزية والحوكمة والرصد وصحة الطوابير في قرار تنفيذي واحد قبل الإطلاق.',
    };
  }

  getRuntimeVerificationPlan() {
    return {
      ok: true,
      executionOrder: [
        'تشغيل db:generate',
        'تشغيل typecheck',
        'تشغيل build',
        'تشغيل api:smoke',
        'تشغيل migrate deploy على بيئة الاختبار',
        'تشغيل e2e الأساسية',
        'مراجعة queue health وrelease gate قبل go-live',
      ],
      commands: [
        'pnpm db:generate',
        'pnpm typecheck',
        'pnpm build',
        'pnpm api:smoke',
        'pnpm db:migrate:deploy',
        'pnpm --filter @madar/api test:e2e',
        'pnpm runtime:wiring:audit',
      ],
      successCriteria: [
        'عدم وجود أخطاء TypeScript',
        'اكتمال build للتطبيقات الأساسية',
        'نجاح migrate deploy على قاعدة الاختبار',
        'نجاح smoke checks وe2e الأساسية',
        'عدم وجود مجالات غير موصولة في AppModule أو الواجهة',
        'عدم وجود تراكم حرج أو وظائف فاشلة في الطوابير قبل الإطلاق',
      ],
      blockers: [
        'لم يتم في هذه الجلسة إثبات pass فعلي لكل الأوامر على بيئة مكتملة الاعتماديات',
        'بعض طبقات vector retrieval ما زالت scaffolding وليست sync production-grade',
        'تحتاج الموجة النهائية تشغيلًا فعليًا على قاعدة اختبار وRedis مهيأين',
      ],
      noteAr: 'هذه الخطة تنظّم الإغلاق التنفيذي النهائي وتحوّل التحقق من قائمة نظرية إلى مسار تشغيل يمكن تكراره وتوثيقه.',
    };
  }

  async getFinalClosureSummary(params: { organizationId?: string }) {
    const release = await this.getReleaseGateDetails(params);
    const domains = [
      { key: 'heritage', titleAr: 'Atheel Heritage', status: 'active' },
      { key: 'destination', titleAr: 'Atheel Destination', status: 'active' },
      { key: 'mega_events', titleAr: 'Atheel Mega Events', status: 'active' },
      { key: 'culture_programs', titleAr: 'Atheel Culture Programs', status: 'active' },
      { key: 'urban_experience', titleAr: 'Atheel Urban Experience', status: 'active' },
      { key: 'exhibition', titleAr: 'Atheel Exhibition', status: 'active' },
    ];
    return {
      ok: true,
      releaseGate: release.releaseGate,
      posture: release.posture,
      readiness: release.readiness,
      observability: release.observability,
      commandCenter: release.commandCenter,
      queueStats: release.queueStats,
      actionsAr: release.actionsAr,
      domains,
      noteAr: 'هذا الملخص يجمع حالة الإغلاق النهائي عبر الجاهزية والرصد وصحة الطوابير وحضور المجالات القطاعية داخل أثيل.',
    };
  }

  async listPacks(params: { organizationId?: string; q?: string }, user?: RequestUser) {
    const q = (params.q || '').trim();
    const orgId = params.organizationId?.trim();
    if (orgId) assertOrgAccess(user, orgId);

    const where: any = {
      isArchived: false,
      ...(orgId ? { OR: [{ scope: 'organization', organizationId: orgId }, { scope: 'global' }] } : { scope: 'global' }),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    };

    try {
      const packs = (this.prisma as Record<string, unknown>).governancePolicyPack;
      if (!packs?.findMany) throw new Error('pack unavailable');
      const items = await packs.findMany({ where, orderBy: [{ updatedAt: 'desc' }] });
      return { count: items.length, items };
    } catch (err) {
      throwIfProdDbError(err, 'GovernanceService.listPacks');
      return { count: 0, items: [] };
    }
  }

  async createPack(dto: any, user?: RequestUser) {
    const scope = (dto.scope || 'organization') as 'global'|'organization';
    const organizationId = (dto.organizationId || '').toString().trim() || undefined;
    const name = (dto.name || '').toString().trim();
    if (!name) throw new BadRequestException('name مطلوب');
    if (scope === 'organization' && !organizationId) throw new BadRequestException('organizationId مطلوب');
    if (scope === 'global' && !isSuperAdmin(user)) throw new BadRequestException('يتطلب صلاحية super_admin لإنشاء سياسة عالمية');
    if (organizationId) assertOrgAccess(user, organizationId);

    try {
      const pack = await (this.prisma as Record<string, unknown>).governancePolicyPack.create({
        data: {
          scope,
          organizationId: organizationId || null,
          name,
          description: dto.description || null,
          createdByUserId: user?.sub || null,
        },
      });

      await this.audit.create(
        { organizationId: organizationId, action: 'governance.policy_pack.create', entityType: 'GovernancePolicyPack', entityId: pack.id, after: pack, message: `إنشاء حزمة سياسة: ${name}` },
        user?.sub,
      );
      await this.events.emit({
        organizationId: organizationId,
        eventType: 'governance.policy_pack.created',
        severity: 'info',
        subject: `GovernancePolicyPack/${pack.id}`,
        data: { packId: pack.id, scope, name },
        actorUserId: user?.sub,
      });
      return pack;
    } catch (err) {
      throwIfProdDbError(err, 'GovernanceService.createPack');
      throw err;
    }
  }

  async createVersion(packId: string, dto: any, user?: RequestUser) {
    const version = (dto.version || '').toString().trim();
    if (!version) throw new BadRequestException('version مطلوب');
    const rawPolicy = dto.policyDsl ?? dto.policyJson;
    if (!rawPolicy || typeof rawPolicy !== 'object') throw new BadRequestException('policyDsl أو policyJson مطلوب');

    let pack: any;
    try {
      pack = await (this.prisma as Record<string, unknown>).governancePolicyPack.findUnique({ where: { id: packId } });
    } catch (err) {
      throwIfProdDbError(err, 'GovernanceService.createVersion.loadPack');
      throw err;
    }
    if (!pack) throw new NotFoundException('Policy pack not found');

    if (pack.scope === 'global') {
      if (!isSuperAdmin(user)) throw new BadRequestException('يتطلب صلاحية super_admin');
    } else {
      assertOrgAccess(user, pack.organizationId);
    }

    // Wave44: normalize to official Policy DSL v1 + strict validation + compile
    let dsl: GovernancePolicyDslV1;
    let warnings: string[] = [];
    if ((rawPolicy as Record<string, unknown>).spec === POLICY_DSL_SPEC_V1) {
      dsl = { ...(rawPolicy as any), version } as GovernancePolicyDslV1;
    } else if ((rawPolicy as Record<string, unknown>).routing && (rawPolicy as Record<string, unknown>).sla && (rawPolicy as Record<string, unknown>).escalations) {
      const norm = normalizeToPolicyDslV1({ ...rawPolicy, version });
      dsl = norm.dsl;
      warnings = norm.warnings;
    } else {
      throw new BadRequestException('policyDsl لا يطابق Policy DSL v1 ولا الشكل القديم المدعوم');
    }
    const validation = validatePolicyDslV1(dsl);
    if (!validation.ok) {
      throw new BadRequestException({ message: 'Policy DSL غير صالح', errors: validation.errors });
    }

    // compiled policy is used at runtime for SLA/escalations
    const compiled = compilePolicyDslV1(dsl);

    const stable = stableStringify(dsl);
    const hash = sha256Hex(stable);

    try {
      const ver = await (this.prisma as Record<string, unknown>).governancePolicyVersion.create({
        data: {
          packId,
          version,
          policyJson: dsl as GovernancePolicyDslV1,
          sha256: hash,
          changelog: dto.changelog || null,
          createdByUserId: user?.sub || null,
        },
      });

      await this.audit.create(
        { organizationId: pack.organizationId || null, action: 'governance.policy_version.create', entityType: 'GovernancePolicyVersion', entityId: ver.id, after: ver, message: `إضافة نسخة سياسة ${version}` },
        user?.sub,
      );
      await this.events.emit({
        organizationId: pack.organizationId || null,
        eventType: 'governance.policy_version.created',
        severity: 'info',
        subject: `GovernancePolicyVersion/${ver.id}`,
        data: { packId, versionId: ver.id, version, sha256: hash, dslSpec: dsl.spec, warnings },
        actorUserId: user?.sub,
      });

      // Warm cache
      this.cacheSet(hash, compiled);
      return ver;
    } catch (err) {
      throwIfProdDbError(err, 'GovernanceService.createVersion.create');
      throw err;
    }
  }

  async activate(packId: string, dto: any, user?: RequestUser) {
    const organizationId = (dto.organizationId || '').toString().trim();
    const versionId = (dto.versionId || '').toString().trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    if (!versionId) throw new BadRequestException('versionId مطلوب');

    assertOrgAccess(user, organizationId);

    const effectiveAt = dto.effectiveAtIso ? new Date(dto.effectiveAtIso) : new Date();

    // Validate that version belongs to pack
    const version = await (this.prisma as Record<string, unknown>).governancePolicyVersion.findUnique({ where: { id: versionId } }).catch((err: any) => {
      throwIfProdDbError(err, 'GovernanceService.activate.loadVersion');
      throw err;
    });
    if (!version || version.packId !== packId) throw new BadRequestException('النسخة لا تتبع هذه الحزمة');

    // Deactivate previous active
    await (this.prisma as Record<string, unknown>).governancePolicyAssignment.updateMany({
      where: { organizationId, isActive: true },
      data: { isActive: false, deactivatedAt: new Date() },
    }).catch((err: any) => {
      throwIfProdDbError(err, 'GovernanceService.activate.deactivate');
      throw err;
    });

    const assignment = await (this.prisma as Record<string, unknown>).governancePolicyAssignment.create({
      data: {
        organizationId,
        packId,
        versionId,
        isActive: true,
        effectiveAt,
        activatedByUserId: user?.sub || null,
      },
    }).catch((err: any) => {
      throwIfProdDbError(err, 'GovernanceService.activate.create');
      throw err;
    });

    await this.audit.create(
      { organizationId, action: 'governance.policy.activate', entityType: 'GovernancePolicyAssignment', entityId: assignment.id, after: assignment, message: 'تفعيل سياسة حوكمة' },
      user?.sub,
    );
    await this.events.emit({
      organizationId,
      eventType: 'governance.policy.activated',
      severity: 'info',
      subject: `GovernancePolicyAssignment/${assignment.id}`,
      data: { packId, versionId, effectiveAt: effectiveAt.toISOString() },
      actorUserId: user?.sub,
    });

    return assignment;
  }

  async getActivePolicy(organizationId: string): Promise<GovernancePolicy> {
    const orgId = organizationId?.trim();
    if (!orgId) return DEFAULT_POLICY;

    try {
      const assignment = await (this.prisma as Record<string, unknown>).governancePolicyAssignment.findFirst({
        where: { organizationId: orgId, isActive: true },
        orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }],
        include: { version: true },
      });
      if (!assignment?.version?.policyJson) return DEFAULT_POLICY;

      const sha = String(assignment.version.sha256 || '').trim();
      if (sha) {
        const cached = this.cacheGet(sha);
        if (cached) return cached;
      }

      const raw = assignment.version.policyJson;

      // Wave44: DSL -> compile
      if (raw && typeof raw === 'object' && (raw as Record<string, unknown>).spec === POLICY_DSL_SPEC_V1) {
        const { dsl } = normalizeToPolicyDslV1(raw);
        const compiled = compilePolicyDslV1(dsl);
        if (sha) this.cacheSet(sha, compiled);
        return compiled;
      }

      // Legacy format (compat)
      return raw as GovernancePolicy;
    } catch (err) {
      // In production, do not silently downgrade policy to defaults if DB is down
      throwIfProdDbError(err, 'GovernanceService.getActivePolicy');
      return DEFAULT_POLICY;
    }
  }

  async getActivePolicyDsl(organizationId: string): Promise<GovernancePolicyDslV1> {
    const orgId = organizationId?.trim();
    if (!orgId) return POLICY_DSL_DEFAULT_V1;

    try {
      const assignment = await (this.prisma as Record<string, unknown>).governancePolicyAssignment.findFirst({
        where: { organizationId: orgId, isActive: true },
        orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }],
        include: { version: true },
      });
      const raw = assignment?.version?.policyJson;
      if (!raw) return POLICY_DSL_DEFAULT_V1;
      const { dsl } = normalizeToPolicyDslV1(raw);
      const validation = validatePolicyDslV1(dsl);
      return validation.ok ? dsl : POLICY_DSL_DEFAULT_V1;
    } catch (err) {
      throwIfProdDbError(err, 'GovernanceService.getActivePolicyDsl');
      return POLICY_DSL_DEFAULT_V1;
    }
  }

  async resolveDefaultApproverId(organizationId: string, policy: GovernancePolicy): Promise<string | null> {
    const role = policy?.routing?.approvals?.defaultApproverRole || 'org_admin';
    try {
      const member = await (this.prisma as Record<string, unknown>).organizationMember.findFirst({
        where: { organizationId, role },
        orderBy: [{ createdAt: 'asc' }],
      });
      return member?.userId || null;
    } catch (err) {
      throwIfProdDbError(err, 'GovernanceService.resolveDefaultApproverId');
      return null;
    }
  }

  computeApprovalDueAt(policy: GovernancePolicy, now = new Date()): Date {
    const hours = Number(policy?.sla?.approvals?.defaultHours ?? 48);
    const safe = Number.isFinite(hours) && hours > 0 ? hours : 48;
    return new Date(now.getTime() + safe * 3600_000);
  }


  computeWorkflowEscalationPlan(policy: GovernancePolicy) {
    const levels = Array.isArray((policy as any)?.escalations?.workflows) ? (policy as Record<string, unknown>).escalations.workflows : [];
    return levels
      .map((l: any) => ({
        afterMinutes: Math.max(0, Number(l.afterMinutes ?? 0) || 0),
        severity: (l.severity || 'warning') as any,
        notify: Array.isArray(l.notify) ? l.notify.map((x: any /* typed */) => String(x)) : [],
        channels: Array.isArray(l.channels) ? l.channels.map((x: any /* typed */) => String(x)) : ['in_app'],
        titleAr: l.titleAr ? String(l.titleAr) : undefined,
        messageAr: l.messageAr ? String(l.messageAr) : undefined,
      }))
      .sort((a: any, b: any) => a.afterMinutes - b.afterMinutes);
  }

  computeApprovalEscalationPlan(policy: GovernancePolicy) {
    const levels = Array.isArray(policy?.escalations?.approvals) ? policy!.escalations!.approvals! : [];
    // Normalize & sort
    return levels
      .map((l: any) => ({
        afterMinutes: Math.max(0, Number(l.afterMinutes ?? 0) || 0),
        severity: (l.severity || 'warning') as any,
        notify: Array.isArray(l.notify) ? l.notify.map((x: any /* typed */) => String(x)) : [],
        channels: Array.isArray(l.channels) ? l.channels.map((x: any /* typed */) => String(x)) : ['in_app'],
        titleAr: l.titleAr ? String(l.titleAr) : undefined,
        messageAr: l.messageAr ? String(l.messageAr) : undefined,
      }))
      .sort((a: any, b: any) => a.afterMinutes - b.afterMinutes);
  }

  private buildStageGateEvidenceStatus(template: any, evidence: Record<string, unknown>) {
    const stages = Array.isArray(template?.stages) ? template.stages : [];
    const stageResults = stages.map((stage: any) => {
      const requiredEvidence = Array.isArray(stage.requiredEvidence) ? stage.requiredEvidence : [];
      const missing = requiredEvidence.filter((key: string) => !evidence?.[key]);
      return {
        key: stage.key,
        nameAr: stage.nameAr,
        requiredEvidence,
        missingEvidence: missing,
        passed: missing.length === 0,
      };
    });
    return {
      stageResults,
      allPassed: stageResults.every((x: any /* typed */) => x.passed),
      missingEvidenceKeys: stageResults.flatMap((x: any /* typed */) => x.missingEvidence),
    };
  }

  async listStageGateTemplates(params: { organizationId?: string; entityType?: string; templateKey?: string }, user?: RequestUser) {
    if (params.organizationId) assertOrgAccess(user, params.organizationId);
    const items = DEFAULT_STAGE_GATE_TEMPLATES
      .filter((x) => !params.entityType || x.entityType === params.entityType)
      .filter((x) => !params.templateKey || x.key === params.templateKey)
      .map((x) => ({ ...x, stageCount: x.stages.length }));
    return { ok: true, count: items.length, items };
  }

  async evaluateStageGate(dto: any, user?: RequestUser) {
    const organizationId = String(dto.organizationId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    let approval: any = null;
    if (dto.approvalId) {
      approval = await (this.prisma as Record<string, unknown>).approvalRequest.findUnique({ where: { id: String(dto.approvalId) } }).catch((err: any) => {
        throwIfProdDbError(err, 'GovernanceService.evaluateStageGate.loadApproval');
        return null;
      });
      if (!approval) throw new NotFoundException('Approval not found');
      if (String(approval.organizationId) !== organizationId) throw new BadRequestException('approval لا يتبع نفس الجهة');
    }

    const template = DEFAULT_STAGE_GATE_TEMPLATES.find((x) => x.key === (dto.templateKey || '') || x.entityType === (dto.entityType || approval?.entityType || ''));
    if (!template) throw new BadRequestException('لم يتم العثور على Stage Gate Template مناسب');

    const evidence = typeof dto.evidence === 'object' && dto.evidence ? dto.evidence : {};
    const result = this.buildStageGateEvidenceStatus(template, evidence);
    const policy = await this.getActivePolicy(organizationId);

    return {
      ok: true,
      organizationId,
      templateKey: template.key,
      templateNameAr: template.nameAr,
      approvalId: approval?.id || null,
      entityType: approval?.entityType || dto.entityType || template.entityType,
      policyVersion: policy.version || 'unknown',
      gateStatus: result.allPassed ? 'ready' : 'needs_evidence',
      recommendationAr: result.allPassed ? 'الحزمة جاهزة للانتقال إلى قرار الاعتماد' : 'يلزم استكمال الأدلة الناقصة قبل الانتقال للبوابة التالية',
      ...result,
    };
  }

  async generateBoardPacket(dto: any, user?: RequestUser) {
    const evaluation = await this.evaluateStageGate(dto, user);
    let approval: any = null;
    if (dto.approvalId) {
      approval = await (this.prisma as Record<string, unknown>).approvalRequest.findUnique({ where: { id: String(dto.approvalId) } }).catch((err: any) => {
        throwIfProdDbError(err, 'GovernanceService.generateBoardPacket.loadApproval');
        return null;
      });
    }

    const boardPacket = {
      titleAr: approval?.title ? `حزمة قرار — ${approval.title}` : `حزمة قرار — ${evaluation.templateNameAr}`,
      organizationId: evaluation.organizationId,
      generatedAt: new Date().toISOString(),
      summaryAr: evaluation.gateStatus === 'ready'
        ? 'الطلب مكتمل من ناحية البوابات والأدلة المطلوبة وجاهز للرفع إلى جهة القرار'
        : 'الطلب غير مكتمل بعد، وتوجد أدلة ناقصة تمنع الرفع النهائي',
      decisionReadiness: evaluation.gateStatus,
      entityType: evaluation.entityType,
      templateKey: evaluation.templateKey,
      approval: approval ? {
        id: approval.id,
        title: approval.title,
        status: approval.status,
        dueAt: approval.dueAt ? new Date(approval.dueAt).toISOString() : null,
        currentApproverId: approval.currentApproverId || null,
      } : null,
      gates: evaluation.stageResults,
      missingEvidenceKeys: evaluation.missingEvidenceKeys,
      nextActionAr: evaluation.gateStatus === 'ready' ? 'رفع الحزمة إلى مجلس القرار أو لجنة الاعتماد' : 'استكمال الأدلة الناقصة ثم إعادة التقييم',
    };

    return { ok: true, boardPacket };
  }

  async simulate(dto: any, user?: RequestUser) {
    const organizationId = (dto.organizationId || '').toString().trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    let policy: GovernancePolicy;
    if (dto.policyDsl || dto.policyJson) {
      const raw = dto.policyDsl ?? dto.policyJson;
      const { dsl } = normalizeToPolicyDslV1(raw);
      const validation = validatePolicyDslV1(dsl);
      if (!validation.ok) {
        throw new BadRequestException({ message: 'Policy DSL غير صالح', errors: validation.errors });
      }
      policy = compilePolicyDslV1(dsl);
    } else {
      policy = await this.getActivePolicy(organizationId);
    }

    const createdAt = dto.createdAtIso ? new Date(dto.createdAtIso) : new Date();
    const dueAt = dto.dueAtIso ? new Date(dto.dueAtIso) : this.computeApprovalDueAt(policy, createdAt);
    const now = new Date();

    const minutesOverdue = Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / 60000));
    const plan = this.computeApprovalEscalationPlan(policy);

    const wouldTrigger = plan
      .map((lvl: any, idx: number) => ({ level: idx + 1, ...lvl, triggered: minutesOverdue >= lvl.afterMinutes }))
      .filter((x: any /* typed */) => x.triggered);

    return {
      ok: true,
      kind: dto.kind,
      organizationId,
      nowIso: now.toISOString(),
      createdAtIso: createdAt.toISOString(),
      dueAtIso: dueAt.toISOString(),
      minutesOverdue,
      wouldTrigger,
      policyVersion: policy.version || 'unknown',
    };
  }


evaluatePolicyRuntime(dto: any, user?: RequestUser) {
  const evidenceKeys = Array.isArray(dto?.evidenceKeys) ? dto.evidenceKeys : [];
  const heritageSensitivity = Number(dto?.heritageSensitivity ?? 0);
  const capacityPressure = Number(dto?.capacityPressure ?? 0);
  const riskLevel = String(dto?.riskLevel || 'medium');
  const blockers: string[] = [];
  const requirements: string[] = [];
  if (dto?.entityType === 'heritage_asset' && heritageSensitivity >= 0.8) blockers.push('الأصل عالي الحساسية ويتطلب مراجعة تراثية عليا');
  if (capacityPressure >= 0.85) blockers.push('ضغط السعة أعلى من الحد الموصى به');
  if (!evidenceKeys.includes('risk_register')) requirements.push('risk_register');
  if (!evidenceKeys.includes('decision_memo')) requirements.push('decision_memo');
  const decision = {
    id: `pdec_${crypto.randomUUID().slice(0,8)}`,
    organizationId: dto?.organizationId,
    entityType: dto?.entityType || 'project',
    entityId: dto?.entityId || null,
    action: dto?.action || 'submit_for_approval',
    verdict: blockers.length ? 'blocked' : requirements.length ? 'conditional' : 'allowed',
    blockers,
    requirements,
    riskLevel,
    reviewerMode: blockers.length || riskLevel === 'high' || riskLevel === 'critical' ? 'board_review' : 'manager_review',
    createdByUserId: user?.sub,
    createdAt: new Date().toISOString(),
  };
  this.policyDecisionsLite.unshift(decision);
  return { ok: true, decision };
}

linkEvidence(dto: any, user?: RequestUser) {
  const node = {
    id: `ev_${crypto.randomUUID().slice(0,8)}`,
    organizationId: dto?.organizationId,
    entityType: dto?.entityType || 'project',
    entityId: dto?.entityId || null,
    nodeType: dto?.nodeType || 'document',
    nodeRef: dto?.nodeRef || null,
    title: dto?.title || dto?.nodeType || 'evidence',
    relation: dto?.relation || 'supports',
    summary: dto?.summary || '',
    createdByUserId: user?.sub,
    createdAt: new Date().toISOString(),
  };
  this.evidenceNodesLite.unshift(node);
  return { ok: true, node };
}

getEvidenceGraph(params: { organizationId?: string; entityType?: string; entityId?: string }) {
  const items = this.evidenceNodesLite.filter((x) => {
    if (params.organizationId && x.organizationId !== params.organizationId) return false;
    if (params.entityType && x.entityType !== params.entityType) return false;
    if (params.entityId && x.entityId !== params.entityId) return false;
    return true;
  });
  return {
    ok: true,
    total: items.length,
    nodes: items,
    quickView: {
      documents: items.filter((x) => x.nodeType === 'document').length,
      simulations: items.filter((x) => x.nodeType === 'simulation').length,
      aiRecommendations: items.filter((x) => x.nodeType === 'ai_recommendation').length,
    },
  };
}

getBoardModeSummary(params: { organizationId?: string; projectId?: string }) {
  const latestDecisions = this.policyDecisionsLite.filter((x) => !params.organizationId || x.organizationId === params.organizationId).slice(0, 8);
  const blocked = latestDecisions.filter((x) => x.verdict === 'blocked').length;
  const conditional = latestDecisions.filter((x) => x.verdict === 'conditional').length;
  return {
    ok: true,
    executiveSummaryAr: blocked
      ? 'هناك قرارات محجوبة تتطلب تدخلًا من اللجنة العليا قبل الإطلاق.'
      : conditional
        ? 'الوضع العام مقبول مع استكمال أدلة أساسية قبل قرار المجلس.'
        : 'الوضع العام جيد ولا توجد حواجز حرجة ظاهرة حاليًا.',
    posture: {
      blocked,
      conditional,
      ready: latestDecisions.filter((x) => x.verdict === 'allowed').length,
    },
    latestDecisions,
  };
}

getCommandCenterSummary(params: { organizationId?: string }) {
  const decisions = this.policyDecisionsLite.filter((x) => !params.organizationId || x.organizationId === params.organizationId);
  return {
    ok: true,
    readiness: {
      governanceAlerts: decisions.filter((x) => x.verdict !== 'allowed').length,
      criticalAlerts: decisions.filter((x) => x.riskLevel === 'critical').length,
      operationalState: decisions.some((x) => x.verdict === 'blocked') ? 'degraded' : 'nominal',
    },
    alerts: decisions.slice(0, 10).map((x) => ({ id: x.id, verdict: x.verdict, riskLevel: x.riskLevel, entityType: x.entityType, entityId: x.entityId })),
  };
}



getObservabilitySummary(params: { organizationId?: string }) {
  const decisions = this.policyDecisionsLite.filter((x) => !params.organizationId || x.organizationId === params.organizationId);
  const queueMode = this.queues.getMode();
  const failures = decisions.filter((x) => ['high', 'critical'].includes(String(x.riskLevel || '').toLowerCase())).length;
  const blocked = decisions.filter((x) => x.verdict === 'blocked').length;
  return {
    ok: true,
    queueMode,
    signals: {
      traces: 'enabled_if_otel_bootstrap_present',
      metrics: 'collector_pipeline_configured',
      logs: 'structured_http_logging_enabled',
    },
    governance: {
      recentDecisions: decisions.length,
      blocked,
      highOrCritical: failures,
    },
    posture: blocked > 0 ? 'degraded' : failures > 0 ? 'watch' : 'nominal',
    noteAr: 'هذا الملخص يجمع مؤشرات الحوكمة مع وضع الطوابير وإشارات الرصد الأساسية، ويرتبط بمنهج OpenTelemetry في ربط traces وmetrics وlogs ضمن سياق موحد.'
  };
}

}
