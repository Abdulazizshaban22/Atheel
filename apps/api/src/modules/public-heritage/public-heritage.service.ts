import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';

function normQ(q?: string) {
  return String(q ?? '').replace(/\s+/g, ' ').trim();
}

@Injectable()
export class PublicHeritageService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async ensureManifest(asset: any) {
    if (!asset) return null;
    const orgId = String(asset.organizationId);
    const manifestId = `heritage_${String(asset.id)}`;

    // Attachments linked to the asset
    const atts = await (this.prisma as Record<string, unknown>).attachment
      .findMany({ where: { organizationId: orgId, entityType: 'heritage_asset', entityId: String(asset.id) }, orderBy: { uploadedAt: 'asc' } })
      .catch(() => []);

    const attachmentIds = (atts || []).map((a: any) => String(a.id));

    const iiifModel = (this.prisma as Record<string, unknown>).iiifManifest;
    if (iiifModel?.upsert) {
      await iiifModel.upsert({
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

    // keep link on asset (best-effort)
    if (!asset.iiifManifestId || String(asset.iiifManifestId) !== manifestId) {
      await (this.prisma as Record<string, unknown>).heritageAsset.update({ where: { id: String(asset.id) }, data: { iiifManifestId: manifestId } }).catch(() => void 0);
    }

    return { manifestId, attachmentIdsCount: attachmentIds.length };
  }

  async search(params: { q?: string; region?: string; assetType?: string; page?: number; pageSize?: number }) {
    const q = normQ(params.q);
    const region = normQ(params.region);
    const assetType = normQ(params.assetType);
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.max(1, Math.min(50, Number(params.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    // Base filter: only published public assets with publicSlug
    const baseWhere: any = {
      status: 'published',
      accessLevel: 'public',
      publicSlug: { not: null },
      ...(region ? { region } : {}),
      ...(assetType ? { assetType } : {}),
    };

    // If DB supports tsquery, use ranked full-text search (title/description/fulltext)
    if (q) {
      try {
        const regionParam = region || '';
        const typeParam = assetType || '';
        const rows: any[] = await (this.prisma as Record<string, unknown>).$queryRaw`
          SELECT
            "id",
            "publicSlug",
            "titleAr",
            "descriptionAr",
            "assetType",
            "region",
            "city",
            "updatedAt",
            ts_rank(
              to_tsvector('simple', coalesce("titleAr",'') || ' ' || coalesce("descriptionAr",'') || ' ' || coalesce("fulltextAr",'')),
              websearch_to_tsquery('simple', ${q})
            ) AS "rank",
            ts_headline(
              'simple',
              coalesce("descriptionAr",'') || ' ' || coalesce("fulltextAr",''),
              websearch_to_tsquery('simple', ${q}),
              'MaxFragments=2,MaxWords=18,MinWords=6'
            ) AS "snippetAr"
          FROM "HeritageAsset"
          WHERE
            "status" = 'published'
            AND "accessLevel" = 'public'
            AND "publicSlug" IS NOT NULL
            AND (${regionParam} = '' OR "region" = ${regionParam})
            AND (${typeParam} = '' OR "assetType"::text = ${typeParam})
            AND to_tsvector('simple', coalesce("titleAr",'') || ' ' || coalesce("descriptionAr",'') || ' ' || coalesce("fulltextAr",'')) @@ websearch_to_tsquery('simple', ${q})
          ORDER BY "rank" DESC, "updatedAt" DESC
          LIMIT ${pageSize} OFFSET ${offset};
        `;

        const items = rows.map((r: any) => ({
          id: r.id,
          publicSlug: r.publicSlug,
          titleAr: r.titleAr,
          descriptionAr: r.descriptionAr,
          snippetAr: r.snippetAr,
          assetType: r.assetType,
          region: r.region,
          city: r.city,
          updatedAt: r.updatedAt,
        }));

        return { ok: true, mode: 'ts', page, pageSize, count: items.length, items };
      } catch {
        // fallback to contains
      }
    }

    const rows = await (this.prisma as Record<string, unknown>).heritageAsset
      .findMany({
        where: {
          ...baseWhere,
          ...(q ? { OR: [{ titleAr: { contains: q, mode: 'insensitive' } }, { descriptionAr: { contains: q, mode: 'insensitive' } }, { fulltextAr: { contains: q, mode: 'insensitive' } }] } : {}),
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: pageSize,
        skip: offset,
        select: { id: true, publicSlug: true, titleAr: true, descriptionAr: true, assetType: true, region: true, city: true, updatedAt: true },
      })
      .catch(() => []);

    return { ok: true, mode: q ? 'contains' : 'latest', page, pageSize, count: rows.length, items: rows };
  }

  async getBySlug(slug: string) {
    const s = normQ(slug);
    if (!s) throw new BadRequestException('slug مطلوب');

    const row = await (this.prisma as Record<string, unknown>).heritageAsset
      .findFirst({
        where: { publicSlug: s, status: 'published', accessLevel: 'public' },
        include: { protocols: true },
      })
      .catch(() => null);

    if (!row) throw new NotFoundException('Heritage asset not found');

    const ensure = await this.ensureManifest(row).catch(() => null);
    return { ok: true, asset: row, iiif: ensure };
  }

  async getManifestBySlug(slug: string) {
    const res = await this.getBySlug(slug);
    const asset = (res as any)?.asset;
    const orgId = String(asset.organizationId);

    const baseUrl = (process.env.PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
    const publicAppUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    const manifestId = `${baseUrl}/public/heritage/assets/${encodeURIComponent(String(asset.publicSlug))}/manifest.json`;

    const atts = await (this.prisma as Record<string, unknown>).attachment
      .findMany({ where: { organizationId: orgId, entityType: 'heritage_asset', entityId: String(asset.id) }, orderBy: { uploadedAt: 'asc' } })
      .catch(() => []);

    const items: any[] = [];
    let idx = 0;
    for (const att of atts || []) {
      const attId = String(att.id);
      const label = att.originalName || `عنصر ${idx + 1}`;
      const canvasId = `${baseUrl}/public/heritage/assets/${encodeURIComponent(String(asset.publicSlug))}/canvas/${idx + 1}`;
      const bodyId = `${baseUrl}/public/heritage/assets/${encodeURIComponent(String(asset.publicSlug))}/attachments/${encodeURIComponent(attId)}/download`;
      const isImage = (att.mimeType || '').startsWith('image/');
      const isPdf = (att.mimeType || '').includes('pdf') || String(att.extension || '').toLowerCase() === '.pdf';
      const body: any = {
        id: bodyId,
        type: isImage ? 'Image' : isPdf ? 'Text' : 'ContentResource',
        format: att.mimeType || 'application/octet-stream',
      };
      const annoPageId = `${canvasId}/page/1`;
      const annoId = `${canvasId}/annotation/1`;
      items.push({
        id: canvasId,
        type: 'Canvas',
        label: { ar: [label] },
        items: [
          {
            id: annoPageId,
            type: 'AnnotationPage',
            items: [
              {
                id: annoId,
                type: 'Annotation',
                motivation: 'painting',
                body,
                target: canvasId,
              },
            ],
          },
        ],
      });
      idx++;
    }

    return {
      '@context': ['http://iiif.io/api/presentation/3/context.json'],
      id: manifestId,
      type: 'Manifest',
      label: { ar: [String(asset.titleAr || 'أصل تراثي')] },
      homepage: [
        {
          id: `${publicAppUrl}/public/heritage/${encodeURIComponent(String(asset.publicSlug))}`,
          type: 'Text',
          label: { ar: ['صفحة الأصل'] },
          format: 'text/html',
        },
      ],
      items,
      metadata: [
        { label: { ar: ['المنطقة'] }, value: { ar: [String(asset.region || '')] } },
        { label: { ar: ['عدد العناصر'] }, value: { ar: [String((atts || []).length)] } },
      ],
      // IIIF Content Search endpoint
      service: [
        {
          id: `${baseUrl}/public/heritage/assets/${encodeURIComponent(String(asset.publicSlug))}/search`,
          type: 'SearchService1',
          profile: 'http://iiif.io/api/search/1/search',
          label: { ar: ['بحث داخل النص'] },
        },
      ],
    };
  }

  async searchWithinAsset(slug: string, q: string) {
    const res = await this.getBySlug(slug);
    const asset = (res as any)?.asset;
    const query = normQ(q);
    const baseUrl = (process.env.PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

    const pageId = `${baseUrl}/public/heritage/assets/${encodeURIComponent(String(asset.publicSlug))}/search?q=${encodeURIComponent(query)}`;
    if (!query) {
      return { '@context': 'http://iiif.io/api/search/1/context.json', id: pageId, type: 'AnnotationPage', items: [] };
    }

    const fulltextOriginal = String(asset.fulltextAr || asset.descriptionAr || '');
    const fulltext = fulltextOriginal.toLowerCase();
    const qLower = query.toLowerCase();

    const firstCanvas = `${baseUrl}/public/heritage/assets/${encodeURIComponent(String(asset.publicSlug))}/canvas/1`;

    const items: any[] = [];
    const hits: any[] = [];

    // Collect multiple matches (max 12) with local excerpts for better highlights.
    let idx = 0;
    let hitIndex = 0;
    while (hitIndex < 12) {
      const at = fulltext.indexOf(qLower, idx);
      if (at < 0) break;

      const exact = fulltextOriginal.slice(at, at + query.length);
      const preStart = Math.max(0, at - 45);
      const sufEnd = Math.min(fulltextOriginal.length, at + query.length + 45);
      const prefix = fulltextOriginal.slice(preStart, at);
      const suffix = fulltextOriginal.slice(at + query.length, sufEnd);
      const excerpt = `${prefix}${exact}${suffix}`.trim();

      const annoId = `${pageId}#anno-${hitIndex + 1}`;
      items.push({
        id: annoId,
        type: 'Annotation',
        motivation: 'supplementing',
        body: {
          type: 'TextualBody',
          value: excerpt,
          format: 'text/plain',
          language: 'ar',
        },
        target: {
          type: 'SpecificResource',
          source: firstCanvas,
          selector: {
            type: 'TextQuoteSelector',
            exact: exact || query,
            prefix: prefix.slice(-40),
            suffix: suffix.slice(0, 40),
          },
        },
      });

      hits.push({
        match: query,
        annotations: [annoId],
      });

      hitIndex += 1;
      idx = at + Math.max(1, query.length);
    }

    // Fallback: if we somehow did not find substring (e.g., different normalization), still return one generic hit.
    if (!items.length) {
      const annoId = `${pageId}#anno-1`;
      items.push({
        id: annoId,
        type: 'Annotation',
        motivation: 'supplementing',
        body: { type: 'TextualBody', value: `تطابق في النص: ${query}`, format: 'text/plain', language: 'ar' },
        target: firstCanvas,
      });
      hits.push({ match: query, annotations: [annoId] });
    }

    return {
      '@context': 'http://iiif.io/api/search/1/context.json',
      id: pageId,
      type: 'AnnotationPage',
      items,
      // IIIF Search API compatible: include hits to help clients highlight multiple snippets.
      hits,
    };
  }
}
