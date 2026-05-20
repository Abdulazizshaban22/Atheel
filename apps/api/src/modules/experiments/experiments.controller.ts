import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExperimentsService } from './experiments.service';
import { CreateImpactModelDto } from './dto/create-impact-model.dto';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { CreateExperimentVariantDto } from './dto/create-variant.dto';
import { RecordExperimentEventDto } from './dto/record-event.dto';
import { BuildEventGenomeDto } from './dto/build-event-genome.dto';
import { RecommendFromMemoryDto } from './dto/recommend-from-memory.dto';

@ApiTags('experiments')
@ApiBearerAuth()
@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly service: ExperimentsService) {}

  // Impact Model Registry
  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('impact-models')
  listImpactModels(@Query('organizationId') organizationId?: string) {
    return this.service.listImpactModels(organizationId);
  }

  @Roles('analyst', 'project_manager', 'org_admin', 'super_admin')
  @Post('impact-models')
  createImpactModel(@Body() dto: CreateImpactModelDto) {
    return this.service.createImpactModel({
      organizationId: dto.organizationId,
      code: dto.code,
      nameAr: dto.nameAr,
      descriptionAr: dto.descriptionAr,
      modelJson: dto.modelJson,
    });
  }


  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('memory/projects/:projectId/lessons')
  lessons(@Param('projectId') projectId: string, @Query('organizationId') organizationId?: string) {
    return this.service.projectLessons(projectId, organizationId);
  }

  @Roles('analyst', 'project_manager', 'org_admin', 'super_admin')
  @Post('genome/events/build')
  buildGenome(@Body() dto: BuildEventGenomeDto) {
    return this.service.buildEventGenome(dto || {});
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('genome/events/:id')
  getGenome(@Param('id') id: string) {
    return this.service.getEventGenome(id);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post('recommendations/from-memory')
  recommendFromMemory(@Body() dto: RecommendFromMemoryDto) {
    return this.service.recommendFromMemory(dto || {});
  }

  // Experiments
  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get()
  list(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
    return this.service.listExperiments(organizationId, projectId);
  }

  @Roles('analyst', 'project_manager', 'org_admin', 'super_admin')
  @Post()
  create(@Body() dto: CreateExperimentDto) {
    return this.service.createExperiment({
      organizationId: dto.organizationId,
      projectId: dto.projectId,
      nameAr: dto.nameAr,
      objectiveAr: dto.objectiveAr,
      impactModelId: dto.impactModelId,
    });
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id')
  async get(@Param('id') id: string) {
    const experiment = await this.service.getExperiment(id);
    const variants = await this.service.listVariants(id);
    return { ok: true, experiment, variants };
  }

  @Roles('analyst', 'project_manager', 'org_admin', 'super_admin')
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.service.setStatus(id, status);
  }

  // Variants
  @Roles('analyst', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/variants')
  addVariant(@Param('id') id: string, @Body() dto: CreateExperimentVariantDto) {
    return this.service.addVariant(id, { key: dto.key, labelAr: dto.labelAr, payloadJson: dto.payloadJson });
  }

  // Events
  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/events')
  recordEvent(@Param('id') id: string, @Body() dto: RecordExperimentEventDto) {
    return this.service.recordEvent(id, {
      variantKey: dto.variantKey,
      kind: dto.kind,
      metricsJson: dto.metricsJson,
      userId: dto.userId,
    });
  }

  // Summary
  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.service.summary(id);
  }
}
