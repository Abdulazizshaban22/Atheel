import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponseEnvelope } from '../../common/http/api-response-envelope.decorator';
import { CoreMutationRoute } from '../../common/contracts/core-mutation-route.decorator';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS, POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Policy } from '../auth/decorators/policy.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { QueryApprovalsDto } from './dto/query-approvals.dto';
import { DecisionDto } from './dto/decision.dto';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.approvals, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'list', message: 'Approval requests fetched' })
  @Get()
  findAll(@Query() query: QueryApprovalsDto, @CurrentUser() user: RequestUser) { return this.service.findAll(query, user); }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.approvals,
    policyAction: POLICY_ACTIONS.create,
    auditAction: CORE_MUTATION_ACTIONS.approvalCreate,
    entityType: AUDIT_ENTITY_TYPES.approvalRequest,
    organizationIdBodyField: 'organizationId',
    message: 'Approval request created',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Approval request created' })
  @Post()
  create(@Body() dto: CreateApprovalDto, @CurrentUser() user: RequestUser) { return this.service.create(dto, user); }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.approvals,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.approvalSubmit,
    entityType: AUDIT_ENTITY_TYPES.approvalRequest,
    entityIdParam: 'id',
    message: 'Approval submitted',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Approval submitted' })
  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: RequestUser) {
    return this.service.submit(id, user, dto.currentApproverId);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.approvals,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.approvalApprove,
    entityType: AUDIT_ENTITY_TYPES.approvalRequest,
    entityIdParam: 'id',
    message: 'Approval approved',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Approval approved' })
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: RequestUser) {
    return this.service.approve(id, user, dto.note);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.approvals,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.approvalReject,
    entityType: AUDIT_ENTITY_TYPES.approvalRequest,
    entityIdParam: 'id',
    message: 'Approval rejected',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Approval rejected' })
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: RequestUser) {
    return this.service.reject(id, user, dto.note);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.approvals,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.approvalRequestChanges,
    entityType: AUDIT_ENTITY_TYPES.approvalRequest,
    entityIdParam: 'id',
    message: 'Approval changes requested',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Approval changes requested' })
  @Post(':id/request-changes')
  requestChanges(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: RequestUser) {
    return this.service.requestChanges(id, user, dto.changes || dto.note);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.approvals,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.approvalCancel,
    entityType: AUDIT_ENTITY_TYPES.approvalRequest,
    entityIdParam: 'id',
    message: 'Approval cancelled',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Approval cancelled' })
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: RequestUser) {
    return this.service.cancel(id, user, dto.note);
  }
}
