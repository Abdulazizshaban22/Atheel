import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { AttachmentsService } from '../attachments/attachments.service';

function isAdmin(user?: RequestUser) {
  return Boolean(user?.roles?.includes('org_admin') || user?.roles?.includes('super_admin'));
}


function uniqStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((x) => String(x || '').trim()).filter(Boolean)));
}

@Injectable()
export class HeritageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: AttachmentsService,
  ) {}

  private makePublicSlug(titleAr: string, id: string) {
    const base = String(titleAr || '').trim() || 'heritage';
    const cleaned = base
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      // keep Arabic letters/numbers and latin, remove other punctuation
      .replace(/[^0-9a-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\-]+/g, '')
      .replace(/\-+/g, '-')
      .replace(/^\-+|\-+$/g, '');
    const suffix = String(id || '').slice(-6);
    return `${cleaned || 'heritage'}-${suffix}`;
  }

  private async syncIiifManifest(asset: any) {
    if (!asset) return null;
    const orgId = String(asset.organizationId);
    const id = String(asset.id);

    const atts = await (this.prisma as Record<string, unknown>).attachment
      .findMany({ where: { organizationId: orgId, entityType: 'heritage_asset', entityId: id }, orderBy: { uploadedAt: 'asc' } })
      .catch(() => []);
    const attachmentIds = (atts || []).map((a: any) => String(a.id));

    const manifestId = `heritage_${id}`;
    const iiif = (this.prisma as Record<string, unknown>).iiifManifest;
    if (iiif?.upsert) {
      await iiif.upsert({
        where: { id: manifestId },
        update: {
          organizationId: orgId,
          labelAr: String(asset.titleAr || 'أصل تراثي'),
          labelEn: null,
          attachmentIds,
          fulltextAr: asset.fulltextAr ? String(asset.fulltextAr) : null,
          updatedAt: new Date(),
        },
        create: {
          id: manifestId,
          organizationId: orgId,
          labelAr: String(asset.titleAr || 'أصل تراثي'),
          labelEn: null,
          attachmentIds,
          fulltextAr: asset.fulltextAr ? String(asset.fulltextAr) : null,
        },
      });
    }

    // keep link on asset
    if (String(asset.iiifManifestId || '') !== manifestId) {
      await (this.prisma as Record<string, unknown>).heritageAsset.update({ where: { id }, data: { iiifManifestId: manifestId } }).catch(() => void 0);
    }
    return { manifestId, attachmentIdsCount: attachmentIds.length };
  }

  private async canReadAsset(asset: any, user?: RequestUser) {
    if (!asset) return false;
    const uid = String(user?.sub || '');
    const orgId = String(user?.activeOrgId || '');
    if (!orgId || orgId !== String(asset.organizationId)) return false;

    // Admins can read all.
    if (isAdmin(user)) return true;

    // Basic access levels
    const level = String(asset.accessLevel || 'internal');
    if (level === 'public') return true;
    if (level === 'internal') return true; // any org member
    if (level === 'researchers') {
      // require role analyst/curator/project_manager/content_editor etc
      const allowed = ['analyst','curator','project_manager','content_editor','org_admin','super_admin'];
      return (user?.roles || []).some((r) => allowed.includes(r));
    }
    // restricted: must satisfy accessPolicy.allowedUserIds or allowedRoles
    const policy = asset.accessPolicy || {};
    const allowedUserIds = Array.isArray(policy.allowedUserIds) ? policy.allowedUserIds.map(String) : [];
    const allowedRoles = Array.isArray(policy.allowedRoles) ? policy.allowedRoles.map(String) : [];
    if (allowedUserIds.includes(uid)) return true;
    if (allowedRoles.length && (user?.roles || []).some((r) => allowedRoles.includes(r))) return true;
    return false;
  }

  async list(params: { organizationId?: string }, user?: RequestUser) {
    const organizationId = String(params.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const rows = await (this.prisma as Record<string, unknown>).heritageAsset.findMany({
      where: { organizationId },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
      include: { protocols: true },
    });
    // Filter by access
    const visible: any[] = [];
    for (const r of rows) {
      if (await this.canReadAsset(r, user)) visible.push(r);
    }
    return { ok: true, organizationId, count: visible.length, items: visible };
  }

  async get(id: string, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).heritageAsset.findUnique({ where: { id }, include: { protocols: true } }).catch(() => null);
    if (!row) throw new NotFoundException('HeritageAsset not found');
    const ok = await this.canReadAsset(row, user);
    if (!ok) throw new ForbiddenException('لا تملك صلاحية عرض هذا الأصل');
    return { ok: true, asset: row };
  }

  async create(dto: any, user?: RequestUser) {
    const organizationId = String(dto.organizationId || user?.activeOrgId || '').trim();
    if (!organizationId) throw new BadRequestException('organizationId مطلوب');
    assertOrgAccess(user, organizationId);

    const createdById = String(user?.sub || '').trim();
    if (!createdById) throw new BadRequestException('user مطلوب');

    const created = await (this.prisma as Record<string, unknown>).heritageAsset.create({
      data: {
        organizationId,
        createdById,
        titleAr: String(dto.titleAr || '').trim(),
        descriptionAr: dto.descriptionAr ? String(dto.descriptionAr) : null,
        fulltextAr: dto.fulltextAr ? String(dto.fulltextAr) : null,
        assetType: dto.assetType,
        region: dto.region ? String(dto.region) : null,
        city: dto.city ? String(dto.city) : null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        accessLevel: dto.accessLevel || 'internal',
        accessPolicy: dto.accessPolicy || null,
        status: 'draft',
      },
    });

    // Link attachments if provided
    const ids = Array.isArray(dto.attachmentIds) ? dto.attachmentIds.map(String).filter(Boolean) : [];
    for (const attId of ids) {
      await this.attachments.link(attId, { organizationId, entityType: 'heritage_asset', entityId: created.id }, createdById).catch(() => void 0);
    }

    return { ok: true, asset: created };
  }

  async update(id: string, dto: any, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).heritageAsset.findUnique({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('HeritageAsset not found');
    assertOrgAccess(user, String(row.organizationId));
    // Non-admin can only update drafts they created
    if (!isAdmin(user) && String(row.createdById) !== String(user?.sub || '')) {
      throw new ForbiddenException('لا تملك صلاحية تعديل هذا الأصل');
    }

    // Restrict publishing + publicSlug changes to admins only
    const wantsPublish = dto.status === 'published';
    if ((dto.publicSlug !== undefined || wantsPublish) && !isAdmin(user)) {
      throw new ForbiddenException('يتطلب صلاحية مدير الجهة');
    }

    const nextStatus = dto.status !== undefined ? String(dto.status) : String(row.status || 'draft');
    const nextAccess = dto.accessLevel !== undefined ? String(dto.accessLevel) : String(row.accessLevel || 'internal');
    const shouldHavePublicSlug = nextStatus === 'published' && nextAccess === 'public';

    const publicSlug = shouldHavePublicSlug
      ? (dto.publicSlug ? String(dto.publicSlug) : (row.publicSlug ? String(row.publicSlug) : this.makePublicSlug(dto.titleAr ?? row.titleAr, id)))
      : (dto.publicSlug !== undefined ? null : row.publicSlug);

    const updated = await (this.prisma as Record<string, unknown>).heritageAsset.update({
      where: { id },
      data: {
        ...(dto.titleAr !== undefined ? { titleAr: String(dto.titleAr) } : {}),
        ...(dto.descriptionAr !== undefined ? { descriptionAr: dto.descriptionAr ? String(dto.descriptionAr) : null } : {}),
        ...(dto.fulltextAr !== undefined ? { fulltextAr: dto.fulltextAr ? String(dto.fulltextAr) : null } : {}),
        ...(dto.assetType !== undefined ? { assetType: dto.assetType } : {}),
        ...(dto.region !== undefined ? { region: dto.region ? String(dto.region) : null } : {}),
        ...(dto.city !== undefined ? { city: dto.city ? String(dto.city) : null } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.accessLevel !== undefined ? { accessLevel: dto.accessLevel } : {}),
        ...(dto.accessPolicy !== undefined ? { accessPolicy: dto.accessPolicy || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(shouldHavePublicSlug ? { publicSlug } : (dto.publicSlug !== undefined ? { publicSlug: null } : {})),
        ...(wantsPublish ? { publishedAt: new Date() } : {}),
      },
    });

    // Attachments linking (best-effort)
    const ids = Array.isArray(dto.attachmentIds) ? dto.attachmentIds.map(String).filter(Boolean) : [];
    for (const attId of ids) {
      await this.attachments.link(attId, { organizationId: String(updated.organizationId), entityType: 'heritage_asset', entityId: updated.id }, String(user?.sub || '')).catch(() => void 0);
    }

    // If published and public => sync IIIF manifest to enable public portal
    if (String(updated.status) === 'published' && String(updated.accessLevel) === 'public') {
      await this.syncIiifManifest(updated).catch(() => void 0);
    }
    return { ok: true, asset: updated };
  }

  private defaultSafetyProfile(asset: any) {
    const assetType = String(asset?.assetType || 'material');
    const baseByType: Record<string, unknown> = {
      architectural: {
        sensitivityLevel: 'high',
        visitorCapacityPerDay: 800,
        visitorCapacityPerHour: 120,
        requiredControls: ['مسار دخول/خروج واضح', 'مراقبة كثافة الزوار', 'منع التدخلات المادية غير المعتمدة'],
        restrictedActivities: ['أعمال تثبيت ثقيلة', 'مؤثرات حرارية أو لهبية', 'أحمال اهتزازية عالية'],
        allowedExperienceTypes: ['route', 'exhibition', 'museum'],
        blockedExperienceTypes: ['food_culture'],
      },
      immaterial: {
        sensitivityLevel: 'medium',
        visitorCapacityPerDay: 3000,
        visitorCapacityPerHour: 500,
        requiredControls: ['توثيق الممارسات', 'إشراك الحاملين للموروث', 'منع التشويه السردي'],
        restrictedActivities: ['إعادة تمثيل مسيئة', 'استخدام تجاري مضلل'],
        allowedExperienceTypes: ['event', 'exhibition', 'route', 'museum', 'food_culture'],
        blockedExperienceTypes: [],
      },
      material: {
        sensitivityLevel: 'medium',
        visitorCapacityPerDay: 1200,
        visitorCapacityPerHour: 200,
        requiredControls: ['خطة مناولة وحماية', 'توثيق قبل/بعد الاستخدام'],
        restrictedActivities: ['ملامسة مباشرة غير محكومة', 'تخزين مؤقت غير مراقب'],
        allowedExperienceTypes: ['exhibition', 'museum', 'route'],
        blockedExperienceTypes: [],
      },
    };
    const profile = baseByType[assetType] || baseByType.material;
    return {
      assetType,
      sensitivityLevel: profile.sensitivityLevel,
      visitorCapacityPerDay: profile.visitorCapacityPerDay,
      visitorCapacityPerHour: profile.visitorCapacityPerHour,
      restrictedActivities: profile.restrictedActivities,
      requiredControls: profile.requiredControls,
      allowedExperienceTypes: profile.allowedExperienceTypes,
      blockedExperienceTypes: profile.blockedExperienceTypes,
      conservationNotesAr: null,
      meta: {},
    };
  }

  private resolveSafetyProfile(asset: any) {
    const defaults = this.defaultSafetyProfile(asset);
    const saved = asset?.accessPolicy && typeof asset.accessPolicy === 'object' ? (asset.accessPolicy as Record<string, unknown>).safetyProfile : null;
    const merged = { ...defaults, ...(saved || {}) };
    return {
      assetId: String(asset.id),
      organizationId: String(asset.organizationId),
      titleAr: String(asset.titleAr || ''),
      status: String(asset.status || 'draft'),
      accessLevel: String(asset.accessLevel || 'internal'),
      profile: {
        assetType: String(merged.assetType || defaults.assetType),
        sensitivityLevel: ['low','medium','high','critical'].includes(String(merged.sensitivityLevel)) ? String(merged.sensitivityLevel) : defaults.sensitivityLevel,
        visitorCapacityPerDay: Number(merged.visitorCapacityPerDay || defaults.visitorCapacityPerDay),
        visitorCapacityPerHour: Number(merged.visitorCapacityPerHour || defaults.visitorCapacityPerHour),
        restrictedActivities: uniqStrings(merged.restrictedActivities || defaults.restrictedActivities),
        requiredControls: uniqStrings(merged.requiredControls || defaults.requiredControls),
        allowedExperienceTypes: uniqStrings(merged.allowedExperienceTypes || defaults.allowedExperienceTypes),
        blockedExperienceTypes: uniqStrings(merged.blockedExperienceTypes || defaults.blockedExperienceTypes),
        conservationNotesAr: merged.conservationNotesAr ? String(merged.conservationNotesAr) : null,
        meta: merged.meta && typeof merged.meta === 'object' ? merged.meta : {},
      },
    };
  }

  async getSafetyProfile(id: string, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).heritageAsset.findUnique({ where: { id }, include: { protocols: true } }).catch(() => null);
    if (!row) throw new NotFoundException('HeritageAsset not found');
    const ok = await this.canReadAsset(row, user);
    if (!ok) throw new ForbiddenException('لا تملك صلاحية عرض هذا الأصل');
    const safety = this.resolveSafetyProfile(row);
    return { ok: true, ...safety, protocolCount: Array.isArray(row.protocols) ? row.protocols.length : 0 };
  }

  async updateSafetyProfile(id: string, dto: any, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).heritageAsset.findUnique({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('HeritageAsset not found');
    assertOrgAccess(user, String(row.organizationId));
    if (!isAdmin(user) && String(row.createdById) !== String(user?.sub || '')) {
      throw new ForbiddenException('لا تملك صلاحية تعديل ملف السلامة لهذا الأصل');
    }

    const current = this.resolveSafetyProfile(row).profile;
    const next = {
      ...current,
      ...(dto.sensitivityLevel !== undefined ? { sensitivityLevel: String(dto.sensitivityLevel) } : {}),
      ...(dto.visitorCapacityPerDay !== undefined ? { visitorCapacityPerDay: Number(dto.visitorCapacityPerDay) } : {}),
      ...(dto.visitorCapacityPerHour !== undefined ? { visitorCapacityPerHour: Number(dto.visitorCapacityPerHour) } : {}),
      ...(dto.restrictedActivities !== undefined ? { restrictedActivities: uniqStrings(dto.restrictedActivities) } : {}),
      ...(dto.requiredControls !== undefined ? { requiredControls: uniqStrings(dto.requiredControls) } : {}),
      ...(dto.allowedExperienceTypes !== undefined ? { allowedExperienceTypes: uniqStrings(dto.allowedExperienceTypes) } : {}),
      ...(dto.blockedExperienceTypes !== undefined ? { blockedExperienceTypes: uniqStrings(dto.blockedExperienceTypes) } : {}),
      ...(dto.conservationNotesAr !== undefined ? { conservationNotesAr: dto.conservationNotesAr ? String(dto.conservationNotesAr) : null } : {}),
      ...(dto.meta !== undefined ? { meta: dto.meta && typeof dto.meta === 'object' ? dto.meta : {} } : {}),
    };

    const accessPolicy = row.accessPolicy && typeof row.accessPolicy === 'object' ? { ...(row.accessPolicy as any) } : {};
    accessPolicy['safetyProfile'] = next;

    const updated = await (this.prisma as Record<string, unknown>).heritageAsset.update({
      where: { id },
      data: { accessPolicy },
    });

    return { ok: true, assetId: String(updated.id), safetyProfile: next };
  }

  async runSafetyAssessment(id: string, dto: any, user?: RequestUser) {
    const row = await (this.prisma as Record<string, unknown>).heritageAsset.findUnique({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('HeritageAsset not found');
    const ok = await this.canReadAsset(row, user);
    if (!ok) throw new ForbiddenException('لا تملك صلاحية تقييم هذا الأصل');

    let derivedExperienceType = dto.experienceType ? String(dto.experienceType) : undefined;
    let experience: any = null;
    if (dto.experienceId) {
      experience = await (this.prisma as Record<string, unknown>).visitorExperience?.findUnique?.({ where: { id: String(dto.experienceId) } }).catch(() => null);
      if (experience?.projectId) {
        const project = await (this.prisma as Record<string, unknown>).project?.findUnique?.({ where: { id: String(experience.projectId) } }).catch(() => null);
        if (project) assertOrgAccess(user, String(project.organizationId));
      }
      if (!derivedExperienceType && experience?.experienceType) derivedExperienceType = String(experience.experienceType);
    }

    const safety = this.resolveSafetyProfile(row).profile;
    const expectedVisitors = Math.max(0, Number(dto.expectedVisitors || 0));
    const peakVisitorsPerHour = Math.max(0, Number(dto.peakVisitorsPerHour || 0));
    const activities = uniqStrings(dto.activities);
    const controlsProvided = uniqStrings(dto.controlsProvided);
    const blockedActivities = activities.filter((x) => safety.restrictedActivities.includes(x));
    const missingControls = safety.requiredControls.filter((x) => !controlsProvided.includes(x));
    const loadRatioDay = safety.visitorCapacityPerDay > 0 ? expectedVisitors / safety.visitorCapacityPerDay : 0;
    const loadRatioHour = safety.visitorCapacityPerHour > 0 ? peakVisitorsPerHour / safety.visitorCapacityPerHour : 0;
    const typeBlocked = Boolean(derivedExperienceType && (safety.blockedExperienceTypes.includes(derivedExperienceType) || (safety.allowedExperienceTypes.length && !safety.allowedExperienceTypes.includes(derivedExperienceType))));

    let score = 0;
    const findings: Array<{ code: string; severity: 'info' | 'warning' | 'critical'; messageAr: string }> = [];
    const addFinding = (code: string, severity: 'info' | 'warning' | 'critical', messageAr: string, points: number) => {
      findings.push({ code, severity, messageAr });
      score += points;
    };

    const sensitivityBase: Record<string, number> = { low: 5, medium: 12, high: 20, critical: 28 };
    score += sensitivityBase[String(safety.sensitivityLevel)] || 12;

    if (typeBlocked) addFinding('experience_type_blocked', 'critical', 'نوع التجربة غير مناسب لهذا الأصل التراثي وفق ملف السلامة.', 30);
    if (blockedActivities.length) addFinding('restricted_activities', 'critical', `تتضمن الخطة أنشطة مقيّدة: ${blockedActivities.join('، ')}`, 28);
    if (loadRatioDay > 1) addFinding('daily_capacity_exceeded', 'critical', 'عدد الزوار المتوقع يتجاوز السعة اليومية الموصى بها.', 24);
    else if (loadRatioDay > 0.8) addFinding('daily_capacity_high', 'warning', 'عدد الزوار المتوقع قريب من الحد اليومي الموصى به.', 12);
    if (loadRatioHour > 1) addFinding('hourly_capacity_exceeded', 'critical', 'الذروة المتوقعة تتجاوز السعة الساعة الموصى بها.', 24);
    else if (loadRatioHour > 0.8) addFinding('hourly_capacity_high', 'warning', 'الذروة المتوقعة قريبة من الحد الآمن للساعة.', 12);
    if (missingControls.length) addFinding('missing_controls', missingControls.length >= 2 ? 'critical' : 'warning', `ضوابط ناقصة: ${missingControls.join('، ')}`, 10 + missingControls.length * 4);
    if (!findings.length) addFinding('safe_baseline', 'info', 'لا توجد مؤشرات خطر رئيسية وفق المدخلات الحالية.', 0);

    const normalized = Math.max(0, Math.min(100, Math.round(score)));
    const riskLevel = normalized >= 70 ? 'critical' : normalized >= 45 ? 'high' : normalized >= 20 ? 'medium' : 'low';
    const recommendation = riskLevel === 'critical'
      ? 'إيقاف الاعتماد مؤقتًا حتى تخفيض الحمل الزائري وإغلاق جميع المخاطر الحرجة.'
      : riskLevel === 'high'
        ? 'المضي مشروطًا بخطة تحكم واضحة وموافقة تراثية إضافية.'
        : riskLevel === 'medium'
          ? 'يمكن المضي مع مراقبة تشغيلية وضبط الذروة والأنشطة.'
          : 'المخاطر ضمن الحد المقبول ويمكن المتابعة مع المراقبة الروتينية.';

    return {
      ok: true,
      assetId: String(row.id),
      titleAr: String(row.titleAr || ''),
      safetyProfile: safety,
      input: {
        experienceId: dto.experienceId ? String(dto.experienceId) : null,
        experienceType: derivedExperienceType || null,
        expectedVisitors,
        peakVisitorsPerHour,
        activities,
        controlsProvided,
      },
      assessment: {
        riskScore: normalized,
        riskLevel,
        recommendationAr: recommendation,
        findings,
        metrics: {
          loadRatioDay: Number(loadRatioDay.toFixed(4)),
          loadRatioHour: Number(loadRatioHour.toFixed(4)),
          blockedActivitiesCount: blockedActivities.length,
          missingControlsCount: missingControls.length,
        },
      },
      experience: experience ? { id: String(experience.id), titleAr: String(experience.titleAr || ''), experienceType: String(experience.experienceType || '') } : null,
    };
  }

  async addProtocol(assetId: string, dto: any, user?: RequestUser) {
    const asset = await (this.prisma as Record<string, unknown>).heritageAsset.findUnique({ where: { id: assetId } }).catch(() => null);
    if (!asset) throw new NotFoundException('HeritageAsset not found');
    assertOrgAccess(user, String(asset.organizationId));
    if (!isAdmin(user)) throw new ForbiddenException('يتطلب صلاحية مدير الجهة');

    const created = await (this.prisma as Record<string, unknown>).heritageAccessProtocol.create({
      data: { heritageAssetId: assetId, nameAr: String(dto.nameAr || '').trim(), rulesJson: dto.rulesJson || {} },
    });
    return { ok: true, protocol: created };
  }
}
