import { Module } from '@nestjs/common';
import { OfficialController } from './official.controller';
import { OfficialService } from './official.service';
import { RadarModule } from '../radar/radar.module';
import { CultureGraphModule } from '../culture-graph/culture-graph.module';

@Module({
  imports: [RadarModule, CultureGraphModule],
  controllers: [OfficialController],
  providers: [OfficialService],
  exports: [OfficialService],
})
export class OfficialModule {}
