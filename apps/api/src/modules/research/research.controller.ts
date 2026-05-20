import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ResearchService } from './research.service';

@Controller('research')
export class ResearchController {
  constructor(private readonly research: ResearchService) {}

  @Get('documents')
  list(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string, @Query('q') q?: string) {
    return this.research.listDocuments({ organizationId, projectId, q });
  }

  @Post('documents')
  create(@Body() body: any) {
    return this.research.createDocument(body);
  }

  @Post('import/from-url')
  importFromUrl(@Body() body: any) {
    return this.research.importFromUrl(body);
  }

  @Get('documents/:id')
  get(@Param('id') id: string) {
    return this.research.getDocument(id);
  }

  @Post('documents/:id/extract')
  extract(@Param('id') id: string, @Body() body: any) {
    return this.research.extractAndLink(id, body);
  }
  @Post('documents/:id/insight/generate')
  generateInsight(@Param('id') id: string, @Body() body: any) {
    return this.research.generateInsight(id, body || {});
  }


  @Get('documents/:id/graph')
  graph(@Param('id') id: string) {
    return this.research.buildGraph(id);
  }
}
