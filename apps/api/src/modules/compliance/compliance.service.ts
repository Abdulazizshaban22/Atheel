import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { ApprovalsService } from '../approvals/approvals.service';
import { ObligationsService } from '../obligations/obligations.service';

function norm(s?: any) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function stableKey(parts: Array<string | number | null | undefined>) {
  return parts.map((p) => String(p ?? '')).join('|').toLowerCase().replace(/\s+/g, ' ').trim();
}

type ChecklistItemInput = {
  titleAr: string;
  descriptionAr?: string;
  required?: boolean;
  severity?: 'info' | 'warning' | 'critical';
  externalUrl?: string;
  dueAt?: Date | null;
  metaJson?: any;
};

@Injectable()
export class ComplianceService {
  private readinessProfilesMem: any[] = [];
  private aiTrustReportsMem: any[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
    private readonly obligations: ObligationsService,
  ) {}

  async listChecklists(params: { organizationId?: string; subjectType?: string; subjectId?: string; status?: string }, user?: RequestUser) {
    const organizationId = norm(params.organizationId || user?.activeOrgId || '');
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const rows = await (this.prisma as Record<string, unknown>).complianceChecklist
      .findMany({
        where: {
          organizationId,
          ...(params.subjectType ? { subjectType: params.subjectType } : {}),
          ...(params.subjectId ? { subjectId: params.subjectId } : {}),
          ...(params.status ? { status: params.status } : {}),
        },
        orderBy: [{ updatedAt: 'desc' }],
        include: { items: true },
        take: 200,
      })
      .catch(() => []);

    return { ok: true, count: rows.length, items: rows };
  }

