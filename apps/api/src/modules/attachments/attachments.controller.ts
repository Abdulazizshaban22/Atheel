import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Policy } from '../auth/decorators/policy.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AttachmentsService } from './attachments.service';
import { QueryAttachmentsDto } from './dto/query-attachments.dto';
import { LinkAttachmentDto } from './dto/link-attachment.dto';
import { assertWorkerToken } from '../../common/security/worker-token';
import { CoreMutationRoute } from '../../common/contracts/core-mutation-route.decorator';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS, POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';
import { ApiResponseEnvelope } from '../../common/http/api-response-envelope.decorator';
import { AttachmentsApplicationService } from './attachments.application-service';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly service: AttachmentsService,
    private readonly application: AttachmentsApplicationService,
  ) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.attachments, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'list', message: 'Attachments fetched' })
  @Get()
  findAll(@Query() query: QueryAttachmentsDto) {
    return this.service.findAll(query);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.attachments, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Attachment fetched' })
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Get(':id/worker-meta')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  @ApiResponseEnvelope({ kind: 'item', message: 'Attachment worker metadata fetched' })
  async workerMeta(@Param('id') id: string, @Req() req?: any) {
    assertWorkerToken(req);
    return this.service.getById(id);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.attachments,
    policyAction: POLICY_ACTIONS.create,
    auditAction: CORE_MUTATION_ACTIONS.attachmentUpload,
    entityType: AUDIT_ENTITY_TYPES.attachment,
    organizationIdBodyField: 'organizationId',
    message: 'Attachment uploaded',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Attachment uploaded' })
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: any,
    @Query('organizationId') organizationId: string | undefined,
    @Query('entityType') entityType: string | undefined,
    @Query('entityId') entityId: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.application.upload({ file, organizationId, entityType, entityId, uploaderUserId: user?.sub });
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.attachments,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.attachmentLink,
    entityType: AUDIT_ENTITY_TYPES.attachment,
    entityIdParam: 'id',
    message: 'Attachment linked',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Attachment linked' })
  @Patch(':id/link')
  link(@Param('id') id: string, @Body() dto: LinkAttachmentDto, @CurrentUser() user: RequestUser) {
    return this.application.link(id, dto, user?.sub);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.attachments, POLICY_ACTIONS.read)
  @Get(':id/download')
  @Header('Cache-Control', 'private, max-age=60')
  async download(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<StreamableFile> {
    const { attachment, absPath } = await this.service.resolveFile(id, user);
    const stream = createReadStream(absPath);
    return new StreamableFile(stream, {
      type: attachment.mimeType || 'application/octet-stream',
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName || id)}`,
    });
  }
}
