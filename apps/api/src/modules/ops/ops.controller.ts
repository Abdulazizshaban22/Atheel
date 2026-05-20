import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { OpsService } from './ops.service';
import { UpsertOpsSettingsDto } from './dto/upsert-ops-settings.dto';
import { UpsertApprovalSkillDto } from './dto/upsert-approval-skill.dto';
import { CreateSloPolicyDto } from './dto/create-slo-policy.dto';
import { EvaluateSloDto } from './dto/evaluate-slo.dto';
import { IncidentActionDto } from './dto/incident-action.dto';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Roles('org_admin', 'super_admin')
  @Get('settings')
  getSettings(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    return this.ops.getSettings({ organizationId }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('settings')
  upsertSettings(@Body() body: UpsertOpsSettingsDto, @CurrentUser() user: RequestUser) {
    return this.ops.upsertSettings(body, user);
  }

  @Roles('org_admin', 'super_admin')
  @Get('approvals/routing/simulate')
  simulateApprovalRouting(
    @Query('organizationId') organizationId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('contextViolationType') contextViolationType: string,
    @Query('contextDomain') contextDomain: string,
    @Query('contextRegion') contextRegion: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ops.simulateApprovalRouting({ organizationId, entityType, entityId, contextViolationType, contextDomain, contextRegion }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Get('approvals/skills')
  listApprovalSkills(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    return this.ops.listApprovalSkills({ organizationId }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('approvals/skills')
  upsertApprovalSkill(@Body() body: UpsertApprovalSkillDto, @CurrentUser() user: RequestUser) {
    return this.ops.upsertApprovalSkill(body, user);
  }

  @Roles('org_admin', 'super_admin')
  @Get('approvals/workload')
  approvalWorkload(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    return this.ops.getApprovalWorkload({ organizationId }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Get('slo/policies')
  listSloPolicies(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    return this.ops.listSloPolicies({ organizationId }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('slo/policies')
  createSloPolicy(@Body() body: CreateSloPolicyDto, @CurrentUser() user: RequestUser) {
    return this.ops.createSloPolicy(body, user);
  }

  @Roles('org_admin', 'super_admin')
  @Get('slo/burn-rate')
  burnRate(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    return this.ops.computeBurnRates({ organizationId }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('slo/evaluate')
  evaluate(@Body() body: EvaluateSloDto, @CurrentUser() user: RequestUser) {
    return this.ops.evaluateSloAndNotify(body, user);
  }

  @Roles('org_admin', 'super_admin')
  @Get('incidents')
  incidents(
    @Query('organizationId') organizationId: string,
    @Query('status') status: string,
    @Query('limit') limit: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ops.listIncidents({ organizationId, status, limit: Number(limit || 100) }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Get('incidents/:id/timeline')
  incidentTimeline(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ops.incidentTimeline({ organizationId, incidentId: id, limit: Number(limit || 200) }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('incidents/:id/ack')
  ackIncident(@Param('id') id: string, @Body() body: IncidentActionDto, @CurrentUser() user: RequestUser) {
    return this.ops.ackIncident({ ...(body || {}), incidentId: id }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('incidents/:id/close')
  closeIncident(@Param('id') id: string, @Body() body: IncidentActionDto, @CurrentUser() user: RequestUser) {
    return this.ops.closeIncident({ ...(body || {}), incidentId: id }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('incidents/:id/mute')
  muteIncident(@Param('id') id: string, @Body() body: IncidentActionDto, @CurrentUser() user: RequestUser) {
    return this.ops.muteIncident({ ...(body || {}), incidentId: id }, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('incidents/:id/unmute')
  unmuteIncident(@Param('id') id: string, @Body() body: IncidentActionDto, @CurrentUser() user: RequestUser) {
    return this.ops.unmuteIncident({ ...(body || {}), incidentId: id }, user);
  }
}
