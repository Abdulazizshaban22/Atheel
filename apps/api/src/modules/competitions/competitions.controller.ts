import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CompetitionsService } from './competitions.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { QueryCompetitionsDto } from './dto/query-competitions.dto';
import { AnalyzeCompetitionDto } from './dto/analyze-competition.dto';
import { UpdateCompetitionRequirementDto } from './dto/update-requirement.dto';
import { AssignRequirementDto } from './dto/assign-requirement.dto';
import { ExportStudioScopeDto } from './dto/export-studio-scope.dto';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('competitions')
@ApiBearerAuth()
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly service: CompetitionsService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get()
  list(@Query() q: QueryCompetitionsDto) {
    return this.service.listCompetitions(q as any);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post()
  create(@Body() dto: CreateCompetitionDto, @CurrentUser() user: RequestUser) {
    return this.service.createCompetition(dto as any, user);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getCompetition(id, user);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id/requirements')
  listRequirements(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.listRequirements(id, user);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Patch(':id/requirements/:rid')
  updateRequirement(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: UpdateCompetitionRequirementDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateRequirement(id, rid, dto as any, user);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/requirements/:rid/assign')
  assignRequirement(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: AssignRequirementDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.assignRequirement(id, rid, dto as any, user);
  }



  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id/staff-catalog')
  staffCatalog(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getStaffCatalog(id, user);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id/category-assignments')
  listCategoryAssignments(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.listCategoryAssignments(id, user);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/category-assignments/set-owner')
  setCategoryOwner(@Param('id') id: string, @Body() body: any, @CurrentUser() user: RequestUser) {
    return this.service.setCategoryOwner(id, body || {}, user);
  }
  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/analyze')
  analyze(@Param('id') id: string, @Body() dto: AnalyzeCompetitionDto, @CurrentUser() user: RequestUser) {
    return this.service.requestAnalyze(id, dto as any, user);
  }

  // Worker callback
  @Post(':id/analysis/complete')
  @Public()
  @SkipThrottle({ default: true, auth: true })
  completeFromWorker(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    const token = (req.headers?.['x-worker-token'] || '').toString();
    return this.service.completeAnalysisFromWorker(id, body || {}, token);
  }



  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id/experience-blueprint')
  getExperienceBlueprint(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getExperienceBlueprint(id, user);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get(':id/experience-plan')
  getExperiencePlan(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getExperiencePlan(id, user);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/experience-blueprint/regenerate')
  regenExperienceBlueprint(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.regenerateExperienceBlueprint(id, user);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/category-assignments/recommend-owners')
  recommendOwners(@Param('id') id: string, @Body() body: any, @CurrentUser() user: RequestUser) {
    return this.service.recommendCategoryOwners(id, body || {}, user);
  }

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post(':id/exports/studio-scope')
  exportStudioScope(@Param('id') id: string, @Body() dto: ExportStudioScopeDto, @CurrentUser() user: RequestUser) {
    return this.service.exportStudioScope(id, dto as any, user);
  }
}
