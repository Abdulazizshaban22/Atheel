import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { ContentItem } from '@madar/shared';
import { throwIfProdDbError } from '../../common/db-fallback';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

type GuidePersona = VisitorGuideRecord['persona'];
type GuideLanguage = VisitorGuideRecord['languageCode'];

type ContentLookupRecord = Pick<ContentItem, 'id' | 'title' | 'languageCode' | 'contentType' | 'status' | 'summary' | 'organizationId' | 'projectId'>;
type VisitorExperienceLookupRecord = {
  id: string;
  projectId: string;
  titleAr: string;
  twinId?: string | null;
};
type ProjectLookupRecord = { id: string; organizationId?: string | null };
type VisitorGuideLookupRecord = VisitorGuideRecord & { createdAt?: string; updatedAt?: string };
type TwinNodeLookupRecord = Pick<TwinNodeRecord, 'kind' | 'nameAr'> & { updatedAt?: string };

interface VisitorGuidePrismaFacade {
  visitorGuide: {
    findMany(args: { where: { experienceId?: string }; orderBy: { updatedAt: 'desc' }; take: number }): Promise<VisitorGuideLookupRecord[]>;
    findUnique(args: { where: { id: string } }): Promise<VisitorGuideLookupRecord | null>;
    create(args: { data: Record<string, unknown> }): Promise<VisitorGuideLookupRecord>;
  };
  contentItem: {
    findMany(args: { where: { id: { in: string[] } } }): Promise<ContentLookupRecord[]>;
    create(args: { data: Record<string, unknown> }): Promise<ContentLookupRecord>;
  };
  visitorExperience: {
    findUnique(args: { where: { id: string } }): Promise<VisitorExperienceLookupRecord | null>;
  };
  project: {
    findUnique(args: { where: { id: string } }): Promise<ProjectLookupRecord | null>;
  };
  twinNode: {
    findMany(args: { where: { twinId: string }; orderBy: { updatedAt: 'desc' } }): Promise<TwinNodeLookupRecord[]>;
  };
}

