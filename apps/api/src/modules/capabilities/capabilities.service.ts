import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { throwIfProdDbError } from '../../common/db-fallback';

export type CapabilityPackItem = {
  code: string;
  nameAr: string;
  domain: 'core' | 'culture' | 'heritage' | 'ops' | 'ai' | 'twin' | 'compliance' | 'radar' | 'integration' | 'other';
  descriptionAr: string;
  modules: string[];
  requires?: string[];
  defaultEnabled?: boolean;
};

const STATIC_CATALOG: CapabilityPackItem[] = [
  {
    code: 'core.identity',
    nameAr: 'الهوية والجلسات والسياسات',
    domain: 'core',
    descriptionAr: 'تسجيل الدخول والجلسات متعددة الأجهزة وسياسات الصلاحيات والتدقيق.',
    modules: ['auth', 'users', 'governance', 'audit-logs'],
    defaultEnabled: true,
  },
  {
    code: 'core.projects',
    nameAr: 'المشاريع والمساحات',
    domain: 'core',
    descriptionAr: 'إدارة المشاريع والمساحات التشغيلية وربطها بالمحتوى والتجارب.',
    modules: ['projects', 'workspaces'],
    defaultEnabled: true,
  },
  {
    code: 'culture.content',
    nameAr: 'المحتوى والسرد',
    domain: 'culture',
    descriptionAr: 'إدارة المحتوى الثقافي والسرديات والوثائق وإسنادها للمشاريع.',
    modules: ['content', 'narratives', 'documentation', 'stories'],
    defaultEnabled: true,
  },
  {
    code: 'culture.experiences',
    nameAr: 'التجارب ودليل الزائر',
    domain: 'culture',
    descriptionAr: 'تصميم التجارب الثقافية ومسارات الزوار ودليل الزائر.',
    modules: ['experiences', 'visitor-guide'],
    defaultEnabled: true,
  },
  {
    code: 'twin.digital',
    nameAr: 'التوأم ومحاكاة التدفق',
    domain: 'twin',
    descriptionAr: 'تمثيل التجربة كنقاط وروابط ومحاكاة سيناريوهات تدفق الزوار.',
    modules: ['twin', 'twinspec'],
  },
  {
    code: 'ai.rag',
    nameAr: 'الذكاء والاسترجاع المعرفي',
    domain: 'ai',
    descriptionAr: 'مساعد محتوى + RAG + تقييم جودة الاسترجاع مع سياسات حقن المعرفة.',
    modules: ['ai', 'knowledge-packs', 'research'],
    requires: ['VLLM_BASE_URL (اختياري)'],
  },
  {
    code: 'ops.reliability',
    nameAr: 'العمليات والموثوقية',
    domain: 'ops',
    descriptionAr: 'حوادث وتشغيل تلقائي ومؤشرات SLO وتنبيهات و Outbox.',
    modules: ['ops', 'incidents', 'outbox', 'operational-events', 'metrics'],
    requires: ['REDIS_URL'],
  },
  {
    code: 'compliance.matrix',
    nameAr: 'الامتثال والمخاطر',
    domain: 'compliance',
    descriptionAr: 'مصفوفة امتثال وتحويلها إلى التزامات وتذكيرات ومخاطر.',
    modules: ['compliance', 'obligations', 'risks'],
    requires: ['REDIS_URL (للتذكيرات)'],
  },
  {
    code: 'heritage.assets',
    nameAr: 'الأصول التراثية والبوابة العامة',
    domain: 'heritage',
    descriptionAr: 'سجل أصول تراثية مع سياسات وصول وبوابة نشر عامة.',
    modules: ['heritage', 'public-heritage', 'heritage-memory'],
  },
  {
    code: 'heritage.iiif',
    nameAr: 'عرض IIIF والبحث داخل الأصول',
    domain: 'heritage',
    descriptionAr: 'تمكين عارض IIIF والبحث داخل المحتوى وإرجاع مقتطفات.',
    modules: ['iiif'],
  },
  {
    code: 'radar.signals',
    nameAr: 'الرادار والإشارات',
    domain: 'radar',
    descriptionAr: 'مسح مصادر وإشارات وربطها بالمنافسات والتحليل.',
    modules: ['radar', 'official'],
    requires: ['REDIS_URL (للمسح المجدول)'],
  },
];

export type EditionDefinition = {
  code: string;
  nameAr: string;
  targetAr: string;
  capabilities: string[];
  descriptionAr: string;
};

const STATIC_EDITIONS: EditionDefinition[] = [
  {
    code: 'heritage_edition',
    nameAr: 'نسخة التراث',
    targetAr: 'الجهات المالكة والمشغلة للأصول التراثية',
    capabilities: ['core.identity', 'core.projects', 'culture.content', 'culture.experiences', 'heritage.assets', 'heritage.iiif', 'compliance.matrix'],
    descriptionAr: 'تركيز على الأصول التراثية، المحتوى، الامتثال، ودليل الزائر.',
  },
  {
    code: 'destination_edition',
    nameAr: 'نسخة الوجهة',
    targetAr: 'الوجهات والمواسم الثقافية والسياحية',
    capabilities: ['core.identity', 'core.projects', 'culture.content', 'culture.experiences', 'twin.digital', 'ai.rag', 'ops.reliability', 'compliance.matrix'],
    descriptionAr: 'تركيز على برمجة الوجهة، التوأم، الذكاء، والعمليات.',
  },
  {
    code: 'mega_event_edition',
    nameAr: 'نسخة الفعالية الكبرى',
    targetAr: 'الفعاليات الكبرى والمعارض والمعارض المؤقتة',
    capabilities: ['core.identity', 'core.projects', 'culture.experiences', 'ops.reliability', 'compliance.matrix', 'twin.digital'],
    descriptionAr: 'تركيز على التشغيل، التدفق، السلامة، والجاهزية.',
  },
  {
    code: 'exhibition_edition',
    nameAr: 'نسخة المعرض',
    targetAr: 'المعارض والمتاحف المؤقتة والدائمة',
    capabilities: ['core.identity', 'core.projects', 'culture.content', 'culture.experiences', 'heritage.assets'],
    descriptionAr: 'تركيز على المحتوى والسرد والتجربة داخل المعرض.',
  },
];

