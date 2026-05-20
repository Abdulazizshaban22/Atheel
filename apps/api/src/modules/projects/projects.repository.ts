import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@madar/db';
import { throwCorePersistenceError } from '../../common/db-fallback';
import { QueryProjectsDto } from './dto/query-projects.dto';

type ProjectRecord = {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  status: string;
  progressPercent: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  ownerDisplayName?: string | null;
  budgetEstimate?: unknown;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type ProjectDelegate = {
  findMany(args?: Record<string, unknown>): Promise<ProjectRecord[]>;
  findUnique(args: Record<string, unknown>): Promise<ProjectRecord | null>;
  create(args: { data: Prisma.ProjectUncheckedCreateInput }): Promise<ProjectRecord>;
  update(args: { where: { id: string }; data: Prisma.ProjectUncheckedUpdateInput }): Promise<ProjectRecord>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

export type ProjectDbClient = { project: ProjectDelegate };

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryProjectsDto = {}): Promise<ProjectRecord[]> {
    try {
      return await this.getDelegate().findMany({
        where: {
          organizationId: query.organizationId,
          status: query.status,
          ...(query.q ? { OR: [{ nameAr: { contains: query.q, mode: 'insensitive' } }, { code: { contains: query.q, mode: 'insensitive' } }] } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      throwCorePersistenceError(err, 'ProjectsRepository.findMany');
    }
  }

  async findById(id: string, client?: ProjectDbClient): Promise<ProjectRecord> {
    const db = this.getDelegate(client);
    try {
      const row = await db.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('المشروع غير موجود');
      return row;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwCorePersistenceError(err, 'ProjectsRepository.findById');
    }
  }

  async create(data: Prisma.ProjectUncheckedCreateInput, client?: ProjectDbClient): Promise<ProjectRecord> {
    const db = this.getDelegate(client);
    try {
      return await db.create({ data });
    } catch (err) {
      throwCorePersistenceError(err, 'ProjectsRepository.create');
    }
  }

  async update(id: string, data: Prisma.ProjectUncheckedUpdateInput, client?: ProjectDbClient): Promise<ProjectRecord> {
    const db = this.getDelegate(client);
    try {
      return await db.update({ where: { id }, data });
    } catch (err) {
      throwCorePersistenceError(err, 'ProjectsRepository.update');
    }
  }

  async delete(id: string, client?: ProjectDbClient): Promise<{ id: string; deleted: true }> {
    const db = this.getDelegate(client);
    try {
      await db.delete({ where: { id } });
      return { id, deleted: true as const };
    } catch (err) {
      throwCorePersistenceError(err, 'ProjectsRepository.delete');
    }
  }

  private getDelegate(client?: ProjectDbClient): ProjectDelegate {
    return ((client ?? (this.prisma as unknown as ProjectDbClient)).project);
  }
}
