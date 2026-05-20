import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@madar/db';
import { throwIfProdDbError } from '../../common/db-fallback';
import { QueryExperiencesDto } from './dto/query-experiences.dto';
import type {
  ExperienceCreateData,
  ExperienceDeleteResult,
  ExperiencePrismaCreateData,
  ExperiencePrismaUpdateData,
  ExperienceRecord,
  ExperienceUpdateData,
} from './experience-core.types';

type ExperienceProjectLookup = { organizationId?: string | null };

type ExperienceDelegate = {
  findMany(args?: Record<string, unknown>): Promise<ExperienceRecord[]>;
  findUnique(args: Record<string, unknown>): Promise<ExperienceRecord | null>;
  create(args: { data: ExperiencePrismaCreateData }): Promise<ExperienceRecord>;
  update(args: { where: { id: string }; data: ExperiencePrismaUpdateData }): Promise<ExperienceRecord>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

type ProjectLookupDelegate = {
  findUnique(args: Record<string, unknown>): Promise<ExperienceProjectLookup | null>;
};

export type ExperienceDbClient = { visitorExperience: ExperienceDelegate };
type ExperiencePrismaFacade = ExperienceDbClient & { project: ProjectLookupDelegate };

@Injectable()
export class ExperiencesRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findMany(query: QueryExperiencesDto = {}): Promise<ExperienceRecord[]> {
    try {
      return await this.getDelegate().findMany({
        where: {
          projectId: query.projectId,
          experienceType: query.experienceType,
          publishStatus: query.publishStatus,
          ...(query.q ? { titleAr: { contains: query.q, mode: 'insensitive' } } : {}),
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (err) {
      throwIfProdDbError(err, 'ExperiencesRepository.findMany');
      return this.dataStore.getExperiences().filter((x) =>
        (!query.projectId || x.projectId === query.projectId) &&
        (!query.experienceType || x.experienceType === query.experienceType) &&
        (!query.publishStatus || x.publishStatus === query.publishStatus) &&
        (!query.q || x.titleAr.includes(query.q)),
      );
    }
  }

  async findById(id: string, client?: ExperienceDbClient): Promise<ExperienceRecord> {
    const delegate = this.getDelegate(client);
    try {
      const row = await delegate.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('التجربة غير موجودة');
      return row;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwIfProdDbError(err, 'ExperiencesRepository.findById');
      const row = this.dataStore.getExperienceById(id);
      if (!row) throw new NotFoundException('التجربة غير موجودة');
      return row;
    }
  }

  async create(data: ExperienceCreateData, client?: ExperienceDbClient): Promise<ExperienceRecord> {
    const delegate = this.getDelegate(client);
    try {
      return await delegate.create({ data: this.toPrismaCreateData(data) });
    } catch (err) {
      throwIfProdDbError(err, 'ExperiencesRepository.create');
      return this.dataStore.addExperience(this.toFallbackRecord(data));
    }
  }

  async update(id: string, data: ExperienceUpdateData, client?: ExperienceDbClient): Promise<ExperienceRecord> {
    const delegate = this.getDelegate(client);
    try {
      return await delegate.update({ where: { id }, data: this.toPrismaUpdateData(data) });
    } catch (err) {
      throwIfProdDbError(err, 'ExperiencesRepository.update');
      return this.dataStore.updateExperience(id, data);
    }
  }

  async delete(id: string, client?: ExperienceDbClient): Promise<ExperienceDeleteResult> {
    const delegate = this.getDelegate(client);
    try {
      await delegate.delete({ where: { id } });
      return { id, deleted: true as const };
    } catch (err) {
      throwIfProdDbError(err, 'ExperiencesRepository.delete');
      await this.dataStore.removeExperience(id);
      return { id, deleted: true as const };
    }
  }

  async resolveOrganizationIdForProject(projectId?: string | null): Promise<string | undefined> {
    if (!projectId) return undefined;
    try {
      const project = await this.getPrismaFacade().project.findUnique({ where: { id: projectId }, select: { organizationId: true } });
      if (typeof project?.organizationId === 'string' && project.organizationId) return project.organizationId;
    } catch (err) {
      throwIfProdDbError(err, 'ExperiencesRepository.resolveOrganizationIdForProject');
    }
    return this.dataStore.getProjectById(projectId)?.organizationId;
  }

  private getDelegate(client?: ExperienceDbClient): ExperienceDelegate {
    return (client ?? this.getPrismaFacade()).visitorExperience;
  }

  private getPrismaFacade(): ExperiencePrismaFacade {
    return this.prisma as unknown as ExperiencePrismaFacade;
  }

  private toPrismaCreateData(data: ExperienceCreateData): ExperiencePrismaCreateData {
    return {
      id: data.id,
      projectId: data.projectId,
      titleAr: data.titleAr,
      experienceType: data.experienceType,
      durationMinutesDefault: data.durationMinutesDefault,
      publishStatus: data.publishStatus ?? 'draft',
      twinId: data.twinId ?? null,
    };
  }

  private toPrismaUpdateData(data: ExperienceUpdateData): ExperiencePrismaUpdateData {
    return {
      titleAr: data.titleAr,
      experienceType: data.experienceType,
      durationMinutesDefault: data.durationMinutesDefault,
      publishStatus: data.publishStatus,
      twinId: data.twinId,
    };
  }

  private toFallbackRecord(data: ExperienceCreateData): ExperienceRecord {
    const now = new Date().toISOString();
    return {
      id: data.id || `exp_${Date.now()}`,
      projectId: data.projectId,
      titleAr: data.titleAr,
      experienceType: data.experienceType,
      durationMinutesDefault: data.durationMinutesDefault,
      publishStatus: data.publishStatus ?? 'draft',
      ...(data.twinId ? { twinId: data.twinId } : {}),
      createdAt: now,
      updatedAt: now,
    };
  }
}