@Injectable()
export class CapabilitiesService {
  private editionAssignmentsMem: any[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async catalog(): Promise<CapabilityPackItem[]> {
    // Prefer DB-defined catalog when available (allows org-specific enablement)
    try {
      const rows = await (this.prisma as Record<string, unknown>).capabilityPack?.findMany?.({ orderBy: [{ code: 'asc' }] });
      if (Array.isArray(rows) && rows.length) {
        return rows.map((r: any) => ({
          code: String(r.code),
          nameAr: String(r.nameAr || r.code),
          domain: (String(r.domain || 'other') as any),
          descriptionAr: String(r.descriptionAr || ''),
          modules: Array.isArray(r.modules) ? r.modules.map(String) : (r.manifest?.modules ? [].concat(r.manifest.modules).map(String) : []),
          requires: r.requires ? [].concat(r.requires).map(String) : undefined,
          defaultEnabled: Boolean(r.defaultEnabled),
        }));
      }
    } catch (err) {
      throwIfProdDbError(err, 'CapabilitiesService.catalog');
    }

    return STATIC_CATALOG;
  }

  async listForOrg(organizationId: string) {
    const catalog = await this.catalog();

    try {
      const rows = await (this.prisma as Record<string, unknown>).organizationCapability?.findMany?.({
        where: { organizationId },
        include: { pack: true },
        orderBy: [{ updatedAt: 'desc' }],
      });

      const byCode = new Map<string, any>();
      for (const r of (rows || [])) {
        const code = String(r?.pack?.code || r?.packCode || '');
        if (!code) continue;
        byCode.set(code, r);
      }

      return catalog.map((p) => {
        const row = byCode.get(p.code);
        return {
          ...p,
          enabled: row ? Boolean(row.isEnabled) : Boolean(p.defaultEnabled),
          config: row?.config || null,
          updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        };
      });
    } catch (err) {
      throwIfProdDbError(err, 'CapabilitiesService.listForOrg');
      // Dev fallback: assume defaults
      return catalog.map((p) => ({ ...p, enabled: Boolean(p.defaultEnabled), config: null, updatedAt: null }));
    }
  }

  async setForOrg(organizationId: string, dto: { packCode: string; enabled: boolean; config?: any }, actorUserId?: string | null) {
    const code = String(dto.packCode || '').trim();
    if (!code) return { ok: false, message: 'packCode مطلوب' };

    const now = new Date();
    try {
      // Ensure pack exists (upsert)
      const pack = await (this.prisma as Record<string, unknown>).capabilityPack.upsert({
        where: { code },
        update: { updatedAt: now },
        create: {
          code,
          nameAr: code,
          domain: 'other',
          descriptionAr: '',
          modules: [],
          defaultEnabled: false,
          manifest: { createdBy: actorUserId || null },
        },
      });

      const row = await (this.prisma as Record<string, unknown>).organizationCapability.upsert({
        where: { organizationId_packId: { organizationId, packId: pack.id } },
        update: { isEnabled: Boolean(dto.enabled), config: dto.config || null, updatedAt: now, updatedByUserId: actorUserId || null },
        create: { organizationId, packId: pack.id, isEnabled: Boolean(dto.enabled), config: dto.config || null, enabledAt: dto.enabled ? now : null, updatedByUserId: actorUserId || null },
      });

      return { ok: true, packCode: code, enabled: Boolean(row.isEnabled) };
    } catch (err) {
      throwIfProdDbError(err, 'CapabilitiesService.setForOrg');
      // Dev fallback: no persistence
      return { ok: true, packCode: code, enabled: Boolean(dto.enabled), note: 'Dev fallback: no persistence (Prisma models not migrated yet).' };
    }
  }
  listEditions(): EditionDefinition[] {
    return STATIC_EDITIONS;
  }

  async getEditionCapabilities(code: string) {
    const edition = STATIC_EDITIONS.find((x) => x.code === code);
    if (!edition) return { ok: false, reason: 'edition_not_found' };
    const catalog = await this.catalog();
    const capabilities = catalog.filter((x) => edition.capabilities.includes(x.code));
    return { ok: true, edition, capabilities };
  }

  async assignEdition(organizationId: string, dto: { editionCode: string; metadata?: any }, actorUserId?: string | null) {
    const edition = STATIC_EDITIONS.find((x) => x.code === dto.editionCode);
    if (!edition) return { ok: false, message: 'editionCode غير معروف' };

    const applied: any[] = [];
    for (const code of edition.capabilities) {
      const res = await this.setForOrg(organizationId, { packCode: code, enabled: true }, actorUserId || null);
      applied.push(res);
    }
    const assignment = {
      id: `edt_${Date.now().toString(36)}`,
      organizationId,
      editionCode: edition.code,
      metadata: dto.metadata || null,
      appliedCapabilityCount: applied.filter((x) => x?.ok).length,
      createdAt: new Date().toISOString(),
    };
    this.editionAssignmentsMem.unshift(assignment);
    return { ok: true, edition, assignment, applied };
  }

}
