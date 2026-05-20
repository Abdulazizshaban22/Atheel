import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { TwinSpecController } from './twinspec.controller';
import { TwinSpecService } from './twinspec.service';
import { TwinModule } from '../twin/twin.module';
import { AiModule } from '../ai/ai.module';

@Module({
  controllers: [TwinSpecController],
  providers: [TwinSpecService],
  exports: [TwinSpecService],
})
export class TwinSpecModule {}
