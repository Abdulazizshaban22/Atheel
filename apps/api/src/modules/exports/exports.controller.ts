import { Body, Controller, Get, Header, Param, Post, Query, Req, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Policy } from '../auth/decorators/policy.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Public } from '../auth/decorators/public.decorator';
import { GenerateExportDto } from './dto/generate-export.dto';
import { ExportsService } from './exports.service';
import { assertWorkerToken } from '../../common/security/worker-token';
import { POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.exports, POLICY_ACTIONS.create)
  @Post('approval-packets/:id/generate')
  generateForApprovalPacket(
    @Param('id') approvalPacketId: string,
    @Body() dto: GenerateExportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.requestExportForApprovalPacket(approvalPacketId, dto, user);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.exports, POLICY_ACTIONS.read)
  @Get('jobs')
  list(@Query('approvalPacketId') approvalPacketId?: string) {
    return this.service.listJobs({ approvalPacketId });
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.exports, POLICY_ACTIONS.read)
  @Get('jobs/:id')
  get(@Param('id') id: string) {
    return this.service.getJob(id);
  }

  @Post('jobs/:id/run')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  run(@Param('id') id: string, @Req() req: Request) {
    assertWorkerToken(req);
    return this.service.runJob(id, { forceSync: false });
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.exports, POLICY_ACTIONS.read)
  @Get('download/:attachmentId')
  @Header('Cache-Control', 'no-store')
  async download(@Param('attachmentId') attachmentId: string, @CurrentUser() user: RequestUser, @Res() res: Response) {
    const file = await this.service.resolveAttachmentFile(attachmentId, user);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    if (!res.sendFile) return { ok: false, reason: 'send_file_not_available', absPath: file.absPath };
    return res.sendFile(file.absPath);
  }
}
