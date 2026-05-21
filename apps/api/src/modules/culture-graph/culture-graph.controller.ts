import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CultureGraphService } from './culture-graph.service';

@Controller('culture-graph')
export class CultureGraphController {
  constructor(private readonly service: CultureGraphService) {}

  @Get('entities')
  listEntities(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listEntities({ q, type, organizationId, projectId, limit: limit ? Number(limit) : undefined });
  }

  @Post('entities')
  createEntity(@Body() body: any) {
    return this.service.createEntity(body || {});
  }

  @Post('entities/:id/aliases')
  addAlias(@Param('id') id: string, @Body() body: any) {
    return this.service.addAlias(id, body || {});
  }

  @Post('relations')
  createRelation(@Body() body: any) {
    return this.service.createRelation(body || {});
  }

  @Post('provenance')
  addProvenance(@Body() body: any) {
    return this.service.addProvenance(body || {});
  }

  @Post('import/from-knowledge')
  importFromKnowledge(@Body() body: any) {
    return this.service.importFromKnowledge(body || {});
  }

  @Get('export/jsonld')
  exportJsonLd(
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.exportJsonLd({ organizationId, projectId });
  }
}
