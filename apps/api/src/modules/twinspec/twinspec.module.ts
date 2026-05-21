import { Module } from '@nestjs/common';
import { TwinSpecController } from './twinspec.controller';
import { TwinSpecService } from './twinspec.service';

@Module({
  controllers: [TwinSpecController],
  providers: [TwinSpecService],
  exports: [TwinSpecService],
})
export class TwinSpecModule {}
