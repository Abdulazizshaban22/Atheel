import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { ExhibitionBrainController } from './exhibition-brain.controller';
import { ExhibitionBrainService } from './exhibition-brain.service';
@Module({ imports:[PrismaModule], controllers:[ExhibitionBrainController], providers:[ExhibitionBrainService], exports:[ExhibitionBrainService] })
export class ExhibitionBrainModule {}
