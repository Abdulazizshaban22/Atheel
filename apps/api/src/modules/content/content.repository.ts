import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@madar/db';
import { throwCorePersistenceError } from '../../common/db-fallback';
import { QueryContentItemsDto } from './dto/query-content-items.dto';

type ContentRecord = {
  id: string;
  organizationId: string;
  projectId?: string | null;
  title: string;
  languageCode: string;
  contentType: string;
  status: string;
  summary?: string | null;
  versionNo?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type ContentDelegate = {
  findMany(args?: Record<string, unknown>): Promise<ContentRecord[]>;
  findUnique(args: Record<string, unknown>): Promise<ContentRecord | null>;
  create(args: { data: Prisma.ContentItemUncheckedCreateInput }): Promise<ContentRecord>;
  update(args: { where: { id: string }; data: Prisma.ContentItemUncheckedUpdateInput }): Promise<ContentRecord>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

export type ContentDbClient = { contentItem: ContentDelegate };

@Injectable()
export class ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryContentItemsDto = {}): Promise<ContentRecord[]> {
    try {
      return await this.getDelegate().findMany({
        where: {
          organizationId: query.organizationId,
          projectId: query.projectId,
          languageCode: query.languageCode,
          contentType: query.contentType,
          status: query.status,
          ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { summary: { contains: query.q, mode: 'insensitive' } }] } : {}),
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (err) {
      throwCorePersistenceError(err, 'ContentRepository.findMany');
    }
  }

  async findById(id: string, client?: ContentDbClient): Promise<ContentRecord> {
    const db = this.getDelegate(client);
    try {
      const row = await db.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('عنصر المحتوى غير موجود');
      return row;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwCorePersistenceError(err, 'ContentRepository.findById');
    }
  }

  async create(data: Prisma.ContentItemUncheckedCreateInput, client?: ContentDbClient): Promise<ContentRecord> {
    const db = this.getDelegate(client);
    try {
      return await db.create({ data });
    } catch (err) {
      throwCorePersistenceError(err, 'ContentRepository.create');
    }
  }

  async update(id: string, data: Prisma.ContentItemUncheckedUpdateInput, client?: ContentDbClient): Promise<ContentRecord> {
    const db = this.getDelegate(client);
    try {
      return await db.update({ where: { id }, data });
    } catch (err) {
      throwCorePersistenceError(err, 'ContentRepository.update');
    }
  }

  async delete(id: string, client?: ContentDbClient): Promise<{ id: string; deleted: true }> {
    const db = this.getDelegate(client);
    try {
      await db.delete({ where: { id } });
      return { id, deleted: true as const };
    } catch (err) {
      throwCorePersistenceError(err, 'ContentRepository.delete');
    }
  }

  private getDelegate(client?: ContentDbClient): ContentDelegate {
    return ((client ?? (this.prisma as unknown as ContentDbClient)).contentItem);
  }
}
