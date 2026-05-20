import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { NarrativesController } from './narratives.controller';
import { NarrativesService } from './narratives.service';

@Module({
  imports: [PrismaModule],
  controllers: [NarrativesController],
  providers: [NarrativesService],
})
export class NarrativesModule {}
