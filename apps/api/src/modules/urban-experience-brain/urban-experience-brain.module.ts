
import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { UrbanExperienceBrainController } from './urban-experience-brain.controller';
import { UrbanExperienceBrainService } from './urban-experience-brain.service';

@Module({
  imports: [PrismaModule],
  controllers: [UrbanExperienceBrainController],
  providers: [UrbanExperienceBrainService],
  exports: [UrbanExperienceBrainService],
})
export class UrbanExperienceBrainModule {}
