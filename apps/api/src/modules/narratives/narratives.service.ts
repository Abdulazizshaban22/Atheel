import { Injectable, NotFoundException } from '@nestjs/common';
import { createCitationId } from '@madar/innovation-kernel';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

@Injectable()
export class NarrativesService {
  constructor(private readonly prisma: PrismaService) {}

  list(params?: { ideaId?: string; experienceId?: string; twinId?: string }) {
    let items = await this.prisma.narrativeInstance.findMany();
    if (params?.ideaId) items = items.filter((x) => x.ideaId === params.ideaId);
    if (params?.experienceId) items = items.filter((x) => x.experienceId === params.experienceId);
    if (params?.twinId) items = items.filter((x) => x.twinId === params.twinId);
    return { returned: items.length, items: items.slice(0, 200) };
  }

  get(id: string) {
    const item = await this.prisma.narrativeInstance.findUnique({ where: { id: id } });
    if (!item) throw new NotFoundException('Narrative not found');
    return { ...item, beats: safeJson(item.beatsJson) };
  }

  generate(input: {
    organizationId?: string;
    projectId?: string;
    ideaId?: string;
    experienceId?: string;
    twinId?: string;
    variant?: 'A' | 'B' | 'single';
    style?: 'immersive' | 'educational' | 'minimal';
  }) {
    const now = new Date().toISOString();

    const idea = input.ideaId ? await this.prisma.ideaVault.findUnique({ where: { id: input.ideaId } }) : null;
    const exp = input.experienceId ? await this.prisma.visitorExperience.findUnique({ where: { id: input.experienceId } }) : null;
    const twinId = input.twinId || exp?.twinId;
    if (!twinId) throw new NotFoundException('Twin is required (directly or via experienceId)');

    const twin = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!twin) throw new NotFoundException('Twin not found');

    const nodes = await this.prisma.twinNode.findMany({ where: { twinId: twinId } });
    const pathNodes = nodes
      .filter((n) => ['entry', 'exhibit', 'activity', 'service', 'rest', 'exit'].includes(n.kind))
      .slice(0, 12);

    const style = input.style || 'immersive';
    const variant = input.variant || 'single';

    const beats = pathNodes.map((n, i) => {
      const prefix = i === 0 ? 'البداية' : i === pathNodes.length - 1 ? 'الخاتمة' : `محطة ${i}`;
      const beatText = style === 'educational'
        ? `${prefix}: تعريف موجز بالمحطة وربطها بسياق تراثي محلي قابل للتوثيق.`
        : style === 'minimal'
          ? `${prefix}: نقطة توقف قصيرة.`
          : `${prefix}: لحظة متعددة الحواس، صوت + صورة + تفاعل بسيط، تربط الزائر بالذاكرة المحلية.`;
      return {
        nodeId: n.id,
        nameAr: n.nameAr,
        beatAr: beatText,
        dwellSecondsSuggested: n.dwellTimeSecondsAvg,
      };
    });

    const citations: NarrativeInstanceRecord['citations'] = [];
    if (idea) {
      const ev = await this.prisma.ideaEvidence.findMany({ where: { ideaId: idea.id } }).slice(0, 8);
      for (const e of ev) {
        citations.push({
          citationId: createCitationId({ sourceKind: e.kind, seed: e.url || e.titleAr }),
          titleAr: e.titleAr,
          url: e.url,
          kind: e.kind,
        });
      }
    }
    for (const a of await this.prisma.inspirationAsset.findMany().slice(0, 4)) {
      citations.push({
        citationId: a.citationId || createCitationId({ sourceKind: a.sourceId || 'other', seed: a.url || a.titleAr }),
        titleAr: a.titleAr,
        url: a.url,
        kind: 'inspiration',
      });
    }

    const titleAr = idea?.titleAr ? `سردية: ${idea.titleAr}` : `سردية للتوأم: ${twin.nameAr}`;
    const loglineAr = idea?.oneLinerAr || 'سردية مرتبطة بالموقع تُبنى على مصادر موثقة وتتحول إلى تجربة قابلة للقياس.';

    const row: NarrativeInstanceRecord = {
      id: uid('narr'),
      organizationId: input.organizationId,
      projectId: input.projectId,
      ideaId: input.ideaId,
      experienceId: input.experienceId,
      twinId,
      variant,
      titleAr,
      loglineAr,
      beatsJson: JSON.stringify({ style, beats }),
      citations,
      createdAt: now,
      updatedAt: now,
    };

