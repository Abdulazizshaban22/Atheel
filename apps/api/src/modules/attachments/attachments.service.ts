import { Injectable } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { AttachmentsApplicationService } from './attachments.application-service';
import { AttachmentsRepository } from './attachments.repository';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly repository: AttachmentsRepository,
    private readonly application: AttachmentsApplicationService,
  ) {}

  async findAll(query: { organizationId?: string; entityType?: string; entityId?: string } = {}) {
    return this.repository.findMany(query);
  }

  async getById(id: string) {
    return this.repository.findById(id);
  }

  async resolveFile(id: string, user?: RequestUser) {
    const attachment: any = await this.getById(id);
    assertOrgAccess(user, attachment.organizationId);
    const { absPath } = this.repository.resolveLocalPath(attachment.storagePath);
    return { attachment, absPath };
  }

  async upload(params: { file: any; organizationId?: string; entityType?: string; entityId?: string; uploaderUserId?: string }) {
    return this.application.upload(params);
  }

  async createFromBuffer(params: {
    buffer: Buffer;
    originalName: string;
    mimeType?: string;
    organizationId?: string;
    entityType?: string;
    entityId?: string;
    uploaderUserId?: string;
    metadata?: any;
  }) {
    return this.application.createFromBuffer(params);
  }

  async createFromFilePath(params: {
    absPath: string;
    originalName: string;
    mimeType?: string;
    organizationId?: string;
    entityType?: string;
    entityId?: string;
    uploaderUserId?: string;
    metadata?: any;
    removeSourceAfter?: boolean;
  }) {
    return this.application.createFromFilePath(params);
  }

  async link(id: string, payload: { organizationId?: string; entityType: string; entityId: string }, actorUserId?: string) {
    return this.application.link(id, payload, actorUserId);
  }
}
