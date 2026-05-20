import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { GovernanceService } from './governance.service';
import { CreateGovernancePolicyPackDto } from './dto/create-pack.dto';
import { CreateGovernancePolicyVersionDto } from './dto/create-version.dto';
import { ActivateGovernancePolicyDto } from './dto/activate.dto';
import { QueryGovernancePacksDto } from './dto/query-packs.dto';
import { SimulateGovernancePolicyDto } from './dto/simulate.dto';
import { ValidatePolicyDslDto } from './dto/validate-policy-dsl.dto';
import { QueryStageGatesDto } from './dto/query-stage-gates.dto';
import { EvaluateStageGateDto } from './dto/evaluate-stage-gate.dto';
import { GenerateBoardPacketDto } from './dto/generate-board-packet.dto';
import { LinkEvidenceDto } from './dto/link-evidence.dto';
import { EvaluatePolicyRuntimeDto } from './dto/evaluate-policy-runtime.dto';

@ApiTags('governance')
@ApiBearerAuth()
@Controller('governance')
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}

  @Roles('org_admin', 'super_admin')
  @Get('policy-dsl/schema')
  policyDslSchema() {
    return { ok: true, schema: this.service.getPolicyDslSchema() };
  }

  @Roles('org_admin', 'super_admin')
  @Get('policy-dsl/ui')
  policyDslUi() {
    return { ok: true, ui: this.service.getPolicyDslUi() };
  }

  @Roles('org_admin', 'super_admin')
  @Post('policy-dsl/validate')
  validatePolicy(@Body() body: ValidatePolicyDslDto) {
    return this.service.validatePolicyDsl(body.dsl);
  }


  @Roles('org_admin', 'super_admin')
  @Get('stage-gates/templates')
  listStageGateTemplates(@Query() query: QueryStageGatesDto, @CurrentUser() user: RequestUser) {
    return this.service.listStageGateTemplates(query, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('stage-gates/evaluate')
  evaluateStageGate(@Body() dto: EvaluateStageGateDto, @CurrentUser() user: RequestUser) {
    return this.service.evaluateStageGate(dto, user);
  }

  @Roles('org_admin', 'super_admin')
  @Post('stage-gates/board-packet')
  generateBoardPacket(@Body() dto: GenerateBoardPacketDto, @CurrentUser() user: RequestUser) {
    return this.service.generateBoardPacket(dto, user);
  }



@Roles('org_admin', 'super_admin')
@Post('policy-runtime/evaluate')
evaluatePolicyRuntime(@Body() dto: EvaluatePolicyRuntimeDto, @CurrentUser() user: RequestUser) {
  return this.service.evaluatePolicyRuntime(dto, user);
}

@Roles('org_admin', 'super_admin')
@Post('evidence/link')
linkEvidence(@Body() dto: LinkEvidenceDto, @CurrentUser() user: RequestUser) {
  return this.service.linkEvidence(dto, user);
}

@Roles('org_admin', 'super_admin')
@Get('evidence/graph')
evidenceGraph(@Query('organizationId') organizationId?: string, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
  return this.service.getEvidenceGraph({ organizationId, entityType, entityId });
}

@Roles('org_admin', 'super_admin')
@Get('board-mode/summary')
boardModeSummary(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
  return this.service.getBoardModeSummary({ organizationId, projectId });
}

@Roles('org_admin', 'super_admin')
@Get('command-center/summary')
commandCenterSummary(@Query('organizationId') organizationId?: string) {
  return this.service.getCommandCenterSummary({ organizationId });
}

@Roles('org_admin', 'super_admin')
@Get('observability/summary')
observabilitySummary(@Query('organizationId') organizationId?: string) {
  return this.service.getObservabilitySummary({ organizationId });
}

@Roles('org_admin', 'super_admin')
@Get('readiness/summary')
readinessSummary(@Query('organizationId') organizationId?: string) {
  return this.service.getReadinessSummary({ organizationId });
}

@Roles('org_admin', 'super_admin')
@Get('release-gate/details')
releaseGateDetails(@Query('organizationId') organizationId?: string) {
  return this.service.getReleaseGateDetails({ organizationId });
}

@Roles('org_admin', 'super_admin')
@Get('final-closure/summary')
finalClosureSummary(@Query('organizationId') organizationId?: string) {
  return this.service.getFinalClosureSummary({ organizationId });
}

@Roles('org_admin', 'super_admin')
@Get('runtime-verification/plan')
runtimeVerificationPlan() {
  return this.service.getRuntimeVerificationPlan();
}

  @Roles('org_admin', 'super_admin')
  @Get('policy-packs')
  listPacks(@Query() query: QueryGovernancePacksDto, @CurrentUser() user: RequestUser) {
    return this.service.listPacks(query, user);
  }

  @Roles('super_admin', 'org_admin')
  @Post('policy-packs')
  createPack(@Body() dto: CreateGovernancePolicyPackDto, @CurrentUser() user: RequestUser) {
    return this.service.createPack(dto, user);
  }

  @Roles('super_admin', 'org_admin')
  @Post('policy-packs/:packId/versions')
  createVersion(@Param('packId') packId: string, @Body() dto: CreateGovernancePolicyVersionDto, @CurrentUser() user: RequestUser) {
    return this.service.createVersion(packId, dto, user);
  }

  @Roles('super_admin', 'org_admin')
  @Post('policy-packs/:packId/activate')
  activate(@Param('packId') packId: string, @Body() dto: ActivateGovernancePolicyDto, @CurrentUser() user: RequestUser) {
    return this.service.activate(packId, dto, user);
  }

  @Roles('org_admin', 'super_admin')
  @Get('policy-packs/active')
  async active(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    // access check inside service
    const policy = await this.service.getActivePolicy(organizationId);
    return { ok: true, organizationId, policy };
  }

  @Roles('org_admin', 'super_admin')
  @Get('policy-packs/active-dsl')
  async activeDsl(@Query('organizationId') organizationId: string, @CurrentUser() _user: RequestUser) {
    // access check inside service
    const policyDsl = await this.service.getActivePolicyDsl(organizationId);
    return { ok: true, organizationId, policyDsl };
  }

  @Roles('org_admin', 'super_admin')
  @Post('policy-packs/simulate')
  simulate(@Body() dto: SimulateGovernancePolicyDto, @CurrentUser() user: RequestUser) {
    return this.service.simulate(dto, user);
  }
}
