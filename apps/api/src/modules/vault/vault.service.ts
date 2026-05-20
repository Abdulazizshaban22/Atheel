import { Injectable, NotFoundException } from '@nestjs/common';
import { canAdvanceIdeaState, normalizeEvidenceInput } from '@madar/creative-loop-kernel';
import { jaccardSimilarity } from '@madar/innovation-kernel';
import {
  VaultEvidenceRecord,
  VaultIdeaRecord,
  NarrativeDraftRecord,

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

@Injectable()
export class VaultService {
  constructor(private readonly prisma: PrismaService) {}

  listIdeas(params?: { state?: string; q?: string; projectId?: string }) {
    let items = await this.prisma.ideaVault.findMany();
    if (params?.projectId) items = items.filter((x) => x.projectId === params.projectId);
    if (params?.state) items = items.filter((x) => x.state === params.state);
    if (params?.q) {
      const qq = params.q.toLowerCase();
      items = items.filter((x) => x.titleAr.toLowerCase().includes(qq) || x.oneLinerAr.toLowerCase().includes(qq));
    }
    return { returned: items.length, items: items.slice(0, 200) };
  }



  findSimilarIdeas(params: { ideaId?: string; q?: string; limit?: number }) {
    const items = await this.prisma.ideaVault.findMany();
    const limit = params.limit || 10;

    let queryText = (params.q || '').trim();
    if (!queryText && params.ideaId) {
      const base = await this.prisma.ideaVault.findUnique({ where: { id: params.ideaId } });
      if (base) queryText = `${base.titleAr} ${base.oneLinerAr} ${base.experienceSketchAr}`;
    }
    if (!queryText) return { returned: 0, items: [] };

    const scored = items
      .filter((x) => !params.ideaId || x.id !== params.ideaId)
      .map((x) => {
        const t = `${x.titleAr} ${x.oneLinerAr} ${x.experienceSketchAr}`;
        const score = jaccardSimilarity(queryText, t);
        return { idea: x, score };
      })
      .filter((x) => x.score > 0.04)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => ({ ...x.idea, similarity: Math.round(x.score * 1000) / 10 }));

    return { returned: scored.length, items: scored };
  }

  getIdea(id: string) {
    const item = await this.prisma.ideaVault.findUnique({ where: { id: id } });
    if (!item) throw new NotFoundException('Idea not found');
    const evidence = await this.prisma.ideaEvidence.findMany({ where: { ideaId: id } });
    const narrative = await this.prisma.narrativeDraft.findFirst({ where: { ideaVaultId: id } });
    return { ...item, evidence, narrative };
  }

  createIdea(input: Partial<VaultIdeaRecord>) {
    const now = new Date().toISOString();
    const row: VaultIdeaRecord = {
      id: uid('idea'),
      organizationId: input.organizationId,
      projectId: input.projectId,
      state: (input.state as any) || 'raw',
      domain: input.domain || 'festival',
      titleAr: input.titleAr || 'فكرة جديدة',
      oneLinerAr: input.oneLinerAr || '—',
      audienceAr: input.audienceAr || '—',
      regionAr: input.regionAr,
      formatAr: input.formatAr || 'فعالية',
      whyNowAr: input.whyNowAr || '—',
      experienceSketchAr: input.experienceSketchAr || '—',
      deliverablesAr: input.deliverablesAr || [],
      kpisAr: input.kpisAr || [],
      risksAr: input.risksAr || [],
      evidenceMinCount: typeof input.evidenceMinCount === 'number' ? input.evidenceMinCount : 3,
      brainstormBoardId: input.brainstormBoardId,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };
    await this.prisma.ideaVault.create({ data: row);
    return row;
  }

  patchIdea(id: string, patch: Partial<VaultIdeaRecord>) {
    return await this.prisma.ideaVault.update({ where: { id: id }, data: patch);
  }

  addEvidence(ideaId: string, input: { titleAr: string; url?: string; citationAr?: string }) {
    const idea = await this.prisma.ideaVault.findUnique({ where: { id: ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');

    const now = new Date().toISOString();
    const normalized = normalizeEvidenceInput(input);
    const row: VaultEvidenceRecord = {
      id: uid('ev'),
      ideaId,
      titleAr: normalized.titleAr,
      url: normalized.url,
      kind: normalized.kind as any,
      citationAr: normalized.citationAr,
      createdAt: now,
    };
    await this.prisma.ideaEvidence.create({ data: row);
    return row;
  }

  advanceState(ideaId: string, nextState: VaultIdeaRecord['state']) {
    const idea = await this.prisma.ideaVault.findUnique({ where: { id: ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');
    const evidence = await this.prisma.ideaEvidence.findMany({ where: { ideaId: ideaId } });

    const model = {
      ...idea,
      evidenceRefs: evidence.map((e) => ({ id: e.id, ideaId: e.ideaId, titleAr: e.titleAr, url: e.url, kind: e.kind, citationAr: e.citationAr, createdAt: e.createdAt })),
      evidenceMinCount: idea.evidenceMinCount,
    } as any;

    const check = canAdvanceIdeaState(model, nextState as any);
    if (!check.ok) return { ok: false, reasonAr: check.reasonAr };

    const updated = await this.prisma.ideaVault.update({ where: { id: ideaId }, data: { state: nextState });
    return { ok: true, idea: updated };
  }

  getNarrative(ideaId: string) {
    const idea = await this.prisma.ideaVault.findUnique({ where: { id: ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');
    return await this.prisma.narrativeDraft.findFirst({ where: { ideaVaultId: ideaId } }) || null;
  }

  generateNarrative(ideaId: string) {
    // Guard: require evidence baseline before generating any official narrative.
    const idea = await this.prisma.ideaVault.findUnique({ where: { id: ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');
    const evidence = await this.prisma.ideaEvidence.findMany({ where: { ideaId: ideaId } });

    if (evidence.length < idea.evidenceMinCount || !evidence.some((e) => e.kind === 'official_sa' || e.kind === 'unesco')) {
      return {
        ok: false,
        reasonAr: 'قبل كتابة السردية الرسمية: أكمل حزمة البحث. المطلوب مراجع موثقة كافية + مرجع رسمي سعودي أو UNESCO على الأقل.',
        required: { minEvidence: idea.evidenceMinCount, mustInclude: 'official_sa_or_unesco' },
      };
    }

    const now = new Date().toISOString();
    const nar: NarrativeDraftRecord = {
      id: uid('nar'),
      ideaId,
      status: 'draft',
      loglineAr: `${idea.titleAr}: ${idea.oneLinerAr}`,
      act1: `التمهيد: تعريف بالمكان/العنصر الثقافي وربطه بالهوية المحلية.`,
      act2: `التحول: تجربة متعددة الحواس عبر محطات قصيرة مرتبطة بمراجع موثقة.`,
      act3: `الأثر: دعوة للمشاركة/الحفظ + مخرج قابل للمشاركة + قياس أثر.`,
      createdAt: now,
      updatedAt: now,
    };

    await this.prisma.narrativeDraft.upsert(nar);
    return { ok: true, narrative: nar, evidenceUsed: evidence.map((e) => ({ titleAr: e.titleAr, url: e.url, kind: e.kind })) };
  }
}
