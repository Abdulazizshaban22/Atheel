import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { VaultService } from './vault.service';

@ApiBearerAuth()
@Controller('vault')
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  @Get('ideas')
  list(@Query('state') state?: string, @Query('q') q?: string, @Query('projectId') projectId?: string) {
    return this.vault.listIdeas({ state, q, projectId });
  }



  @Get('ideas/similar')
  similar(@Query('ideaId') ideaId?: string, @Query('q') q?: string, @Query('limit') limit?: string) {
    return this.vault.findSimilarIdeas({ ideaId, q, limit: limit ? Number(limit) : 10 });
  }

  @Post('ideas')
  create(@Body() body: any) {
    return this.vault.createIdea(body || {});
  }

  @Get('ideas/:id')
  get(@Param('id') id: string) {
    return this.vault.getIdea(id);
  }

  @Patch('ideas/:id')
  patch(@Param('id') id: string, @Body() body: any) {
    return this.vault.patchIdea(id, body || {});
  }

  @Post('ideas/:id/evidence')
  addEvidence(@Param('id') id: string, @Body() body: any) {
    return this.vault.addEvidence(id, body || {});
  }

  @Post('ideas/:id/advance')
  advance(@Param('id') id: string, @Body() body: any) {
    return this.vault.advanceState(id, body?.nextState);
  }

  @Get('ideas/:id/narrative')
  narrative(@Param('id') id: string) {
    return this.vault.getNarrative(id);
  }

  @Post('ideas/:id/narrative/generate')
  generateNarrative(@Param('id') id: string) {
    return this.vault.generateNarrative(id);
  }
}
