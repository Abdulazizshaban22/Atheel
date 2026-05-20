import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { KnowledgeSpineService } from './knowledge-spine.service';
import { UpsertDomainCorpusDto } from './dto/upsert-domain-corpus.dto';
import { SearchDomainKnowledgeDto } from './dto/search-domain-knowledge.dto';

@ApiBearerAuth()
@Controller('knowledge-spine')
export class KnowledgeSpineController {
  constructor(private readonly service: KnowledgeSpineService) {}

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Get('taxonomies')
  taxonomies() {
    return this.service.listTaxonomies();
  }

  @Get('corpora')
  corpora() {
    return this.service.listCorpora();
  }

  @Post('corpora')
  upsertCorpus(@Body() body: UpsertDomainCorpusDto) {
    return this.service.upsertCorpus(body);
  }

  @Post('search')
  search(@Body() body: SearchDomainKnowledgeDto) {
    return this.service.routeSearch(body);
  }
}
