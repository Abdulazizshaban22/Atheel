import { Module } from '@nestjs/common';
import { KnowledgePacksController } from './knowledge-packs.controller';
import { KnowledgePacksService } from './knowledge-packs.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [KnowledgePacksController],
  providers: [KnowledgePacksService],
  exports: [KnowledgePacksService],
})
export class KnowledgePacksModule {}
