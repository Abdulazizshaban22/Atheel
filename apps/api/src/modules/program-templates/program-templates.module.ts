import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { ProgramTemplatesController } from './program-templates.controller';
import { ProgramTemplatesService } from './program-templates.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProgramTemplatesController],
  providers: [ProgramTemplatesService],
})
export class ProgramTemplatesModule {}
