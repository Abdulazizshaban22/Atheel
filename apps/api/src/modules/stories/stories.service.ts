import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { AiService } from '../ai/ai.service';

function norm(s?: any) {
  return String(s ?? '').trim();
}

function clamp01(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.7;
  return Math.max(0, Math.min(1, n));
}

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService, private readonly ai: AiService) {}

  async list(params: { organizationId?: string; projectId?: string; q?: string }) {
    const q = norm(params.q);
    const where: any = {
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.projectId ? { projectId: params.projectId } : {}),
      ...(q ? { OR: [{ titleAr: { contains: q, mode: 'insensitive' } }, { narratorName: { contains: q, mode: 'insensitive' } }, { locationAr: { contains: q, mode: 'insensitive' } }] } : {}),
    };
    const items = await (this.prisma as Record<string, unknown>).story
      .findMany({ where, orderBy: { updatedAt: 'desc' }, include: { transcripts: { take: 1, orderBy: { createdAt: 'desc' } }, consents: true, entityLinks: true } })
      .catch(() => []);
    return { count: items.length, items };
  }

  async create(body: any) {
    const titleAr = norm(body.titleAr);
    if (!titleAr) throw new BadRequestException('titleAr is required');
    const row = await (this.prisma as Record<string, unknown>).story.create({
      data: {
        organizationId: body.organizationId || null,
        projectId: body.projectId || null,
        titleAr,
        narratorName: body.narratorName || null,
        locationAr: body.locationAr || null,
        status: body.status || 'draft',
        metaJson: body.metaJson || null,
      },
    });
    return { ok: true, story: row };
  }

  async get(id: string) {
    const row = await (this.prisma as Record<string, unknown>).story
      .findUnique({ where: { id }, include: { transcripts: { orderBy: { createdAt: 'desc' } }, consents: { orderBy: { createdAt: 'desc' } }, entityLinks: true } })
      .catch(() => null);
    if (!row) throw new NotFoundException('Story not found');
    return { ok: true, story: row };
  }

  async addTranscript(storyId: string, body: any) {
    const text = norm(body.text);
    if (!text) throw new BadRequestException('text is required');
    const story = await (this.prisma as Record<string, unknown>).story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');

    const row = await (this.prisma as Record<string, unknown>).storyTranscript.create({
      data: {
        storyId,
        languageCode: body.languageCode || 'ar',
        kind: body.kind || 'text',
        text,
      },
    });

    await (this.prisma as Record<string, unknown>).story.update({ where: { id: storyId }, data: { updatedAt: new Date() } }).catch(() => void 0);
    return { ok: true, transcript: row };
  }

  async addConsent(storyId: string, body: any) {
    const story = await (this.prisma as Record<string, unknown>).story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    const row = await (this.prisma as Record<string, unknown>).storyConsent.create({
      data: {
        storyId,
        consentType: body.consentType || 'publish',
        signedBy: body.signedBy || null,
        signedAt: body.signedAt ? new Date(body.signedAt) : null,
        noteAr: body.noteAr || null,
      },
    });
    await (this.prisma as Record<string, unknown>).story.update({ where: { id: storyId }, data: { updatedAt: new Date() } }).catch(() => void 0);
    return { ok: true, consent: row };
  }

  async linkEntity(storyId: string, body: any) {
    const entityId = norm(body.entityId);
    if (!entityId) throw new BadRequestException('entityId is required');
    await (this.prisma as Record<string, unknown>).storyEntityLink.create({
      data: {
        storyId,
        entityId,
        mentionText: body.mentionText || null,
        confidence: clamp01(body.confidence),
      },
    });
    await (this.prisma as Record<string, unknown>).story.update({ where: { id: storyId }, data: { updatedAt: new Date() } }).catch(() => void 0);
    return { ok: true };
  }

  private async getStoryText(storyId: string) {
    const transcripts = await (this.prisma as Record<string, unknown>).storyTranscript
      .findMany({ where: { storyId }, orderBy: { createdAt: 'desc' }, take: 5 })
      .catch(() => []);
    return transcripts.map((t: any) => t.text).join('\n\n').trim();
  }

  async autoLinkEntities(storyId: string, body: any) {
    const story = await (this.prisma as Record<string, unknown>).story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');

    const text = await this.getStoryText(storyId);
    if (!text) throw new BadRequestException('لا يوجد نص تفريغ/رواية لعمل الربط');

    const mode = body.mode || 'heuristic';
    let suggestions: Array<{ nameAr: string; entityType?: string; confidence?: number; mentionText?: string }> = [];

    if (mode === 'ai') {
      const prompt = `استخرج كيانات ثقافية سعودية من النص التالي. أعد JSON فقط على شكل مصفوفة عناصر: {"nameAr": "...", "entityType": "place|person|practice|artifact|event|food|coffee|craft|source", "confidence": 0..1, "mentionText": "..."}.\n\nالنص:\n${text.slice(0, 4000)}`;
      const llm = await this.ai.chat({
        organizationId: story.organizationId || undefined,
        messages: [
          { role: 'system', content: 'أنت محلل كيانات تراثية. أعد JSON فقط بدون شرح.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        maxTokens: 800,
      } as any);
      try {
        const json = JSON.parse(String((llm as Record<string, unknown>).output || (llm as Record<string, unknown>).answer || '').trim());
        if (Array.isArray(json)) suggestions = json;
      } catch {
        // ignore
      }
    }

    if (!suggestions.length) {
      // Heuristic: try to match existing entities by scanning a small set of keywords.
      const candidates = new Set<string>();
      for (const w of text.split(/\s+/g)) {
        const token = w.replace(/[\u064B-\u0652]/g, '').replace(/[\W_]+/g, '').trim();
        if (token.length >= 4 && token.length <= 16) candidates.add(token);
        if (candidates.size >= 50) break;
      }
      const top = Array.from(candidates).slice(0, 30);
      const found: any[] = [];
      for (const term of top) {
        const rows = await (this.prisma as Record<string, unknown>).culturalEntity
          .findMany({ where: { canonicalNameAr: { contains: term, mode: 'insensitive' } }, take: 5 })
          .catch(() => []);
        for (const r of rows) found.push(r);
        if (found.length >= 25) break;
      }
      const uniq = new Map<string, any>();
      for (const e of found) uniq.set(e.id, e);
      suggestions = Array.from(uniq.values()).slice(0, 15).map((e: any) => ({ nameAr: e.canonicalNameAr, entityType: e.entityType, confidence: 0.65, mentionText: e.canonicalNameAr }));
    }

    // Upsert entities then link
    let linked = 0;
    for (const s of suggestions.slice(0, 12)) {
      const nameAr = norm((s as Record<string, unknown>).nameAr);
      if (!nameAr) continue;
      const entityType = norm((s as Record<string, unknown>).entityType) || 'practice';

      // Find entity by exact name first
      let entity = await (this.prisma as Record<string, unknown>).culturalEntity
        .findFirst({ where: { organizationId: story.organizationId || undefined, canonicalNameAr: nameAr, entityType } })
        .catch(() => null);

      if (!entity) {
        entity = await (this.prisma as Record<string, unknown>).culturalEntity
          .create({
            data: {
              organizationId: story.organizationId || null,
              projectId: story.projectId || null,
              entityType,
              canonicalNameAr: nameAr,
              descriptionAr: null,
              cidocClass: null,
              externalRefs: null,
              tags: ['story_auto', 'sa'],
              createdByUserId: null,
            },
          })
          .catch(() => null);
      }
      if (!entity) continue;

      await (this.prisma as Record<string, unknown>).storyEntityLink
        .create({
          data: {
            storyId,
            entityId: entity.id,
            mentionText: (s as Record<string, unknown>).mentionText || nameAr,
            confidence: clamp01((s as Record<string, unknown>).confidence),
          },
        })
        .catch(() => void 0);
      linked += 1;

      // Add provenance to the entity (story as source)
      await (this.prisma as Record<string, unknown>).culturalProvenance
        .create({
          data: {
            organizationId: story.organizationId || null,
            projectId: story.projectId || null,
            entityId: entity.id,
            sourceTitle: `رواية/قصة: ${story.titleAr}`,
            sourceUrl: null,
            citationAr: `مستخرج من رواية داخل أَثِيل، الراوي: ${story.narratorName || 'غير محدد'}`,
            capturedAt: new Date(),
            capturedByUserId: null,
          },
        })
        .catch(() => void 0);
    }

    await (this.prisma as Record<string, unknown>).story.update({ where: { id: storyId }, data: { updatedAt: new Date() } }).catch(() => void 0);
    return { ok: true, linked, suggestionsCount: suggestions.length };
  }

  async buildStoryGraph(storyId: string) {
    const story = await (this.prisma as Record<string, unknown>).story
      .findUnique({ where: { id: storyId }, include: { transcripts: true, consents: true, entityLinks: true } })
      .catch(() => null);
    if (!story) throw new NotFoundException('Story not found');

    const entityIds = Array.from(new Set((story.entityLinks || []).map((l: any) => l.entityId)));
    const entities = entityIds.length
      ? await (this.prisma as Record<string, unknown>).culturalEntity.findMany({ where: { id: { in: entityIds } } }).catch(() => [])
      : [];

    const nodes: any[] = [];
    const edges: any[] = [];

    nodes.push({
      id: `story:${story.id}`,
      type: 'default',
      position: { x: 0, y: 0 },
      data: { label: `📖 ${story.titleAr}` },
    });

    // consent nodes
    (story.consents || []).slice(0, 6).forEach((c: any, idx: number) => {
      const nid = `consent:${c.id}`;
      nodes.push({ id: nid, type: 'default', position: { x: -260, y: 120 + idx * 90 }, data: { label: `✅ موافقة: ${c.consentType}` } });
      edges.push({ id: `e_story_${nid}`, source: `story:${story.id}`, target: nid, type: 'smoothstep' });
    });

    entities.forEach((e: any, idx: number) => {
      const nid = `entity:${e.id}`;
      nodes.push({ id: nid, type: 'default', position: { x: 320, y: 120 + idx * 90 }, data: { label: `🔖 ${e.canonicalNameAr}` } });
      edges.push({ id: `e_story_entity_${e.id}`, source: `story:${story.id}`, target: nid, type: 'smoothstep' });
    });

    // transcripts as a single node
    if ((story.transcripts || []).length) {
      const nid = `transcripts:${story.id}`;
      nodes.push({ id: nid, type: 'default', position: { x: 0, y: 160 }, data: { label: `📝 تفريغات: ${(story.transcripts || []).length}` } });
      edges.push({ id: `e_story_tx_${story.id}`, source: `story:${story.id}`, target: nid, type: 'smoothstep' });
    }

    return { ok: true, storyId: story.id, nodes, edges };
  }
}
