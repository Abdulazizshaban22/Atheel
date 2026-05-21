import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CultureService } from './culture.service';

@ApiBearerAuth()
@Controller('culture')
export class CultureController {
  constructor(private readonly culture: CultureService) {}

  @Get('taxonomy')
  taxonomy() {
    return this.culture.taxonomy();
  }

  @Get('ideas')
  ideas(
    @Query('q') q?: string,
    @Query('region') region?: any,
    @Query('theme') theme?: any,
    @Query('format') format?: any,
    @Query('audience') audience?: any,
    @Query('limit') limit?: string,
  ) {
    return this.culture.listIdeas({ q, region, theme, format, audience, limit: limit ? Number(limit) : undefined });
  }

  @Get('ideas/:id')
  idea(@Param('id') id: string) {
    return this.culture.getIdea(id);
  }

  @Post('knowledge/install')
  installKnowledge(@Body() body: any) {
    return this.culture.installSaudiCultureKnowledge(body || {});
  }
}