@Injectable()
export class VisitorGuideService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async list(experienceId?: string) {
    try {
      const items = await this.prismaClient.visitorGuide.findMany({
        where: { experienceId: experienceId || undefined },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
      return { returned: items.length, items };
    } catch (err) {
      throwIfProdDbError(err, 'VisitorGuideService.list');
      const items = await this.prisma.visitorGuide.findMany({ where: { experienceId } });
      return { returned: items.length, items: items.slice(0, 200), note: 'fallback_in_memory' };
    }
  }

  async get(id: string) {
    try {
      const item = await this.prismaClient.visitorGuide.findUnique({ where: { id } });
      if (!item) throw new NotFoundException('Guide not found');
      const content = item.contentItemIds.length
        ? await this.prismaClient.contentItem.findMany({ where: { id: { in: item.contentItemIds } } })
        : [];
      return { ...item, content };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwIfProdDbError(err, 'VisitorGuideService.get');
      const item = await this.prisma.visitorGuide.findUnique({ where: { id: id } });
      if (!item) throw new NotFoundException('Guide not found');
      const content = item.contentItemIds.map((cid) => await this.prisma.contentItem.findUnique({ where: { id: cid } })).filter(Boolean);
      return { ...item, content, note: 'fallback_in_memory' };
    }
  }

  async generate(input: {
    organizationId?: string;
    projectId?: string;
    experienceId: string;
    persona?: string;
    languageCode?: string;
  }) {
    try {
      const exp = await this.prismaClient.visitorExperience.findUnique({ where: { id: input.experienceId } });
      if (!exp) throw new NotFoundException('Experience not found');

      const project = await this.prismaClient.project.findUnique({ where: { id: exp.projectId } });
      const orgId = input.organizationId || project?.organizationId || 'org_demo_1';
      const twinId = exp.twinId || undefined;

      const nodes = twinId
        ? await this.prismaClient.twinNode.findMany({ where: { twinId }, orderBy: { updatedAt: 'desc' } })
        : [];

      const persona = normalizeGuidePersona(input.persona);
      const languageCode = normalizeGuideLanguage(input.languageCode);

      const stopTextIds: string[] = [];
      const stopNodes = nodes.filter((node) => isGuideStop(node.kind)).slice(0, 12);

      for (const node of stopNodes) {
        const title = `${exp.titleAr} | ${node.nameAr}`;
        const summary = buildStopSummary(persona);

        const created = await this.prismaClient.contentItem.create({
          data: {
            organizationId: orgId,
            projectId: exp.projectId,
            title,
            languageCode,
            contentType: 'stop_text',
            status: 'draft',
            summary,
          },
        });
        stopTextIds.push(created.id);
      }

      const audioCreated = await this.prismaClient.contentItem.create({
        data: {
          organizationId: orgId,
          projectId: exp.projectId,
          title: `${exp.titleAr} | سيناريو صوتي`,
          languageCode,
          contentType: 'audio_script',
          status: 'draft',
          summary: 'سيناريو صوتي مترابط للمسار بالكامل. يُحسّن لاحقاً عبر LLM مع RAG لضمان الاستشهاد.',
        },
      });

      const createdGuide = await this.prismaClient.visitorGuide.create({
        data: {
          id: uid('guide'),
          organizationId: orgId,
          projectId: exp.projectId,
          experienceId: exp.id,
          twinId: twinId || null,
          persona,
          languageCode,
          contentItemIds: [...stopTextIds, audioCreated.id],
          summaryAr: `تم توليد مرشد زائر (${persona}) مع ${stopTextIds.length} محطة + سيناريو صوتي.`,
        },
      });

      return { ok: true, guide: createdGuide };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwIfProdDbError(err, 'VisitorGuideService.generate');

      const exp = await this.prisma.visitorExperience.findUnique({ where: { id: input.experienceId } });
      if (!exp) throw new NotFoundException('Experience not found');

      const project = await this.prisma.project.findUnique({ where: { id: exp.projectId } });
      const orgId = input.organizationId || project?.organizationId || 'org_demo_1';
      const twinId = exp.twinId;
      const nodes = twinId ? await this.prisma.twinNode.findMany({ where: { twinId: twinId } }) : [];

      const persona = normalizeGuidePersona(input.persona);
      const languageCode = normalizeGuideLanguage(input.languageCode);
      const now = new Date().toISOString();

      const stopTextIds: string[] = [];
      const stopNodes = nodes.filter((node) => isGuideStop(node.kind)).slice(0, 12);

      for (const node of stopNodes) {
        const title = `${exp.titleAr} | ${node.nameAr}`;
        const summary = buildStopSummary(persona);

        const ci: ContentItem = {
          id: uid('cnt'),
          organizationId: orgId,
          projectId: exp.projectId,
          title,
          languageCode,
          contentType: 'stop_text',
          status: 'draft',
          summary,
        };
        await this.prisma.contentItem.create({ data: ci);
        stopTextIds.push(ci.id);
      }

      const audio: ContentItem = {
        id: uid('cnt'),
        organizationId: orgId,
        projectId: exp.projectId,
        title: `${exp.titleAr} | سيناريو صوتي`,
        languageCode,
        contentType: 'audio_script',
        status: 'draft',
        summary: 'سيناريو صوتي مترابط للمسار بالكامل. يُحسّن لاحقاً عبر LLM مع RAG لضمان الاستشهاد.',
      };
      await this.prisma.contentItem.create({ data: audio);

      const row: VisitorGuideRecord = {
        id: uid('guide'),
        organizationId: orgId,
        projectId: exp.projectId,
        experienceId: exp.id,
        twinId,
        persona,
        languageCode,
        contentItemIds: [...stopTextIds, audio.id],
        summaryAr: `تم توليد مرشد زائر (${persona}) مع ${stopTextIds.length} محطة + سيناريو صوتي.`,
        createdAt: now,
        updatedAt: now,
      };
      await this.prisma.visitorGuide.create({ data: row);

      return { ok: true, guide: row, note: 'fallback_in_memory' };
    }
  }

  createVisitorProfile(input: { organizationId?: string; displayName: string; homeCity?: string; persona?: string; interests?: string[]; accessibilityNeeds?: string[] }) {
    const now = new Date().toISOString();
    const row: VisitorProfileRecord = {
      id: uid('vis'),
      organizationId: input.organizationId || 'org_demo_1',
      displayName: input.displayName,
      homeCity: input.homeCity || null,
      persona: input.persona || 'cultural_explorer',
      interests: Array.isArray(input.interests) ? input.interests : [],
      accessibilityNeeds: Array.isArray(input.accessibilityNeeds) ? input.accessibilityNeeds : [],
      createdAt: now,
      updatedAt: now,
    };
    await this.prisma.visitorProfileLite.create({ data: row);
    return { ok: true, profile: row };
  }

  async listVisitorSegments(organizationId?: string) {
    const profiles = (await this.prisma.visitorProfileLite.findMany({ where: organizationId ? { organizationId } : {} }));
    const byPersona = new Map<string, number>();
    for (const profile of profiles) {
      const key = typeof profile.persona === 'string' && profile.persona ? profile.persona : 'unknown';
      byPersona.set(key, (byPersona.get(key) || 0) + 1);
    }
    return {
      ok: true,
      returned: byPersona.size,
      items: [...byPersona.entries()].map(([persona, count]) => ({ persona, count })),
    };
  }

  recommendExperiences(input: { organizationId?: string; interests?: string[]; limit?: number; profileId?: string }) {
    const items = this.store
      .getExperiences()
      .filter((experience) => !input.organizationId || await this.prisma.project.findUnique({ where: { id: experience.projectId } })?.organizationId === input.organizationId)
      .slice(0, Math.max(1, Math.min(Number(input.limit || 5), 20)))
      .map((experience) => ({
        id: experience.id,
        titleAr: experience.titleAr,
        projectId: experience.projectId,
        reasonAr: 'تمت التوصية بها بناءً على قربها من الاهتمامات المتاحة وهيكل التجربة الحالية.',
      }));
    return { ok: true, returned: items.length, items };
  }

  visitorHistory(id: string) {
    const profile = await this.prisma.visitorProfileLite.findUnique({ where: { id: (id } }));
    if (!profile) throw new NotFoundException('Visitor profile not found');
    return { ok: true, profile, history: [] };
  }

  private get prismaClient(): VisitorGuidePrismaFacade {
    return this.prisma as unknown as VisitorGuidePrismaFacade;
  }
}

function buildStopSummary(persona: GuidePersona) {
  if (persona === 'expert') return 'نص موجز بمعلومة دقيقة قابلة للتوثيق.';
  if (persona === 'student') return 'نص تعليمي مبسط مع سؤال تفاعلي.';
  if (persona === 'tourist') return 'نص ترحيبي مع سياق سريع للهوية المحلية.';
  return 'نص عائلي قصير ولطيف.';
}

function isGuideStop(kind: TwinNodeRecord['kind'] | undefined) {
  return kind === 'entry' || kind === 'exhibit' || kind === 'activity' || kind === 'rest' || kind === 'exit';
}

function normalizeGuidePersona(value?: string): GuidePersona {
  return value === 'student' || value === 'tourist' || value === 'expert' ? value : 'family';
}

function normalizeGuideLanguage(value?: string): GuideLanguage {
  return value === 'en' ? 'en' : 'ar';
}
