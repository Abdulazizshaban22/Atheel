import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { CultureGraphModule } from '../culture-graph/culture-graph.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [CultureGraphModule, AiModule],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
