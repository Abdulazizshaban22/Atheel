import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { HeritageMemoryService } from './heritage-memory.service';

@ApiBearerAuth()
@Controller('heritage-memory')
export class HeritageMemoryController {
  constructor(private readonly mem: HeritageMemoryService) {}

  @Get('sources')
  sources() {
    return this.mem.listSources();
  }

  @Post('sources')
  addSource(@Body() body: any) {
    return this.mem.addSource(body || {});
  }

  @Post('ingest-text')
  ingestText(@Body() body: any) {
    return this.mem.ingestText(body || {});
  }

  @Post('query')
  query(@Body() body: any) {
    return this.mem.query(body || {});
  }

  @Get('status')
  status() {
    return this.mem.status();
  }
}
