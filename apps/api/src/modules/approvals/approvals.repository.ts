import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@madar/db';
import { throwCorePersistenceError } from '../../common/db-fallback';
import { QueryApprovalsDto } from './dto/query-approvals.dto';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryApprovalsDto = {}) {
    try {
      return await (this.prisma as Record<string, unknown>).approvalRequest.findMany({
        where: {
          organizationId: query.organizationId,
          entityType: query.entityType,
          entityId: query.entityId,
          status: query.status,
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (err) {
      throwCorePersistenceError(err, 'ApprovalsRepository.findMany');
    }
  }

  async findById(id: string, client?: DbClient) {
    const db = client ?? this.prisma;
    try {
      const row = await (db as Record<string, unknown>).approvalRequest.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('طلب الموافقة غير موجود');
      return row;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwCorePersistenceError(err, 'ApprovalsRepository.findById');
    }
  }

  async create(data: Record<string, unknown>, client?: DbClient) {
    const db = client ?? this.prisma;
    try {
      return await (db as Record<string, unknown>).approvalRequest.create({ data });
    } catch (err) {
      throwCorePersistenceError(err, 'ApprovalsRepository.create');
    }
  }

  async update(id: string, data: Record<string, unknown>, client?: DbClient) {
    const db = client ?? this.prisma;
    try {
      return await (db as Record<string, unknown>).approvalRequest.update({ where: { id }, data });
    } catch (err) {
      throwCorePersistenceError(err, 'ApprovalsRepository.update');
    }
  }
}
