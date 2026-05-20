import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponseEnvelope } from '../../common/http/api-response-envelope.decorator';
import { CoreMutationRoute } from '../../common/contracts/core-mutation-route.decorator';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS, POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';
import { Policy } from '../auth/decorators/policy.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsApplicationService } from './projects.application-service';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly service: ProjectsService,
    private readonly application: ProjectsApplicationService,
  ) {}

  @Roles('viewer','analyst','project_manager','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.projects, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'list', message: 'Projects fetched' })
  @Get()
  findAll(@Query() query: QueryProjectsDto){ return this.service.findAll(query); }

  @Roles('viewer','analyst','project_manager','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.projects, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Project fetched' })
  @Get(':id')
  findOne(@Param('id') id: string){ return this.service.findOne(id); }

  @Roles('project_manager','org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.projects,
    policyAction: POLICY_ACTIONS.create,
    auditAction: CORE_MUTATION_ACTIONS.projectCreate,
    entityType: AUDIT_ENTITY_TYPES.project,
    organizationIdBodyField: 'organizationId',
    message: 'Project created',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Project created' })
  @Post()
  create(@Body() dto: CreateProjectDto){ return this.application.create(dto); }

  @Roles('project_manager','org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.projects,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.projectUpdate,
    entityType: AUDIT_ENTITY_TYPES.project,
    entityIdParam: 'id',
    message: 'Project updated',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Project updated' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto){ return this.application.update(id, dto); }

  @Roles('org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.projects,
    policyAction: POLICY_ACTIONS.delete,
    auditAction: CORE_MUTATION_ACTIONS.projectDelete,
    entityType: AUDIT_ENTITY_TYPES.project,
    entityIdParam: 'id',
    message: 'Project deleted',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Project deleted' })
  @Delete(':id')
  remove(@Param('id') id: string){ return this.application.remove(id); }
}
