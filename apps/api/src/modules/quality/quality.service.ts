import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';

function norm(s?: any) {
  return String(s ?? '').trim();
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function countCitations(text: string) {
  const matches = text.match(/\[(\d+)\]/g) || [];
  const uniq = new Set(matches);
  return uniq.size;
}

@Injectable()
export class QualityService {
  constructor(private readonly prisma: PrismaService) {}

  async assessAuthenticity(body: any) {
    const subjectType = norm(body.subjectType);
    const subjectId = norm(body.subjectId);
    if (!subjectType || !subjectId) throw new BadRequestException('subjectType and subjectId are required');

    const organizationId = body.organizationId || null;

    let provenanceCount = 0;
    let evidenceCount = 0;
    let hasConsent = false;
    let hasCredential = false;

    if (subjectType === 'entity') {
      provenanceCount = await (this.prisma as Record<string, unknown>).culturalProvenance.count({ where: { entityId: subjectId } }).catch(() => 0);
      evidenceCount = await (this.prisma as Record<string, unknown>).culturalRelation.count({ where: { OR: [{ fromEntityId: subjectId }, { toEntityId: subjectId }] } }).catch(() => 0);
    } else if (subjectType === 'story') {
      provenanceCount = await (this.prisma as Record<string, unknown>).storyConsent.count({ where: { storyId: subjectId } }).catch(() => 0);
      evidenceCount = await (this.prisma as Record<string, unknown>).storyTranscript.count({ where: { storyId: subjectId } }).catch(() => 0);
      hasConsent = provenanceCount > 0;
    } else if (subjectType === 'research') {
      provenanceCount = await (this.prisma as Record<string, unknown>).researchEntityLink.count({ where: { documentId: subjectId } }).catch(() => 0);
      evidenceCount = await (this.prisma as Record<string, unknown>).researchExtractionRun.count({ where: { documentId: subjectId, status: 'completed' } }).catch(() => 0);
    } else if (subjectType === 'attachment') {
      provenanceCount = await (this.prisma as Record<string, unknown>).contentCredential.count({ where: { subjectType: 'attachment', subjectId } }).catch(() => 0);
      evidenceCount = provenanceCount;
      hasCredential = provenanceCount > 0;
    }

    // Normalize
    const pScore = clamp01(provenanceCount / 3);
    const eScore = clamp01(evidenceCount / 3);
    const cScore = hasConsent ? 1 : 0;
    const credScore = hasCredential ? 1 : 0;

    const score = clamp01(0.4 * pScore + 0.3 * eScore + 0.2 * cScore + 0.1 * credScore);
    const factors = {
      provenanceCount,
      evidenceCount,
      hasConsent,
      hasCredential,
      components: { pScore, eScore, cScore, credScore },
    };

    const row = await (this.prisma as Record<string, unknown>).authenticityAssessment.create({
      data: {
        organizationId,
        subjectType,
        subjectId,
        score,
        factorsJson: factors,
      },
    });

    return { ok: true, assessment: row };
  }

  async listAuthenticity(params: { organizationId?: string; subjectType?: string }) {
    const rows = await (this.prisma as Record<string, unknown>).authenticityAssessment
      .findMany({
        where: {
          ...(params.organizationId ? { organizationId: params.organizationId } : {}),
          ...(params.subjectType ? { subjectType: params.subjectType } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      .catch(() => []);
    return { count: rows.length, items: rows };
  }

  async checkEvidence(body: any) {
    const subjectType = norm(body.subjectType);
    const subjectId = norm(body.subjectId);
    if (!subjectType || !subjectId) throw new BadRequestException('subjectType and subjectId are required');
    const text = String(body.text || '').trim();
    if (!text) throw new BadRequestException('text is required');

    const kind = norm(body.kind) || 'citations';
    const requiresCitations = body.requiresCitations !== false;

    const issues: any[] = [];
    const citations = countCitations(text);
    if (requiresCitations && citations === 0) {
      issues.push({ code: 'missing_citations', messageAr: 'النص لا يحتوي أي استشهادات [1] [2] ...' });
    }
    if (/\bjavascript:|\bdata:/i.test(text)) {
      issues.push({ code: 'unsafe_url', messageAr: 'تم رصد رابط غير آمن (javascript: أو data:)' });
    }
    if (text.length < 120) {
      issues.push({ code: 'too_short', messageAr: 'النص قصير جدًا؛ قد لا يكون كافيًا للتوثيق' });
    }

    const status = issues.length ? 'fail' : 'pass';
    const organizationId = body.organizationId || null;

    const row = await (this.prisma as Record<string, unknown>).evidenceCheck.create({
      data: {
        organizationId,
        subjectType,
        subjectId,
        kind,
        status,
        issuesJson: { citations, issues },
      },
    });

    return { ok: true, check: row };
  }

  async listEvidence(params: { organizationId?: string; subjectType?: string }) {
    const rows = await (this.prisma as Record<string, unknown>).evidenceCheck
      .findMany({
        where: {
          ...(params.organizationId ? { organizationId: params.organizationId } : {}),
          ...(params.subjectType ? { subjectType: params.subjectType } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      .catch(() => []);
    return { count: rows.length, items: rows };
  }

  async listRagMetrics(params: { organizationId?: string; limit?: number }) {
    const take = Math.max(1, Math.min(500, params.limit ?? 100));
    const rows = await (this.prisma as Record<string, unknown>).ragQualityMetric
      .findMany({
        where: { ...(params.organizationId ? { organizationId: params.organizationId } : {}) },
        orderBy: { createdAt: 'desc' },
        take,
      })
      .catch(() => []);
    return { count: rows.length, items: rows };
  }

  async ragMetricsSummary(params: { organizationId?: string }) {
    const rows = await (this.prisma as Record<string, unknown>).ragQualityMetric
      .findMany({
        where: { ...(params.organizationId ? { organizationId: params.organizationId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      .catch(() => []);
    const n = rows.length || 1;
    const avgGrounding = rows.reduce((a: number, r: any) => a + Number(r.groundingScore || 0), 0) / n;
    const avgCitations = rows.reduce((a: number, r: any) => a + Number(r.citationsCount || 0), 0) / n;
    const avgRetrieved = rows.reduce((a: number, r: any) => a + Number(r.retrievedChunks || 0), 0) / n;
    return {
      ok: true,
      count: rows.length,
      averages: {
        groundingScore: Number(avgGrounding.toFixed(3)),
        citationsCount: Number(avgCitations.toFixed(2)),
        retrievedChunks: Number(avgRetrieved.toFixed(2)),
      },
      latest: rows[0] || null,
    };
  }
}
