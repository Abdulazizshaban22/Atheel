import { Injectable } from '@nestjs/common';
import { createCitationId } from '@madar/innovation-kernel';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

@Injectable()
export class InspirationService {
  constructor(private readonly prisma: PrismaService) {}

  listSources() {
    return { items: await this.prisma.inspirationSource.findMany({}) };
  }

  listAssets(params?: { q?: string; tag?: string; regionCode?: string; themeCode?: string; limit?: number }) {
    let items = await this.prisma.inspirationAsset.findMany();
    const q = (params?.q || '').trim();
    const tag = (params?.tag || '').trim();

    if (q) {
      const qq = q.toLowerCase();
      items = items.filter((x) => (x.titleAr || '').toLowerCase().includes(qq) || (x.notesAr || '').toLowerCase().includes(qq));
    }
    if (tag) {
      items = items.filter((x) => (x.tags || []).includes(tag));
    }
    if (params?.regionCode) {
      items = items.filter((x) => x.regionCode === params.regionCode);
    }
    if (params?.themeCode) {
      items = items.filter((x) => x.themeCode === params.themeCode);
    }
    if (params?.limit) items = items.slice(0, params.limit);

    return { returned: items.length, items };
  }

  addAsset(input: {
    organizationId?: string;
    projectId?: string;
    sourceId?: string;
    titleAr: string;
    url: string;
    mediaType?: 'image' | 'video' | 'pdf' | 'link';
    regionCode?: string;
    themeCode?: string;
    tags?: string[];
    notesAr?: string;
    createdByUserId?: string;
  }) {
    const now = new Date().toISOString();
    const srcKind = input.sourceId ? (await this.prisma.inspirationSource.findMany({}).find((s) => s.id === input.sourceId)?.kind || 'other') : 'other';
    const citationId = createCitationId({ sourceKind: srcKind, seed: input.url || input.titleAr });
    const row: InspirationAssetRecord = {
      id: uid('insp'),
      organizationId: input.organizationId,
      projectId: input.projectId,
      sourceId: input.sourceId,
      titleAr: input.titleAr,
      url: input.url,
      mediaType: input.mediaType || 'link',
      regionCode: input.regionCode,
      themeCode: input.themeCode,
      tags: input.tags || [],
      notesAr: input.notesAr,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };
    await this.prisma.inspirationAsset.create({ data: row);
    return row;
  }

  listBoards(params?: { projectId?: string; q?: string }) {
    let items = await this.prisma.inspirationBoard.findMany({});
    if (params?.projectId) items = items.filter((b) => b.projectId === params.projectId);
    if (params?.q) {
      const qq = params.q.toLowerCase();
      items = items.filter((b) => (b.titleAr || '').toLowerCase().includes(qq) || (b.descriptionAr || '').toLowerCase().includes(qq));
    }
    return { returned: items.length, items };
  }

  getBoard(id: string) {
    const b = await this.prisma.inspirationBoard.findUnique({ where: { id: id } });
    if (!b) return null;
    const items = await this.prisma.inspirationBoardItem.findMany(id).map((it) => {
      const a = await this.prisma.inspirationAsset.findMany().find((x) => x.id === it.assetId);
      return { ...it, asset: a || null };
    });
    return { ...b, items };
  }

  createBoard(input: Partial<InspirationBoardRecord>) {
    const now = new Date().toISOString();
    const row: InspirationBoardRecord = {
      id: uid('board'),
      organizationId: input.organizationId,
      projectId: input.projectId,
      titleAr: input.titleAr || 'Board جديد',
      descriptionAr: input.descriptionAr,
      status: (input.status as any) || 'active',
      visibility: (input.visibility as any) || 'org',
      ownerUserId: input.ownerUserId,
      editorUserIds: input.editorUserIds || [],
      viewerUserIds: input.viewerUserIds || [],
      createdAt: now,
      updatedAt: now,
    };
    await this.prisma.inspirationBoard.create({ data: row);
    return row;
  }

  addAssetToBoard(boardId: string, input: { assetId: string; noteAr?: string }) {
    const now = new Date().toISOString();
    const existing = await this.prisma.inspirationBoardItem.findMany(boardId);
    const orderIndex = existing.length ? Math.max(...existing.map((x) => x.orderIndex)) + 1 : 1;
    const row: InspirationBoardItemRecord = { id: uid('bi'), boardId, assetId: input.assetId, noteAr: input.noteAr, orderIndex, createdAt: now };
    await this.prisma.inspirationBoardItem.create({ data: row);
    return row;
  }

  removeBoardItem(boardId: string, itemId: string) {
    return await this.prisma.inspirationBoardItem.delete({ where: { id: boardId, itemId } });
  }

  getAssetCitation(assetId: string) {
    const asset = await this.prisma.inspirationAsset.findMany().find((x) => x.id === assetId);
    if (!asset) return null;
    return { id: asset.id, citationId: asset.citationId, citationAr: asset.citationAr, url: asset.url, titleAr: asset.titleAr };
  }

}
