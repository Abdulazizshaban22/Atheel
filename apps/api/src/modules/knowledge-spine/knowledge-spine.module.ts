import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { KnowledgeSpineController } from './knowledge-spine.controller';
import { KnowledgeSpineService } from './knowledge-spine.service';

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeSpineController],
  providers: [KnowledgeSpineService],
  exports: [KnowledgeSpineService],
})
export class KnowledgeSpineModule {}
