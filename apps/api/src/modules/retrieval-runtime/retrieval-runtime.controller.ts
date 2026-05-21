import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { RetrievalRuntimeService } from './retrieval-runtime.service';
import { RetrievalQueryDto } from './dto/retrieval-query.dto';

@ApiTags('retrieval-runtime')
@ApiBearerAuth()
@Controller('retrieval')
export class RetrievalRuntimeController {
  constructor(private readonly service: RetrievalRuntimeService) {}

  @Post('query')
  query(@Body() dto: RetrievalQueryDto) {
    return this.service.query(dto);
  }

  @Post('query/domain/:domain')
  queryDomain(@Param('domain') domain: string, @Body() dto: RetrievalQueryDto) {
    return this.service.query({ ...dto, domain });
  }

  @Get('citations/:queryId')
  citations(@Param('queryId') queryId: string) {
    return this.service.getCitations(queryId);
  }

  @Get('vector-sync/overview')
  vectorSyncOverview() {
    return this.service.getVectorSyncOverview();
  }

  @Get('vector-sync/domain/:domain/status')
  vectorSyncStatus(@Param('domain') domain: string) {
    return this.service.getVectorSyncStatus(domain);
  }

  @Post('vector-sync/domain/:domain/run')
  vectorSyncRun(@Param('domain') domain: string, @Body() dto: { filesIndexed?: number; chunksIndexed?: number; freshnessCoverage?: number; lastRunDurationMs?: number }) {
    return this.service.runVectorSync(domain, dto);
  }

  @Post('vector-sync/run-all')
  runAll(@Body() dto: { filesIndexed?: number; chunksIndexed?: number }) {
    return this.service.runAllVectorSync(dto);
  }

  @Get('hybrid-policies')
  hybridPolicies() {
    return this.service.getHybridPolicies();
  }

  @Get('quality/overview')
  qualityOverview() {
    return this.service.qualityOverview();
  }

  @Get('domain/:domain/top-chunks')
  topChunks(@Param('domain') domain: string) {
    return this.service.getTopChunks(domain);
  }
}

