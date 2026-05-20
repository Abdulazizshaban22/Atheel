import { Module } from '@nestjs/common';
import { RadarController } from './radar.controller';
import { RadarService } from './radar.service';
import { WorkflowsModule } from '../workflows/workflows.module';
import { CultureGraphModule } from '../culture-graph/culture-graph.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [WorkflowsModule, CultureGraphModule, RealtimeModule],
  controllers: [RadarController],
  providers: [RadarService],
  exports: [RadarService],
})
export class RadarModule {}
