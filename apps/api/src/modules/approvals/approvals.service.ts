import { Injectable } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess, isSuperAdmin } from '../../common/access';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { QueryApprovalsDto } from './dto/query-approvals.dto';
import { ApprovalsApplicationService } from './approvals.application-service';
import { ApprovalsRepository } from './approvals.repository';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repository: ApprovalsRepository,
    private readonly application: ApprovalsApplicationService,
  ) {}

  async findAll(query: QueryApprovalsDto = {}, user?: RequestUser) {
    if (query.organizationId) assertOrgAccess(user, query.organizationId);

    const rows = await this.repository.findMany({
      ...query,
      organizationId: query.organizationId,
    });

    if (isSuperAdmin(user)) return rows;

    const allowedOrgs = new Set(user?.orgIds || []);
    return rows.filter((row: any) => !row.organizationId || allowedOrgs.has(String(row.organizationId)));
  }

  async create(dto: CreateApprovalDto, user?: RequestUser) {
    return this.application.create(dto, user);
  }

  async submit(id: string, user?: RequestUser, currentApproverId?: string) {
    return this.application.submit(id, user, currentApproverId);
  }

  async approve(id: string, user?: RequestUser, note?: string) {
    return this.application.approve(id, user, note);
  }

  async reject(id: string, user?: RequestUser, note?: string) {
    return this.application.reject(id, user, note);
  }

  async requestChanges(id: string, user?: RequestUser, changes?: string) {
    return this.application.requestChanges(id, user, changes);
  }

  async cancel(id: string, user?: RequestUser, note?: string) {
    return this.application.cancel(id, user, note);
  }
}