    await this.prisma.narrativeInstance.upsert(row);
    return { ok: true, narrative: { ...row, beats } };
  }

  generateAB(input: {
    organizationId?: string;
    projectId?: string;
    ideaId?: string;
    experienceId?: string;
    twinId?: string;
  }) {
    return {
      ok: true,
      variants: [
        this.generate({ ...input, variant: 'A', style: 'immersive' }),
        this.generate({ ...input, variant: 'B', style: 'educational' }),
      ],
    };
  }

  createPolicy(input: {
    organizationId?: string;
    projectId?: string;
    nameAr: string;
    expectedTone?: string;
    protectedTerms?: string[];
    bannedTerms?: string[];
    requiredThemes?: string[];
  }) {
    const policy = await this.prisma.narrativePolicyRuntime.create({ data: {
      id: uid('npol'),
      organizationId: input.organizationId || null,
      projectId: input.projectId || null,
      nameAr: input.nameAr,
      expectedTone: input.expectedTone || 'ثقافي رصين',
      protectedTerms: Array.isArray(input.protectedTerms) ? input.protectedTerms : [],
      bannedTerms: Array.isArray(input.bannedTerms) ? input.bannedTerms : [],
      requiredThemes: Array.isArray(input.requiredThemes) ? input.requiredThemes : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { ok: true, policy };
  }

  checkConsistency(input: {
    organizationId?: string;
    projectId?: string;
    placeIdentity?: string;
    expectedTone?: string;
    audience?: string;
    channels?: Array<{ channel: string; text: string }>;
    narrativePolicy?: Record<string, unknown>;
  }) {
    const channels = Array.isArray(input.channels) ? input.channels : [];
    const policy = input.narrativePolicy || await this.prisma.narrativePolicyRuntime.findFirst({ where: { projectId: input.projectId } }) || null;
    const expectedTone = String(input.expectedTone || (policy as any)?.expectedTone || 'ثقافي رصين');
    const protectedTerms = Array.isArray((policy as any)?.protectedTerms) ? (policy as Record<string, unknown>).protectedTerms : [];
    const bannedTerms = Array.isArray((policy as any)?.bannedTerms) ? (policy as Record<string, unknown>).bannedTerms : [];
    const requiredThemes = Array.isArray((policy as any)?.requiredThemes) ? (policy as Record<string, unknown>).requiredThemes : [];
    const findings: Array<{ severity: string; code: string; messageAr: string; channel?: string }> = [];
    let score = 100;

    for (const item of channels) {
      const text = String(item?.text || '');
      const ch = String(item?.channel || 'unknown');
      for (const banned of bannedTerms) {
        if (banned && text.includes(banned)) {
          score -= 15;
          findings.push({ severity: 'high', code: 'banned_term', channel: ch, messageAr: `تم رصد عبارة غير مرغوبة في قناة ${ch}: ${banned}` });
        }
      }
      for (const term of protectedTerms) {
        if (term && !text.includes(term)) {
          score -= 6;
          findings.push({ severity: 'medium', code: 'missing_protected_term', channel: ch, messageAr: `القناة ${ch} لا تتضمن المصطلح المحوري: ${term}` });
        }
      }
      for (const theme of requiredThemes) {
        if (theme && !text.includes(theme)) {
          score -= 8;
          findings.push({ severity: 'medium', code: 'missing_theme', channel: ch, messageAr: `القناة ${ch} لا تعكس الثيمة المطلوبة: ${theme}` });
        }
      }
      if (input.placeIdentity && !text.includes(String(input.placeIdentity))) {
        score -= 5;
        findings.push({ severity: 'low', code: 'place_identity_weak', channel: ch, messageAr: `القناة ${ch} لا تُظهر هوية المكان بوضوح.` });
      }
    }

    const normalizedScore = Math.max(0, Math.min(100, score));
    const status = normalizedScore >= 85 ? 'aligned' : normalizedScore >= 65 ? 'needs_review' : 'drifted';
    const check = await this.prisma.documentationCheck.create({ data: {
      id: uid('nchk'),
      organizationId: input.organizationId || null,
      projectId: input.projectId || null,
      expectedTone,
      score: normalizedScore,
      status,
      findings,
      channelCount: channels.length,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, check };
  }

  projectAlignment(projectId: string) {
    const items = await this.prisma.documentationCheck.findMany(projectId);
    const latest = items[0] || null;
    const avg = items.length ? Math.round(items.reduce((a, b) => a + Number(b.score || 0), 0) / items.length) : null;
    return {
      ok: true,
      projectId,
      latest,
      averageScore: avg,
      recentChecks: items.slice(0, 10),
      summaryAr: latest
        ? latest.status === 'aligned'
          ? 'السرد الحالي متسق بدرجة جيدة مع هوية المشروع.'
          : latest.status === 'needs_review'
            ? 'السرد مقبول لكنه يحتاج مراجعة في بعض القنوات.'
            : 'هناك انجراف واضح بين الرسائل وهوية المشروع.'
        : 'لا توجد فحوصات اتساق مسجلة بعد.',
    };
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s || 'null');
  } catch {
    return null;
  }
}
