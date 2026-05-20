import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';

@Module({
  providers: [ProgramsService],
  controllers: [ProgramsController],
})
export class ProgramsModule {}
