import { Injectable } from '@nestjs/common';
import { getRequestContext } from '../../common/request-context';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

type RecordAuditActionInput = {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  severity?: 'info' | 'warning' | 'critical';
  message?: string;
  before?: unknown;
  after?: unknown;
};

@Injectable()
export class AuditLogsService {

  async findAll(query: QueryAuditLogsDto = {}) {
    try {
      const audit = (this.prisma as any)?.auditLog;
      if (!audit?.findMany) throw new Error('audit unavailable');
      return await audit.findMany({
        where: {
          organizationId: query.organizationId,
          entityType: query.entityType,
          entityId: query.entityId,
          severity: query.severity,
          ...(query.q ? { OR: [{ action: { contains: query.q, mode: 'insensitive' } }, { message: { contains: query.q, mode: 'insensitive' } }] } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return this.dataStore.listAuditLogs().filter((x) =>
        (!query.organizationId || x.organizationId === query.organizationId) &&
        (!query.entityType || x.entityType === query.entityType) &&
        (!query.entityId || x.entityId === query.entityId) &&
        (!query.severity || x.severity === query.severity) &&
        (!query.q || x.action.includes(query.q) || (x.message || '').includes(query.q))
      );
    }
  }

  async create(dto: CreateAuditLogDto, actorUserId?: string) {
    return this.recordAction({
      organizationId: dto.organizationId,
      actorUserId,
      action: dto.action,
      entityType: dto.entityType,
      entityId: dto.entityId,
      severity: dto.severity ?? 'info',
      message: dto.message,
      before: dto.before,
      after: dto.after,
    });
  }

  async recordAction(input: RecordAuditActionInput) {
    const ctx = getRequestContext();
    const payload = {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      severity: input.severity ?? 'info',
      message: input.message,
      before: input.before,
      after: input.after,
    };

    try {
      const audit = (this.prisma as any)?.auditLog;
      if (!audit?.create) throw new Error('audit unavailable');
      const row = await audit.create({ data: payload });
      this.dataStore.addAuditLog({
        id: row.id,
        organizationId: row.organizationId ?? undefined,
        actorUserId: row.actorUserId ?? undefined,
        action: row.action,
        entityType: row.entityType ?? undefined,
        entityId: row.entityId ?? undefined,
        severity: row.severity,
        message: row.message ?? undefined,
        before: row.before,
        after: row.after,
        createdAt: row.createdAt.toISOString(),
      });
      return row;
    } catch {
      return this.dataStore.addAuditLog({
        id: `audit_${Date.now()}`,
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        severity: input.severity ?? 'info',
        message: input.message,
        before: input.before,
        after: {
          ...(typeof input.after === 'object' && input.after !== null ? (input.after as Record<string, unknown>) : { value: input.after }),
          context: {
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            authSource: ctx.authSource,
          },
        },
        createdAt: new Date().toISOString(),
      });
    }
  }
}
