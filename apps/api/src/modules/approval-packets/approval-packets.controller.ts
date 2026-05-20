import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Policy } from '../auth/decorators/policy.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { ApprovalPacketsService } from './approval-packets.service';
import { GenerateApprovalPacketDto } from './dto/generate-approval-packet.dto';
import { POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';

@ApiTags('approval-packets')
@ApiBearerAuth()
@Controller('approval-packets')
export class ApprovalPacketsController {
  constructor(private readonly service: ApprovalPacketsService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.approvalPackets, POLICY_ACTIONS.read)
  @Get()
  async list(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string, @Query('experienceId') experienceId?: string, @Query('twinId') twinId?: string, @CurrentUser() user?: RequestUser) {
    const orgId = String(organizationId || user?.activeOrgId || '');
    if (orgId) assertOrgAccess(user, orgId);
    return this.service.list({ organizationId: orgId || organizationId, projectId, experienceId, twinId });
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.approvalPackets, POLICY_ACTIONS.read)
  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const out = await this.service.get(id);
    const orgId = (out as any)?.item?.organizationId;
    assertOrgAccess(user, orgId);
    return out;
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.approvalPackets, POLICY_ACTIONS.create)
  @Post('generate')
  generate(@Body() dto: GenerateApprovalPacketDto, @CurrentUser() user: RequestUser) {
    const organizationId = dto.organizationId || (user?.orgIds || [])[0];
    assertOrgAccess(user, organizationId);
    return this.service.generate({ ...dto, organizationId } as any);
  }
}
