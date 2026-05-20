import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { CultureProgramsBrainController } from './culture-programs-brain.controller';
import { CultureProgramsBrainService } from './culture-programs-brain.service';
@Module({ imports:[PrismaModule], controllers:[CultureProgramsBrainController], providers:[CultureProgramsBrainService], exports:[CultureProgramsBrainService] })
export class CultureProgramsBrainModule {}
