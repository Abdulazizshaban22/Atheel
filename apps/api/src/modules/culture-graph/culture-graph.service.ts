import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';

function norm(s?: string) {
  return String(s || '').trim();
}

@Injectable()
export class CultureGraphService {
  constructor(private readonly prisma: PrismaService) {}

  async listEntities(params: { q?: string; type?: string; organizationId?: string; projectId?: string; limit?: number }) {
    const q = norm(params.q);
    const take = Math.max(1, Math.min(200, params.limit ?? 50));
    const where: any = {
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.projectId ? { projectId: params.projectId } : {}),
      ...(params.type ? { entityType: params.type } : {}),
      ...(q
        ? {
            OR: [
              { canonicalNameAr: { contains: q, mode: 'insensitive' } },
              { canonicalNameEn: { contains: q, mode: 'insensitive' } },
              { aliases: { some: { name: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const items = await (this.prisma as Record<string, unknown>).culturalEntity.findMany({
      where,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        aliases: true,
        provenance: { take: 3, orderBy: { createdAt: 'desc' } },
      },
    });

    return { items, total: items.length, limit: take };
  }

  async createEntity(body: any) {
    const canonicalNameAr = norm(body.canonicalNameAr || body.nameAr);
    const entityType = norm(body.entityType);
    if (!canonicalNameAr) throw new BadRequestException('canonicalNameAr is required');
    if (!entityType) throw new BadRequestException('entityType is required');

    const created = await (this.prisma as Record<string, unknown>).culturalEntity.create({
      data: {
        organizationId: body.organizationId || null,
        projectId: body.projectId || null,
        entityType,
        canonicalNameAr,
        canonicalNameEn: body.canonicalNameEn || null,
        descriptionAr: body.descriptionAr || null,
        descriptionEn: body.descriptionEn || null,
        cidocClass: body.cidocClass || null,
        externalRefs: body.externalRefs || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        createdByUserId: body.createdByUserId || null,
      },
      include: { aliases: true, provenance: true },
    });

    if (Array.isArray(body.aliases) && body.aliases.length) {
      await (this.prisma as Record<string, unknown>).culturalEntityAlias.createMany({
        data: body.aliases.map((a: any) => ({
          entityId: created.id,
          name: norm(a.name),
          languageCode: a.languageCode || 'ar',
        })).filter((x: any /* typed */) => x.name),
        skipDuplicates: true,
      });
    }

    return { entity: await (this.prisma as Record<string, unknown>).culturalEntity.findUnique({ where: { id: created.id }, include: { aliases: true, provenance: true } }) };
  }

  async addAlias(entityId: string, body: any) {
    const name = norm(body.name);
    if (!name) throw new BadRequestException('name is required');
    await (this.prisma as Record<string, unknown>).culturalEntityAlias.create({
      data: { entityId, name, languageCode: body.languageCode || 'ar' },
    });
    return { ok: true };
  }

  async createRelation(body: any) {
    const fromEntityId = norm(body.fromEntityId);
    const toEntityId = norm(body.toEntityId);
    const predicate = norm(body.predicate);
    if (!fromEntityId || !toEntityId || !predicate) throw new BadRequestException('fromEntityId, toEntityId, predicate are required');

    const rel = await (this.prisma as Record<string, unknown>).culturalRelation.create({
      data: {
        organizationId: body.organizationId || null,
        projectId: body.projectId || null,
        fromEntityId,
        toEntityId,
        predicate,
        cidocProperty: body.cidocProperty || null,
        confidence: typeof body.confidence === 'number' ? body.confidence : 0.7,
        evidenceTextAr: body.evidenceTextAr || null,
      },
    });

    if (body.provenance) {
      await (this.prisma as Record<string, unknown>).culturalProvenance.create({
        data: {
          organizationId: body.organizationId || null,
          projectId: body.projectId || null,
          relationId: rel.id,
          sourceTitle: norm(body.provenance.sourceTitle) || 'مصدر غير مسمى',
          sourceUrl: body.provenance.sourceUrl || null,
          citationAr: body.provenance.citationAr || null,
          capturedAt: body.provenance.capturedAt ? new Date(body.provenance.capturedAt) : null,
          capturedByUserId: body.provenance.capturedByUserId || null,
        },
      });
    }

    return { relation: rel };
  }

  async addProvenance(body: any) {
    const sourceTitle = norm(body.sourceTitle);
    if (!sourceTitle) throw new BadRequestException('sourceTitle is required');
    if (!body.entityId && !body.relationId) throw new BadRequestException('entityId or relationId is required');

    const prov = await (this.prisma as Record<string, unknown>).culturalProvenance.create({
      data: {
        organizationId: body.organizationId || null,
        projectId: body.projectId || null,
        entityId: body.entityId || null,
        relationId: body.relationId || null,
        sourceTitle,
        sourceUrl: body.sourceUrl || null,
        citationAr: body.citationAr || null,
        capturedAt: body.capturedAt ? new Date(body.capturedAt) : null,
        capturedByUserId: body.capturedByUserId || null,
      },
    });

    return { provenance: prov };
  }

  // Minimal bootstrap from KnowledgeDocuments: creates Source entities and links them to extracted mentions.
  async importFromKnowledge(body: any) {
    const organizationId = body.organizationId || null;
    const projectId = body.projectId || null;

    const docs = await (this.prisma as Record<string, unknown>).knowledgeDocument.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      take: Math.max(1, Math.min(50, body.limit ?? 20)),
      orderBy: { updatedAt: 'desc' },
    }).catch(() => []);

    const createdEntities: any[] = [];
    for (const d of docs) {
      const title = norm(d.title) || 'مصدر';
      const source = await (this.prisma as Record<string, unknown>).culturalEntity.create({
        data: {
          organizationId,
          projectId,
          entityType: 'source',
          canonicalNameAr: title,
          descriptionAr: `وثيقة معرفة: ${title}`,
          cidocClass: 'E31', // Document
          externalRefs: { knowledgeDocumentId: d.id, sourceType: d.sourceType, sourceRef: d.sourceRef },
          tags: ['bootstrap', 'knowledge'],
        },
      });
      createdEntities.push(source);

      await (this.prisma as Record<string, unknown>).culturalProvenance.create({
        data: {
          organizationId,
          projectId,
          entityId: source.id,
          sourceTitle: title,
          sourceUrl: d.sourceRef || null,
          citationAr: `مستخرج تلقائيًا من وثيقة معرفة داخل أَثِيل`,
          capturedAt: d.updatedAt,
        },
      });
    }

    return { ok: true, created: createdEntities.length, entities: createdEntities };
  }

  async exportJsonLd(params: { organizationId?: string; projectId?: string }) {
    const where: any = {
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.projectId ? { projectId: params.projectId } : {}),
    };

    const entities = await (this.prisma as Record<string, unknown>).culturalEntity.findMany({ where, include: { aliases: true, provenance: true } });
    const relations = await (this.prisma as Record<string, unknown>).culturalRelation.findMany({ where, include: { provenance: true } });

    const context = {
      '@vocab': 'https://atheel.local/vocab#',
      cidoc: 'http://www.cidoc-crm.org/cidoc-crm/',
      nameAr: 'https://schema.org/name',
      descriptionAr: 'https://schema.org/description',
      sourceUrl: 'https://schema.org/url',
    };

    const graph: any[] = [];

    for (const e of entities) {
      graph.push({
        '@id': `urn:atheel:entity:${e.id}`,
        '@type': e.cidocClass ? `cidoc:${e.cidocClass}` : `atheel:${e.entityType}`,
        entityType: e.entityType,
        nameAr: e.canonicalNameAr,
        nameEn: e.canonicalNameEn || undefined,
        descriptionAr: e.descriptionAr || undefined,
        tags: e.tags || [],
        aliases: (e.aliases || []).map((a: any) => ({ name: a.name, languageCode: a.languageCode })),
        provenance: (e.provenance || []).map((p: any) => ({ sourceTitle: p.sourceTitle, sourceUrl: p.sourceUrl, citationAr: p.citationAr, capturedAt: p.capturedAt })),
        externalRefs: e.externalRefs || undefined,
      });
    }

    for (const r of relations) {
      graph.push({
        '@id': `urn:atheel:relation:${r.id}`,
        '@type': r.cidocProperty ? `cidoc:${r.cidocProperty}` : 'atheel:Relation',
        from: `urn:atheel:entity:${r.fromEntityId}`,
        to: `urn:atheel:entity:${r.toEntityId}`,
        predicate: r.predicate,
        confidence: r.confidence,
        evidenceTextAr: r.evidenceTextAr || undefined,
        provenance: (r.provenance || []).map((p: any) => ({ sourceTitle: p.sourceTitle, sourceUrl: p.sourceUrl, citationAr: p.citationAr, capturedAt: p.capturedAt })),
      });
    }

    return {
      '@context': context,
      '@graph': graph,
      meta: {
        exportedAt: new Date().toISOString(),
        organizationId: params.organizationId || null,
        projectId: params.projectId || null,
      },
    };
  }
}
