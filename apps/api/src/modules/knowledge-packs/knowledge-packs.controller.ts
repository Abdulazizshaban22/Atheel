import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { KnowledgePacksService } from './knowledge-packs.service';

@Controller('knowledge-packs')
export class KnowledgePacksController {
  constructor(private readonly packs: KnowledgePacksService) {}

  @Get()
  list() {
    return this.packs.list();
  }

  @Get('preview/:id')
  preview(@Param('id') id: string) {
    return this.packs.preview(id);
  }

  @Post('seed')
  seed(@Body() body: any) {
    return this.packs.seed(body);
  }
}
