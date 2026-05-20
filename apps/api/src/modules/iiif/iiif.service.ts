import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { AttachmentsService } from '../attachments/attachments.service';
import { randomUUID } from 'node:crypto';

export type IiifManifestRecord = {
  id: string;
  organizationId?: string;
  labelAr: string;
  labelEn?: string;
  attachmentIds: string[];
  fulltextAr?: string;
  createdAt: string;
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

@Injectable()
export class IiifService {
  // Fallback store for local scaffolding when DB is not configured.
  private manifests: IiifManifestRecord[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: AttachmentsService,
  ) {}

  async list(orgId?: string) {
    try {
      const iiif = (this.prisma as any)?.iiifManifest;
      if (!iiif?.findMany) throw new Error('iiifManifest unavailable');
      const items = await iiif.findMany({
        where: { organizationId: orgId || undefined },
        orderBy: { updatedAt: 'desc' },
      });
      return { count: items.length, items };
    } catch {
      const items = this.manifests.filter((m) => (!orgId || m.organizationId === orgId));
      return { count: items.length, items };
    }
  }

  private async getRecord(id: string): Promise<any> {
    try {
      const iiif = (this.prisma as any)?.iiifManifest;
      if (!iiif?.findUnique) throw new Error('iiifManifest unavailable');
      const row = await iiif.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('IIIF manifest not found');
      return row;
    } catch {
      const m = this.manifests.find((x) => x.id === id);
      if (!m) throw new NotFoundException('IIIF manifest not found');
      return m;
    }
  }

  async create(input: { organizationId?: string; labelAr: string; labelEn?: string; attachmentIds: string[]; fulltextAr?: string }) {
    // Validate attachments exist
    for (const id of input.attachmentIds || []) {
      await this.attachments.getById(id);
    }

    const id = `iiif_${randomUUID().slice(0, 10)}`;
    const organizationId = input.organizationId || 'org_demo_1';

    try {
      const iiif = (this.prisma as any)?.iiifManifest;
      if (!iiif?.create) throw new Error('iiifManifest unavailable');
      const row = await iiif.create({
        data: {
          id,
          organizationId,
          labelAr: input.labelAr,
          labelEn: input.labelEn || null,
          attachmentIds: input.attachmentIds || [],
          fulltextAr: input.fulltextAr || null,
        },
      });
      return { ok: true, manifest: row };
    } catch {
      const rec: IiifManifestRecord = {
        id,
        organizationId,
        labelAr: input.labelAr,
        labelEn: input.labelEn,
        attachmentIds: input.attachmentIds,
        fulltextAr: input.fulltextAr,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      this.manifests.unshift(rec);
      return { ok: true, manifest: rec, note: 'fallback_in_memory' };
    }
  }

  async buildPresentationManifest(id: string) {
    const m: any = await this.getRecord(id);
    const baseUrl = (process.env.PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
    const publicAppUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    const manifestId = `${baseUrl}/iiif/manifests/${encodeURIComponent(m.id)}/manifest.json`;

    const items: any[] = [];
    let idx = 0;

    for (const attId of m.attachmentIds || []) {
      const att: any = await this.attachments.getById(attId);
      const label = att.originalName || `عنصر ${idx + 1}`;
      const canvasId = `${baseUrl}/iiif/manifests/${encodeURIComponent(m.id)}/canvas/${idx + 1}`;
      const bodyId = `${baseUrl}/attachments/${encodeURIComponent(attId)}/download`;

      const isImage = (att.mimeType || '').startsWith('image/');
      const isPdf = (att.mimeType || '').includes('pdf') || (att.extension || '').toLowerCase() === '.pdf';

      const annoPageId = `${canvasId}/page/1`;
      const annoId = `${canvasId}/annotation/1`;

      const body: any = {
        id: bodyId,
        type: isImage ? 'Image' : isPdf ? 'Text' : 'ContentResource',
        format: att.mimeType || 'application/octet-stream',
      };

      const annotation = {
        id: annoId,
        type: 'Annotation',
        motivation: 'painting',
        body,
        target: canvasId,
      };

      items.push({
        id: canvasId,
        type: 'Canvas',
        label: { ar: [label] },
        items: [
          {
            id: annoPageId,
            type: 'AnnotationPage',
            items: [annotation],
          },
        ],
      });

      idx++;
    }

    return {
      '@context': ['http://iiif.io/api/presentation/3/context.json'],
      id: manifestId,
      type: 'Manifest',
      label: {
        ar: [m.labelAr],
        ...(m.labelEn ? { en: [m.labelEn] } : {}),
      },
      homepage: [
        {
          id: `${publicAppUrl}/iiif`,
          type: 'Text',
          label: { ar: ['واجهة الاستعراض'] },
          format: 'text/html',
        },
      ],
      items,
      metadata: [
        { label: { ar: ['عدد العناصر'] }, value: { ar: [String((m.attachmentIds || []).length)] } },
      ],
    };
  }

  async contentSearch(manifestId: string, q: string) {
    const m: any = await this.getRecord(manifestId);
    const query = (q || '').trim();
    const baseUrl = (process.env.PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

    const pageId = `${baseUrl}/iiif/manifests/${encodeURIComponent(m.id)}/search?q=${encodeURIComponent(query)}`;

    const fulltext = String(m.fulltextAr || '').toLowerCase();
    if (!query) {
      return { '@context': 'http://iiif.io/api/search/1/context.json', id: pageId, type: 'AnnotationPage', items: [] };
    }

    const hits: any[] = [];

    // Simple fulltext search (extendable to per-canvas text index)
    if (fulltext.includes(query.toLowerCase())) {
      const firstCanvas = `${baseUrl}/iiif/manifests/${encodeURIComponent(m.id)}/canvas/1`;
      hits.push({
        id: `${pageId}#hit-1`,
        type: 'Annotation',
        motivation: 'supplementing',
        body: {
          type: 'TextualBody',
          value: `تطابق في النص: ${query}`,
          format: 'text/plain',
          language: 'ar',
        },
        target: firstCanvas,
      });
    }

    return {
      '@context': 'http://iiif.io/api/search/1/context.json',
      id: pageId,
      type: 'AnnotationPage',
      items: hits,
    };
  }
}
