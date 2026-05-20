import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Get()
  list(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string, @Query('q') q?: string) {
    return this.stories.list({ organizationId, projectId, q });
  }

  @Post()
  create(@Body() body: any) {
    return this.stories.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.stories.get(id);
  }

  @Post(':id/transcripts')
  addTranscript(@Param('id') id: string, @Body() body: any) {
    return this.stories.addTranscript(id, body);
  }

  @Post(':id/consents')
  addConsent(@Param('id') id: string, @Body() body: any) {
    return this.stories.addConsent(id, body);
  }

  @Post(':id/entities')
  linkEntity(@Param('id') id: string, @Body() body: any) {
    return this.stories.linkEntity(id, body);
  }

  @Post(':id/auto-link')
  autoLink(@Param('id') id: string, @Body() body: any) {
    return this.stories.autoLinkEntities(id, body);
  }

  @Get(':id/graph')
  graph(@Param('id') id: string) {
    return this.stories.buildStoryGraph(id);
  }
}
