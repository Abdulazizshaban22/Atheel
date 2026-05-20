import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '../../common/audit/audit-action.decorator';
import { CoreMutationRoute } from '../../common/contracts/core-mutation-route.decorator';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS, POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';
import { ExperiencesService } from './experiences.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { QueryExperiencesDto } from './dto/query-experiences.dto';
import { Policy } from '../auth/decorators/policy.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExperiencesApplicationService } from './experiences.application-service';
import { ExperienceTwinDeadLetterService } from './experience-twin-dead-letter.service';
import { ApiResponseEnvelope } from '../../common/http/api-response-envelope.decorator';
import type { ExperienceSimulationInput } from './experience-core.types';

@ApiTags('experiences')
@ApiBearerAuth()
@Controller('experiences')
export class ExperiencesController {
  constructor(
    private readonly service: ExperiencesService,
    private readonly application: ExperiencesApplicationService,
    private readonly deadLetters: ExperienceTwinDeadLetterService,
  ) {}

  @Roles('viewer','analyst','experience_designer','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'list', message: 'Experiences fetched' })
  @Get()
  findAll(@Query() query: QueryExperiencesDto){ return this.service.findAll(query); }

  @Roles('viewer','analyst','experience_designer','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience route score simulated' })
  @Get('simulate-route-score')
  simulateRouteScore(){ return this.service.simulateRouteScore(); }

  @Roles('viewer','analyst','experience_designer','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience fetched' })
  @Get(':id')
  findOne(@Param('id') id: string){ return this.service.findOne(id); }

  @Roles('viewer','analyst','experience_designer','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.update)
  @AuditAction({ action: CORE_MUTATION_ACTIONS.experienceBlueprintBuild, entityType: AUDIT_ENTITY_TYPES.experience, entityIdParam: 'id', message: 'Experience blueprint rebuilt' })
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience blueprint rebuilt' })
  @Post(':id/blueprint')
  buildBlueprint(@Param('id') id: string, @Body() body: Record<string, unknown>){ return this.service.buildBlueprint(id, body || {}); }

  @Roles('experience_designer','project_manager','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.update)
  @AuditAction({ action: CORE_MUTATION_ACTIONS.experienceJourneyUpdate, entityType: AUDIT_ENTITY_TYPES.experience, entityIdParam: 'id', message: 'Experience journey updated' })
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience journey updated' })
  @Patch(':id/journey')
  updateJourney(@Param('id') id: string, @Body() body: Record<string, unknown>){ return this.service.updateJourney(id, body || {}); }

  @Roles('viewer','analyst','experience_designer','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience touchpoints fetched' })
  @Get(':id/touchpoints')
  touchpoints(@Param('id') id: string){ return this.service.getTouchpoints(id); }

  @Roles('viewer','analyst','experience_designer','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience triggers simulated' })
  @Post(':id/triggers/simulate')
  simulateTriggers(@Param('id') id: string, @Body() body: Record<string, unknown>){ return this.service.simulateTriggers(id, body || {}); }

  @Roles('viewer','analyst','experience_designer','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience simulation completed' })
  @Post(':id/simulate')
  simulate(@Param('id') id: string, @Body() body: ExperienceSimulationInput){ return this.service.simulateExperience(id, body || {}); }

  @Roles('org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience twin dead-letter jobs fetched' })
  @Get('twin-sync/dead-letter')
  getTwinSyncDeadLetters(@Query('limit') limit?: string){ return this.deadLetters.list(Number(limit || 20)); }

  @Roles('org_admin','super_admin')
  @Policy(POLICY_RESOURCES.experiences, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Experience twin dead-letter job fetched' })
  @Get('twin-sync/dead-letter/:jobId')
  getTwinSyncDeadLetter(@Param('jobId') jobId: string){ return this.deadLetters.inspect(jobId); }

  @Roles('org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.experiences,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.experienceTwinDeadLetterReplay,
    entityType: AUDIT_ENTITY_TYPES.experience,
    message: 'Experience twin dead-letter replay requested',
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Experience twin dead-letter replay requested' })
  @Post('twin-sync/dead-letter/:jobId/replay')
  replayTwinSyncDeadLetter(@Param('jobId') jobId: string, @Body() body?: { attempts?: number }){ return this.deadLetters.replay(jobId, { attempts: Number(body?.attempts || 0) || undefined }); }

  @Roles('experience_designer','project_manager','org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.experiences,
    policyAction: POLICY_ACTIONS.create,
    auditAction: CORE_MUTATION_ACTIONS.experienceCreate,
    entityType: AUDIT_ENTITY_TYPES.experience,
    organizationIdBodyField: 'organizationId',
    message: 'Experience created',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Experience created' })
  @Post()
  create(@Body() dto: CreateExperienceDto){ return this.application.create(dto); }

  @Roles('experience_designer','project_manager','org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.experiences,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.experienceUpdate,
    entityType: AUDIT_ENTITY_TYPES.experience,
    entityIdParam: 'id',
    message: 'Experience updated',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Experience updated' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExperienceDto){ return this.application.update(id, dto); }

  @Roles('experience_designer','project_manager','org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.experiences,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.experienceTwinSyncQueued,
    entityType: AUDIT_ENTITY_TYPES.experience,
    entityIdParam: 'id',
    message: 'Experience twin sync requested',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Experience twin sync requested' })
  @Post(':id/twin/ensure')
  ensureTwin(@Param('id') id: string){ return this.application.ensureTwin(id); }

  @Roles('org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.experiences,
    policyAction: POLICY_ACTIONS.delete,
    auditAction: CORE_MUTATION_ACTIONS.experienceDelete,
    entityType: AUDIT_ENTITY_TYPES.experience,
    entityIdParam: 'id',
    message: 'Experience deleted',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Experience deleted' })
  @Delete(':id')
  remove(@Param('id') id: string){ return this.application.remove(id); }
}
