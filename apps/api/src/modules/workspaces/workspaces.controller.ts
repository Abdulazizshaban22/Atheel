import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Public } from '../auth/decorators/public.decorator';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  @Get()
  list(@Query('organizationId') organizationId?: string, @Query('status') status?: string, @Query('q') q?: string) {
    return this.service.list({ organizationId, status, q });
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user?: RequestUser) {
    return this.service.create(body || {}, user);
  }

  @Get('prompt-templates/list')
  listPromptTemplates(
    @Query('workspaceId') workspaceId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('q') q?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.listPromptTemplates({ workspaceId, organizationId, q, activeOnly: activeOnly === 'true' });
  }

  @Post('prompt-templates')
  createPromptTemplate(@Body() body: any, @CurrentUser() user?: RequestUser) {
    return this.service.createPromptTemplate(body || {}, user);
  }

  @Patch('prompt-templates/:id')
  updatePromptTemplate(@Param('id') id: string, @Body() body: any) {
    return this.service.updatePromptTemplate(id, body || {});
  }

  @Post('prompt-templates/render')
  renderTemplate(@Body() body: any) {
    return this.service.renderTemplate(body || {});
  }

  @Post('model-routing/simulate')
  simulateModelRouting(@Body() body: any) {
    return this.service.simulateModelRouting(body || {});
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body || {});
  }
}
