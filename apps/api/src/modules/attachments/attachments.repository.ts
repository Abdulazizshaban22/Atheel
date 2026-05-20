import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@madar/db';
import { ConfigService } from '@nestjs/config';
import { resolve, sep } from 'node:path';
import { throwCorePersistenceError } from '../../common/db-fallback';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AttachmentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findMany(query: { organizationId?: string; entityType?: string; entityId?: string } = {}) {
    try {
      return await (this.prisma as Record<string, unknown>).attachment.findMany({
        where: {
          organizationId: query.organizationId,
          entityType: query.entityType,
          entityId: query.entityId,
        },
        orderBy: { uploadedAt: 'desc' },
      });
    } catch (err) {
      throwCorePersistenceError(err, 'AttachmentsRepository.findMany');
    }
  }

  async findById(id: string, client?: DbClient) {
    const db = client ?? this.prisma;
    try {
      const row = await (db as Record<string, unknown>).attachment.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Attachment not found');
      return row;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwCorePersistenceError(err, 'AttachmentsRepository.findById');
    }
  }

  async create(data: Record<string, unknown>, client?: DbClient) {
    const db = client ?? this.prisma;
    try {
      return await (db as Record<string, unknown>).attachment.create({ data });
    } catch (err) {
      throwCorePersistenceError(err, 'AttachmentsRepository.create');
    }
  }

  async update(id: string, data: Record<string, unknown>, client?: DbClient) {
    const db = client ?? this.prisma;
    try {
      return await (db as Record<string, unknown>).attachment.update({ where: { id }, data });
    } catch (err) {
      throwCorePersistenceError(err, 'AttachmentsRepository.update');
    }
  }

  resolveLocalPath(storagePath: string) {
    const uploadDir = this.config.get<string>('ATHEEL_UPLOAD_DIR') || 'runtime_uploads';
    const absBase = resolve(process.cwd(), uploadDir);
    const absPath = resolve(process.cwd(), storagePath);
    if (!(absPath === absBase || absPath.startsWith(absBase + sep))) {
      throw new NotFoundException('مسار المرفق غير صالح');
    }
    return { absBase, absPath };
  }
}
