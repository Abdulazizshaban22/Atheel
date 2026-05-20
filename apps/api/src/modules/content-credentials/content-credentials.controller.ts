import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContentCredentialsService } from './content-credentials.service';
import { CreateCredentialFromAttachmentDto } from './dto/create-credential.dto';
import { CreateManualCredentialDto } from './dto/create-manual-credential.dto';

@ApiTags('content-credentials')
@ApiBearerAuth()
@Controller('content-credentials')
export class ContentCredentialsController {
  constructor(private readonly service: ContentCredentialsService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get()
  list(@Query('organizationId') organizationId?: string) {
    return this.service.list(organizationId);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  // Return the C2PA-inspired manifest JSON only
  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id/manifest.json')
  @Header('Content-Type', 'application/json')
  async manifest(@Param('id') id: string) {
    const row: any = await this.service.get(id);
    return row?.manifestJson || row?.manifest || null;
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post('from-attachment/:attachmentId')
  createFromAttachment(@Param('attachmentId') attachmentId: string, @Body() dto: CreateCredentialFromAttachmentDto) {
    return this.service.createFromAttachment(attachmentId, {
      organizationId: dto.organizationId,
      noteAr: dto.noteAr,
      createdByUserId: dto.createdByUserId,
    });
  }

  // Manual creation for external assets or pre-built manifests
  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post()
  createManual(@Body() dto: CreateManualCredentialDto) {
    return this.service.createManual({
      organizationId: dto.organizationId,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      subjectName: dto.subjectName,
      sha256: dto.sha256,
      noteAr: dto.noteAr,
      manifestJson: dto.manifestJson,
      createdByUserId: dto.createdByUserId,
    });
  }
}
