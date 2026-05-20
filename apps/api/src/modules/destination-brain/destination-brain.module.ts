import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { DestinationBrainController } from './destination-brain.controller';
import { DestinationBrainService } from './destination-brain.service';

@Module({
  imports: [PrismaModule],
  controllers: [DestinationBrainController],
  providers: [DestinationBrainService],
  exports: [DestinationBrainService],
})
export class DestinationBrainModule {}
