import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { HeritageBrainController } from './heritage-brain.controller';
import { HeritageBrainService } from './heritage-brain.service';

@Module({
  imports: [PrismaModule],
  controllers: [HeritageBrainController],
  providers: [HeritageBrainService],
  exports: [HeritageBrainService],
})
export class HeritageBrainModule {}