  async getChecklist(id: string, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).complianceChecklist.findUnique({ where: { id }, include: { items: true } }).catch(() => null);
    if (!row) throw new BadRequestException('Checklist not found');
    assertOrgAccess(user, row.organizationId);
    return { ok: true, checklist: row };
  }

  async setItemStatus(checklistId: string, itemId: string, status: string, user?: RequestUser) {
    const chk = await (this.prisma as Record<string, unknown>).complianceChecklist.findUnique({ where: { id: checklistId } }).catch(() => null);
    if (!chk) throw new BadRequestException('Checklist not found');
    assertOrgAccess(user, chk.organizationId);

    const next = ['open', 'done', 'blocked', 'waived'].includes(String(status)) ? String(status) : 'open';
    const row = await (this.prisma as Record<string, unknown>).complianceChecklistItem.update({ where: { id: itemId }, data: { status: next } }).catch(() => null);
    return { ok: true, item: row };
  }

  async generateKsaEventLicensingChecklist(input: {
    organizationId?: string;
    subjectType: string;
    subjectId: string;
    region?: string;
    city?: string;
    eventFormat?: string;
    expectedAttendance?: number;
    hasFood?: boolean;
    usesAmplifiedSound?: boolean;
    includesFilming?: boolean;
  }, user?: RequestUser) {
    const organizationId = norm(input.organizationId || user?.activeOrgId || '');
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const subjectType = norm(input.subjectType);
    const subjectId = norm(input.subjectId);
    if (!subjectType || !subjectId) throw new BadRequestException('subjectType/subjectId مطلوب');

    const region = norm(input.region);
    const city = norm(input.city);
    const format = norm(input.eventFormat);

    const attendance = Math.max(0, Number(input.expectedAttendance ?? 0));

    // Saudi cultural licensing reference (Abde'a)
    const mocUrl = 'https://abdea.moc.gov.sa/';

    const items: ChecklistItemInput[] = [];

    items.push({
      titleAr: 'تحديد المجال الثقافي ونطاق النشاط',
      descriptionAr: 'حدد المجال: فعالية/معرض/ورشة/عرض… واربطه بوصف مختصر (الغرض، الجمهور، المدة).',
      required: true,
      severity: 'info',
    });

    items.push({
      titleAr: 'متطلبات منصة أبدع للتراخيص الثقافية (وزارة الثقافة)',
      descriptionAr: 'تحقق من الترخيص/التصريح المناسب للنشاط الثقافي، وجهّز بيانات المنشأة/الممارس وخطة الفعالية.',
      required: true,
      severity: 'critical',
      externalUrl: mocUrl,
      metaJson: { authority: 'moc_abdea' },
    });

    if (attendance >= 500) {
      items.push({
        titleAr: 'خطة إدارة الحشود ومسارات الإخلاء',
        descriptionAr: 'تعريف سعة الموقع، مخارج الطوارئ، نقاط التجمع، وإجراءات الإخلاء، مع مخطط واضح.',
        required: true,
        severity: attendance >= 5000 ? 'critical' : 'warning',
        metaJson: { attendance },
      });
    }

    items.push({
      titleAr: 'خطة السلامة والطوارئ والتواصل مع الجهات',
      descriptionAr: 'خطة إسعاف/إطفاء/طوارئ + أدوار الفريق + أرقام التواصل.',
      required: true,
      severity: 'warning',
    });

    if (input.hasFood) {
      items.push({
        titleAr: 'تصاريح الأغذية والممارسات الصحية',
        descriptionAr: 'إذا يوجد تقديم طعام/مشروبات: اشتراطات صحية، مورّدين معتمدين، وإدارة مخلفات.',
        required: true,
        severity: 'warning',
        metaJson: { hasFood: true },
      });
    }

    if (input.usesAmplifiedSound) {
      items.push({
        titleAr: 'التصاريح المتعلقة بالصوت والضوضاء (حسب الموقع)',
        descriptionAr: 'تأكد من حدود الصوت وساعات التشغيل حسب الجهة المحلية والموقع.',
        required: false,
        severity: 'info',
      });
    }

    if (input.includesFilming) {
      items.push({
        titleAr: 'تصريح تصوير/نشر (عند الحاجة)',
        descriptionAr: 'إذا سيتم التصوير/النشر: حدّد نوع المحتوى وحقوق استخدامه وموافقات المشاركين.',
        required: false,
        severity: 'info',
      });
    }

    if (region) {
      items.push({
        titleAr: `اشتراطات محلية للمنطقة: ${region}${city ? ` - ${city}` : ''}`,
        descriptionAr: 'تحقق من متطلبات الجهات المحلية (الأمانة/البلدية/إدارة الموقع) حسب نوع الفعالية.',
        required: true,
        severity: 'warning',
        metaJson: { region, city },
      });
    }

    // De-dup: key by organization+subject
    const checklistKey = stableKey(['ksa_licensing', organizationId, subjectType, subjectId]);

    const existing = await (this.prisma as Record<string, unknown>).complianceChecklist
      .findFirst({ where: { organizationId, subjectType, subjectId, authorityKey: 'moc_abdea' }, include: { items: true } })
      .catch(() => null);

    const titleAr = `قائمة متطلبات وتراخيص (السعودية) — ${format || subjectType}`;

    const checklist = await (this.prisma as Record<string, unknown>).complianceChecklist.upsert({
      where: { id: existing?.id || '___new___' },
      update: {
        titleAr,
        status: 'active',
        authorityKey: 'moc_abdea',
        externalRefUrl: mocUrl,
        metaJson: { ...(existing?.metaJson || {}), checklistKey, region: region || null, city: city || null, format: format || null, attendance },
      },
      create: {
        organizationId,
        subjectType,
        subjectId,
        titleAr,
        status: 'active',
        authorityKey: 'moc_abdea',
        externalRefUrl: mocUrl,
        metaJson: { checklistKey, region: region || null, city: city || null, format: format || null, attendance },
        createdByUserId: user?.sub || null,
      },
    }).catch(async () => {
      // Prisma upsert requires unique id; fallback: create new
      return (this.prisma as Record<string, unknown>).complianceChecklist.create({
        data: {
          organizationId,
          subjectType,
          subjectId,
          titleAr,
          status: 'active',
          authorityKey: 'moc_abdea',
          externalRefUrl: mocUrl,
          metaJson: { checklistKey, region: region || null, city: city || null, format: format || null, attendance },
          createdByUserId: user?.sub || null,
        },
      });
    });

    // Replace items (simple strategy)
    if (existing?.items?.length) {
      await (this.prisma as Record<string, unknown>).complianceChecklistItem.deleteMany({ where: { checklistId: checklist.id } }).catch(() => void 0);
    }
    for (const it of items) {
      await (this.prisma as Record<string, unknown>).complianceChecklistItem.create({
        data: {
          checklistId: checklist.id,
          titleAr: it.titleAr,
          descriptionAr: it.descriptionAr || null,
          required: it.required !== false,
          status: 'open',
          severity: it.severity || null,
          externalUrl: it.externalUrl || null,
          dueAt: it.dueAt || null,
          metaJson: it.metaJson || null,
        },
      }).catch(() => void 0);
    }

    // Create an approval draft to make the checklist reviewable in the approval system
    const approval = await this.approvals
      .create(
        {
          organizationId,
          entityType: 'licensing_checklist' as any,
          entityId: checklist.id,
          title: `اعتماد متطلبات وترخيص: ${format || subjectType}`,
          dueAt: null,
          contextDomain: 'licensing',
          contextRegion: region || null,
          payloadSnapshot: {
            checklistId: checklist.id,
            subjectType,
            subjectId,
            authorityKey: 'moc_abdea',
            externalRefUrl: mocUrl,
          },
        } as any,
        user,
      )
      .catch(() => null);

    const out = await (this.prisma as Record<string, unknown>).complianceChecklist.findUnique({ where: { id: checklist.id }, include: { items: true } }).catch(() => ({ ...checklist, items: [] }));

    return { ok: true, checklist: out, approval };
  }
  async listReadinessProfiles(organizationId: string, user?: RequestUser) {
    const orgId = norm(organizationId || user?.activeOrgId || '');
    if (!orgId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, orgId);
    const items = this.readinessProfilesMem.filter((x) => x.organizationId === orgId);
    return { ok: true, organizationId: orgId, count: items.length, items };
  }

  async listAiTrustReports(organizationId: string, user?: RequestUser) {
    const orgId = norm(organizationId || user?.activeOrgId || '');
    if (!orgId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, orgId);
    const items = this.aiTrustReportsMem.filter((x) => x.organizationId === orgId);
    return { ok: true, organizationId: orgId, count: items.length, items };
  }

  async runTenantHardeningCheck(tenantId: string, input: {
    organizationId?: string;
    enabledCapabilities?: string[];
    deploymentTier?: string;
    dataClassification?: string;
  }, user?: RequestUser) {
    const organizationId = norm(input.organizationId || user?.activeOrgId || '');
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const enabledCapabilities = Array.isArray(input.enabledCapabilities) ? input.enabledCapabilities.map(String) : [];
    const deploymentTier = norm(input.deploymentTier || 'enterprise');
    const dataClassification = norm(input.dataClassification || 'internal');

    const checks = [
      {
        key: 'identity_sessions',
        titleAr: 'الهوية والجلسات',
        status: enabledCapabilities.includes('core.identity') ? 'pass' : 'warn',
        messageAr: enabledCapabilities.includes('core.identity') ? 'تم تفعيل قدرات الهوية والجلسات.' : 'ينصح بتفعيل قدرات الهوية والجلسات قبل النشر المؤسسي.',
      },
      {
        key: 'ops_reliability',
        titleAr: 'الموثوقية والتشغيل',
        status: enabledCapabilities.includes('ops.reliability') ? 'pass' : 'warn',
        messageAr: enabledCapabilities.includes('ops.reliability') ? 'قدرات التشغيل والموثوقية مفعّلة.' : 'ينصح بتفعيل طبقة التشغيل والموثوقية للبيئات المؤسسية.',
      },
      {
        key: 'compliance_matrix',
        titleAr: 'الامتثال والمخاطر',
        status: enabledCapabilities.includes('compliance.matrix') ? 'pass' : 'warn',
        messageAr: enabledCapabilities.includes('compliance.matrix') ? 'طبقة الامتثال مفعّلة.' : 'ينصح بتفعيل طبقة الامتثال والمخاطر قبل الإطلاق الحكومي.',
      },
      {
        key: 'ai_governance',
        titleAr: 'حوكمة الذكاء الاصطناعي',
        status: enabledCapabilities.includes('ai.rag') ? 'review' : 'na',
        messageAr: enabledCapabilities.includes('ai.rag') ? 'مطلوب تقرير ثقة للذكاء الاصطناعي وإثباتات قياس ومراقبة.' : 'لا توجد قدرات ذكاء مفعّلة حاليًا.',
      },
      {
        key: 'data_classification',
        titleAr: 'تصنيف البيانات',
        status: ['restricted','confidential'].includes(dataClassification) ? 'review' : 'pass',
        messageAr: ['restricted','confidential'].includes(dataClassification) ? 'البيانات الحساسة تتطلب مراجعة ضوابط عزل إضافية.' : 'تصنيف البيانات لا يشير إلى ضوابط عزل استثنائية.',
      },
    ];

    const statusPriority: Record<string, number> = { fail: 4, review: 3, warn: 2, pass: 1, na: 0 };
    const overallStatus = checks.reduce((best, item) => statusPriority[item.status] > statusPriority[best] ? item.status : best, 'pass');
    const profile = {
      id: `rdy_${Date.now().toString(36)}`,
      tenantId,
      organizationId,
      deploymentTier,
      dataClassification,
      overallStatus,
      checks,
      createdAt: new Date().toISOString(),
    };
    const aiTrustReport = {
      id: `air_${Date.now().toString(36)}`,
      tenantId,
      organizationId,
      status: enabledCapabilities.includes('ai.rag') ? 'needs_measurement' : 'not_applicable',
      functions: enabledCapabilities.includes('ai.rag') ? ['govern', 'map', 'measure', 'manage'] : [],
      notesAr: enabledCapabilities.includes('ai.rag')
        ? 'عند تفعيل قدرات الذكاء يوصى بقياس المخرجات، مراقبة الانحراف، وتوثيق الضوابط التشغيلية.'
        : 'لا توجد قدرات ذكاء اصطناعي مفعلة ضمن هذا الفحص.',
      createdAt: new Date().toISOString(),
    };
    this.readinessProfilesMem.unshift(profile);
    this.aiTrustReportsMem.unshift(aiTrustReport);
    return { ok: true, readinessProfile: profile, aiTrustReport };
  }

}
