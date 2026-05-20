import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UrbanExperienceBrainService } from './urban-experience-brain.service';
import { RunUrbanExperienceRetrievalDto } from './dto/run-urban-experience-retrieval.dto';
import { RunUrbanExperienceEvalDto } from './dto/run-urban-experience-eval.dto';
import { IngestUrbanExperienceCorpusDto } from './dto/ingest-urban-experience-corpus.dto';
import { LinkUrbanExperienceEvidenceDto } from './dto/link-urban-experience-evidence.dto';
import { RunUrbanExperienceQualityCheckDto } from './dto/run-urban-experience-quality-check.dto';

@ApiBearerAuth()
@Controller('domains/urban-experience')
export class UrbanExperienceBrainController {
  constructor(private readonly service: UrbanExperienceBrainService) {}
  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('summary') summary(@Query('organizationId') organizationId?: string) { return this.service.summary({ organizationId }); }
  @Get('agents') agents() { return this.service.agents(); }
  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('retrieve') retrieve(@Body() body: RunUrbanExperienceRetrievalDto) { return this.service.retrieve(body); }
  @Post('evals/run') runEval(@Body() body: RunUrbanExperienceEvalDto) { return this.service.runEval(body); }
  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('dashboard') dashboard(@Query('organizationId') organizationId?: string) { return this.service.dashboard({ organizationId }); }
  @Get('flow-linkage') flowLinkage(@Query('organizationId') organizationId?: string) { return this.service.flowLinkage({ organizationId }); }
  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('corpus-admin') corpusAdmin(@Query('organizationId') organizationId?: string) { return this.service.corpusAdmin({ organizationId }); }
  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('ingest') ingest(@Body() body: IngestUrbanExperienceCorpusDto) { return this.service.ingest(body); }
  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('quality/run') runQuality(@Body() body: RunUrbanExperienceQualityCheckDto) { return this.service.runQualityCheck(body); }
  @Post('evidence/link') linkEvidence(@Body() body: LinkUrbanExperienceEvidenceDto) { return this.service.linkEvidence(body); }
  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('vector-store') vectorStore(@Query('organizationId') organizationId?: string) { return this.service.vectorStore({ organizationId }); }
  @Roles('''analyst''','''curator''','''org_admin''','''super_admin''')
  @Post('vector-store/sync') syncVectorStore(@Body('organizationId') organizationId?: string) { return this.service.syncVectorStore({ organizationId }); }
  @Roles('''viewer''','''analyst''','''curator''','''org_admin''','''super_admin''')
  @Get('retrieval-contracts') retrievalContracts() { return this.service.retrievalContracts(); }
  @Get('readiness-linkage') readinessLinkage(@Query('organizationId') organizationId?: string) { return this.service.readinessLinkage({ organizationId }); }
}
