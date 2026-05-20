import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@madar/db';
import { SAUDI_REGIONS, CULTURE_THEMES, MOC_CULTURAL_SECTORS } from '@madar/culture-sa-kernel';
import { classifyOpportunity } from '@madar/engines-kernel';
import { WorkflowsService } from '../workflows/workflows.service';
import { CultureGraphService } from '../culture-graph/culture-graph.service';
import { QueueService } from '../queue/queue.service';
import { RealtimeService } from '../realtime/realtime.service';

function clamp01(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function norm(s?: any) {
  return String(s ?? '').trim();
}

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function safeIso(v: any) {
  const s = String(v || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  return d.toISOString();
}

function computeSignalFingerprint(input: { titleAr: string; descriptionAr?: string | null; metaJson?: any }) {
  const m = input.metaJson || {};
  const attachments = Array.isArray(m.attachments)
    ? m.attachments
        .map((a: any) => (typeof a === 'string' ? { url: a, name: null } : { url: String(a?.url || a?.href || ''), name: a?.name ? String(a.name) : null }))
        .filter((a: any) => a.url)
        .sort((a: any, b: any) => a.url.localeCompare(b.url))
    : [];

  const obj = {
    titleAr: norm(input.titleAr),
    descriptionAr: norm(input.descriptionAr || ''),
    source: m.source ? String(m.source) : null,
    sourceUrl: m.url ? String(m.url) : null,
    sourceKey: m.sourceKey ? String(m.sourceKey) : null,
    deadlineAt: safeIso(m.deadlineAt),
    inquiryDeadlineAt: safeIso(m.inquiryDeadlineAt),
    openingAt: safeIso(m.openingAt),
    addendaCount: Number.isFinite(Number(m.addendaCount)) ? Number(m.addendaCount) : null,
    attachments,
    updatedHint: safeIso(m.updatedAt || m.changedAt || m.lastUpdatedAt),
  };

  return sha256(JSON.stringify(obj));
}


function scoreFormula(input: { communityInterest: number; officialPriority: number; productionFeasibility: number; lossRisk: number; evidenceBoost: number }) {
  // Default weights
  const base =
    0.35 * input.communityInterest +
    0.25 * input.officialPriority +
    0.25 * input.productionFeasibility +
    0.15 * input.lossRisk;
  const boosted = base + Math.min(0.15, input.evidenceBoost); // cap boost
  return Math.max(0, Math.min(1, boosted));
}

function mapThemeToDomain(theme?: string) {
  const t = String(theme || '').toLowerCase();
  if (t.includes('coffee')) return 'food_culture';
  if (t.includes('craft')) return 'artisan';
  if (t.includes('unesco_intangible')) return 'heritage';
  if (t.includes('poetry') || t.includes('story')) return 'literature';
  if (t.includes('music') || t.includes('performance')) return 'performance';
  if (t.includes('architecture')) return 'destination';
  return 'events';
}

function guessRegionCode(text: string) {
  const t = String(text || '').toLowerCase();
  for (const r of SAUDI_REGIONS) {
    if (t.includes(String(r.nameAr).toLowerCase())) return r.code;
    for (const h of r.hubs || []) {
      if (h && t.includes(String(h).toLowerCase())) return r.code;
    }
  }
  return null;
}

function guessTaxonomyCode(text: string) {
  const t = String(text || '').toLowerCase();
  // Prefer MoC sector classification when possible
  for (const s of MOC_CULTURAL_SECTORS) {
    for (const k of s.keywords || []) {
      if (k && t.includes(String(k).toLowerCase())) return `sector:${s.code}`;
    }
  }
  // Fallback to themes
  for (const th of CULTURE_THEMES) {
    for (const k of th.keywordsAr || []) {
      if (k && t.includes(String(k).toLowerCase())) return `theme:${th.code}`;
    }
  }
  return null;
}

@Injectable()
export class RadarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowsService,
    private readonly cultureGraph: CultureGraphService,
    private readonly queue: QueueService,
    private readonly realtime: RealtimeService,
  ) {}

  async listTaxonomy(params: { organizationId?: string }) {
    const rows = await (this.prisma as Record<string, unknown>).culturalTaxonomyNode
      .findMany({
        where: { organizationId: params.organizationId || undefined },
        orderBy: [{ kind: 'asc' }, { code: 'asc' }],
      })
      .catch(() => []);
    return { count: rows.length, items: rows };
  }

  async seedTaxonomy(params: { organizationId: string | null }) {
    const organizationId = params.organizationId;

    const baseNodes: any[] = [
      { code: 'root', labelAr: 'تصنيف الثقافة السعودية', kind: 'root', parentCode: null, tags: ['sa', 'culture'] },
      { code: 'themes', labelAr: 'المجالات والموضوعات', kind: 'group', parentCode: 'root', tags: ['themes'] },
      { code: 'sectors', labelAr: 'القطاعات الثقافية', kind: 'group', parentCode: 'root', tags: ['sectors', 'moc'] },
      { code: 'regions', labelAr: 'المناطق', kind: 'group', parentCode: 'root', tags: ['regions'] },
    ];

    for (const t of CULTURE_THEMES) {
      baseNodes.push({
        code: `theme:${t.code}`,
        labelAr: t.nameAr,
        kind: 'theme',
        parentCode: 'themes',
        tags: ['theme', t.code, ...(t.keywordsAr || []).slice(0, 6)],
      });
    }

    // 16 sectors (Ministry of Culture focus areas)
    for (const s of MOC_CULTURAL_SECTORS) {
      baseNodes.push({
        code: `sector:${s.code}`,
        labelAr: s.nameAr,
        kind: 'sector',
        parentCode: 'sectors',
        tags: ['sector', s.code, ...(s.keywords || []).slice(0, 8)],
      });
    }
    for (const r of SAUDI_REGIONS) {
      baseNodes.push({
        code: `region:${r.code}`,
        labelAr: r.nameAr,
        kind: 'region',
        parentCode: 'regions',
        tags: ['region', r.code, ...(r.hubs || []).slice(0, 6)],
      });
    }

    const model = (this.prisma as Record<string, unknown>).culturalTaxonomyNode;
    if (!model?.upsert) return { ok: false, note: 'prisma_not_ready' };

    let upserted = 0;
    for (const n of baseNodes) {
      await model
        .upsert({
          where: { organizationId_code: { organizationId, code: n.code } },
          update: { labelAr: n.labelAr, labelEn: n.labelEn || null, kind: n.kind, parentCode: n.parentCode, tags: n.tags },
          create: { organizationId, code: n.code, labelAr: n.labelAr, labelEn: n.labelEn || null, kind: n.kind, parentCode: n.parentCode, tags: n.tags },
        })
        .then(() => (upserted += 1))
        .catch(() => void 0);
    }
    return { ok: true, upserted };
  }

  async listSignals(params: { organizationId?: string; projectId?: string; status?: string; q?: string }) {
    const q = norm(params.q);
    const where: any = {
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.projectId ? { projectId: params.projectId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(q
        ? {
            OR: [{ titleAr: { contains: q, mode: 'insensitive' } }, { descriptionAr: { contains: q, mode: 'insensitive' } }],
          }
        : {}),
    };

    const rows = await (this.prisma as Record<string, unknown>).culturalSignal
      .findMany({ where, orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }], include: { evidence: true, entityLinks: true } })
      .catch(() => []);
    return { count: rows.length, items: rows };
  }


  async getSignal(id: string) {
    const row = await (this.prisma as Record<string, unknown>).culturalSignal.findUnique({ where: { id }, include: { evidence: true, entityLinks: true } }).catch(() => null);
    if (!row) throw new NotFoundException('Signal not found');
    return { ok: true, item: row };
  }

  async createSignal(body: any) {
    const titleAr = norm(body.titleAr);
    if (!titleAr) throw new BadRequestException('titleAr is required');

    const fullTextForGuess = `${titleAr} ${norm(body.descriptionAr)}`.trim();

    const opportunity = classifyOpportunity({ titleAr, descriptionAr: body.descriptionAr || null, metaJson: body.metaJson || {} });
    const taxonomyGuess = body.taxonomyCode ? null : guessTaxonomyCode(fullTextForGuess);
    const regionGuess = body.regionCode ? null : guessRegionCode(fullTextForGuess);

    // If scan provides a stable sourceKey, use it as idempotency key and apply change detection.
    const sourceKey = body?.metaJson?.sourceKey ? String(body.metaJson.sourceKey) : '';
    if (sourceKey) {
      const existing = await (this.prisma as Record<string, unknown>).culturalSignal
        .findFirst({
          where: { metaJson: { path: ['sourceKey'], equals: sourceKey } as any },
          include: { evidence: true, entityLinks: true },
        })
        .catch(() => null);

      if (existing) {
        const oldMeta = (existing as Record<string, unknown>).metaJson || {};
        const mergedMeta: any = { ...(oldMeta || {}), ...(body.metaJson || {}), sourceKey };
        const nowIso = new Date().toISOString();
        mergedMeta.lastSeenAt = nowIso;

        const newHash = computeSignalFingerprint({ titleAr, descriptionAr: body.descriptionAr || null, metaJson: mergedMeta });
        const oldHash = oldMeta?.contentHash ? String(oldMeta.contentHash) : '';

        mergedMeta.contentHash = newHash;

        const baseUpdate: any = {
          titleAr,
          descriptionAr: body.descriptionAr || null,
          taxonomyCode: body.taxonomyCode || (existing as Record<string, unknown>).taxonomyCode || taxonomyGuess || opportunity.primaryTaxonomyCode || null,
          regionCode: body.regionCode || (existing as Record<string, unknown>).regionCode || regionGuess || opportunity.regionCode || null,
          status: body.status || (existing as Record<string, unknown>).status || 'new',
          officialPriority: clamp01(body.officialPriority ?? (existing as Record<string, unknown>).officialPriority),
          communityInterest: clamp01(body.communityInterest ?? (existing as Record<string, unknown>).communityInterest),
          productionFeasibility: clamp01(body.productionFeasibility ?? (existing as Record<string, unknown>).productionFeasibility),
          lossRisk: clamp01(body.lossRisk ?? (existing as Record<string, unknown>).lossRisk),
          sectorCodes: ((opportunity.sectorCodes || []) as any),
          metaJson: { ...mergedMeta, opportunityEngine: opportunity },
        };

        if (!oldHash || oldHash !== newHash) {
          const diff: any = { fields: {}, from: {}, to: {} };

          const keys = ['deadlineAt', 'inquiryDeadlineAt', 'openingAt', 'addendaCount', 'updatedAt', 'changedAt'];
          for (const k of keys) {
            const a = (oldMeta as any)?.[k] ?? null;
            const b = (mergedMeta as any)?.[k] ?? null;
            if (String(a ?? '') !== String(b ?? '')) {
              diff.fields[k] = true;
              diff.from[k] = a;
              diff.to[k] = b;
            }
          }

          const oldDesc = norm((existing as Record<string, unknown>).descriptionAr || '');
          const newDesc = norm(body.descriptionAr || '');
          if (oldDesc !== newDesc) {
            diff.fields.descriptionAr = true;
            diff.from.descriptionAr = oldDesc;
            diff.to.descriptionAr = newDesc;
          }

          let changeType = 'updated';
          if (diff.fields.deadlineAt) changeType = 'deadline_changed';
          else if (diff.fields.inquiryDeadlineAt) changeType = 'inquiry_deadline_changed';
          else if (diff.fields.addendaCount) changeType = 'addenda_updated';
          else if (diff.fields.descriptionAr) changeType = 'description_updated';

          const updated = await (this.prisma as Record<string, unknown>).culturalSignal.update({
            where: { id: (existing as Record<string, unknown>).id },
            data: baseUpdate,
            include: { evidence: true, entityLinks: true },
          });

          await (this.prisma as Record<string, unknown>).culturalSignalChange
            .create({
              data: {
                signalId: (existing as Record<string, unknown>).id,
                changeType,
                previousHash: oldHash || null,
                newHash,
                diffJson: diff,
                actor: 'radar_worker',
              },
            })
            .catch(() => void 0);

          const severity = changeType.includes('deadline') || changeType.includes('addenda') ? 'warning' : 'info';
          const titleN = `تحديث فرصة: ${titleAr}`;
          const deadlineFrom = diff?.from?.deadlineAt ?? null;
          const deadlineTo = diff?.to?.deadlineAt ?? null;
          const inqFrom = diff?.from?.inquiryDeadlineAt ?? null;
          const inqTo = diff?.to?.inquiryDeadlineAt ?? null;
          const addFrom = diff?.from?.addendaCount ?? null;
          const addTo = diff?.to?.addendaCount ?? null;

          const msg =
            changeType === 'deadline_changed'
              ? `تم رصد تغيير في آخر موعد لتقديم العروض. من: ${deadlineFrom || 'غير محدد'} إلى: ${deadlineTo || 'غير محدد'}.`
              : changeType === 'inquiry_deadline_changed'
                ? `تم رصد تغيير في آخر موعد لاستلام الاستفسارات. من: ${inqFrom || 'غير محدد'} إلى: ${inqTo || 'غير محدد'}.`
                : changeType === 'addenda_updated'
                  ? `تم رصد تغيّر في الملحقات. السابق: ${addFrom ?? 'غير معروف'} الحالي: ${addTo ?? 'غير معروف'}.`
                  : 'تم تحديث بيانات الفرصة من المصدر الرسمي.';

          await (this.prisma as Record<string, unknown>).internalNotification
            .create({
              data: {
                organizationId: (existing as Record<string, unknown>).organizationId || body.organizationId || null,
                severity,
                titleAr: titleN,
                messageAr: msg,
                entityType: 'cultural_signal',
                entityId: (existing as Record<string, unknown>).id,
                metaJson: { changeType, sourceKey, source: mergedMeta?.source || null, diff },
              },
            })
            .catch(() => void 0);

          this.realtime.emit('radar.signal_changed', { signalId: (existing as Record<string, unknown>).id, changeType, sourceKey });

          await this.scoreSignal((existing as Record<string, unknown>).id, { recompute: true }).catch(() => void 0);
          return { ok: true, signal: updated, note: 'updated_sourceKey', changeType };
        }

        if (!oldHash) {
          await (this.prisma as Record<string, unknown>).culturalSignal.update({ where: { id: (existing as Record<string, unknown>).id }, data: { metaJson: mergedMeta } }).catch(() => void 0);
        }
        return { ok: true, signal: existing, note: 'duplicate_sourceKey' };
      }
    }

    const created = await (this.prisma as Record<string, unknown>).culturalSignal.create({
      data: {
        organizationId: body.organizationId || null,
        projectId: body.projectId || null,
        titleAr,
        descriptionAr: body.descriptionAr || null,
        taxonomyCode: body.taxonomyCode || taxonomyGuess || opportunity.primaryTaxonomyCode || null,
        regionCode: body.regionCode || regionGuess || opportunity.regionCode || null,
        status: body.status || 'new',
        officialPriority: clamp01(body.officialPriority),
        communityInterest: clamp01(body.communityInterest),
        productionFeasibility: clamp01(body.productionFeasibility),
        lossRisk: clamp01(body.lossRisk),
        sectorCodes: ((opportunity.sectorCodes || []) as any),
        score: 0,
        metaJson: { ...(body.metaJson || {}), classification: { taxonomyGuess, regionGuess }, opportunityEngine: opportunity },
      },
      include: { evidence: true, entityLinks: true },
    });

    // score once
    await this.scoreSignal(created.id, { recompute: true });
    return { ok: true, signal: await (this.prisma as Record<string, unknown>).culturalSignal.findUnique({ where: { id: created.id }, include: { evidence: true, entityLinks: true } }) };
  }

  async enqueueScan(params: { organizationId?: string | null }) {
    return this.queue.enqueueRadarScan({ organizationId: params.organizationId || undefined });
  }

  async scheduleScan(params: { organizationId?: string | null; everyMinutes: number }) {
    const everyMs = Math.max(10, Number(params.everyMinutes || 60)) * 60_000;
    return this.queue.scheduleRadarScan({ organizationId: params.organizationId || undefined, everyMs });
  }

  // Worker scan ingestion: upsert a batch of findings into CulturalSignal + Evidence.
  async ingestScanFindings(body: any) {
    const organizationId = body.organizationId || null;
    const projectId = body.projectId || null;
    const items: any[] = Array.isArray(body.items) ? body.items : [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const it of items.slice(0, 50)) {
      const titleAr = norm(it.titleAr);
      if (!titleAr) continue;
      const sourceUrl = it.sourceUrl ? String(it.sourceUrl) : null;
      const sourceTitle = it.sourceTitle ? String(it.sourceTitle) : 'Radar Scan';
      const snippetAr = it.snippetAr ? String(it.snippetAr) : null;
      const metaJson = it.metaJson || {};

      // Use the same duplicate protection by sourceKey if provided.
      const res = await this.createSignal({
        organizationId,
        projectId,
        titleAr,
        descriptionAr: it.descriptionAr || null,
        taxonomyCode: it.taxonomyCode || null,
        regionCode: it.regionCode || null,
        status: 'new',
        officialPriority: it.officialPriority ?? 0,
        communityInterest: it.communityInterest ?? 0,
        productionFeasibility: it.productionFeasibility ?? 0,
        lossRisk: it.lossRisk ?? 0,
        metaJson,
      });

      const signal = (res as any)?.signal;
      if (!signal?.id) continue;

      if ((res as any)?.note === 'duplicate_sourceKey') {
        skipped += 1;
      } else if ((res as any)?.note === 'updated_sourceKey') {
        updated += 1;
      } else {
        created += 1;
      }

      // Add evidence if URL/snippet exists
      if (sourceTitle || sourceUrl || snippetAr) {
        await this.addEvidence(signal.id, { sourceTitle, sourceUrl, snippetAr, weight: 1 }).catch(() => void 0);
      }
    }

    return { ok: true, created, updated, skipped, received: items.length };
  }

  async addEvidence(signalId: string, body: any) {
    const sourceTitle = norm(body.sourceTitle);
    if (!sourceTitle) throw new BadRequestException('sourceTitle is required');
    await (this.prisma as Record<string, unknown>).culturalSignalEvidence.create({
      data: {
        signalId,
        sourceTitle,
        sourceUrl: body.sourceUrl || null,
        snippetAr: body.snippetAr || null,
        weight: Math.max(0.2, Math.min(3, Number(body.weight || 1))),
      },
    });
    await this.scoreSignal(signalId, { recompute: true });
    return { ok: true };
  }

  async scoreSignal(signalId: string, body: any) {
    const s = await (this.prisma as Record<string, unknown>).culturalSignal.findUnique({ where: { id: signalId }, include: { evidence: true } });
    if (!s) throw new NotFoundException('Signal not found');

    const evidenceBoost = (s.evidence || []).reduce((acc: number, e: any) => acc + (Number(e.weight || 1) > 0 ? 0.02 : 0), 0);
    const score = scoreFormula({
      communityInterest: clamp01(s.communityInterest),
      officialPriority: clamp01(s.officialPriority),
      productionFeasibility: clamp01(s.productionFeasibility),
      lossRisk: clamp01(s.lossRisk),
      evidenceBoost,
    });

    await (this.prisma as Record<string, unknown>).culturalSignal.update({ where: { id: signalId }, data: { score } });
    return { ok: true, score };
  }


  async listSignalChanges(signalId: string, params?: { limit?: number }) {
    const take = Math.max(1, Math.min(200, Number(params?.limit || 50)));
    const rows = await (this.prisma as Record<string, unknown>).culturalSignalChange
      .findMany({ where: { signalId }, orderBy: [{ detectedAt: 'desc' }], take })
      .catch(() => []);
    return { count: rows.length, items: rows };
  }

  async convertSignalToWorkflow(signalId: string, body: any) {
    const signal = await (this.prisma as Record<string, unknown>).culturalSignal.findUnique({ where: { id: signalId }, include: { evidence: true, entityLinks: true } });
    if (!signal) throw new NotFoundException('Signal not found');

    const theme = String(signal.taxonomyCode || '').startsWith('theme:') ? String(signal.taxonomyCode).slice('theme:'.length) : String(signal.taxonomyCode || '');
    const domain = mapThemeToDomain(theme);

    // Choose a stable template from catalog: standard manual_request curation_programming
    const catalog = this.workflows.listCatalog({ domain: domain as any, intent: 'curation_programming' as any, trigger: 'manual_request' as any, complexity: 'standard' as any, limit: 5 }).items;
    const templateId = body.templateId || catalog?.[0]?.id;
    if (!templateId) throw new BadRequestException('No workflow template found for this signal');

    const instance = await this.workflows.instantiate({
      templateId,
      organizationId: body.organizationId || signal.organizationId || 'org_demo_1',
      projectId: body.projectId || signal.projectId || undefined,
      parameters: {
        brief: `إشارة ثقافية: ${signal.titleAr}\n${signal.descriptionAr || ''}`.trim(),
        metadata: {
          signalId: signal.id,
          taxonomyCode: signal.taxonomyCode,
          regionCode: signal.regionCode,
          score: signal.score,
          evidence: (signal.evidence || []).map((e: any) => ({ sourceTitle: e.sourceTitle, sourceUrl: e.sourceUrl, snippetAr: e.snippetAr })),
        },
      },
      autoActivate: true,
    });

    // Link to Culture Graph: create a minimal entity for the signal if requested
    if (body.createEntity !== false) {
      const e = await this.cultureGraph.createEntity({
        organizationId: signal.organizationId,
        projectId: signal.projectId,
        entityType: 'signal',
        canonicalNameAr: signal.titleAr,
        descriptionAr: signal.descriptionAr || null,
        tags: ['radar', 'signal', signal.taxonomyCode || ''],
        cidocClass: body.cidocClass || null,
      });
      await (this.prisma as Record<string, unknown>).culturalSignalEntityLink.create({ data: { signalId: signal.id, entityId: (e as Record<string, unknown>).entity?.id || (e as any)?.id || (e as any)?.entityId || null, relation: 'represented_by' } }).catch(() => void 0);
    }

    await (this.prisma as Record<string, unknown>).culturalSignal.update({ where: { id: signal.id }, data: { status: 'converted', metaJson: { ...(signal.metaJson || {}), workflowInstanceId: (instance as Record<string, unknown>).instance?.id } } }).catch(() => void 0);

    return { ok: true, workflow: instance, signalId: signal.id };
  }


  async enrichSignal(signalId: string) {
    const s = await (this.prisma as Record<string, unknown>).culturalSignal.findUnique({ where: { id: signalId } }).catch(() => null);
    if (!s) throw new NotFoundException('Signal not found');

    const opportunity = classifyOpportunity({ titleAr: s.titleAr, descriptionAr: s.descriptionAr || null, metaJson: s.metaJson || {} });

    const updated = await (this.prisma as Record<string, unknown>).culturalSignal.update({
      where: { id: signalId },
      data: {
        taxonomyCode: s.taxonomyCode || opportunity.primaryTaxonomyCode || null,
        regionCode: s.regionCode || opportunity.regionCode || null,
        sectorCodes: (opportunity.sectorCodes || []) as any,
        metaJson: { ...(s.metaJson || {}), opportunityEngine: opportunity },
      },
    });

    return { ok: true, signalId, opportunity, updated };
  }
}
