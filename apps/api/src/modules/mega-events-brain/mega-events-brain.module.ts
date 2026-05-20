import { Module } from '@nestjs/common';
import { MegaEventsBrainController } from './mega-events-brain.controller';
import { MegaEventsBrainService } from './mega-events-brain.service';
import { PrismaModule } from '@madar/db';

@Module({
  imports: [PrismaModule],
  controllers: [MegaEventsBrainController],
  providers: [MegaEventsBrainService],
  exports: [MegaEventsBrainService],
})
export class MegaEventsBrainModule {}
