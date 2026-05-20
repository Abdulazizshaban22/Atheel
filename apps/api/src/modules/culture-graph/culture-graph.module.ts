import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { CultureGraphController } from './culture-graph.controller';
import { CultureGraphService } from './culture-graph.service';

@Module({
  imports: [PrismaModule],
  controllers: [CultureGraphController],
  providers: [CultureGraphService],
  exports: [CultureGraphService],
})
export class CultureGraphModule {}
